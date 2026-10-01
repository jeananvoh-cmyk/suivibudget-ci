import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';
import { LOCAL_BUDGETS_REFERENTIAL, setPublishedLocalBudgets, getLocalBudgetsForInstitution } from '../../data/localBudgetsReferential';

let db: PGlite;
const admin = '00000000-0000-0000-0000-000000000001';
const ca = CA_PILOT_FIXTURES[0];
const row = (ca=CA_PILOT_FIXTURES[0]) => ({ kind: 'CA', institution_id: ca.institution_id, institution_type: ca.institution_type, fiscal_year: ca.fiscal_year,
  source: { name: ca.source_document, reference: `${ca.source_document}, page ${ca.source_page}`, date: ca.created_at.slice(0,10), date_kind: 'RECORDED' },
  data: { verification_status: ca.verification_status, operating_planned: ca.operating_planned, operating_realized: ca.operating_realized, investment_planned: ca.investment_planned, investment_realized: ca.investment_realized, total_planned: ca.total_planned, total_realized: ca.total_realized },
  precision: Object.fromEntries(['operating_planned','operating_realized','investment_planned','investment_realized','total_planned','total_realized'].map(k=>[k,'EXACT'])) });
async function plan(rows: unknown[], commit=false, hash: string|null=null): Promise<any> {
  return (await db.query<{result: any}>('select public.import_data_batch($1::jsonb,$2,$3) result',[JSON.stringify(rows),commit,hash])).rows[0].result;
}
async function stage(rows: unknown[]) {const preview=await plan(rows);return plan(rows,true,preview.plan_hash);}
async function review(ids: string[], action: string) {return (await db.query<{result:any}>('select public.review_data_import($1::text[],$2,$3) result',[ids,action,'Relecture locale des sources pilotes'])).rows[0].result;}
async function isolated(run:()=>Promise<void>) {await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);await db.exec('set local role authenticated');await run();}finally{await db.exec('rollback');}}

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function private.has_staff_role(text[]) returns boolean language sql as $$select auth.uid()='${admin}'::uuid$$;
    create function public.uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;
    create table public.institutions(id text primary key,name text,type text);
    create table public.projects(id text primary key);
    grant usage on schema public,private,auth to authenticated,anon;
  `);
  for(const pilot of CA_PILOT_FIXTURES) await db.query("insert into public.institutions values ($1,$2,'MAIRIE')",[pilot.institution_id,pilot.institution_name]);
  await db.exec("insert into public.institutions values ('inst-com-cocody','Mairie de Cocody','MAIRIE')");
  for(const [file,names] of [
    ['20260928_local_budgets_referential.sql',['local_budgets']],
    ['20260928_administrative_accounts.sql',['administrative_accounts','ca_investment_operations','ca_procurement_matches']],
  ] as const){const sql=readFileSync(`supabase/migrations/${file}`,'utf8');for(const name of names) await db.exec(sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${name} \\([\\s\\S]*?\\n\\);`))![0]);}
  const migration=readFileSync('supabase/migrations/20261001091748_controlled_data_import.sql','utf8');
  await db.exec(migration);
},30000);
afterAll(async()=>{await db?.close();});

