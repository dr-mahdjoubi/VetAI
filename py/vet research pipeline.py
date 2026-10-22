#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
vet_research_pipeline.py
------------------------
1) يجلب أحدث الأبحاث البيطرية من مصادر RSS.
2) يرسلها إلى OpenAI لاستخراج: العنوان، الملخص العلمي، التطبيق العملي للأطباء، مستوى المربين.
3) يُخرج JSON جاهزًا لقاعدة MySQL (واختياريًا يدرجه مباشرة في جدول articles).

التثبيت:
    pip install feedparser openai requests mysql-connector-python

التشغيل:
    export OPENAI_API_KEY="sk-..."
    python vet_research_pipeline.py --limit 10 --out articles.json
    python vet_research_pipeline.py --limit 10 --insert      # إدراج مباشر في MySQL
    python vet_research_pipeline.py --print-schema           # طباعة SQL إنشاء الجدول
"""

import argparse
import hashlib
import html
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone

import feedparser
import requests
from openai import OpenAI

# ----------------------------------------------------------------------------
# الإعدادات
# ----------------------------------------------------------------------------
# مصادر RSS بيطرية مفتوحة. عدّلها أو أضف مصادرك (PubMed يمكنه توليد RSS لأي استعلام بحث).
FEEDS = [
    {"name": "Frontiers in Veterinary Science", "url": "https://www.frontiersin.org/journals/veterinary-science/rss"},
    {"name": "BMC Veterinary Research", "url": "https://bmcvetres.biomedcentral.com/articles/most-recent/rss.xml"},
    {"name": "Veterinary Research (BMC)", "url": "https://veterinaryresearch.biomedcentral.com/articles/most-recent/rss.xml"},
    {"name": "Acta Veterinaria Scandinavica", "url": "https://actavetscand.biomedcentral.com/articles/most-recent/rss.xml"},
]

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_INPUT_CHARS = 6000          # أقصى طول لنص البحث المُرسل للنموذج
REQUEST_TIMEOUT = 30
OPENAI_RETRIES = 3

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DB", "vetai"),
    "charset": "utf8mb4",
}

# بنية الجدول المقترحة (عدّل الأسماء لتطابق جدول موقعك الفعلي)
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS articles (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(500)  NOT NULL,
    scientific_summary TEXT        NOT NULL,
    vet_application  TEXT          NOT NULL,
    breeder_level    TEXT          NOT NULL,
    source_name      VARCHAR(255)  NULL,
    source_url       VARCHAR(1000) NOT NULL,
    original_title   VARCHAR(500)  NULL,
    content_hash     CHAR(64)      NOT NULL,
    published_at     DATETIME      NULL,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_content_hash (content_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
""".strip()

SYSTEM_PROMPT = """أنت محرر علمي بيطري متخصص. ستتلقى عنوان بحث ومستخلصه.
أعد كائن JSON واحدًا فقط (بدون أي نص خارجه) بالمفاتيح التالية بالضبط:
- "title": عنوان عربي واضح وجذاب للمقال (لا يتجاوز 120 حرفًا).
- "scientific_summary": ملخص علمي دقيق بالعربية (4-6 جمل) يشمل الهدف والمنهج والنتائج الرئيسية.
- "vet_application": التطبيق العملي للأطباء البيطريين (نقاط مختصرة تفصل بينها أسطر جديدة): التشخيص/العلاج/الوقاية إن وجد.
- "breeder_level": شرح مبسط للمربين والمزارعين بلغة سهلة بلا مصطلحات معقدة، مع نصائح عملية.
- "species": الأنواع الحيوانية المعنية (قائمة نصوص بالعربية، مثل ["أبقار","كلاب"]).
- "is_veterinary": true إذا كان البحث متعلقًا فعلًا بالطب البيطري، وإلا false.
قواعد: لا تخترع أرقامًا أو نتائج غير موجودة في النص. إن كان المستخلص غير كافٍ فاذكر ذلك بإيجاز ولا تخمّن.
اكتب بالعربية الفصحى المبسطة، وأبقِ أسماء الأدوية والمصطلحات اللاتينية بصيغتها الأصلية."""


# ----------------------------------------------------------------------------
# أدوات مساعدة
# ----------------------------------------------------------------------------
log = logging.getLogger("vet-pipeline")


