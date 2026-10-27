# Lists the ground tiles of a delivered chip GDS for the 2D story film, so the film can draw each tile's edge:
#   run_python_in_pyg_env.sh -I story/gnd_tiles.py --gds <chip.gds> --top <cell> --out <folder>
# The GDS is only read. Every cell instance placed in the flow's gnd_tiling cell is one tile (a library tile master);
# <out>/gnd_tiles.json gets each tile's box in microns ([x0, y0, x1, y1], die coordinates) and its master's name.
import argparse, hashlib, json, math, os
import gdstk

ap = argparse.ArgumentParser()
for name in ('gds', 'top', 'out'): ap.add_argument(f'--{name}', required=True)
a = ap.parse_args()
lib = gdstk.read_gds(a.gds)
top = next(c for c in lib.cells if c.name == a.top)


def place(ref, points):
    """Points in ref's cell -> points in its parent, as the reference places them."""
    c, s = math.cos(ref.rotation), math.sin(ref.rotation)
    m = ref.magnification
    return [(ref.origin[0] + m * (c * x - s * (-y if ref.x_reflection else y)),
             ref.origin[1] + m * (s * x + c * (-y if ref.x_reflection else y))) for x, y in points]


def tiling(cell, chain):
    for r in cell.references:
        if r.cell.name == 'gnd_tiling': return r, chain + [r]
        if r.cell.references and not r.cell.name.startswith('blk_'):
            found = tiling(r.cell, chain + [r])
            if found: return found


found = tiling(top, [])
if found is None: raise SystemExit(f'{a.top} has no gnd_tiling cell')
ref, chain = found
tiles = []
for s in ref.cell.references:
    for one in (s.apply_repetition() or [s]) if s.repetition.size else [s]:
        (x0, y0), (x1, y1) = one.bounding_box()
        points = [(x0, y0), (x1, y1)]
        for parent in reversed(chain): points = place(parent, points)
        xs, ys = [p[0] for p in points], [p[1] for p in points]
        tiles.append({'box': [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)], 'master': s.cell.name})
json.dump({'tiles': tiles, 'source': {'gds': os.path.abspath(a.gds), 'gds_sha256': hashlib.sha256(open(a.gds, 'rb').read()).hexdigest(), 'top': a.top}},
          open(f'{a.out}/gnd_tiles.json', 'w'))
print(f'{len(tiles)} tiles -> {a.out}/gnd_tiles.json')
