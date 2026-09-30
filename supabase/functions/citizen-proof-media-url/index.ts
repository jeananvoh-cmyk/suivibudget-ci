import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers:cors});
 try{
  const {proof_id,media="image"}=await req.json();
  if(typeof proof_id!=="string"||!proof_id.trim()||!["image","secondary_image","video"].includes(media)) return new Response(JSON.stringify({error:"Requête invalide"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const column=media==="video"?"video_url":media==="secondary_image"?"secondary_image_url":"image_url";
  const {data,error}=await admin.from("citizen_proofs").select(`id,verification_status,${column}`).eq("id",proof_id).eq("verification_status","APPROVED").maybeSingle();
  if(error||!data) return new Response(JSON.stringify({error:"Preuve publique introuvable"}),{status:404,headers:{...cors,"Content-Type":"application/json"}});
  const value=(data as Record<string,unknown>)[column];
  if(typeof value!=="string"||!value) return new Response(JSON.stringify({error:"Média indisponible"}),{status:404,headers:{...cors,"Content-Type":"application/json"}});
  if(/^https:\/\//i.test(value)) return new Response(JSON.stringify({url:value,expires_in:null}),{headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
  const {data:signed,error:signedError}=await admin.storage.from("citizen_photos").createSignedUrl(value,300);
  if(signedError||!signed?.signedUrl) return new Response(JSON.stringify({error:"Lien temporaire indisponible"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
  return new Response(JSON.stringify({url:signed.signedUrl,expires_in:300}),{headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
 }catch{return new Response(JSON.stringify({error:"Requête invalide"}),{status:400,headers:{...cors,"Content-Type":"application/json"}})}
});
