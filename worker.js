/* وسيط الذكاء الاصطناعي لمنصة VetAI — Cloudflare Worker + Workers AI
   الواجهة: POST { messages:[{role,content}] }  →  { text }
   الإعداد: أضف Binding من نوع Workers AI باسم AI، وعدّل ALLOWED أدناه إلى نطاق موقعك. */
const ALLOWED=['https://dr-mahdjoubi.github.io'];
const MODEL='@cf/meta/llama-3.1-8b-instruct'; // تحقق من اسم النموذج المتاح في لوحة Cloudflare
const MAX_MSGS=8, MAX_CHARS=6000;

function cors(origin){
  const ok=ALLOWED.includes(origin);
  return {'Access-Control-Allow-Origin':ok?origin:ALLOWED[0],'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};
}
export default {
  async fetch(req,env){
    const origin=req.headers.get('Origin')||'';
    const h=cors(origin);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h});
    if(req.method!=='POST')return new Response('Method Not Allowed',{status:405,headers:h});
    if(!ALLOWED.includes(origin))return new Response('Forbidden',{status:403,headers:h});
    let body;try{body=await req.json();}catch(e){return new Response('Bad JSON',{status:400,headers:h});}
    const m=body&&body.messages;
    if(!Array.isArray(m)||!m.length||m.length>MAX_MSGS)return new Response('Bad messages',{status:400,headers:h});
    // النص فقط: الصور ترفضها الواجهة ثم تنتقل الصفحة تلقائيًا إلى المزوّد التالي
    for(const x of m){
      if(typeof x.content!=='string'||x.content.length>MAX_CHARS||!['system','user','assistant'].includes(x.role))
        return new Response('Unsupported message',{status:400,headers:h});
    }
    try{
      const r=await env.AI.run(MODEL,{messages:m,max_tokens:600,temperature:0.2});
      const text=(r&&(r.response||r.result&&r.result.response))||'';
      if(!text)return new Response('Empty',{status:502,headers:h});
      return new Response(JSON.stringify({text}),{headers:{...h,'Content-Type':'application/json'}});
    }catch(e){return new Response('AI error',{status:502,headers:h});}
  }
};
