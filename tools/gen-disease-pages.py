#!/usr/bin/env python3
"""Generate one static, indexable page per unique disease (Batch F, item 41).

Source of truth: json/diseases/*.json (600 entries across 6 species files).
Dedup: same rule as tools/gen-disease-counts.py — distinct Arabic names
(field "n"). When a name appears in more than one species file, the FIRST
occurrence wins (files in sorted order, entries in file order); the other
occurrences' differing text is NOT merged — merging would need editorial
decisions about which species-specific wording survives. 46 names appear in
more than one file with differing content; see the generator's stdout.

Slug scheme (deterministic, collision-free): URL-safe ASCII slug of the
entry's existing English name (field "e", present on all 540 unique
entries): lowercase, diacritics stripped, runs of non-alphanumerics become
a single hyphen. Collisions (21 slug values collide, e.g. "rabies" from
different Arabic names) resolve by appending -2, -3, ... in encounter
order. Slugs are stable as long as the English names and file order are
unchanged; a name added later never renumbers existing slugs (it takes the
next free suffix). If an entry ever lacks "e", the fallback slug is
"disease-<first 8 hex of sha1(name)>".

Output: diseases/<slug>.html (540 flat pages; flat form required: the GitHub web-UI upload route cannot preserve nested folders) + diseases/manifest.json
(slug -> name mapping, for traceability). Each page renders ONLY fields
present in its JSON entry — no invented medical text. Field labels reuse
the site's own article-section vocabulary. The z/u flag fields in the JSON
are NOT rendered: their meaning is not documented anywhere in the repo.

The script also appends the new URLs to sitemap.xml (text-based append
before </urlset>, idempotent; the pre-existing entries are left
byte-identical) and is fully deterministic: no timestamps are written into
pages, so running it twice produces identical output.

Usage (from the repository root):

    python3 tools/gen-disease-pages.py
"""

import hashlib
import html
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DISEASES_DIR = ROOT / "json" / "diseases"
OUT_DIR = ROOT / "diseases"
SITEMAP = ROOT / "sitemap.xml"
BASE = "https://drvet.onrender.com"
LASTMOD = "2026-11-13"  # matches the lastmod already used in sitemap.xml
SECTIONS = ["atlas", "ai-suite", "research", "showreel"]

# Site's own article-section labels (index.html AS array + gen-articles FIELDS).
LABELS = [
    ("c", "التصنيف"),
    ("a", "الأسباب والمسبب"),
    ("s", "الأعراض"),
    ("d", "التشخيص والتحاليل"),
    ("t", "العلاج (مبادئ عامة)"),
    ("p", "الوقاية والمكافحة"),
]
DISCLAIMER = "المحتوى تعليمي ولا يغني عن الفحص السريري للطبيب البيطري."


def slugify(english_name: str, arabic_name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", english_name).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")
    if not slug:
        slug = "disease-" + hashlib.sha1(arabic_name.encode("utf-8")).hexdigest()[:8]
    return slug


def collect():
    """Return (ordered unique entries, duplicate-name report)."""
    first = {}
    order = []
    seen_variants = {}
    for path in sorted(DISEASES_DIR.glob("*.json")):
        if path.name == "counts.json":
            continue
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        for entry in data:
            name = entry.get("n")
            if not name:
                continue
            seen_variants.setdefault(name, []).append(entry)
            if name not in first:
                first[name] = (entry, path.name)
                order.append(name)
    differing = sum(
        1
        for variants in seen_variants.values()
        if len(variants) > 1
        and len({json.dumps(v, sort_keys=True, ensure_ascii=False) for v in variants}) > 1
    )
    return [(first[name][0], first[name][1]) for name in order], len(seen_variants), differing


def assign_slugs(entries):
    used = {}
    result = []
    collisions = 0
    for entry, source in entries:
        base = slugify(entry.get("e") or "", entry["n"])
        slug = base
        n = 2
        while slug in used:
            slug = f"{base}-{n}"
            n += 1
        if slug != base:
            collisions += 1
        used[slug] = entry["n"]
        result.append((slug, entry, source))
    return result, collisions


