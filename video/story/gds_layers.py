# Draws a delivered chip GDS top-down into PNG layers for the 2D story film, in the same layout.json schema as
# layout_layers.mjs (which reads a viewer scene):
#   run_python_in_pyg_env.sh -I story/gds_layers.py --gds <chip.gds> --top <cell> --colours <layout.json> --out <folder>
#     [--members <essentials record.json>] [--ppu 5]
# The GDS is only read. Stages come from the flow's cell names under the top cell: blk_* are the essentials (one block
# each), conductor_* the interconnect, routes_dc_lines the DC lines, gnd_tiling and C1_FET_GND_* the ground tiling and
# *FILL* the density fill. Only metal layers are drawn; vias and markers stay out. Layer colours and heights come from
# an earlier layout.json (--colours), so both exporters paint the same stack. The members (each block's devices and
# coils, for the block view) come from the essentials record; each must lie inside its block as the GDS places it.
# Each coil member (cell pix_* or *ind*) also gets its drawn shape: its block's metal polygons inside its box, by layer.
import argparse, hashlib, json, os, re
import gdstk
from PIL import Image, ImageDraw

LAYERS = {2: 'RX', 7: 'PC', 15: 'M1', 17: 'M2', 187: 'C1', 197: 'C2', 140: 'C3', 41: 'C4', 141: 'C5', 4349: 'JA', 139: 'QA', 39: 'QB', 69: 'LB'}
DATATYPES = {0, 58, 235, 236}  # drawn, fill and the two double-pattern colours

ap = argparse.ArgumentParser()
for name in ('gds', 'top', 'colours', 'out'): ap.add_argument(f'--{name}', required=True)
ap.add_argument('--ppu', type=float, default=5)
ap.add_argument('--members')
a = ap.parse_args()

stack = {l['name']: l for l in json.load(open(a.colours))['layers']}
metals = sorted((n for n in LAYERS.values() if n in stack), key=lambda n: stack[n]['z_um'])
z = {n: i for i, n in enumerate(metals)}
lib = gdstk.read_gds(a.gds)
top = next(c for c in lib.cells if c.name == a.top)
die = [round(v, 3) for p in top.bounding_box() for v in p]


def stage_of(name):
    if name.startswith('blk_'): return 'essentials'
    if name.startswith('conductor_'): return 'interconnect'
    if name == 'routes_dc_lines': return 'dc_lines'
    if name == 'gnd_tiling' or name.startswith('C1_FET_GND'): return 'gnd_tiling'
    if 'FILL' in name: return 'density'
    return None


groups, blocks, placed = {}, [], {}
def add(key, layer, points): groups.setdefault(key, {}).setdefault(layer, []).append(points)
def take(polygons, stage, block=None):
    for p in polygons:
        layer = LAYERS.get(p.layer)
        if layer not in z or p.datatype not in DATATYPES: continue
        add(f'stage_{stage}', layer, p.points); add(f'layer_{layer}', layer, p.points)
        if block: add(f'block_{block}', layer, p.points)


def walk(cell):
    for r in cell.references:
        name = r.cell.name
        stage = stage_of(name)
        if stage is None and r.cell.references: walk(r.cell); continue  # a wrapper cell, such as the chip without its fill
        if stage is None: continue
        block = name[4:].split('__')[0] if stage == 'essentials' else None
        if block: blocks.append({'name': block, 'box': [round(v, 3) for p in r.bounding_box() for v in p]})
        polygons = r.get_polygons(depth=None)
        if block: placed[block] = polygons
        take(polygons, stage, block)
    take(cell.polygons, 'interconnect')  # the top cell's own joins between lines and pads
walk(top)

os.makedirs(f'{a.out}/layout', exist_ok=True)
ppu, (x0, y0, x1, y1) = a.ppu, die
width, height = round((x1 - x0) * ppu), round((y1 - y0) * ppu)
files = {}
for key, by_layer in groups.items():
    image = Image.new('RGBA', (width, height)); draw = ImageDraw.Draw(image)
    count = 0
    for layer in sorted(by_layer, key=lambda n: z[n]):  # lower metals first, as seen from above
        colour = stack[layer]['color']
        for pts in by_layer[layer]:
            xy = [((x - x0) * ppu, (y1 - y) * ppu) for x, y in pts]
            draw.polygon(xy, fill=colour)
            count += 1
    image.save(f'{a.out}/layout/{key}.png', optimize=True)
    files[key] = {'file': f'layout/{key}.png', 'polygons': count}
    print(f'{key}: {count} polygons', flush=True)

members, shapes = [], {}
if a.members:
    boxes = {b['name']: b['box'] for b in blocks}
    for m in json.load(open(a.members))['geometry']:
        b, box = boxes[m['block']], [round(v, 3) for v in m['bbox']]
        if not (box[0] >= b[0] - .01 and box[1] >= b[1] - .01 and box[2] <= b[2] + .01 and box[3] <= b[3] + .01):
            raise SystemExit(f'{m["block"]}/{m["member"]} {box} lies outside its block {b}: the record is for another chip')
        members.append({'block': m['block'], 'member': m['member'], 'cell': m['cell'], 'box': box})
        if re.search(r'^pix_|ind', m['cell'], re.I):
            layers = {}
            for p in placed[m['block']]:
                (px0, py0), (px1, py1) = p.bounding_box()
                if LAYERS.get(p.layer) in z and p.datatype in DATATYPES and px0 >= box[0] - .01 and py0 >= box[1] - .01 and px1 <= box[2] + .01 and py1 <= box[3] + .01:
                    layers.setdefault(LAYERS[p.layer], []).append([[round(x, 3), round(y, 3)] for x, y in p.points])
            shapes[m['member']] = {'bbox': box, 'layers': layers}

order = ['essentials', 'interconnect', 'dc_lines', 'gnd_tiling', 'density']
json.dump({
    'title': a.top, 'die': die, 'ppu': ppu, 'width': width, 'height': height, 'files': files,
    'stages': [s for s in order if f'stage_{s}' in files],
    'layers': [{k: stack[n][k] for k in ('name', 'color', 'z_um', 'thickness_um')} for n in metals],
    'blocks': blocks, 'members': members, 'shapes': shapes,
    'source': {'gds': os.path.abspath(a.gds), 'gds_sha256': hashlib.sha256(open(a.gds, 'rb').read()).hexdigest(), 'top': a.top,
               **({'members': os.path.abspath(a.members), 'members_sha256': hashlib.sha256(open(a.members, 'rb').read()).hexdigest()} if a.members else {})},
}, open(f'{a.out}/layout.json', 'w'), indent=1)
print(f'{len(files)} images, {width}x{height} px -> {a.out}')
