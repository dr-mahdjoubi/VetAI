#!/usr/bin/env python3
"""VetAI — AI Admin Agents Pipeline (3 agents, daily). Python 3.9+, standard library only.

Agents:  researchers (PubMed + optional RSS)  ->  data/researchers.json
         students    (NCBI Bookshelf + Open Library) -> data/students.json
         breeders    (AI-written awareness articles) -> data/breeders.json
Also:    duplicate check, data/log.json, GitHub step summary, optional e-mail report.

Env:  ANTHROPIC_API_KEY (needed for summaries/articles), ANTHROPIC_MODEL (default below),
      NCBI_API_KEY (optional), RSS_FEEDS (comma separated URLs, optional),
      SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS MAIL_TO (optional e-mail report),
      MAX_PER_AGENT (default 5)
"""
import json, os, re, sys, time, hashlib, difflib, smtplib, datetime as dt
import urllib.request, urllib.parse, xml.etree.ElementTree as ET
from email.message import EmailMessage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data')
MODEL = os.environ.get('ANTHROPIC_MODEL', 'claude-sonnet-5-5')
MAXN = int(os.environ.get('MAX_PER_AGENT', '5'))
CAP = 300                       # items kept per file
UA = {'User-Agent': 'VetAI-AdminAgents/1.0 (+https://github.com)'}

# ---------------------------------------------------------------- utilities
def http(url, data=None, headers=None, timeout=30, retries=3):
    h = dict(UA); h.update(headers or {})
    for i in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:
            if i == retries - 1: raise
            time.sleep(2 * (i + 1))

def load(name, default):
    try:
        with open(os.path.join(DATA, name), encoding='utf-8') as f: return json.load(f)
    except Exception: return default

def save(name, obj):                          # atomic write
    os.makedirs(DATA, exist_ok=True)
    p = os.path.join(DATA, name); tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, p)

norm = lambda s: re.sub(r'\W+', ' ', (s or '').lower()).strip()
def uid(*parts): return hashlib.sha1('|'.join(norm(p) for p in parts if p).encode()).hexdigest()[:16]
def clean(t): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t or '')).strip()

def is_dup(item, existing):
    """Duplicate = same id, same DOI/URL, or near-identical title (>=0.9)."""
    t = norm(item['title'])
    for e in existing:
        if e['id'] == item['id']: return True
        if item.get('doi') and item.get('doi') == e.get('doi'): return True
        if item.get('url') and item.get('url') == e.get('url'): return True
        if difflib.SequenceMatcher(None, t, norm(e['title'])).ratio() >= 0.9: return True
    return False

def llm(system, user, max_tokens=900):
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key: raise RuntimeError('ANTHROPIC_API_KEY missing')
    body = json.dumps({'model': MODEL, 'max_tokens': max_tokens, 'system': system,
                       'messages': [{'role': 'user', 'content': user}]}).encode()
    out = http('https://api.anthropic.com/v1/messages', body,
               {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}, 90)
    return ''.join(b.get('text', '') for b in json.loads(out).get('content', []))

def jparse(txt):
    m = re.search(r'\{.*\}', txt, re.S)
    return json.loads(m.group(0)) if m else {}

SYS = ('أنت محرر علمي بيطري. اكتب بالعربية الفصحى المبسطة بدقة، دون اختلاق معلومات غير موجودة في النص المعطى. '
       'لا تذكر جرعات دوائية. أعد JSON فقط بلا أي نص إضافي.')

def commit_items(fname, items):
    """Insert only non-duplicates (newest first). Returns number inserted."""
    cur = load(fname, []); added = 0
    for it in items:
        if not is_dup(it, cur):
            cur.insert(0, it); added += 1
    save(fname, cur[:CAP]); return added