def clean_text(raw: str) -> str:
    """إزالة وسوم HTML والمسافات الزائدة."""
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def to_mysql_datetime(entry) -> str | None:
    """تحويل تاريخ الإدخال إلى صيغة DATETIME في MySQL (UTC)."""
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if not parsed:
        return None
    return datetime(*parsed[:6], tzinfo=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def make_hash(url: str, title: str) -> str:
    return hashlib.sha256(f"{url}|{title}".encode("utf-8")).hexdigest()


def trunc(value: str, n: int) -> str:
    value = (value or "").strip()
    return value if len(value) <= n else value[: n - 1].rstrip() + "…"


# ----------------------------------------------------------------------------
# 1) جلب الأبحاث
# ----------------------------------------------------------------------------
def fetch_entries(feeds, per_feed: int):
    items = []
    for feed in feeds:
        try:
            resp = requests.get(
                feed["url"], timeout=REQUEST_TIMEOUT,
                headers={"User-Agent": "VetAI-Research-Bot/1.0"},
            )
            resp.raise_for_status()
            parsed = feedparser.parse(resp.content)
        except Exception as exc:
            log.warning("تعذّر جلب %s: %s", feed["name"], exc)
            continue

        for entry in parsed.entries[:per_feed]:
            title = clean_text(entry.get("title", ""))
            link = entry.get("link", "").strip()
            abstract = clean_text(
                entry.get("summary", "")
                or (entry.get("content") or [{}])[0].get("value", "")
            )
            if not title or not link:
                continue
            items.append({
                "source_name": feed["name"],
                "original_title": title,
                "source_url": link,
                "abstract": abstract,
                "published_at": to_mysql_datetime(entry),
            })
        log.info("%s: %d عنصرًا", feed["name"], min(len(parsed.entries), per_feed))
    return items


# ----------------------------------------------------------------------------
# 2) التلخيص بالذكاء الاصطناعي
# ----------------------------------------------------------------------------
def summarize(client: OpenAI, item: dict) -> dict | None:
    user_msg = (
        f"Title: {item['original_title']}\n\n"
        f"Abstract/Content: {trunc(item['abstract'], MAX_INPUT_CHARS) or '(لا يوجد مستخلص)'}"
    )
    for attempt in range(1, OPENAI_RETRIES + 1):
        try:
            resp = client.chat.completions.create(
                model=OPENAI_MODEL,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
            )
            data = json.loads(resp.choices[0].message.content)
            required = ("title", "scientific_summary", "vet_application", "breeder_level")
            if not all(isinstance(data.get(k), str) and data[k].strip() for k in required):
                raise ValueError("استجابة ناقصة من النموذج")
            return data
        except Exception as exc:
            log.warning("محاولة %d/%d فشلت (%s): %s",
                        attempt, OPENAI_RETRIES, item["original_title"][:50], exc)
            time.sleep(2 * attempt)
    return None


# ----------------------------------------------------------------------------
# 3) التنسيق لـ MySQL
# ----------------------------------------------------------------------------
def to_mysql_row(item: dict, ai: dict) -> dict:
    """صف جاهز للإدراج: أنواع بسيطة فقط، DATETIME صحيح، وأطوال ضمن حدود الأعمدة."""
    return {
        "title": trunc(ai["title"], 500),
        "scientific_summary": ai["scientific_summary"].strip(),
        "vet_application": ai["vet_application"].strip(),
        "breeder_level": ai["breeder_level"].strip(),
        "source_name": trunc(item["source_name"], 255),
        "source_url": trunc(item["source_url"], 1000),
        "original_title": trunc(item["original_title"], 500),
        "content_hash": make_hash(item["source_url"], item["original_title"]),
        "published_at": item["published_at"],  # 'YYYY-MM-DD HH:MM:SS' أو null
    }


def insert_rows(rows: list[dict]) -> int:
    import mysql.connector  # استيراد متأخر ليبقى اختياريًا

    sql = """
        INSERT INTO articles
            (title, scientific_summary, vet_application, breeder_level,
             source_name, source_url, original_title, content_hash, published_at)
        VALUES
            (%(title)s, %(scientific_summary)s, %(vet_application)s, %(breeder_level)s,
             %(source_name)s, %(source_url)s, %(original_title)s, %(content_hash)s, %(published_at)s)
        ON DUPLICATE KEY UPDATE content_hash = content_hash
    """
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    try:
        cur = conn.cursor()
        cur.execute(SCHEMA_SQL)
        cur.executemany(sql, rows)
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


# ----------------------------------------------------------------------------
# التشغيل
# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="خط معالجة الأبحاث البيطرية")
    ap.add_argument("--limit", type=int, default=10, help="أقصى عدد مقالات إجمالًا")
    ap.add_argument("--per-feed", type=int, default=5, help="عدد العناصر من كل مصدر")
    ap.add_argument("--out", default="articles.json", help="ملف JSON الناتج")
    ap.add_argument("--insert", action="store_true", help="إدراج النتائج في MySQL")
    ap.add_argument("--print-schema", action="store_true", help="طباعة SQL إنشاء الجدول ثم الخروج")
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if args.print_schema:
        print(SCHEMA_SQL)
        return

    if not os.getenv("OPENAI_API_KEY"):
        sys.exit("خطأ: عيّن متغير البيئة OPENAI_API_KEY أولًا.")

    client = OpenAI()
    items = fetch_entries(FEEDS, args.per_feed)

    # إزالة التكرار داخل الدفعة نفسها
    seen, unique = set(), []
    for it in items:
        h = make_hash(it["source_url"], it["original_title"])
        if h not in seen:
            seen.add(h)
            unique.append(it)

    rows = []
    for it in unique[: args.limit]:
        ai = summarize(client, it)
        if not ai:
            continue
        if ai.get("is_veterinary") is False:
            log.info("تخطّي (غير بيطري): %s", it["original_title"][:60])
            continue
        rows.append(to_mysql_row(it, ai))

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    log.info("تم حفظ %d مقالًا في %s", len(rows), args.out)

    if args.insert and rows:
        n = insert_rows(rows)
        log.info("تم إدراج %d صفًا في MySQL (المكرر يُتجاهل)", n)


if __name__ == "__main__":
    main()
