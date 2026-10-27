# The coil candidates of a coil search for the story film's optimize scene: the drawn metal of each run's best GDS, in
# the same shape schema as layout.json's shapes (bbox, polygons by layer), for the film to show beside the chosen coil:
#   run_python_in_pyg_env.sh -I story/coil_candidates.py --runs <run folder>,<run folder>,... --out <coil_candidates.json>
# Each run folder holds best.gds; only metal layers are kept (the pixel grid's boundary marker stays out). The GDS is only read.
import argparse, hashlib, json, os
import gdstk

LAYERS = {15: 'M1', 17: 'M2', 187: 'C1', 197: 'C2', 140: 'C3', 41: 'C4', 141: 'C5', 4349: 'JA', 139: 'QA', 39: 'QB', 69: 'LB'}

ap = argparse.ArgumentParser()
ap.add_argument('--runs', required=True)
ap.add_argument('--out', required=True)
a = ap.parse_args()

candidates = []
for run in a.runs.split(','):
    path = os.path.join(run, 'best.gds')
    top = gdstk.read_gds(path).top_level()[0]
    layers = {}
    for p in top.get_polygons():
        if p.layer in LAYERS and p.datatype == 0:
            layers.setdefault(LAYERS[p.layer], []).append([[round(x, 3), round(y, 3)] for x, y in p.points])
    if not layers: raise SystemExit(f'{path} has no metal')
    xs = [x for ps in layers.values() for poly in ps for x, _ in poly]; ys = [y for ps in layers.values() for poly in ps for _, y in poly]
    candidates.append({'run': os.path.basename(run.rstrip('/')), 'bbox': [min(xs), min(ys), max(xs), max(ys)], 'layers': layers,
                       'gds': path, 'gds_sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest()})
json.dump({'candidates': candidates}, open(a.out, 'w'))
print(f'{len(candidates)} candidates -> {a.out}')
