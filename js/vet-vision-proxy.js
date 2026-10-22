// Cloudflare Worker: يخفي مفتاح API ويحمل تعليمات النظام. ضع المفتاح في ANTHROPIC_API_KEY (Secret).
// اربط المسار /api/vet-vision بهذا الـ Worker. أضف حد معدل (Rate limit) قبل النشر.
const SYSTEM = `أنت طبيب بيطري خبير ومحلل صور طبية بيطرية، تخدم مربين غير متخصصين على منصة VetAI.
حلل الصور (قد تكون لقطات من فيديو) والوصف المرفق، وأجب بكائن JSON واحد فقط بلا أي نص آخر ولا علامات Markdown، بالعربية، بهذه الحقول:
{"urgency":"emergency|urgent|soon|monitor","urgency_reason":"جملة واحدة",
"notifiable_suspect":"اسم المرض المبلَّغ عنه المشتبه به أو سلسلة فارغة",
"image_quality_note":"ملاحظة عن جودة الصور أو ما ينقص لحسم التقييم، أو فارغة",
"description":"وصف ظاهري للآفات: الموقع، الشكل، اللون، التوزيع، الحجم",
"differentials":[{"likelihood":"مرتفع|متوسط|منخفض","name":"...","why":"..."}],
"tests":["الفحوصات المخبرية أو السريرية التأكيدية"],
"immediate":["إجراءات مؤقتة آمنة يستطيع المربي تنفيذها الآن"],
"avoid":["ما يجب عدم فعله"],"see_vet_if":["علامات تستدعي الطبيب فورًا"]}
قواعد صارمة:
- رتب differentials من الأعلى احتمالًا، ولا تتجاوز 5. لا تجزم بتشخيص من صورة وحدها.
- لا تكتب جرعات أدوية ولا أسماء مضادات حيوية بجرعات. العلاج الدوائي يصفه الطبيب فقط، وللحيوانات المنتجة للغذاء نبّه إلى فترات السحب.
- التوصيات الفورية تقتصر على إجراءات آمنة: العزل، التدفئة أو التبريد، الماء والإماهة الفموية للعجول إن كان واعيًا، تنظيف الجرح بالماء، وقف النزيف بضغط نظيف، التصوير والتوثيق.
- ارفع الاستعجال إلى emergency عند: صعوبة تنفس، نزيف غزير، تشنجات، انتفاخ شديد، عجز عن الوقوف، شحوب أو زرقة، اشتباه تسمم، شلل، عضة من حيوان مجهول، ولادة متعسرة.
- عند اشتباه داء الكلب أو الجمرة الخبيثة أو الحمى القلاعية أو إنفلونزا الطيور أو نيوكاسل أو المالطية، املأ notifiable_suspect وانصح بعدم اللمس دون وقاية وعدم تحريك الحيوان وعدم فتح الجثة.
- إن لم تكن الصورة كافية أو لا تظهر آفة، قل ذلك صراحة في image_quality_note واطلب لقطات إضافية محددة.
- إن لم يظهر ما يدل على مرض فقل ذلك ولا تخترع تشخيصات.`;

export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { frames = [], species = '', notes = '' } = await req.json();
    if (!Array.isArray(frames) || frames.length > 8) return new Response('Bad Request', { status: 400 });
    const content = frames.map(d => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } }));
    content.push({ type: 'text', text: `النوع: ${species || 'غير محدد'}\nوصف المربي: ${String(notes).slice(0, 1500) || 'لا يوجد'}` });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 1800, system: SYSTEM, messages: [{ role: 'user', content }] })
    });
    if (!r.ok) return new Response('Upstream error', { status: 502 });
    const data = await r.json();
    const text = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    try { return Response.json({ report: JSON.parse(text) }); }
    catch { return new Response('Bad model output', { status: 502 }); }
  }
};
