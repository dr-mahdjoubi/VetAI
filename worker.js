// Cloudflare Worker: وسيط آمن بين موقعك وذكاء Gemini المجاني (المفتاح مخفي هنا)
// المتغير السري المطلوب: GEMINI_KEY  (يُضاف من إعدادات Worker ← Variables ← Secret)
const ALLOWED_ORIGIN = 'https://dr-mahdjoubi.github.io';
const MODEL = 'gemini-2.5-flash'; // غيّره إن تغيّر اسم النموذج المجاني

const SYSTEM = 'أنت "بيطري-AI"، مساعد معرفي في منصة VetAI Global Intelligence للطب البيطري. ' +
  'أجب بلغة المستخدم بوضوح وبدقة وبشكل منظم ومختصر. إجاباتك تعليمية ولا تغني عن الطبيب البيطري، ' +
  'وفي الحالات الخطيرة انصح بمراجعة طبيب بيطري فوراً. لا تخترع مصادر أو أرقاماً. ' +
  'إن لم تكن متأكداً فقل ذلك. يمكنك الإجابة عن أي موضوع آخر بذكاء وأدب.';

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (req.method !== 'POST') return new Response('OK', { headers: h });
    if (origin !== ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403, headers: h });

    try {
      const { question, history = [], context = '' } = await req.json();
      if (!question || question.length > 2000) {
        return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: h });
      }
      const contents = history.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content).slice(0, 2000) }]
      }));
      const q = context ? 'معلومات من قاعدة بيانات المنصة (استعن بها إن كانت مفيدة):\n' + context + '\n\nالسؤال: ' + question : question;
      contents.push({ role: 'user', parts: [{ text: q }] });

      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: contents
          })
        }
      );
      const d = await r.json();
      const text = d.candidates && d.candidates[0] && d.candidates[0].content.parts.map(p => p.text).join('');
      if (!text) return new Response(JSON.stringify({ error: 'no_answer' }), { status: 502, headers: h });
      return new Response(JSON.stringify({ answer: text }), { headers: { ...h, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'server' }), { status: 500, headers: h });
    }
  }
};
