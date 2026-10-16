import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { createAdminPersistenceFixture } from './adminPersistenceFixtures';
import { adminCreationId, importAdminCsv, mutateAdminEntity, mutateAdminBatch, parseAdminCsv, summarizeCsvAmounts, readAdminRows, requireAdminPersistence } from '../../services/adminPersistenceService';

const api=vi.hoisted(()=>({configured:vi.fn(()=>true),getUser:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock('../../services/supabase',()=>({isSupabaseConfigured:api.configured,supabase:{auth:{getUser:api.getUser},rpc:api.rpc,from:api.from}}));
let fixture: Awaited<ReturnType<typeof createAdminPersistenceFixture>>;
let identity:string|null;
let failRead=false;
let loseResponse=false;
let queue:Promise<unknown>=Promise.resolve();
const isolated=<T>(run:()=>Promise<T>):Promise<T>=>{
  const id=identity;
  const result=queue.then(()=>fixture.session(id,run,true));
  queue=result.catch(()=>{});
  return result;
};

beforeAll(async()=>{
  const storage=new Map<string,string>();
  vi.stubGlobal('sessionStorage',{getItem:(key:string)=>storage.get(key) ?? null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
  fixture=await createAdminPersistenceFixture();
  api.rpc.mockImplementation(async(name:string,args:Record<string,unknown>)=>{
    try {
      if(name==='admin_persistence_version') return {data:3,error:null};
      const data=await isolated(async()=>{
        if(name==='admin_mutate') return fixture.mutate(String(args.p_table),String(args.p_id),args.p_expected_revision as number|null,args.p_patch as object,String(args.p_operation_id),String(args.p_reason));
        if(name==='admin_mutate_batch') return (await fixture.db.query<{value:object}>('select public.admin_mutate_batch($1::jsonb) value',[JSON.stringify(args.p_rows)])).rows[0].value;
        throw new Error('Unexpected RPC');
      });
      if(loseResponse) {loseResponse=false;return {data:null,error:new Error('Réponse réseau perdue après commit')};}
      return {data,error:null};
    } catch(error) {return {data:null,error};}
  });
  api.from.mockImplementation((table:string)=>{
    if(!['institutions','budget_projects','budget_lines','caidp_directory','public_documents'].includes(table)) throw new Error('Unexpected table');
    let id:string|undefined;let range:[number,number]|undefined;
    const read=async(single=false)=>{
      if(failRead) {failRead=false;return {data:null,error:new Error('Relecture hors ligne')};}
      try {
        const result=await isolated(()=>fixture.db.query(`select * from public.${table} ${id ? 'where id=$1' : ''} order by id ${range ? `limit ${range[1]-range[0]+1} offset ${range[0]}` : ''}`,id ? [id] : []));
        return {data:single ? result.rows[0] : result.rows,error:null};
      }catch(error){return {data:null,error};}
    };
    const builder={select:()=>builder,order:()=>builder,eq:(_field:string,value:string)=>{id=value;return builder;},range:(start:number,end:number)=>{range=[start,end];return builder;},single:()=>read(true),then:(resolve:(value:unknown)=>void,reject:(error:unknown)=>void)=>read().then(resolve,reject)};
    return builder;
  });
},60000);
afterAll(async()=>{await queue;await fixture.db.close();});
beforeEach(()=>{identity=fixture.admin;api.configured.mockReturnValue(true);api.getUser.mockImplementation(async()=>({data:{user:identity ? {id:identity} : null},error:null}));failRead=false;loseResponse=false;});

describe('Persistance réelle du service sur PostgreSQL isolé, sans réseau externe',()=>{
  it('signale une reprise dont le commit a été suivi d’une modification concurrente',async()=>{
    const input={table:'institutions' as const,id:'retry-after-concurrent',revision:null,patch:{name:'Ma saisie conservée',type:'MAIRIE'},reason:'Création dont la réponse est perdue'};
    loseResponse=true;
    await expect(mutateAdminEntity(input)).rejects.toThrow(/réseau/);
    await fixture.session(fixture.manager,()=>fixture.mutate('institutions',input.id,1,{name:'Changement concurrent'}),true);
    await expect(mutateAdminEntity(input)).rejects.toThrow(/Conflit.*confirmée/);
    expect(input.patch.name).toBe('Ma saisie conservée');
    expect((await readAdminRows('institutions')).find(row=>row.id===input.id)?.name).toBe('Changement concurrent');
    expect((await fixture.db.query("select count(*)::int count from public.admin_audit_events where entity_id='retry-after-concurrent'")).rows[0]).toEqual({count:2});
  });

  it('reprend après rechargement avec seulement UUID et hash en session, sans stocker la saisie privée',async()=>{
    const input={table:'institutions' as const,id:'retry-after-refresh',revision:null,patch:{name:'Saisie isolée',type:'MAIRIE',contact_email:'private-refresh@example.test'},reason:'Réponse perdue avant rechargement'};
    const stableId=await adminCreationId(input.table,input.patch);
    loseResponse=true;
    await expect(mutateAdminEntity(input)).rejects.toThrow(/réseau/);
    vi.resetModules();
    const reloaded=await import('../../services/adminPersistenceService');
    expect(await reloaded.adminCreationId(input.table,input.patch)).toBe(stableId);
    expect((await reloaded.mutateAdminEntity(input)).revision).toBe(1);
    const retryKey=`admin-retry:${fixture.admin}:institutions:${input.id}`;
    expect(sessionStorage.getItem(retryKey)).not.toContain(input.patch.contact_email);
    expect(JSON.parse(sessionStorage.getItem(retryKey)!)).toEqual({payload:expect.stringMatching(/^[a-f0-9]{64}$/),id:expect.stringMatching(/^[a-f0-9-]{36}$/)});
    expect((await fixture.db.query("select count(*)::int count from public.admin_audit_events where entity_id='retry-after-refresh'")).rows[0]).toEqual({count:1});
  });

  it('refuse une relecture d’identité correcte mais de révision supérieure',async()=>{
    const input={table:'institutions' as const,id:'read-revision-race',revision:null,patch:{name:'Saisie A',type:'MAIRIE'},reason:'Test de conflit après réponse confirmée'};
    const builder={select:()=>builder,eq:()=>builder,single:async()=>{
      await fixture.session(fixture.manager,()=>fixture.mutate('institutions',input.id,1,{name:'Saisie B'}),true);
      return {data:(await fixture.db.query('select * from public.institutions where id=$1',[input.id])).rows[0],error:null};
    }};
    api.from.mockImplementationOnce(()=>builder);
    await expect(mutateAdminEntity(input)).rejects.toThrow(/Conflit après confirmation/);
  });

  it('reprend un lot perdu sans doublon et signale tout élément changé depuis son commit',async()=>{
    const inputs=['retry-lot-a','retry-lot-b'].map(id=>({table:'institutions' as const,id,revision:null,patch:{name:id,type:'MAIRIE'},reason:'Lot à reprendre après perte de réponse'}));
    loseResponse=true;
    await expect(mutateAdminBatch(inputs)).rejects.toThrow(/réseau/);
    await mutateAdminBatch(inputs);
    await fixture.session(fixture.manager,()=>fixture.mutate('institutions','retry-lot-b',1,{name:'Version B'}),true);
    await expect(mutateAdminBatch(inputs)).rejects.toThrow(/Conflit/);
    expect((await fixture.db.query("select count(*)::int count from public.admin_audit_events where entity_id like 'retry-lot-%'")).rows[0]).toEqual({count:3});
  });
  it('relit le profil depuis deux sessions et refuse un formulaire obsolète',async()=>{
    const row=await mutateAdminEntity({table:'institutions',id:'service-profile',revision:null,patch:{name:'Profil isolé',type:'MAIRIE'},reason:'Création de test isolée'});
    identity=fixture.manager;
    expect((await readAdminRows('institutions')).find(item=>item.id===row.id)?.name).toBe('Profil isolé');
    await mutateAdminEntity({table:'institutions',id:row.id,revision:row.revision,patch:{name:'Session B'},reason:'Changement confirmé depuis session B'});
    identity=fixture.admin;
    await expect(mutateAdminEntity({table:'institutions',id:row.id,revision:row.revision,patch:{name:'Session A obsolète'},reason:'Essai concurrent depuis session A'})).rejects.toThrow(/Conflit/);
    expect((await readAdminRows('institutions')).find(item=>item.id===row.id)?.name).toBe('Session B');
  });

  it('réessaie après perte de réponse sans doubler le commit ou le journal',async()=>{
    const input={table:'institutions' as const,id:'lost-response',revision:null,patch:{name:'Réponse perdue',type:'MAIRIE'},reason:'Test du commit et de la réponse perdue'};
    loseResponse=true;
    await expect(mutateAdminEntity(input)).rejects.toThrow(/réseau/);
    expect((await mutateAdminEntity(input)).revision).toBe(1);
    expect((await fixture.db.query<{count:number}>("select count(*)::integer count from public.admin_audit_events where entity_id='lost-response'")).rows[0].count).toBe(1);
  });

  it('conserve la clé de reprise lorsque la relecture échoue après une écriture confirmée',async()=>{
    const input={table:'institutions' as const,id:'lost-read',revision:null,patch:{name:'Relecture perdue',type:'MAIRIE'},reason:'Test de la relecture après commit'};
    failRead=true;
    await expect(mutateAdminEntity(input)).rejects.toThrow(/relecture indisponible/);
    expect((await mutateAdminEntity(input)).revision).toBe(1);
    expect((await fixture.db.query<{count:number}>("select count(*)::integer count from public.admin_audit_events where entity_id='lost-read'")).rows[0].count).toBe(1);
  });

  it('bloque une seconde soumission pendant la confirmation de la première',async()=>{
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    api.getUser.mockImplementationOnce(async()=>{await gate;return {data:{user:{id:fixture.admin}},error:null};});
    const input={table:'institutions' as const,id:'pending-save',revision:null,patch:{name:'Double clic',type:'MAIRIE'},reason:'Test du double clic avant confirmation'};
    const first=mutateAdminEntity(input);
    await expect(mutateAdminEntity(input)).rejects.toThrow(/déjà en cours/);
    release();await first;
    expect((await fixture.db.query<{count:number}>("select count(*)::integer count from public.institutions where id='pending-save'")).rows[0].count).toBe(1);
  });

  it('ne simule aucun succès sans configuration, session, contrat ou droits RLS',async()=>{
    const confirmed={table:'institutions' as const,id:'confirmed-retry',revision:null,patch:{name:'Reprise après rafraîchissement',type:'MAIRIE'},reason:'Reprise du même formulaire confirmé'};
    const row=await mutateAdminEntity(confirmed);
    expect((await mutateAdminEntity(confirmed)).id).toBe(row.id);
    expect((await fixture.db.query<{count:number}>("select count(*)::integer count from public.admin_audit_events where entity_id='confirmed-retry'")).rows[0].count).toBe(1);
    api.rpc.mockResolvedValueOnce({data:3,error:null}).mockResolvedValueOnce({data:{id:'other-id',revision:1},error:null});
    await expect(mutateAdminEntity({...confirmed,id:'invalid-confirmation'})).rejects.toThrow(/Confirmation serveur invalide/);
    api.configured.mockReturnValue(false);
    await expect(requireAdminPersistence()).rejects.toThrow(/indisponible/);
    api.configured.mockReturnValue(true);identity=null;
    await expect(requireAdminPersistence()).rejects.toThrow(/Authentication/);
    identity=fixture.admin;api.rpc.mockResolvedValueOnce({data:null,error:{code:'PGRST202',message:'function does not exist'}});
    await expect(requireAdminPersistence()).rejects.toThrow(/Contrat serveur/);
    identity=fixture.citizen;
    await expect(mutateAdminEntity({table:'institutions',id:'unauthorized-service',revision:null,patch:{name:'Faux rôle',type:'MAIRIE'},reason:'Tentative du citoyen isolé'})).rejects.toThrow(/droits insuffisants/);
    expect((await fixture.db.query("select id from public.institutions where id='unauthorized-service'")).rows).toHaveLength(0);
  });

  it('importe les inconnus à null, conserve zéro, refuse les doublons et la reprise sans revision',async()=>{
    const csv='title;commune_name;region_name;category;fiscal_year;source_url;budget_amount_fcfa\nProjet inconnu;Test;Test;Eau;2024;https://example.org/source;\nProjet zéro;Test;Test;Eau;2024;https://example.org/source;0';
    expect(await importAdminCsv('budget_projects',csv)).toBe(2);
    expect(await importAdminCsv('budget_projects',csv)).toBe(0);
    const rows=await readAdminRows('budget_projects');
    expect(rows.find(row=>row.title==='Projet inconnu')?.budget_amount_fcfa).toBeNull();
    expect(Number(rows.find(row=>row.title==='Projet zéro')?.budget_amount_fcfa)).toBe(0);
    const current=rows.find(row=>row.title==='Projet zéro')!;
    await expect(importAdminCsv('budget_projects',`id;title;commune_name;region_name;category;fiscal_year;source_url\n${current.id};Modifié;Test;Test;Eau;2024;https://example.org/source`)).rejects.toThrow(/revision/);
    await expect(importAdminCsv('budget_projects','title;commune_name;region_name;category;source_url\nProjet;Test;Test;Eau;https://example.org')).rejects.toThrow(/obligatoires/);
    await expect(importAdminCsv('budget_projects',csv.replace(';0',';-1'))).rejects.toThrow(/montant invalide/);
    expect(rows.every(row=>row.publication_status==='DRAFT')).toBe(true);
  });

  it('refuse un lot de contacts en doublon et n’en conserve aucun fragment',async()=>{
    const csv='company_name;category;region;commune;source\nOrganisme doublé;MAIRIE;Test;Test;Source test\nOrganisme doublé;MAIRIE;Test;Test;Source autre';
    await expect(importAdminCsv('caidp_directory',csv)).rejects.toThrow(/Duplicate/);
    expect((await readAdminRows('caidp_directory')).some(row=>row.company_name==='Organisme doublé')).toBe(false);
  });

  it('résume zéro, inconnus et erreurs sans total trompeur',()=>{
    expect(summarizeCsvAmounts([{budget_amount_fcfa:'0'},{budget_amount_fcfa:'40'}])).toEqual({unknownAmountCount:0,invalidAmountCount:0,knownAmountFcfa:40,totalAmountFcfa:40});
    expect(summarizeCsvAmounts([{budget_amount_fcfa:''},{budget_amount_fcfa:'40'},{budget_amount_fcfa:'invalide'},{budget_amount_fcfa:'0x10'}])).toEqual({unknownAmountCount:1,invalidAmountCount:2,knownAmountFcfa:40,totalAmountFcfa:null});
  });

  it('gère séparateurs et guillemets tout en rejetant les CSV ambigus',()=>{
    expect(parseAdminCsv('title;source\n"Titre; avec séparateur";"Source ""citée"""')).toEqual([{title:'Titre; avec séparateur',source:'Source "citée"'}]);
    for(const input of ['id;id\na;b','id;name\na','id;name\na;"ouvert','id;name\na;b;c']) expect(()=>parseAdminCsv(input)).toThrow();
  });
});
