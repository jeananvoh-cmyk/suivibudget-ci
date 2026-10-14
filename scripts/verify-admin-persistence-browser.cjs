const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const out=path.resolve(process.env.ADMIN_BROWSER_OUTPUT || 'work/admin-browser');
fs.mkdirSync(out,{recursive:true});
const pdf=label=>{
 const stream=`BT /F1 12 Tf 20 100 Td (${label}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let value='%PDF-1.4\n';const offsets=[0];
 objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(value));value+=`${index+1} 0 obj\n${object}\nendobj\n`;});
 const xref=Buffer.byteLength(value);value+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(value);
};

(async()=>{
 const {createAdminPersistenceFixture}=await import(pathToFileURL(path.resolve('src/utils/__tests__/adminPersistenceFixtures.ts')).href);
 const fixture=await createAdminPersistenceFixture();
 const {db,admin,manager,moderator,citizen}=fixture;
 const results=[],errors=[],apiErrors=[],debugPages=[],requests=[];let forwardedExternal=0,mockedRequests=0,blockedRequests=0;
 let queue=Promise.resolve(),failNext=false,loseNext=false;
 const isolated=(identity,run)=>{const job=queue.then(()=>fixture.session(identity,run,true));queue=job.catch(()=>{});return job;};
 const privileged=run=>{const job=queue.then(run);queue=job.catch(()=>{});return job;};
 const blobs=new Map();
 const ts=require('typescript');let edgeHandler;
 const edgeSource=fs.readFileSync('supabase/functions/admin-media-url/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
 const edgeJs=ts.transpileModule(edgeSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const edgeClient=(_url,key,options)=>{
   const actor=options?.global?.headers?.Authorization?.replace('Bearer ','') || null;
   const from=table=>{const filters=[];const builder={select:()=>builder,eq:(field,value)=>{filters.push({field,value});return builder;},maybeSingle:async()=>{
     const read=()=>db.query(`select * from public.${table} where ${filters.map((item,index)=>`${item.field}=$${index+1}`).join(' and ')}`,filters.map(item=>item.value));
     const rows=key==='isolated-server' ? await privileged(read) : await isolated(actor,read);return {data:rows.rows[0] || null,error:null};
   }};return builder;};
   return {from,auth:{getUser:async()=>({data:{user:actor ? {id:actor} : null},error:null})},storage:{from:bucket=>({download:async(name)=>({data:blobs.get(`${bucket}/${name}`) || null,error:null}),createSignedUrl:async()=>({data:{signedUrl:'https://isolated.example/media'},error:null})})},rpc:async(_name,args)=>{
     try{await privileged(()=>db.query('select public.admin_confirm_document_integrity($1,$2,$3,$4::jsonb)',[args.p_id,args.p_revision,args.p_actor,JSON.stringify(args.p_files)]));return {data:null,error:null};}catch(error){return {data:null,error};}
   }};
 };
 const integrity={};new Function('exports',ts.transpileModule(fs.readFileSync('supabase/functions/_shared/documentIntegrity.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(integrity);
 new Function('Deno','createClient','Response','calculateManifestSha256','normalizeOcrStatus',edgeJs)({env:{get:key=>key==='SUPABASE_SERVICE_ROLE_KEY' ? 'isolated-server' : 'isolated-public'},serve:handler=>{edgeHandler=handler;}},edgeClient,Response,integrity.calculateManifestSha256,integrity.normalizeOcrStatus);
 const documentPatch={title:'BP E2E',category:'BUDGET_OFFICIEL',institution_name:'Historique',institution_id:'historical',year:2024,fiscal_year:2024,document_type:'BUDGET_PRIMITIF',file_url:'https://example.test/bp.pdf',file_name:'bp.pdf',checksum_sha256:'b'.repeat(64),source_name:'Collectivité isolée',status:'TO_VERIFY',verification_status:'TO_VERIFY',is_official:false};
 await isolated(manager,()=>fixture.mutate('public_documents','browser-bp',null,documentPatch));
 await isolated(manager,()=>fixture.mutate('public_documents','browser-bp',1,{status:'VERIFIED'},undefined,'Contrôle humain du BP de test isolé'));
 await isolated(manager,()=>fixture.mutate('public_documents','browser-bp',2,{status:'PUBLISHED'}));
 await isolated(manager,()=>fixture.mutate('public_documents','browser-review-doc',null,{...documentPatch,title:'Document E2E à contrôler',institution_id:null,fiscal_year:null,document_type:'AUTRE_DOCUMENT_OFFICIEL',checksum_sha256:'c'.repeat(64)}));
 const server=http.createServer((req,res)=>{
   const root=path.resolve(process.env.ADMIN_BROWSER_BUILD || 'dist');const parsed=new URL(req.url,'http://localhost');
   let file=path.resolve(root,'.'+decodeURIComponent(parsed.pathname));
   if(!file.startsWith(root+path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file=path.join(root,'index.html');
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
   fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
 const profiles=new Map([[admin,{name:'Administrateur isolé',email:'admin@example.test'}],[manager,{name:'Gestionnaire isolé',email:'manager@example.test'}],[moderator,{name:'Modérateur isolé',email:'moderator@example.test'}],[citizen,{name:'Citoyen isolé',email:'citizen@example.test'}]]);
 const reply=(route,status,data)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Cache-Control':'no-store'},body:JSON.stringify(data)});
 const token=id=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,user_metadata:{role:'ADMIN'}})).toString('base64url'),'isolated-fixture'].join('.');
 const tables=new Set(['profiles','institutions','budget_projects','budget_lines','news_articles','caidp_directory','public_documents','local_budgets','admin_tasks','admin_audit_events','site_settings']);
 async function context(identity){
   const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
   await context.addInitScript(()=>localStorage.setItem('suivibudget_cookie_consent','ESSENTIAL'));
   if(identity) await context.addInitScript(({id,access,email,host})=>{
     localStorage.setItem(`sb-${host}-auth-token`,JSON.stringify({access_token:access,refresh_token:'isolated-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id,email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{role:'ADMIN'}}}));
   },{id:identity,access:token(identity),email:profiles.get(identity).email,host:process.env.ADMIN_TEST_SUPABASE_HOST || 'isolated-admin'});
   await context.route('**/*',async route=>{
     const request=route.request(),url=new URL(request.url());
     if(url.origin===origin || ['data:','blob:'].includes(url.protocol)) return route.continue();
     if(!url.hostname.endsWith('.supabase.co')) {blockedRequests++;return route.abort();}
     mockedRequests++;
     requests.push({path:url.pathname,method:request.method()});
     let actor=null;
     try {const bearer=request.headers().authorization?.split(' ')[1];const decoded=JSON.parse(Buffer.from(bearer?.split('.')[1] || '', 'base64url').toString());if(profiles.has(decoded.sub)) actor=decoded.sub;}catch{}
     if(request.method()==='OPTIONS') return reply(route,200,{});
     if(url.pathname==='/functions/v1/admin-media-url') {
       const response=await edgeHandler(new Request('https://isolated.example/function',{method:'POST',headers:{'Content-Type':'application/json',...(actor ? {Authorization:`Bearer ${actor}`} : {})},body:JSON.stringify(request.postDataJSON())}));
       return reply(route,response.status,await response.json());
     }
     const uploaded=url.pathname.match(/^\/storage\/v1\/object\/(public_documents|admin_media)\/(.+)$/);
     if(uploaded && request.method()==='POST') {
       const bucket=uploaded[1],name=decodeURIComponent(uploaded[2]);
       const form=await new Request('https://isolated.example/upload',{method:'POST',headers:{'Content-Type':request.headers()['content-type']},body:request.postDataBuffer()}).formData();
       const original=Array.from(form.values()).find(value=>value instanceof Blob);
       if(!original) return reply(route,400,{message:'Missing original'});
       if(blobs.has(`${bucket}/${name}`)) return reply(route,409,{statusCode:'409',error:'Duplicate',message:'Already exists'});
       try {const id=crypto.randomUUID();await isolated(actor,()=>db.query('insert into storage.objects(id,bucket_id,name) values($1,$2,$3)',[id,bucket,name]));blobs.set(`${bucket}/${name}`,original);return reply(route,200,{Id:id,Key:`${bucket}/${name}`});}
       catch(error){return reply(route,403,{message:error.message});}
     }
     if(url.pathname==='/auth/v1/user') return actor ? reply(route,200,{id:actor,email:profiles.get(actor).email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{role:'ADMIN'},created_at:'2026-01-01T00:00:00Z'}) : reply(route,401,{message:'Authentication required'});
     if(url.pathname==='/auth/v1/logout') return reply(route,200,{});
     const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/(admin_[a-z_]+)$/)?.[1];
     if(rpc){
       const args=request.postDataJSON() || {};
       if(rpc==='admin_mutate' && failNext){failNext=false;return reply(route,503,{message:'Erreur réseau isolée : aucune sauvegarde confirmée'});}
       try{
         const data=await isolated(actor,async()=>{
           if(rpc==='admin_mutate') return fixture.mutate(args.p_table,args.p_id,args.p_expected_revision,args.p_patch,args.p_operation_id,args.p_reason);
           if(rpc==='admin_mutate_batch') return (await db.query('select public.admin_mutate_batch($1::jsonb) value',[JSON.stringify(args.p_rows)])).rows[0].value;
           if(rpc==='admin_persistence_version') return 3;
           if(rpc==='admin_staff_directory') return (await db.query('select * from public.admin_staff_directory()')).rows;
           if(rpc==='admin_baseline_visibility') return (await db.query('select public.admin_baseline_visibility($1,$2::text[]) value',[args.p_table,args.p_ids])).rows[0].value;
           throw new Error('Unexpected RPC');
         });
         if(rpc==='admin_mutate' && loseNext){loseNext=false;return route.abort();}
         return reply(route,200,data);
       }catch(error){console.log('RPC refusée : '+error.message);return reply(route,400,{message:error.message,code:'P0001'});}
     }
     const table=url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
     if(table && request.method()==='GET'){
       if(!tables.has(table)) return reply(route,200,[]);
       try {
         const params=[],where=[];
         for(const [key,value] of url.searchParams){
           if(['select','order','limit','offset'].includes(key)) continue;
           if(!/^[a-z_]+$/.test(key)) throw new Error('Invalid fixture field');
           if(value.startsWith('eq.')) {params.push(value.slice(3));where.push(`"${key}"=$${params.length}`);}
         }
         let order='id';const requested=url.searchParams.get('order');
         if(requested && /^[a-z_]+\.(asc|desc)(\.nulls(first|last))?$/.test(requested)) order=requested.split('.').slice(0,2).join(' ');
         const limit=Math.min(Number(url.searchParams.get('limit') || 1000),30000),offset=Number(url.searchParams.get('offset') || 0);
         const data=await isolated(actor,async()=>{const result=await db.query(`select * from public.${table} ${where.length ? 'where '+where.join(' and ') : ''} order by ${order} limit ${limit} offset ${offset}`,params);return result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='bigint' ? Number(value) : value])));});
         if(request.headers().accept?.includes('vnd.pgrst.object')) return data.length===1 ? reply(route,200,data[0]) : reply(route,406,{code:'PGRST116',message:'Row not found'});
         return reply(route,200,data);
       }catch(error){apiErrors.push({table,message:error.message});return reply(route,400,{message:error.message});}
     }
     if(url.pathname.startsWith('/functions/v1/')) return reply(route,404,{message:'Fonction non utilisée dans cette fixture'});
     apiErrors.push({path:url.pathname,method:request.method(),message:'Unimplemented fixture request'});
     return route.abort();
   });
   return context;
 }
 async function open(page){
   debugPages.push(page);
   page.on('pageerror',error=>errors.push(error.message));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto(origin+'/admin',{waitUntil:'networkidle'});
   const consent=page.getByRole('button',{name:'Essentiels seuls',exact:true});if(await consent.isVisible().catch(()=>false)) await consent.click();
   await page.getByRole('button',{name:'Console données',exact:true}).waitFor();
 }
 async function consolePage(page){await page.getByRole('button',{name:'Console données',exact:true}).click();await page.locator('summary').filter({hasText:'Lignes budgétaires détaillées'}).click();}
 const card=(page,title)=>page.locator('details article').filter({hasText:title});
 const inputByLabel=(page,label)=>page.locator('label').filter({hasText:label}).last().locator('..').locator('input').first();
 const entityCard=(page,title)=>page.getByRole('heading',{name:title,exact:true}).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
 const check=async(name,run)=>{await run();results.push({name,result:'PASS'});};
 try{
   const a=await context(admin),b=await context(manager),publicContext=await context(null);
   const page=await a.newPage(),pageB=await b.newPage();await open(page);await consolePage(page);
   await check('création serveur et inconnu ≠ zéro',async()=>{
     await page.getByLabel('Budget de la ligne').selectOption('isolated-bp');await page.getByLabel('Libellé de la ligne').fill('E2E ligne inconnue');
     await page.getByLabel('Document de la ligne').selectOption('browser-bp');await page.getByLabel('Page de la ligne').fill('2');
     await page.getByRole('button',{name:'Créer un brouillon de ligne',exact:true}).click();await card(page,'E2E ligne inconnue').waitFor();
     const row=(await db.query("select * from public.budget_lines where line_label='E2E ligne inconnue'")).rows[0];assert.equal(row.amount,null);assert.equal(row.publication_status,'DRAFT');
   });
   await check('reconnexion, actualisation et deuxième session',async()=>{
     await page.reload({waitUntil:'networkidle'});await consolePage(page);await card(page,'E2E ligne inconnue').waitFor();
     await open(pageB);await consolePage(pageB);await card(pageB,'E2E ligne inconnue').waitFor();
   });
   await check('conflit entre deux formulaires et conservation de la saisie',async()=>{
     await card(page,'E2E ligne inconnue').getByRole('button',{name:'Modifier la ligne',exact:true}).click();await page.getByLabel('Montant de la ligne').fill('300');
     await card(pageB,'E2E ligne inconnue').getByRole('button',{name:'Modifier la ligne',exact:true}).click();await pageB.getByLabel('Montant de la ligne').fill('200');
     await pageB.getByRole('button',{name:'Enregistrer la ligne',exact:true}).click();await card(pageB,'E2E ligne inconnue').getByText(/version 2/).waitFor();
     await page.getByRole('button',{name:'Enregistrer la ligne',exact:true}).click();await page.getByRole('status').filter({hasText:'Conflit'}).waitFor();assert.equal(await page.getByLabel('Montant de la ligne').inputValue(),'300');
     assert.equal((await db.query("select amount from public.budget_lines where line_label='E2E ligne inconnue'")).rows[0].amount,200);
     await page.getByRole('button',{name:'Annuler la saisie',exact:true}).click();
   });
   await check('échec réseau sans fermeture du formulaire et reprise',async()=>{
     await page.getByLabel('Budget de la ligne').selectOption('isolated-bp');await page.getByLabel('Libellé de la ligne').fill('E2E reprise réseau');
     failNext=true;await page.getByRole('button',{name:'Créer un brouillon de ligne',exact:true}).click();await page.getByRole('status').filter({hasText:'Erreur réseau isolée'}).waitFor();assert.equal(await page.getByLabel('Libellé de la ligne').inputValue(),'E2E reprise réseau');
     loseNext=true;await page.getByRole('button',{name:'Créer un brouillon de ligne',exact:true}).click();await page.getByRole('button',{name:'Créer un brouillon de ligne',exact:true}).waitFor({state:'visible'});
     await page.waitForFunction(()=>!document.querySelector('details fieldset').disabled);
     await page.getByRole('button',{name:'Créer un brouillon de ligne',exact:true}).click();await card(page,'E2E reprise réseau').waitFor();
     const rows=(await db.query("select id from public.budget_lines where line_label='E2E reprise réseau'")).rows;assert.equal(rows.length,1);
     assert.equal((await db.query('select count(*)::integer count from public.admin_audit_events where entity_id=$1',[rows[0].id])).rows[0].count,1);
   });
   await check('contrôle humain distinct, publication, accès public et archivage',async()=>{
     await pageB.getByLabel('Motif du contrôle de ligne').fill('Comparaison de la ligne 200 FCFA sur la page 2 du BP de test');
     await pageB.getByText('J’ai comparé le libellé').locator('input').check();await card(pageB,'E2E ligne inconnue').getByRole('button',{name:'Vérifier la ligne',exact:true}).click();await card(pageB,'E2E ligne inconnue').getByText(/VERIFIED/).waitFor();
     await card(pageB,'E2E ligne inconnue').getByRole('button',{name:'Soumettre en revue',exact:true}).click();await card(pageB,'E2E ligne inconnue').getByText(/IN_REVIEW/).waitFor();
     await card(pageB,'E2E ligne inconnue').getByRole('button',{name:'Publier la ligne',exact:true}).click();await card(pageB,'E2E ligne inconnue').getByText(/PUBLISHED/).waitFor();
     const rows=await isolated(null,()=>db.query("select id from public.budget_lines where line_label='E2E ligne inconnue'"));assert.equal(rows.rows.length,1);
     await card(pageB,'E2E ligne inconnue').getByRole('button',{name:'Archiver la ligne',exact:true}).click();await card(pageB,'E2E ligne inconnue').waitFor({state:'hidden'});
     assert.equal((await isolated(null,()=>db.query("select id from public.budget_lines where line_label='E2E ligne inconnue'"))).rows.length,0);
     assert.equal((await db.query("select total_amount from public.local_budgets where id='isolated-bp'")).rows[0].total_amount,300);
   });
   await check('parcours documentaire navigateur TO_VERIFY → VERIFIED → PUBLISHED',async()=>{
     await page.getByRole('button',{name:/^Documents Publics/}).click();const row=page.locator('tr').filter({hasText:'Document E2E à contrôler'});await row.waitFor();
     await row.getByRole('button',{name:'Vérifier',exact:true}).click();await row.getByText('VERIFIED',{exact:true}).waitFor();await row.getByRole('button',{name:'Publier',exact:true}).click();await row.getByText('PUBLISHED',{exact:true}).waitFor();
     const stored=(await db.query("select status,verified_by,is_official from public.public_documents where id='browser-review-doc'")).rows[0];assert.equal(stored.status,'PUBLISHED');assert.equal(stored.verified_by,admin);assert.equal(stored.is_official,false);
     assert.equal((await db.query("select status from public.public_documents where id='cocody-reference'")).rows[0].status,'TO_VERIFY');
   });
   await check('institution brouillon, relecture et archivage sans montants inventés',async()=>{
     await page.getByRole('button',{name:/^Annuaire & Élus/}).click();await page.getByRole('button',{name:'+ Nouvelle Entité',exact:true}).click();
     await page.getByPlaceholder('Ex: Mairie de Yamoussoukro, Ministère du Budget...').fill('Institution E2E isolée');await page.getByPlaceholder('Ex: S.E.M. ALASSANE OUATTARA').fill('Responsable de test');
     await page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();await page.getByPlaceholder('Ex: Mairie de Yamoussoukro, Ministère du Budget...').waitFor({state:'hidden'});
     const row=(await db.query("select * from public.institutions where name='Institution E2E isolée'")).rows[0];assert(row);assert.equal(row.total_budget_fcfa,null);assert.equal(row.publication_status,'DRAFT');
     await page.getByPlaceholder('Rechercher par commune, région, ministère, institution ou nom de responsable...').fill('Institution E2E isolée');
     await entityCard(page,'Institution E2E isolée').getByRole('button',{name:"Modifier l'intégralité de la fiche",exact:true}).click();
     await page.getByLabel('Diffusion de la fiche').selectOption('ARCHIVED');await page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();await page.getByPlaceholder('Ex: Mairie de Yamoussoukro, Ministère du Budget...').waitFor({state:'hidden'});
     assert.equal((await db.query('select publication_status from public.institutions where id=$1',[row.id])).rows[0].publication_status,'ARCHIVED');
     assert.equal((await isolated(null,()=>db.query('select id from public.institutions where id=$1',[row.id]))).rows.length,0);
   });
   await check('article créé par interface, revue, publication et dépublication confirmées',async()=>{
     await page.getByRole('button',{name:'Publications',exact:true}).click();await page.getByRole('button',{name:'+ Nouvelle Publication / Rapport',exact:true}).click();
     await page.getByPlaceholder("Ex: Rapport d'Exécution Budgétaire 2026...").fill('Publication E2E isolée');await page.getByPlaceholder('Résumé accrocheur en 2-3 lignes...').fill('Résumé de test');await page.getByPlaceholder("Rédigez l'intégralité du texte ou communiquez les conclusions du rapport...").fill('Contenu de test sans aucune donnée réelle');
     await page.getByRole('button',{name:'Enregistrer sur le serveur',exact:true}).click();await page.getByPlaceholder("Ex: Rapport d'Exécution Budgétaire 2026...").waitFor({state:'hidden'});
     const row=(await db.query("select * from public.news_articles where title='Publication E2E isolée'")).rows[0];assert.equal(row.workflow_status,'DRAFT');
     for(const status of ['IN_REVIEW','PUBLISHED','DRAFT']){
       await entityCard(page,'Publication E2E isolée').getByRole('button',{name:'Modifier',exact:true}).click();await page.getByLabel('État éditorial').selectOption(status);await page.getByRole('button',{name:'Enregistrer sur le serveur',exact:true}).click();await page.getByPlaceholder("Ex: Rapport d'Exécution Budgétaire 2026...").waitFor({state:'hidden'});
       assert.equal((await db.query('select workflow_status from public.news_articles where id=$1',[row.id])).rows[0].workflow_status,status);
       assert.equal((await isolated(null,()=>db.query('select id from public.news_articles where id=$1',[row.id]))).rows.length,status==='PUBLISHED' ? 1 : 0);
     }
   });
   await check('projet déclaré créé par interface avec exercice explicite et montant inconnu',async()=>{
     await page.getByRole('button',{name:/^Projets & investissements/}).click();await page.getByRole('button',{name:'+ Nouveau Projet',exact:true}).click();
     await page.getByPlaceholder("Ex: Construction d'un centre de santé à ...").fill('Projet E2E isolé');await inputByLabel(page,'Commune').fill('Test');await inputByLabel(page,'Région').fill('Test');await page.getByLabel('Exercice fiscal',{exact:true}).fill('2024');await page.getByLabel('Institution du projet').selectOption('historical');
     await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.getByPlaceholder("Ex: Construction d'un centre de santé à ...").waitFor({state:'hidden'});
     const row=(await db.query("select * from public.budget_projects where title='Projet E2E isolé'")).rows[0];assert(row);assert.equal(row.budget_amount_fcfa,null);assert.equal(row.fiscal_year,2024);assert.equal(row.progress_percentage,0);assert.equal(row.current_status,'NOT_STARTED');assert.equal(row.data_provenance,'DECLARED_ADMIN');assert.equal(row.publication_status,'DRAFT');
   });
   await check('organisme CAIDP créé en attente de contrôle humain, sans opérateur inventé',async()=>{
     await page.getByRole('button',{name:/^Répertoire CAIDP/}).click();await page.getByRole('button',{name:'Ajouter un Organisme',exact:true}).click();await page.getByPlaceholder('ex: Direction Générale des Marchés Publics (DGMP), Mairie de Korhogo...').fill('Organisme E2E isolé');await inputByLabel(page,'Source / Référence Officielle').fill('Référence documentaire de test');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.getByPlaceholder('ex: Direction Générale des Marchés Publics (DGMP), Mairie de Korhogo...').waitFor({state:'hidden'});
     const row=(await db.query("select * from public.caidp_directory where company_name='Organisme E2E isolé'")).rows[0];assert(row);assert.equal(row.verification_status,'TO_VERIFY');assert.equal(row.verified_by,null);assert.equal(row.publication_status,'DRAFT');
   });
   await check('file de travail persistante, opérateur réel et refus de clôture sans vérification',async()=>{
     await page.getByRole('button',{name:/^File de Travail/}).click();const row=page.locator('tr').filter({hasText:'Document à valider : Cocody 2024'});await row.waitFor();await row.getByRole('button',{name:'Prendre en charge cette tâche',exact:true}).click();await row.getByText('Moi',{exact:true}).waitFor();
     const task=(await db.query("select * from public.admin_tasks where source_id='cocody-reference'")).rows[0];assert.equal(task.assignee_id,admin);
     await row.getByRole('button',{name:'Marquer comme terminée',exact:true}).click();await page.getByText(/Source state does not justify/).waitFor();assert.equal((await db.query('select status from public.admin_tasks where id=$1',[task.id])).rows[0].status,'IN_PROGRESS');
     await row.getByLabel(/État :/).selectOption('ON_HOLD');
     await page.waitForFunction(()=>!document.querySelector('fieldset[aria-busy="true"]'));
     assert.equal(await row.getByLabel(/État :/).inputValue(),'ON_HOLD');
     assert.equal((await db.query('select status from public.admin_tasks where id=$1',[task.id])).rows[0].status,'ON_HOLD');
   });
   await check('REST simulé : journaux cloisonnés par SQL/RLS et mutations interdites',async()=>{
     const modContext=await context(moderator),modPage=await modContext.newPage();await modPage.goto(origin,{waitUntil:'networkidle'});
     const rows=await modPage.evaluate(async()=>{const session=JSON.parse(localStorage.getItem('sb-isolated-admin-auth-token'));return (await fetch('https://isolated-admin.supabase.co/rest/v1/admin_audit_events',{headers:{Authorization:`Bearer ${session.access_token}`}})).json();});
     assert.equal(rows.some(row=>['public_documents','institutions','budget_projects','budget_lines','site_settings'].includes(row.entity_type)),false);
     const forbidden=await isolated(citizen,()=>db.query('select * from public.admin_audit_events'));assert.equal(forbidden.rows.length,0);
     await assert.rejects(isolated(moderator,()=>db.exec("update public.admin_audit_events set actor_role='ADMIN'")),/permission/);
     await modContext.close();
   });
   await check('reprise navigateur après commit perdu et rechargement sans duplication',async()=>{
     await consolePage(page);await page.getByLabel('Budget de la ligne').selectOption('isolated-bp');await page.getByLabel('Libellé de la ligne').fill('E2E reprise rechargée');
     loseNext=true;await page.getByRole('button',{name:'Créer un brouillon de ligne',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('details fieldset').disabled);
     await page.reload({waitUntil:'networkidle'});await consolePage(page);await page.getByLabel('Budget de la ligne').selectOption('isolated-bp');await page.getByLabel('Libellé de la ligne').fill('E2E reprise rechargée');
     await page.getByRole('button',{name:'Créer un brouillon de ligne',exact:true}).click();await card(page,'E2E reprise rechargée').waitFor();
     const rows=(await db.query("select id from public.budget_lines where line_label='E2E reprise rechargée'")).rows;assert.equal(rows.length,1);
     assert.equal((await db.query('select count(*)::int count from public.admin_audit_events where entity_id=$1',[rows[0].id])).rows[0].count,1);
   });
   await check('fascicules déposés par interface, octets contrôlés puis publication humaine séparée',async()=>{
     await page.getByRole('button',{name:/^Comptes Administratifs/}).click();
     await page.getByRole('button',{name:/^2025/}).click();
     const row=page.locator('tr').filter({hasText:'Historique'});await row.getByRole('button',{name:'Déposer',exact:true}).click();
     const modal=page.getByRole('heading',{name:'Déposer un Compte Administratif (CA)',exact:true}).locator('xpath=ancestor::div[contains(@class,"max-w-")][1]');
     await modal.getByLabel('Document scindé en plusieurs fascicules (multi-PDF)').check();
     await modal.getByLabel('Fichier PDF du fascicule 1',{exact:true}).setInputFiles({name:'fascicule-1.pdf',mimeType:'application/pdf',buffer:pdf('Original fictif un')});
     await modal.getByLabel('Fichier PDF du fascicule 2',{exact:true}).setInputFiles({name:'fascicule-2.pdf',mimeType:'application/pdf',buffer:pdf('Original fictif deux')});
     await modal.getByLabel('Première page du fascicule 1').fill('1');await modal.getByLabel('Dernière page du fascicule 1').fill('1');await modal.getByLabel('Première page du fascicule 2').fill('2');await modal.getByLabel('Dernière page du fascicule 2').fill('2');
     await modal.getByRole('button',{name:'Enregistrer le Compte Administratif',exact:true}).click();await modal.waitFor({state:'hidden'});
     const document=(await db.query("select * from public.public_documents where institution_id='historical' and fiscal_year=2025 and document_type='COMPTE_ADMINISTRATIF'")).rows[0];assert.equal(document.status,'TO_VERIFY');assert.equal(document.checksum_status,'DECLARED');assert.equal(document.parts_count,2);assert.equal(document.storage_path,null);
     await row.getByRole('button',{name:'Examiner',exact:true}).click();
     await page.getByLabel('Document PDF lisible, officiel et complet (sans pages manquantes).').check();
     await page.getByLabel('J’ai contrôlé chaque fascicule et la continuité des pages sur les originaux.').check();
     await page.getByRole('button',{name:/^Valider/}).click();
     await row.getByText('Vérifié (non publié)',{exact:true}).waitFor();
     const checked=(await db.query('select * from public.public_documents where id=$1',[document.id])).rows[0];assert.equal(checked.status,'VERIFIED');assert.equal(checked.checksum_status,'COMPUTED');assert.equal(checked.document_parts.every(part=>part.page_range_verified && part.checksum_status==='COMPUTED'),true);
     await row.getByRole('button',{name:'Examiner',exact:true}).click();await page.getByRole('button',{name:'Publier sur la plateforme',exact:true}).click();await row.getByText('Publié en ligne',{exact:true}).waitFor();
     assert.equal((await isolated(null,()=>db.query('select id from public.public_documents where id=$1',[document.id]))).rows.length,1);
     assert.equal((await db.query("select status from public.public_documents where id='cocody-reference'")).rows[0].status,'TO_VERIFY');
     await page.screenshot({path:path.join(out,'multipart-published.png'),fullPage:true});
   });
   await check('responsive mobile, tablette et bureau',async()=>{
     await consolePage(page);
     for(const width of [360,640,768,1024,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Débordement à '+width);await page.screenshot({path:path.join(out,`admin-${width}.png`),fullPage:true});if([360,1440].includes(width))await page.screenshot({path:path.join(out,`admin-${width}-viewport.png`)});}
   });
   await check('articles brouillons absents de la page publique',async()=>{
     await isolated(admin,()=>fixture.mutate('news_articles','private-e2e-article',null,{title:'BROUILLON PRIVÉ E2E',slug:'private-e2e',summary:'Privé',content:'Privé',category:'ACTUALITE'}));
     const publicPage=await publicContext.newPage();await publicPage.goto(origin,{waitUntil:'networkidle'});assert.equal(await publicPage.getByText('BROUILLON PRIVÉ E2E',{exact:true}).count(),0);
     await publicPage.screenshot({path:path.join(out,'public-home.png'),fullPage:true});
   });
   assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(apiErrors.length,0,JSON.stringify(apiErrors));assert.equal(forwardedExternal,0);
 }catch(error){for(const [index,page] of debugPages.entries()){await page.screenshot({path:path.join(out,`failure-${index}.png`),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,`failure-${index}.txt`),await page.locator('body').innerText().catch(()=>''));}results.push({name:'Échec du parcours',result:'FAIL',message:error.message});throw error;}
 finally{
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors,apiErrors,requests,network:{forwardedExternal,mockedRequests,blockedRequests},database:'PGlite isolé',auth:'Transport Auth simulé ; RLS et RPC PostgreSQL réels',productionWrites:0},null,2));
   await browser.close();await queue;await db.close();await new Promise(resolve=>server.close(resolve));
 }
 console.log(JSON.stringify({passed:results.filter(row=>row.result==='PASS').length,total:results.length,out}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
