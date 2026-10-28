"""The layout pictures of the layout, verification and delivery cards, rendered from the GDS of each design the site
shows, with that design's own DRC and LVS result.

The physical flow places each kind of shape in its own cell, so the shapes are grouped by the cell that holds them:
  fill     the density fill (the density stage's cells)
  ground   the ground tiles (and cells named for a ground join or frame)
  blocks   the placed blocks (pads, inductors, resistors, transistors) on the three thick top metals
  devices  the transistors' diffusion and gate shapes inside the blocks
  dc       the DC lines
  rf       the RF lines (the CPW conductors) on the three thick top metals
  blocks_below, rf_below  the same cells' shapes on the metals under those three (shields and connections)
A cell of no kind that holds cells (a wrapper) is opened; metal drawn directly in it (patches of a few um) goes with the
ground. Every metal of the technology (its technology_facts.json) is drawn; the thick top metals are the three with
the highest order that carry shapes. Each group is one alpha mask (PNG, white with the coverage in alpha), all the
same size; the page paints each with a theme color, so the picture follows light and dark.

The design goes in only with a clean DRC and LVS: the latest report of each in its verify folder must show 0 DRC
results and an overall CORRECT. Cell, layer, tool and circuit names are only read here: layouts.json carries, per
design, a neutral id, the die size in um, the mask files, the pixels each mask covers and the DRC and LVS result.

usage: python -I scripts/export-layout.py <id> <gds> <technology_facts.json> <verify folder>
  writes public/assets/layout/<id>/<group>.png and the <id> entry of src/content/story/layouts.json
"""
import json
import os
import re
import sys

import gdstk
import numpy as np
from PIL import Image, ImageDraw

WIDTH, OVERSAMPLE = 1200, 3
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
if len(sys.argv) != 5 or not re.fullmatch(r"[a-z]", sys.argv[1]):
    raise SystemExit("usage: python -I scripts/export-layout.py <id a-z> <gds> <technology_facts.json> <verify folder>")
design, gds, facts_path, verify = sys.argv[1:]


def latest_report(kind):
    runs = sorted(n for n in os.listdir(os.path.join(verify, kind)) if re.match(r"\d{8}T", n))
    if not runs:
        raise SystemExit("no %s run in the verify folder" % kind)
    return open(os.path.join(verify, kind, runs[-1], "report.txt")).read()


drc = re.search(r"^TOTAL DRC Results Generated:\s+(\d+)", latest_report("drc"), re.M)
lvs = re.search(r"OVERALL COMPARISON RESULTS[\s\S]*?#\s+(CORRECT|INCORRECT)\s+#", latest_report("lvs"))
if not drc or not lvs or int(drc.group(1)) != 0 or lvs.group(1) != "CORRECT":
    raise SystemExit("the design is not DRC and LVS clean: it does not go on the site")
facts = json.load(open(facts_path))["layers"]
lib = gdstk.read_gds(gds)
tops = lib.top_level()
if len(tops) != 1:
    raise SystemExit("expected one top cell, found %d" % len(tops))
top = tops[0]

# The kinds of shape in draw order and the cell of each, by the name the physical flow gives it: the one paint file the
# site and the app read (src/content/layout_paint.json).
PAINT = json.load(open(os.path.join(ROOT, "src", "content", "layout_paint.json")))["kinds"]
KIND = [(k["kind"], k["cells"]) for k in PAINT if "cells" in k]
DRAWN = {"drawing", "vdd", "e1", "e2", "fill", "cfill"}


def streams(functions):
    return {(s["gds_layer"], s["gds_datatype"]) for L in facts.values() if L.get("function") in functions
            for s in L["stream"] if s["valid"] and s["purpose"] in DRAWN}


METAL, DEVICE = streams({"metal"}), {k for k in streams({"diff", "poly"})}
DEVICE = {(l, d) for l, d in DEVICE if any(s["purpose"] == "drawing" and (s["gds_layer"], s["gds_datatype"]) == (l, d)
                                          for L in facts.values() for s in L["stream"])}
ORDER = {(s["gds_layer"], s["gds_datatype"]): L["order"] for L in facts.values() if L.get("function") == "metal" for s in L["stream"]}
groups = {k["kind"]: [] for k in PAINT}
if set(groups) != {"fill", "ground", "blocks_below", "rf_below", "blocks", "devices", "dc", "rf"}:
    raise SystemExit("layout_paint.json names other kinds than the ones this export draws")