def render_page(slug: str, entry: dict) -> str:
    name = entry["n"]
    english = entry.get("e") or ""
    esc = html.escape
    description = f"صفحة مرجعية: {name}" + (f" ({english})" if english else "") + " — VetAI Global"
    canonical = f"{BASE}/diseases/{slug}.html"

    sections = []
    for key, label in LABELS:
        value = entry.get(key)
        if value:
            sections.append(f"<section><h2>{esc(label)}</h2><p>{esc(str(value))}</p></section>")
    sections_html = "\n".join(sections)
    english_html = f'\n<p class="en" dir="ltr" lang="en">{esc(english)}</p>' if english else ""

    ld = {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "@id": canonical + "#medicalwebpage",
        "url": canonical,
        "name": name,
        "description": description,
        "inLanguage": "ar",
        "about": {"@type": "MedicalCondition", "name": name, **({"alternateName": english} if english else {})},
    }
    ld_json = json.dumps(ld, ensure_ascii=False, indent=2)

    # Palette + font stack copied from index.html (body vars, line 76; body
    # font stack). No new visual identity; no local CSS dependency.
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(name)} | VetAI Global</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(name)} | VetAI Global">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{canonical}">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
body{{--bg:#05070b;--bg2:#0a0f19;--fg:#eef3f8;--mut:#8b99ad;--bd:rgba(255,255,255,.09);--a1:#5eead4;margin:0;background:var(--bg);color:var(--fg);font-family:'IBM Plex Sans Arabic','Cairo','Inter',system-ui,sans-serif;line-height:1.85}}
.w{{max-width:760px;margin:0 auto;padding:24px 18px 48px}}
a{{color:var(--a1)}}
.top{{margin-bottom:20px}}
h1{{font-size:28px;line-height:1.4;margin:0 0 4px}}
.en{{color:var(--mut);margin:0 0 20px}}
section{{background:var(--bg2);border:1px solid var(--bd);border-radius:16px;padding:16px 18px;margin:14px 0}}
h2{{font-size:18px;margin:0 0 6px;color:var(--a1)}}
p{{margin:0}}
footer{{margin-top:28px;padding-top:16px;border-top:1px solid var(--bd);color:var(--mut);font-size:13px}}
</style>
<script type="application/ld+json">
{ld_json}
</script>
</head>
<body>
<div class="w">
<p class="top"><a href="../#diseases">← العودة إلى فهرس الأمراض — VetAI Global</a></p>
<h1>{esc(name)}</h1>{english_html}
{sections_html}
<footer>{esc(DISCLAIMER)} <a href="../">VetAI Global</a></footer>
</div>
</body>
</html>
"""


def update_sitemap(urls):
    """Append missing <url> entries before </urlset>; existing bytes untouched."""
    text = SITEMAP.read_text(encoding="utf-8")
    present = set(re.findall(r"<loc>([^<]+)</loc>", text))
    additions = [u for u in urls if u[0] not in present]
    if not additions:
        return 0
    blocks = []
    for loc, priority, changefreq in additions:
        blocks.append(
            f"  <url>\n    <loc>{loc}</loc>\n    <lastmod>{LASTMOD}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n    <priority>{priority}</priority>\n  </url>"
        )
    if "</urlset>" not in text:
        raise SystemExit("sitemap.xml has no </urlset>; refusing to edit")
    new_text = text.replace("</urlset>", "\n".join(blocks) + "\n</urlset>", 1)
    ET.fromstring(new_text)  # validate before writing
    SITEMAP.write_text(new_text, encoding="utf-8")
    return len(additions)


def main() -> int:
    entries, unique_count, differing = collect()
    slugged, collisions = assign_slugs(entries)
    OUT_DIR.mkdir(exist_ok=True)
    manifest = {}
    for slug, entry, source in slugged:
        (OUT_DIR / f"{slug}.html").write_text(render_page(slug, entry), encoding="utf-8")
        manifest[slug] = {"n": entry["n"], "e": entry.get("e") or "", "source": source}
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    urls = [(f"{BASE}/{s}/", "0.8", "monthly") for s in SECTIONS]
    urls += [(f"{BASE}/diseases/{slug}.html", "0.6", "monthly") for slug, _, _ in sorted(slugged)]
    added = update_sitemap(urls)
    print(f"diseases: {unique_count} unique names, {len(slugged)} pages, "
          f"{collisions} slug collisions resolved with -N suffixes, "
          f"{differing} duplicate names with differing content (first occurrence kept)")
    print(f"sitemap: {added} new URLs appended ({len(urls)} candidate URLs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