NOW = lambda: dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# ---------------------------------------------------------------- agent 1: researchers
def agent_researchers():
    key = os.environ.get('NCBI_API_KEY', '')
    q = '("veterinary medicine"[MeSH Terms] OR veterinary[Title/Abstract]) AND hasabstract'
    base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
    kp = ('&api_key=' + key) if key else ''
    ids = json.loads(http(base + 'esearch.fcgi?db=pubmed&retmode=json&retmax=40&sort=date&datetype=edat&reldate=4&term='
                          + urllib.parse.quote(q) + kp))['esearchresult']['idlist']
    cands = []
    if ids:
        root = ET.fromstring(http(base + 'efetch.fcgi?db=pubmed&retmode=xml&id=' + ','.join(ids) + kp))
        for a in root.iter('PubmedArticle'):
            pmid = a.findtext('.//PMID'); title = clean(''.join(a.find('.//ArticleTitle').itertext()))
            abst = clean(' '.join(''.join(x.itertext()) for x in a.findall('.//Abstract/AbstractText')))
            doi = next((x.text for x in a.findall('.//ArticleId') if x.get('IdType') == 'doi'), None)
            cands.append({'id': 'pmid' + pmid, 'title': title, 'abstract': abst, 'doi': doi,
                          'journal': a.findtext('.//Journal/Title'), 'url': 'https://pubmed.ncbi.nlm.nih.gov/%s/' % pmid,
                          'source': 'PubMed'})
    for feed in filter(None, os.environ.get('RSS_FEEDS', '').split(',')):      # optional RSS sources
        try:
            r = ET.fromstring(http(feed.strip()))
            for it in list(r.iter('item'))[:10]:
                l = it.findtext('link') or ''
                cands.append({'id': uid(l), 'title': clean(it.findtext('title')), 'abstract': clean(it.findtext('description')),
                              'url': l, 'journal': feed, 'source': 'RSS', 'doi': None})
        except Exception as e: print('RSS skip', feed, e)
    existing = load('researchers.json', [])
    fresh = [c for c in cands if not is_dup(c, existing)][:MAXN]
    out = []
    for c in fresh:
        try:
            j = jparse(llm(SYS, 'لخّص هذه الورقة البيطرية في 3 جمل، ثم صنّفها في فئة واحدة من: '
                           'أمراض معدية، أدوية وعلاج، جراحة، تغذية، صحة عامة ووبائيات، أبحاث أخرى. '
                           'أعد {"summary":"...","category":"..."}\nالعنوان: %s\nالملخص: %s' % (c['title'], c['abstract'][:2500])))
            c['summary'] = j.get('summary') or c['abstract'][:300]; c['category'] = j.get('category', 'أبحاث أخرى')
        except Exception as e:
            c['summary'] = c['abstract'][:300]; c['category'] = 'أبحاث أخرى'; print('llm fallback:', e)
        c.update(ai_generated=True, added=NOW()); c.pop('abstract', None); out.append(c)
    return commit_items('researchers.json', out)

# ---------------------------------------------------------------- agent 2: students
TOPICS_STUDENT = ['veterinary clinical pathology', 'veterinary pharmacology', 'veterinary parasitology', 'veterinary microbiology',
                  'animal infectious diseases', 'veterinary anatomy', 'veterinary pathology', 'laboratory diagnosis animals',
                  'ruminant diseases', 'poultry diseases', 'canine feline medicine', 'veterinary epidemiology', 'veterinary surgery']
def agent_students():
    topic = TOPICS_STUDENT[dt.date.today().toordinal() % len(TOPICS_STUDENT)]
    cands = []
    try:                                                         # NCBI Bookshelf (free books/chapters)
        base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
        ids = json.loads(http(base + 'esearch.fcgi?db=books&retmode=json&retmax=15&term=' + urllib.parse.quote(topic)))['esearchresult']['idlist']
        if ids:
            sm = json.loads(http(base + 'esummary.fcgi?db=books&retmode=json&id=' + ','.join(ids)))['result']
            for i in ids:
                r = sm.get(i, {}); t = clean(r.get('title'))
                if t: cands.append({'id': 'nbk' + i, 'title': t, 'doi': None, 'source': 'NCBI Bookshelf',
                                    'url': 'https://www.ncbi.nlm.nih.gov/books/?term=' + urllib.parse.quote(t), 'meta': r.get('pubdate', '')})
    except Exception as e: print('bookshelf skip', e)
    try:                                                         # Open Library
        r = json.loads(http('https://openlibrary.org/search.json?limit=15&fields=key,title,author_name,first_publish_year&q=' + urllib.parse.quote(topic)))
        for d in r.get('docs', []):
            cands.append({'id': 'ol' + d['key'].replace('/', '_'), 'title': clean(d.get('title')), 'doi': None, 'source': 'Open Library',
                          'url': 'https://openlibrary.org' + d['key'], 'meta': '%s %s' % (', '.join(d.get('author_name', [])[:2]), d.get('first_publish_year', ''))})
    except Exception as e: print('openlibrary skip', e)
    existing = load('students.json', [])
    fresh = [c for c in cands if not is_dup(c, existing)][:MAXN]
    out = []
    for c in fresh:
        try:
            j = jparse(llm(SYS, 'لكتاب/مرجع بعنوان "%s" (%s) في موضوع %s: اكتب وصفًا من جملتين لفائدته لطالب الطب البيطري دون اختلاق محتوى غير مؤكد '
                           '(استند للعنوان فقط وصرّح بذلك). أعد {"summary":"...","category":"..."} حيث الفئة من: تشخيص مخبري، أمراض، دوائيات، طفيليات، تشريح وفسيولوجيا، عام.' % (c['title'], c['meta'], topic), 500))
            c['summary'] = j.get('summary', ''); c['category'] = j.get('category', 'عام')
        except Exception as e: c['summary'] = ''; c['category'] = 'عام'; print('llm fallback:', e)
        c.update(topic=topic, ai_generated=True, added=NOW()); out.append(c)
    return commit_items('students.json', out)

