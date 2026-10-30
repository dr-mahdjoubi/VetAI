#!/usr/bin/env python3
"""
split-library.py — يحوّل json/resources.json (مصدر الحقيقة الذي يحدّثه البوت)
إلى بنية معيارية مجزّأة حسب التصنيف في data/library/ :

  data/library/manifest.json      فهرس خفيف: النسخة + الأعداد + خريطة الملفات
  data/library/search.json        فهرس بحث مضغوط (عنوان/رابط/تصنيف/لغة/وصف قصير)
  data/library/cat-<slug>-<n>.json  مقاطع التصنيف الواحد (96 عنصرًا لكل مقطع، بالوصف الكامل)

لا يعدّل هذا السكربت resources.json أبدًا. التصنيفات تُشتق آليًا من العنوان
والوصف بقواعد كلمات مفتاحية (أول تطابق يفوز)، ويمكن تجاوز أي عنصر يدويًا
بملف اختياري tools/library-overrides.json بالشكل {"<url>": "<slug>"}.
"""
import json, re, sys, hashlib, unicodedata
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')
SRC = ROOT / 'json' / 'resources.json'
OUT = ROOT / 'data' / 'library'
OVERRIDES = ROOT / 'tools' / 'library-overrides.json'
CHUNK = 96

# (slug, الاسم العربي, كلمات مفتاحية) — الترتيب مهم: أول تطابق يفوز
TAXONOMY = [
    ('exams', 'اختبارات وبنوك أسئلة', ['mcq', 'question bank', 'أسئلة', 'اختبار', 'امتحان', 'بنك أسئلة', 'qcm', 'concours']),
    ('surgery', 'الجراحة والتخدير', ['surgery', 'surgical', 'جراحة', 'تخدير', 'anaesthesia', 'anesthesia', 'orthop', 'chirurgie']),
    ('imaging', 'التصوير والأشعة', ['radiology', 'ultrasound', 'imaging', 'أشعة', 'تصوير', 'موجات', 'échographie', 'radiographie']),
    ('reproduction', 'التناسل والولادة', ['reproduction', 'obstetrics', 'fertility', 'تناسل', 'ولادة', 'تلقيح', 'gynaecology', 'gynecology', 'insémination']),
    ('pharmacology', 'الأدوية والسموم', ['pharmacology', 'drug', 'toxicolog', 'أدوية', 'دواء', 'سموم', 'pharmacie', 'pharmacologie', 'médicament']),
    ('pathology', 'المختبر والتشريح المرضي', ['pathology', 'laboratory', 'clinical pathology', 'مختبر', 'تشريح', 'necropsy', 'histolog', 'pathologie', 'anatomie', 'laboratoire']),
    ('microbiology', 'الأحياء الدقيقة والطفيليات', ['microbiology', 'parasitolog', 'virology', 'bacteri', 'ميكروبيولوج', 'طفيليات', 'فيروس', 'microbiologie', 'parasitologie']),
    ('nutrition', 'التغذية والأعلاف', ['nutrition', 'feed', 'تغذية', 'أعلاف', 'علف', 'alimentation', 'aliment', 'ration']),
    ('poultry', 'الدواجن والطيور', ['poultry', 'avian', 'دواجن', 'طيور', 'poulet', 'volaille', 'aviculture']),
    ('equine', 'الخيول', ['equine', 'horse', 'خيول', 'خيل', 'cheval', 'équin']),
    ('livestock', 'الماشية والإنتاج الحيواني', ['cattle', 'livestock', 'dairy', 'bovine', 'ماشية', 'أبقار', 'إنتاج حيواني', 'bovin', 'ruminant', 'élevage']),
    ('public-health', 'الصحة العامة والأمراض المشتركة', ['zoonos', 'epidemiolog', 'public health', 'صحة عامة', 'مشتركة', 'وبائيات', 'one health', 'épidémiologie', 'zoonose', 'santé publique']),
    ('pets', 'الحيوانات الأليفة', ['cat', 'dog', 'pet', 'small animal', 'قطط', 'كلاب', 'أليفة', 'feline', 'canine', 'chien']),
    ('research', 'أبحاث ورسائل جامعية', ['thèse', 'mémoire', 'dissertation', 'research', 'رسالة', 'أطروحة']),
]
GENERAL = ('general', 'عام ومتعدد التخصصات')

def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.lower()

def lang_of(it):
    d = it.get('desc') or ''
    if 'بالفرنسية' in d: return 'fr'
    if 'بالإنجليزية' in d: return 'en'
    if 'بالعربية' in d: return 'ar'
    t = norm(it.get('title'))
    if re.search(r'[\u0600-\u06FF]', it.get('title') or ''): return 'ar'
    return ''

def categorize(it, overrides):
    if it.get('url') in overrides: return overrides[it['url']]
    hay = norm((it.get('title') or '') + ' ' + (it.get('desc') or ''))
    for slug, _ar, kws in TAXONOMY:
        if any(norm(k) in hay for k in kws): return slug
    return GENERAL[0]

def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    books = data.get('books', [])
    overrides = {}
    if OVERRIDES.exists():
        overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))
    version = hashlib.sha256(SRC.read_bytes()).hexdigest()[:12]
    names = {s: ar for s, ar, _ in TAXONOMY}; names[GENERAL[0]] = GENERAL[1]
    by_cat = {}
    search = []
    for i, b in enumerate(books):
        cat = categorize(b, overrides)
        item = {'id': i, 'title': b.get('title', ''), 'url': b.get('url', ''),
                'desc': b.get('desc', ''), 'cat': cat, 'lang': lang_of(b),
                'bulk': 'الكتالوج الموسّع' in (b.get('desc') or '')}
        by_cat.setdefault(cat, []).append(item)
        search.append({'i': i, 't': item['title'], 'u': item['url'],
                       'c': cat, 'l': item['lang']})
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('cat-*.json'): old.unlink()
    cats_meta = []
    for slug in [s for s, _, _ in TAXONOMY] + [GENERAL[0]]:
        items = by_cat.get(slug, [])
        if not items: continue
        files = []
        for n in range(0, len(items), CHUNK):
            fn = f'cat-{slug}-{n // CHUNK + 1}.json'
            (OUT / fn).write_text(json.dumps({'cat': slug, 'items': items[n:n + CHUNK]},
                                             ensure_ascii=False), encoding='utf-8')
            files.append(fn)
        cats_meta.append({'slug': slug, 'name': names[slug],
                          'count': len(items), 'files': files})
    manifest = {'version': version, 'total': len(books),
                'chunkSize': CHUNK, 'categories': cats_meta,
                'extras': {'journals': data.get('journals', []),
                           'communities': data.get('communities', [])}}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
    (OUT / 'search.json').write_text(json.dumps(search, ensure_ascii=False), encoding='utf-8')
    print(f"OK: {len(books)} books -> {len(cats_meta)} categories, version {version}")

if __name__ == '__main__':
    main()
