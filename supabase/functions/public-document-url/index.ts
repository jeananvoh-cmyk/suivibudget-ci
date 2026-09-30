import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers:cors});
 try{
  const {document_id}=await req.json();
  if(!document_id||typeof document_id!=="string") return new Response(JSON.stringify({error:"document_id requis"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data:doc,error}=await admin.from("public_documents").select("id,storage_path,file_url,status").eq("id",document_id).eq("status","PUBLISHED").maybeSingle();
  if(error||!doc) return new Response(JSON.stringify({error:"Document public introuvable"}),{status:404,headers:{...cors,"Content-Type":"application/json"}});
  let url:string|null=null; let expires:number|null=null;
  if(doc.storage_path){
   const {data:signed,error:signedError}=await admin.storage.from("public_documents").createSignedUrl(doc.storage_path,300);
   if(signedError||!signed?.signedUrl) return new Response(JSON.stringify({error:"Lien temporaire indisponible"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
   url=signed.signedUrl; expires=300;
  } else if(doc.file_url&&/^https:\/\//i.test(doc.file_url)){url=doc.file_url;}
  if(!url) return new Response(JSON.stringify({error:"Fichier non disponible"}),{status:404,headers:{...cors,"Content-Type":"application/json"}});
  return new Response(JSON.stringify({url,expires_in:expires}),{headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
 }catch{return new Response(JSON.stringify({error:"Requête invalide"}),{status:400,headers:{...cors,"Content-Type":"application/json"}})}
});