# ---------------------------------------------------------------- agent 3: breeders
TOPICS_BREEDER = ['الإسعافات الأولية للكلاب والقطط', 'الوقاية من إسهال العجول', 'التلقيح الدوري للأغنام والماعز', 'الوقاية من أمراض الدواجن بالأمن الحيوي',
                  'التعامل مع ضربة الشمس في الحيوانات صيفًا', 'التغذية السليمة للجراء والقطط الصغيرة', 'علامات الجفاف وكيف تتعامل معها', 'الوقاية من التهاب الضرع',
                  'مكافحة القراد والبراغيث', 'العناية بالحيوانات الحوامل وقت الولادة', 'التسمم الغذائي الشائع في الحيوانات المنزلية', 'تربية الأرانب والوقاية من أمراضها',
                  'العناية بحوافر الخيول والأغنام', 'الانتفاخ في المجترّات والتعامل معه', 'سلامة الحليب واللحم وفترات السحب', 'الأمراض المشتركة بين الإنسان والحيوان وكيف تتجنبها']
def agent_breeders():
    existing = load('breeders.json', [])
    used = {e.get('topic') for e in existing}
    pool = [t for t in TOPICS_BREEDER if t not in used] or TOPICS_BREEDER      # cycle again when all used
    topic = pool[dt.date.today().toordinal() % len(pool)]
    j = jparse(llm(SYS + ' المقال موجّه للمربّي غير المختص: خطوات عملية قصيرة، بلا جرعات أدوية، وفيه فقرة "متى تتصل بالطبيب البيطري".',
                   'اكتب مقالًا توعويًا (200–280 كلمة) عن: %s. أعد {"title":"...","summary":"جملتان","body":"فقرات مفصولة بسطر فارغ","category":"إسعافات|وقاية|تغذية|صحة القطيع"}' % topic, 1500))
    if not j.get('title') or not j.get('body'): raise RuntimeError('empty article')
    item = {'id': uid(topic, dt.date.today().isoformat()), 'title': clean(j['title']), 'summary': clean(j.get('summary')),
            'body': j['body'], 'category': j.get('category', 'وقاية'), 'topic': topic, 'url': None, 'doi': None,
            'source': 'AI', 'ai_generated': True, 'added': NOW()}
    return commit_items('breeders.json', [item])

# ---------------------------------------------------------------- report
def report(res):
    n = lambda k: res[k]['count']
    msg = 'تم اليوم رفع %d من الأبحاث لقسم الباحثين، و%d من المراجع لقسم الطلاب، و%d من الإرشادات لقسم المربين بنجاح.' % (n('researchers'), n('students'), n('breeders'))
    errs = ['%s: %s' % (k, v['error']) for k, v in res.items() if v.get('error')]
    if errs: msg += '\nتنبيهات: ' + ' | '.join(errs)
    log = load('log.json', []); log.insert(0, {'time': NOW(), 'message': msg, 'result': res}); save('log.json', log[:90])
    print(msg)
    s = os.environ.get('GITHUB_STEP_SUMMARY')
    if s:
        with open(s, 'a', encoding='utf-8') as f: f.write('### VetAI Admin Agents\n\n' + msg + '\n')
    if os.environ.get('SMTP_HOST') and os.environ.get('MAIL_TO'):
        try:
            m = EmailMessage(); m['Subject'] = 'VetAI — التقرير اليومي للمشرفين الآليين'
            m['From'] = os.environ.get('SMTP_USER', 'agents@localhost'); m['To'] = os.environ['MAIL_TO']; m.set_content(msg)
            with smtplib.SMTP(os.environ['SMTP_HOST'], int(os.environ.get('SMTP_PORT', '587')), timeout=30) as sm:
                sm.starttls(); sm.login(os.environ['SMTP_USER'], os.environ['SMTP_PASS']); sm.send_message(m)
        except Exception as e: print('mail failed:', e)

def main():
    res = {}
    for name, fn in (('researchers', agent_researchers), ('students', agent_students), ('breeders', agent_breeders)):
        try: res[name] = {'count': fn()}
        except Exception as e: res[name] = {'count': 0, 'error': str(e)[:200]}     # one agent failing never stops the others
    report(res)
    return 0 if any(v['count'] for v in res.values()) or not any(v.get('error') for v in res.values()) else 1

if __name__ == '__main__': sys.exit(main())
