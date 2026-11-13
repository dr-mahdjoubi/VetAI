#!/usr/bin/env python3
"""Generate json/diseases/counts.json by COUNTING the disease data files.

Regeneration note (Batch B, audit items 12): re-run this script from the
repository root whenever a file under json/diseases/ changes, and commit the
regenerated json/diseases/counts.json alongside it:

    python3 tools/gen-disease-counts.py

The script reads every species file and counts its entries — no number in the
output is hand-written. The page script js/vetai-counts.js fetches
json/diseases/counts.json and sums the per-file counts for the stats strip.
`unique_names` counts distinct Arabic names (field "n") across all files and
is documentation only; the displayed diseases figure is the entry total.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DISEASES_DIR = ROOT / "json" / "diseases"
OUTPUT = DISEASES_DIR / "counts.json"


def main() -> int:
    files = {}
    names = set()
    for path in sorted(DISEASES_DIR.glob("*.json")):
        if path.name == OUTPUT.name:
            continue  # never count the generated file itself
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, list):
            print(f"SKIP {path.name}: not a list", file=sys.stderr)
            continue
        files[path.name] = len(data)
        for entry in data:
            if isinstance(entry, dict) and entry.get("n"):
                names.add(entry["n"])
    payload = {
        "files": files,
        "total": sum(files.values()),
        "unique_names": len(names),
        "generated_by": "tools/gen-disease-counts.py (counts entries in json/diseases/*.json; re-run after any data change)",
    }
    with open(OUTPUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"wrote {OUTPUT.relative_to(ROOT)}: {payload['total']} entries "
          f"in {len(files)} files, {payload['unique_names']} unique names")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
