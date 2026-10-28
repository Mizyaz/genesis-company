"""The layout picture of the layout, verification and delivery cards, rendered from the GDS of one physical-flow chain
(its density stage's export: the layout DRC and LVS ran on).

The physical flow places each kind of shape in its own cell under the top cell, so the shapes are grouped by the cell
that holds them:
  fill     the density fill (the density stage's cells)
  ground   the ground tiles
  blocks   the placed blocks (pads, inductors, resistors, transistors) on the three thick top metals
  devices  the transistors' diffusion and gate shapes inside the blocks
  dc       the DC lines
  rf       the RF lines (the CPW conductors) on the three thick top metals
  blocks_below, rf_below  the same cells' shapes on the metals under those three (shields and connections)
Every metal of the technology (technology_facts.json of the chain) is drawn; the thick top metals are the three with the
highest order that carry shapes. The devices group keeps the diffusion and gate drawing shapes. Each group is one alpha mask (PNG, white with the coverage in alpha), all the same size; the page
paints each with a theme color, so the picture follows light and dark. Cell, layer and tool names are only read here:
layout.json carries the group names above, the die size in um and the mask files.

usage: python -I scripts/export-layout.py <chain folder>
  writes public/assets/layout/<group>.png and src/content/story/layout.json
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
chain = sys.argv[1]
facts = json.load(open(os.path.join(chain, "essentials", "technology_facts.json")))["layers"]
lib = gdstk.read_gds(os.path.join(chain, "density", "cell_gate", "export", "assembly.gds"))
tops = lib.top_level()
if len(tops) != 1:
    raise SystemExit("expected one top cell, found %d" % len(tops))
top = tops[0]

# The cell of each kind of shape, by the name the physical flow gives it.
KIND = [("fill", r"^(density|BEOL|FEOL|FET)"), ("ground", r"^gnd"), ("blocks", r"^blk"), ("dc", r"^routes"), ("rf", r"^conductor")]
DRAWN = {"drawing", "vdd", "e1", "e2", "fill", "cfill"}


def streams(functions):
    return {(s["gds_layer"], s["gds_datatype"]) for L in facts.values() if L.get("function") in functions
            for s in L["stream"] if s["valid"] and s["purpose"] in DRAWN}


METAL, DEVICE = streams({"metal"}), {k for k in streams({"diff", "poly"})}
DEVICE = {(l, d) for l, d in DEVICE if any(s["purpose"] == "drawing" and (s["gds_layer"], s["gds_datatype"]) == (l, d)
                                          for L in facts.values() for s in L["stream"])}
ORDER = {(s["gds_layer"], s["gds_datatype"]): L["order"] for L in facts.values() if L.get("function") == "metal" for s in L["stream"]}
groups = {name: [] for name in ("fill", "ground", "blocks_below", "rf_below", "blocks", "devices", "dc", "rf")}
unknown = []
for ref in top.references:
    kind = next((k for k, pattern in KIND if re.match(pattern, ref.cell.name)), None)
    if kind is None:
        unknown.append(ref.cell.name)
        continue
    for poly in ref.get_polygons(depth=None):
        key = (poly.layer, poly.datatype)
        if key in METAL:
            groups[kind].append((ORDER[key], poly.points))
        elif kind == "blocks" and key in DEVICE:
            groups["devices"].append((0, poly.points))
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
out_dir = os.path.join(ROOT, "public", "assets", "layout")
os.makedirs(out_dir, exist_ok=True)
files = {}
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
    files[name] = "/assets/layout/%s.png" % name
    print("%-8s %8d shapes  %7d bytes" % (name, len(polys), os.path.getsize(path)))

record = {"what": "The switch's layout rendered from its GDS, one alpha mask per kind of shape",
          "die_um": [round(x1 - x0, 1), round(y1 - y0, 1)], "pixels": [WIDTH, height], "files": files}
open(os.path.join(ROOT, "src", "content", "story", "layout.json"), "w").write(json.dumps(record) + "\n")
print(json.dumps(record))