describe('Controlled real data import',()=>{
  it('feeds published remote budgets into the existing public history only',()=>{
    const pilot=LOCAL_BUDGETS_REFERENTIAL.find(b=>b.institution_id==='inst-com-bingerville')!;
    try {
      setPublishedLocalBudgets([{...pilot,id:'remote-existing-source'}, {...pilot,id:'private-source',status:'VERIFIED'}]);
      expect(getLocalBudgetsForInstitution(pilot.institution_id).some(b=>b.id==='remote-existing-source')).toBe(true);
      expect(getLocalBudgetsForInstitution(pilot.institution_id).some(b=>b.id===pilot.id||b.id==='private-source')).toBe(false);
    } finally {setPublishedLocalBudgets([]);}
  });
  it('rejects a stale dry-run after another import',()=>isolated(async()=>{
    const preview=await plan([row()]);await stage([row()]);
    await expect(plan([row()],true,preview.plan_hash)).rejects.toThrow('stale');
  }));
  it('keeps existing canonical pilot data untouched and reports conflicts',()=>isolated(async()=>{
    const id=(await stage([row()])).rows[0].id;await review([id],'VERIFY');await review([id],'PUBLISH');
    await db.exec('reset role');await db.query('delete from public.data_import_events where row_id=$1',[id]);await db.query('delete from public.data_import_rows where id=$1',[id]);await db.exec('set local role authenticated');
    expect((await plan([row()])).counts.conflicts).toBe(1);
  }));
  it('rejects operation links with incompatible institution or exercise',()=>isolated(async()=>{
    const pilot=CA_PILOT_FIXTURES.find(c=>c.institution_id==='inst-com-tiassale')!;const op=pilot.operations[0];
    const caId=(await stage([row(pilot)])).rows[0].id;await review([caId],'VERIFY');await review([caId],'PUBLISH');
    for(const context of [{...row(pilot),fiscal_year:2025},row()]) {
      const r={...context,kind:'OPERATION',data:{ca_id:caId,operation_reference:op.operation_reference,title:op.title,sector:op.sector,planned_amount:op.planned_amount,executed_amount:op.executed_amount},precision:{planned_amount:'EXACT',executed_amount:'EXACT'}};
      const id=(await stage([r])).rows[0].id;await review([id],'VERIFY');expect((await review([id],'PUBLISH')).rows[0].message).toContain('mismatch');
    }
  }));
  it('imports the Tiassalé CA/operation/DGMP chain only after separate human review',()=>isolated(async()=>{
    const pilot=CA_PILOT_FIXTURES.find(c=>c.institution_id==='inst-com-tiassale')!;
    const op=pilot.operations[0];const market=op.procurement_match!;
    const caId=(await stage([row(pilot)])).rows[0].id;
    await review([caId],'VERIFY');expect((await review([caId],'PUBLISH')).rows[0].status).toBe('PUBLISHED');
    const operation={...row(pilot),kind:'OPERATION',data:{ca_id:caId,operation_reference:op.operation_reference,title:op.title,sector:op.sector,planned_amount:op.planned_amount,executed_amount:op.executed_amount,source_page:op.source_page},precision:{planned_amount:'EXACT',executed_amount:'EXACT'}};
    const opId=(await stage([operation])).rows[0].id;
    await review([opId],'VERIFY');expect((await review([opId],'PUBLISH')).rows[0].status).toBe('PUBLISHED');
    const dgmp={...row(pilot),kind:'DGMP',source:{name:market.source,reference:market.tender_number,date:pilot.created_at.slice(0,10),date_kind:'RECORDED',url:market.source_url},data:{operation_id:opId,tender_number:market.tender_number,procurement_object:market.procurement_object,contractor:market.contractor,award_amount:market.award_amount,award_date:market.award_date,match_level:market.match_level,match_evidence:`${op.operation_reference}, page ${op.source_page} — ${market.tender_number}`},precision:{award_amount:'EXACT'}};
    const marketId=(await stage([dgmp])).rows[0].id;
    await review([marketId],'VERIFY');expect((await review([marketId],'PUBLISH')).rows[0].status).toBe('PUBLISHED');
    await db.exec('reset role');expect((await db.query('select * from public.ca_procurement_matches')).rows).toHaveLength(1);
  }));
  it('rejects ambiguous DGMP publication and isolates review failures',()=>isolated(async()=>{
    const pilot=CA_PILOT_FIXTURES.find(c=>c.institution_id==='inst-com-tiassale')!;
    const market=pilot.operations[0].procurement_match!;
    const dgmp={...row(pilot),kind:'DGMP',data:{tender_number:market.tender_number,match_level:'TO_VERIFY',award_amount:market.award_amount},precision:{award_amount:'EXACT'}};
    const id=(await stage([dgmp])).rows[0].id;
    await review([id],'VERIFY');const p=await review(['absent',id],'PUBLISH');
    expect(p.rows).toHaveLength(2);expect(p.rows[1].message).toContain('Ambiguous');
  }));
  it('stages existing Cocody source with unknown breakdown, publishes sourced Bingerville BP',()=>isolated(async()=>{
    const budgets=['inst-com-cocody','inst-com-bingerville'].map(id=>LOCAL_BUDGETS_REFERENTIAL.find(b=>b.institution_id===id&&b.fiscal_year===2026)!);
    const rows=budgets.map(b=>({kind:'BP',institution_id:b.institution_id,institution_type:b.institution_type,fiscal_year:b.fiscal_year,source:{name:b.primary_source_label,reference:b.primary_source_url,date:b.updated_at.slice(0,10),date_kind:'RECORDED',url:b.primary_source_url},data:{budget_type:b.budget_type,version_number:b.version_number,total_amount:b.total_amount,operating_amount:b.institution_id==='inst-com-cocody'?null:b.operating_amount,investment_amount:b.institution_id==='inst-com-cocody'?null:b.investment_amount,verification_status:b.verification_status,confidence_level:b.confidence_level},precision:{total_amount:b.amount_precision,operating_amount:b.institution_id==='inst-com-cocody'?'UNKNOWN':b.amount_precision,investment_amount:b.institution_id==='inst-com-cocody'?'UNKNOWN':b.amount_precision}}));
    const p=await stage(rows);expect(p.counts.imported).toBe(2);
    const ids=p.rows.map((r:any)=>r.id);await review(ids,'VERIFY');const published=await review(ids,'PUBLISH');
    expect(published.rows[0].status).toBe('ERROR');expect(published.rows[1].status).toBe('PUBLISHED');
  }));
  it('rejects direct mutation and anonymous execution',async()=>{
    for(const statement of ["insert into public.data_import_rows(id,payload) values ('forged','{}')","select public.import_data_batch('[]')"]){
      await db.exec('begin; set local role anon');try{await expect(db.exec(statement)).rejects.toThrow('permission denied');}finally{await db.exec('rollback');}
    }
  });
  it('dry-run writes nothing and imports no public record',()=>isolated(async()=>{
    const p=await plan([row()]);expect(p.counts.ready).toBe(1);
    expect((await db.query('select * from public.data_import_rows')).rows).toHaveLength(0);
    expect((await db.query('select * from public.data_import_events')).rows).toHaveLength(0);
  }));
  it('requires the unchanged preview and is idempotent',()=>isolated(async()=>{
    await expect(plan([row()],true,'wrong')).rejects.toThrow('Dry-run');
  }));
  it('isolates errors and deduplicates repeated rows without overwriting',()=>isolated(async()=>{
    const invalid={...row(),source:{...row().source,date:'2024-02-30'}};
    const p=await stage([row(),row(),invalid]);expect(p.counts).toMatchObject({imported:1,ignored:1,errors:1});
    expect((await stage([row()])).counts.ignored).toBe(1);
    const changed=row();changed.data.total_realized++;
    expect((await stage([changed])).counts.conflicts).toBe(1);
  }));
  it('refuses both conflicting duplicates regardless of order',()=>isolated(async()=>{
    const changed=row();changed.data.total_realized++;
    for(const rows of [[row(),changed],[changed,row()]]) expect((await stage(rows)).counts.conflicts).toBe(2);
  }));
  it('requires source, explicit matching institution type, precision and rejects injected fields',()=>isolated(async()=>{
    const candidates=[{...row(),source:{}},{...row(),institution_type:'REGIONAL_COUNCIL'},{...row(),precision:{}},{...row(),data:{...row().data,status:'PUBLISHED'}},{...row(),data:{...row().data,total_realized:1.5}}];
    expect((await stage(candidates)).counts.errors).toBe(candidates.length);
  }));
  it('keeps UNKNOWN null and non-exact values in staging without inventing legacy amounts',()=>isolated(async()=>{
    const r={...row(),data:{...row().data,total_realized:null},precision:{...row().precision,total_realized:'UNKNOWN'}};
    const result=await stage([r]);const id=result.rows[0].id;
    expect((await review([id],'VERIFY')).rows[0].status).toBe('VERIFIED');
    expect((await review([id],'PUBLISH')).rows[0].status).toBe('ERROR');
    expect((await db.query<any>('select payload from public.data_import_rows')).rows[0].payload.data.total_realized).toBeNull();
  }));
  it('separates verification from publication, preserves provenance and prevents duplicate promotion',()=>isolated(async()=>{
    const result=await stage([row()]);const id=result.rows[0].id;
    expect((await review([id],'PUBLISH')).rows[0].status).toBe('ERROR');
    expect((await review([id],'VERIFY')).rows[0].status).toBe('VERIFIED');
    expect((await review([id],'PUBLISH')).rows[0]).toMatchObject({status:'PUBLISHED'});
    expect((await review([id],'PUBLISH')).rows[0].status).toBe('IGNORED');
    await db.exec('reset role');
    const published=(await db.query<any>('select * from public.administrative_accounts')).rows[0];
    expect(published.total_realized).toBe(ca.total_realized);expect(published.surplus_or_deficit).toBeNull();
    expect(published.import_provenance.source).toEqual(row().source);
  }));
  it('denies citizens the RPC and direct writes, hides staging',async()=>{
    await db.exec('begin');try{await db.exec('set local role authenticated');
      expect((await db.query('select * from public.data_import_rows')).rows).toHaveLength(0);
      await expect(plan([row()])).rejects.toThrow('Staff');
    }finally{await db.exec('rollback');}
  });
});
