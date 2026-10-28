# The site's physical-flow animation data from one physical-flow chain folder (its stage records), coarsened for drawing:
#   run_python_in_pyg_env.sh -I story/flow_motion.py --chain <chain folder> --out <motion.raw.json>
# Writes the die, each placed member's box by block (essentials), the RF line centrelines and widths (interconnect), the
# DC line boxes by net (dc_lines), the ground tiles with the rank of the metal that colours them (gnd_tiling), the fill
# blocks (density) and the DRC and LVS result of the density stage's verify record. No paths, cell or layer names: the
# tiles keep only a rank among the ground plane's metals, bottom to top. scripts/export-flow-motion.mjs guards and
# publishes the result.
import argparse, json, os, re
import numpy as np

a = argparse.ArgumentParser()
a.add_argument('--chain', required=True)
a.add_argument('--out', required=True)
args = a.parse_args()
read = lambda path: json.load(open(os.path.join(args.chain, path)))
r1 = lambda v: round(float(v), 1)
box = lambda b: [r1(v) for v in b]

essentials, interconnect, dc, gnd = read('essentials/record.json'), read('interconnect/record.json'), read('dc_lines/record.json'), read('gnd_tiling/record.json')
verify = read('density/verify/record.json')
if not (verify['drc_verified'] and verify['lvs_verified']): raise SystemExit('The verify record is not DRC and LVS clean')

blocks = {}
for g in essentials['geometry']:
    blocks.setdefault(g['block'], []).append({'member': g['member'], 'box': box(g['bbox'])})
lines = [{'path': [[r1(x), r1(y)] for x, y in l['path_um']], 'width': r1(l['signal_width_um'])} for l in interconnect['rf_lines']['lines']]
nets = sorted({s['net'] for s in dc['routed_shapes']})
dc_boxes = [box(s['box_um']) + [nets.index(s['net'])] for s in dc['routed_shapes']]

# Ground tiles: the placements (origin, master) from the record's sidecar; a master names its metals and may add its size.
facts = read('essentials/technology_facts.json')['layers']
plane = sorted(gnd['plane']['cells_per_layer'], key=lambda name: facts[name]['order'])
npz = np.load(os.path.join(args.chain, 'gnd_tiling/record.npz'))
manifest = json.loads(bytes(npz['manifest']).decode())
def table(z, prefix):
    return {k.split('.', 1)[1]: z[k] for k in z.files if k.startswith(prefix + '.')}
placements = next(t for t in (table(npz, k) for k in sorted({f.split('.')[0] for f in npz.files if f != 'manifest'})) if 'column5' in t and t['column5'].ndim == 2 and t['column5'].shape[1] == 2 and str(t['column2'][0]).startswith('GTile'))
tiles = []
for master, (x, y) in zip(placements['column2'], placements['column5']):
    name = re.sub(r'_lowDen$', '', str(master)[len('GTile_'):])
    size = re.search(r'_(\d+)x(\d+)$', name)
    w, h = (float(size[1]), float(size[2])) if size else (10.0, 10.0)
    name = re.sub(r'_\d+x\d+$', '', name)
    top = max((k for k, layer in enumerate(plane) if name.endswith(layer)), default=-1)
    tiles.append([r1(x), r1(y), w, h, top])

# Fill: each mosaic's origin, columns and rows at its pitch.
dz = np.load(os.path.join(args.chain, 'density/record.npz'))
mosaics = next(t for t in (table(dz, k) for k in sorted({f.split('.')[0] for f in dz.files if f != 'manifest'})) if 'column9' in t and str(t['column0'][0]).startswith('fill_'))
fill = [[r1(x), r1(y), r1(x + c * px), r1(y + r * py)] for (x, y), c, r, (px, py) in zip(mosaics['column5'], mosaics['column7'], mosaics['column8'], mosaics['column9'])]

drc, lvs = verify['checks']['drc'], verify['checks']['lvs']
out = {'die': box(interconnect['region_um']),
       'blocks': [{'name': name, 'members': members} for name, members in blocks.items()],
       'rf': lines, 'dc': dc_boxes, 'tiles': tiles, 'metals': len(plane), 'fill': fill,
       'verify': {'drc_violations': int(drc['violation_count']), 'drc_rule_checks': int(drc['rule_checks']), 'lvs': lvs['status']},
       'seconds': {s['stage']: round(s['stage_seconds']) for s in read('flow.json')['stages']}}
json.dump(out, open(args.out, 'w'), separators=(',', ':'))
print(f"{len(out['blocks'])} blocks, {len(lines)} RF lines, {len(dc_boxes)} DC boxes, {len(tiles)} tiles, {len(fill)} fill blocks -> {args.out}")