unknown = []


def add(kind, polys):
    for poly in polys:
        key = (poly.layer, poly.datatype)
        if key in METAL:
            groups[kind].append((ORDER[key], poly.points))
        elif kind == "blocks" and key in DEVICE:
            groups["devices"].append((0, poly.points))


def walk(refs):
    for ref in refs:
        kind = next((k for k, pattern in KIND if re.search(pattern, ref.cell.name)), None)
        if kind is not None:
            add(kind, ref.get_polygons(depth=None))
        elif ref.cell.references:
            # a wrapper: open it (placed as it is, so its cells keep their coordinates), its own metal with the ground
            if tuple(ref.origin) != (0, 0) or ref.rotation or ref.x_reflection or ref.magnification != 1 or ref.repetition.size > 1:
                raise SystemExit("a wrapper cell is moved or repeated: the walk would misplace its cells")
            walk(ref.cell.references)
            add("ground", ref.get_polygons(depth=0))
        else:
            unknown.append(ref.cell.name)


walk(top.references)
# Cells the flow does not name (the die outline) carry no metal the cards show.
if any(any((p.layer, p.datatype) in METAL for p in lib[name].get_polygons(depth=None)) for name in set(unknown) if lib[name]):
    raise SystemExit("an unnamed cell carries metal: the kinds above miss a stage")
# The three thick top metals: the highest orders the placed shapes use.
thick = sorted({order for name in ("blocks", "rf", "ground") for order, _ in groups[name]})[-3:]
for name in ("blocks", "rf"):
    groups[name + "_below"] = [(o, p) for o, p in groups[name] if o not in thick]
    groups[name] = [(o, p) for o, p in groups[name] if o in thick]
empty = [name for name, polys in groups.items() if not polys]
if empty:
    raise SystemExit("no shapes for %s" % ", ".join(empty))

(x0, y0), (x1, y1) = top.bounding_box()
scale = WIDTH * OVERSAMPLE / (x1 - x0)
size = (WIDTH * OVERSAMPLE, int(round((y1 - y0) * scale)))
height = int(round(size[1] / OVERSAMPLE))
out_dir = os.path.join(ROOT, "public", "assets", "layout", design)
os.makedirs(out_dir, exist_ok=True)
files, covered = {}, {}
for name, polys in groups.items():
    image = Image.new("L", size, 0)
    draw = ImageDraw.Draw(image)
    for _, points in polys:
        pts = (points - (x0, y1)) * (scale, -scale)
        if len(pts) == 4 and len(np.unique(pts[:, 0].round(3))) == 2 and len(np.unique(pts[:, 1].round(3))) == 2:
            (a, b), (c, d) = pts.min(0), pts.max(0)
            draw.rectangle([a, b, c, d], fill=255)
        else:
            draw.polygon([tuple(p) for p in pts], fill=255)
    alpha = image.resize((WIDTH, height), Image.LANCZOS)
    path = os.path.join(out_dir, name + ".png")
    Image.merge("LA", (Image.new("L", alpha.size, 255), alpha)).save(path, optimize=True)
    files[name] = "/assets/layout/%s/%s.png" % (design, name)
    # The pixels each mask covers, as the PNG holds them: the static test recounts them, so a stale mask fails.
    covered[name] = int(np.count_nonzero(np.asarray(Image.open(path).getchannel("A"))))
    print("%-8s %8d shapes  %7d bytes" % (name, len(polys), os.path.getsize(path)))

entry = {"id": design, "die_um": [round(x1 - x0, 1), round(y1 - y0, 1)], "pixels": [WIDTH, height], "files": files,
         "covered_pixels": covered, "drc_results": 0, "lvs": "correct"}
store = os.path.join(ROOT, "src", "content", "story", "layouts.json")
record = json.load(open(store)) if os.path.exists(store) else {}
record["what"] = "Layouts rendered from their GDS, one alpha mask per kind of shape, each with its DRC and LVS result"
record["designs"] = sorted([d for d in record.get("designs", []) if d["id"] != design] + [entry], key=lambda d: d["id"])
open(store, "w").write(json.dumps(record) + "\n")
print(json.dumps(entry))
