// Cloudflare Pages Function: /api/vet-ai
// يخدم: (1) المساعد والترجمة: {messages:[{role,content}]}  (2) تحليل الصور: {kind,species,notes,images:[dataURL]}
// المتغيرات في Cloudflare (Settings ← Variables and Secrets):
//   GEMINI_API_KEY  (سرّي، من aistudio.google.com)   |  GEMINI_MODEL (اختياري)  |  ALLOWED_ORIGIN (اختياري، مثل https://example.com)
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const VISION_SYS = "أنت مساعد بيطري يكتب بالعربية. أعطِ ملاحظات أولية محتملة ومنظمة (ما يظهر، احتمالات، ما يُنصح بفحصه، مدى الاستعجال). لا تقدّم تشخيصًا قطعيًا ولا جرعات دوائية، وانصح دائمًا بمراجعة الطبيب البيطري. إن كانت الصورة غير واضحة أو غير ذات صلة فقل ذلك.";
const KINDS = { xray: "اقرأ صورة الأشعة", lab: "فسّر نتائج التحاليل المصورة", drug: "اقرأ اسم الدواء ومادته الفعالة واستعمالاته العامة وتحذيراته", skin: "صِف حالة الجلد أو الجرح الظاهرة" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8" } });

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) return json({ error: "forbidden" }, 403);
  if (!env.GEMINI_API_KEY) return json({ error: "not_configured" }, 500);
  if (Number(request.headers.get("Content-Length") || 0) > 20_000_000) return json({ error: "too_large" }, 413);
  let b; try { b = await request.json(); } catch { return json({ error: "bad_json" }, 400); }

  let system = "", contents = [];
  if (Array.isArray(b.images) && b.images.length) {
    const parts = b.images.slice(0, 4).map(d => String(d).split(",")[1]).filter(Boolean)
      .map(data => ({ inline_data: { mime_type: "image/jpeg", data } }));
    parts.push({ text: `الحيوان: ${String(b.species || "غير محدد").slice(0, 40)}\nملاحظات: ${String(b.notes || "لا يوجد").slice(0, 800)}\nالمطلوب: ${KINDS[b.kind] || "حلّل الصورة"}.` });
    system = VISION_SYS; contents = [{ role: "user", parts }];
  } else if (Array.isArray(b.messages) && b.messages.length) {
    let total = 0;
    for (const m of b.messages.slice(-20)) {
      const t = String(m.content || ""); total += t.length; if (total > 30000) break;
      if (m.role === "system") system += t + "\n";
      else contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: t }] });
    }
  }
  if (!contents.length) return json({ error: "empty" }, 400);

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const body = { contents, generationConfig: { temperature: 0.2, maxOutputTokens: 4096 } };
  if (system.trim()) body.systemInstruction = { parts: [{ text: system.trim() }] };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body: JSON.stringify(body)
  });
  if (r.status === 429) return json({ error: "rate_limited" }, 429);
  if (!r.ok) return json({ error: "upstream_" + r.status }, 502);
  const d = await r.json();
  const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
  return json({ text });
}
