/** Real mesh geometry, perspective, lighting and depth-tested shadows. No flattened circuit texture. */
import {
  BoxGeometry, CylinderGeometry, Scene, PerspectiveCamera, WebGLRenderer, MeshStandardMaterial,
  InstancedMesh, Object3D, Vector3, HemisphereLight, DirectionalLight, PCFSoftShadowMap,
  SRGBColorSpace, ACESFilmicToneMapping, DynamicDrawUsage,
} from 'three';
import { ease } from './timeline';
import { parts, circuits, partState, connections, connectionState, pixelCandidates, cameraState,
  designState, type Part, type Point3 } from './frontEndScene';
import type { FilmPalette } from './filmPalette';

type Finish = 'silicon' | 'oxide' | 'metal' | 'gold' | 'gate' | 'well' | 'ground' | 'changed' | 'via';
export type CircuitFilm = {
  resize: (width: number, height: number, ratio: number) => void;
  theme: (palette: FilmPalette) => void;
  render: (time: number, contentTop: number, translate: (value: string) => string) => void;
  dispose: () => void;
};

export function createCircuitFilm(canvas: HTMLCanvasElement, labels: HTMLDivElement): CircuitFilm {
  const renderer = new WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene(), camera = new PerspectiveCamera(35, 1, .1, 250);
  const ambient = new HemisphereLight(0xe8f5ff, 0x314252, 2.8); scene.add(ambient);
  const key = new DirectionalLight(0xffefd6, 3.2); key.position.set(-14, 24, -10); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -30; key.shadow.camera.right = 30;
  key.shadow.camera.top = 25; key.shadow.camera.bottom = -25; key.shadow.camera.far = 85;
  key.shadow.normalBias = .035; scene.add(key);
  const rim = new DirectionalLight(0xb2e7ff, 2.4); rim.position.set(12, 8, 16); scene.add(rim);
  const cube = new BoxGeometry(1, 1, 1), cylinder = new CylinderGeometry(.5, .5, 1, 8);
  const materials = Object.fromEntries((['silicon', 'oxide', 'metal', 'gold', 'gate', 'well', 'ground', 'changed', 'via'] as Finish[]).map(name => [name,
    new MeshStandardMaterial({ metalness: ['metal', 'gold', 'gate', 'via'].includes(name) ? .6 : .15,
      roughness: name === 'silicon' ? .46 : name === 'oxide' ? .62 : .32 }),
  ])) as Record<Finish, MeshStandardMaterial>;
  const batches = Object.fromEntries((Object.keys(materials) as Finish[]).map(name => {
    const mesh = new InstancedMesh(name === 'via' ? cylinder : cube, materials[name], name === 'metal' || name === 'changed' ? 5000 : 1800);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled = false;
    mesh.castShadow = name !== 'oxide'; mesh.receiveShadow = true; scene.add(mesh);
    return [name, { mesh, count: 0 }];
  })) as Record<Finish, { mesh: InstancedMesh<BoxGeometry | CylinderGeometry, MeshStandardMaterial>; count: number }>;
  const object = new Object3D(), unitX = new Vector3(1, 0, 0), direction = new Vector3(), projected = new Vector3();
  let width = 1, height = 1, disposed = false;
  const labelNodes = circuits.map(circuit => {
    const node = document.createElement('div'); node.className = 'film-circuit-label'; node.dataset.circuit = circuit.id;
    const title = document.createElement('strong'), detail = document.createElement('span');
    title.textContent = circuit.name; node.append(title, detail); labels.append(node);
    return { circuit, node, detail };
  });
  function emit(finish: Finish) {
    const batch = batches[finish];
    if (batch.count >= batch.mesh.instanceMatrix.count) throw new Error(`Circuit instance budget exceeded: ${finish}`);
    object.updateMatrix(); batch.mesh.setMatrixAt(batch.count++, object.matrix);
  }
  function box(finish: Finish, x: number, y: number, z: number, w: number, h: number, d: number) {
    if (w < .001 || h < .001 || d < .001) return;
    object.position.set(x, y, z); object.quaternion.identity(); object.scale.set(w, h, d); emit(finish);
  }
  function trace(points: readonly Point3[], finish: Finish = 'metal', thickness = .11, portion = 1) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1], p[2] - points[i][2]));
    let remaining = lengths.reduce((a, b) => a + b, 0) * portion;
    for (let i = 0; i < lengths.length && remaining > .001; i++) {
      const a = points[i], b = points[i + 1], length = Math.min(lengths[i], remaining), p = length / lengths[i];
      if (!Number.isFinite(p)) continue;
      direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      object.position.set(a[0] + (b[0] - a[0]) * p / 2, a[1] + (b[1] - a[1]) * p / 2, a[2] + (b[2] - a[2]) * p / 2);
      object.quaternion.setFromUnitVectors(unitX, direction); object.scale.set(length + .025, thickness, thickness);
      emit(finish); remaining -= length;
    }
  }
  function via(x: number, y: number, z: number, h = .38, diameter = .1) { box('via', x, y, z, diameter, h, diameter); }
  function transistor(x: number, y: number, z: number, w: number, d: number, fingers: number, appear = 1) {
    box('well', x, y - .13, z, w + .22, .20 * appear, d + .25);
    box('oxide', x, y, z, w, .07 * appear, d);
    for (let i = 0; i < fingers; i++) {
      const xx = x - w / 2 + (i + .5) * w / fingers;
      box('gate', xx, y + .11, z, .045, .13 * appear, d * .92);
      box('metal', xx + .045, y + .07, z, .035, .08 * appear, d * .69);
      for (const sign of [-1, 1]) via(xx, y + .11, z + sign * d * .37, .13 * appear, .05);
    }
    trace([[x - w / 2, y + .18, z - d * .46], [x + w / 2, y + .18, z - d * .46]], 'gate', .1);
    trace([[x - w / 2, y + .17, z + d * .37], [x + w / 2, y + .17, z + d * .37]], 'metal', .13);
    trace([[x - w / 2, y, z], [x - w / 2, y, z - d * .46]], 'gate');
    trace([[x + w / 2, y, z], [x + w / 2, y, z + d * .37]], 'metal');
  }
  function passive(part: Part, time: number) {
    const s = partState(part, time), variants = pixelCandidates.get(part.id)!;
    const before = variants[s.before], after = variants[s.index];
    const cw = s.width / after.columns, cd = s.depth / after.rows, y = 1.03 + s.lift;
    box('oxide', part.x, y - .21, part.z, s.width + .38, .22 * s.appear, s.depth + .38);
    for (let r = 0; r < after.rows; r++) for (let col = 0; col < after.columns; col++) {
      const a = Number(before.metal[r][col]), b = Number(after.metal[r][col]), on = a + (b - a) * s.blend;
      const grow = ease(part.start + col * .045, part.start + .7 + col * .045, time);
      if (on * grow < .005) continue;
      const hh = .12 * on * grow, changing = a !== b && s.blend > .01 && s.blend < .99;
      box(changing ? 'changed' : 'metal', part.x - s.width / 2 + (col + .5) * cw, y + hh / 2,
        part.z - s.depth / 2 + (r + .5) * cd, cw * .99, hh, cd * .99);
    }
    for (const sign of [-1, 1]) for (let i = 0; i < 13; i++) via(part.x - s.width / 2 + i * s.width / 12, y - .14, part.z + sign * (s.depth / 2 + .16), .25 * s.appear, .065);
    for (const sign of [-1, 1]) trace([[part.x - s.width / 2 - .15, y - .03, part.z + sign * (s.depth / 2 + .16)], [part.x + s.width / 2 + .15, y - .03, part.z + sign * (s.depth / 2 + .16)]], 'ground', .075);
  }
  function drawPart(part: Part, time: number) {
    const s = partState(part, time);
    if (!s.appear) return;
    const { x, z } = part, y = 1.05 + s.lift;
    if (part.kind === 'pixel') passive(part, time);
    if (part.kind === 'mos') transistor(x, y, z, s.width, s.depth, s.fingers, s.appear);
    if (part.kind === 'capacitor') {
      box('oxide', x, y - .17, z, 1.8, .25 * s.appear, 1.65);
      for (let i = 0; i < 12; i++) box(i % 2 ? 'gate' : 'metal', x + (i % 2 ? .08 : -.08), y + .02, z - .68 + i * .124, 1.45, .13 * s.appear, .06);
      trace([[x - .8, y, z - .75], [x - .8, y, z + .75]], 'metal', .16);
      trace([[x + .8, y, z - .75], [x + .8, y, z + .75]], 'gate', .16);
    }
    if (part.kind === 'choke') {
      const winding: Point3[] = [[x - .85, y, z], [x - .8, y, z - .8], [x + .8, y, z - .8], [x + .8, y, z + .8], [x - .52, y, z + .8], [x - .52, y, z - .5], [x + .47, y, z - .5], [x + .47, y, z + .47], [x - .2, y, z + .47], [x - .2, y, z]];
      trace(winding, 'gold', .14, s.appear);
      trace([[x - .2, y - .26, z], [x + .85, y - .26, z]], 'metal', .13, s.appear);
      via(x - .2, y - .13, z, .3 * s.appear); via(x + .85, y - .13, z, .3 * s.appear);
    }
    if (part.kind === 'pad') {
      box('oxide', x, y - .25, z, 1.9, .3 * s.appear, 2.4);
      for (const dz of [-.8, 0, .8]) {
        box('gold', x, y - .035, z + dz, 1.7, .19 * s.appear, .5);
        for (const dx of [-.65, .65]) via(x + dx, y - .22, z + dz, .3 * s.appear, .10);
      }
    }
    if (part.kind === 'mixer') {
      box('oxide', x, y - .3, z, 3.5, .3 * s.appear, 3.5);
      for (const dx of [-.85, .85]) for (const dz of [-.85, .85]) transistor(x + dx, y, z + dz, .68, 1.05, 5, s.appear);
      trace([[x - 1.75, y + .12, z], [x + 1.75, y + .12, z]], 'metal', .12, s.appear);
      trace([[x, y + .3, z - 1.75], [x, y + .3, z + 1.75]], 'gate', .12, s.appear);
      for (const sign of [-1, 1]) trace([[x - .85, y + .2, z + sign * .85], [x + .85, y + .2, z + sign * .85]], 'gate', .095, s.appear);
    }
    if (part.kind === 'switch') {
      for (const dz of [-.48, .48]) transistor(x, y, z + dz, .85, .65, 5, s.appear);
      trace([[x - 1.25, y, z], [x - .9, y, z], [x - .9, y, z - .48], [x - .43, y, z - .48]], 'metal', .12, s.appear);
      trace([[x - .9, y, z], [x - .9, y, z + .48], [x - .43, y, z + .48]], 'metal', .12, s.appear);
      for (const sign of [-1, 1]) trace([[x + .43, y, z + sign * .48], [x + .65, y, z + sign * .48], [x + .65, y, z + sign * .85], [x, y, z + sign * .85]], 'metal', .12, s.appear);
    }
  }
  function drawDie(time: number) {
    const reveal = ease(2.6, 5.5, time);
    box('silicon', 0, -.05, 0, 42, .85 * reveal, 26);
    box('oxide', 0, .70, 0, 41.6, .60 * reveal, 25.6);
    const rail = ease(46, 60, time);
    trace([[-20, 1.07, -12], [20, 1.07, -12], [20, 1.07, 12], [-20, 1.07, 12], [-20, 1.07, -12]], 'ground', .16, rail);
    for (let i = 0; i < 100 * rail; i++) for (const sign of [-1, 1]) via(-19.5 + i * .395, .91, sign * 12, .3, .07);
    // Dicing-edge layers remain visible under real shadows and grazing light.
    for (const y of [-.15, .07, .28]) for (const z of [-13.01, 13.01]) box('ground', 0, y, z, 41.8, .035 * reveal, .04);
  }
  return {
    resize(w, h, ratio) { width = w; height = h; renderer.setPixelRatio(ratio); renderer.setSize(w, h, false); },
    theme(palette) {
      renderer.setClearColor(palette.page);
      materials.silicon.color.set(palette.edge); materials.oxide.color.set(palette.raised);
      materials.metal.color.set(palette.metal); materials.gold.color.set(palette.gold);
      materials.gate.color.set(palette.gold); materials.well.color.set(palette.violet);
      materials.ground.color.set(palette.subtle); materials.changed.color.set(palette.cyan);
      materials.changed.emissive.set(palette.cyan); materials.changed.emissiveIntensity = .22;
      materials.via.color.set(palette.highlight);
      ambient.groundColor.set(palette.page); scene.fog = null;
    },
    render(time, contentTop, translate) {
      if (disposed) return;
      for (const batch of Object.values(batches)) batch.count = 0;
      drawDie(time); parts.forEach(part => drawPart(part, time));
      // A quiet bracket names the complete amplifier, including matching and bias, not one transistor.
      for (const circuit of circuits.filter(circuit => circuit.id === 'lna' || circuit.id === 'pa')) {
        const sign = Math.sign(circuit.z), z = sign * 10.2;
        trace([[-9.6, 1.025, z - sign * .4], [-9.6, 1.025, z], [5.6, 1.025, z], [5.6, 1.025, z - sign * .4]],
          'ground', .045, ease(circuit.start + 13, circuit.start + 15, time));
      }
      for (const edge of connections) {
        const { points, progress } = connectionState(edge, time);
        trace(points, edge.bias ? 'gate' : 'metal', edge.bias ? .085 : .18, progress);
        if (progress === 1 && !edge.bias) {
          // A restrained current packet follows the actual connected route, never an arbitrary orbit.
          const p = ((time * .23) + connections.indexOf(edge) * .13) % 1;
          const lengths = points.slice(1).map((b, i) => Math.hypot(b[0] - points[i][0], b[1] - points[i][1], b[2] - points[i][2]));
          let along = p * lengths.reduce((a, b) => a + b, 0);
          for (let i = 0; i < lengths.length; i++) {
            if (along <= lengths[i] && lengths[i] > .001) {
              const f = along / lengths[i], a = points[i], b = points[i + 1];
              box('changed', a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f + .12, a[2] + (b[2] - a[2]) * f, .13, .045, .13); break;
            } along -= lengths[i];
          }
        }
      }
      for (const batch of Object.values(batches)) { batch.mesh.count = batch.count; batch.mesh.instanceMatrix.needsUpdate = true; }
      const top = Math.min(height - 160, Math.max(contentTop, 160)), bottom = width < 650 ? 115 : height < 550 ? 65 : 105;
      const viewHeight = Math.max(60, height - top - bottom), aspect = width / viewHeight, shot = cameraState(time);
      camera.aspect = aspect;
      const azimuth = width < 650 ? Math.PI * .46 + shot.azimuth * .2 : shot.azimuth;
      const across = Math.abs(Math.cos(azimuth)) * shot.width + Math.abs(Math.sin(azimuth)) * shot.depth;
      const away = Math.abs(Math.sin(azimuth)) * shot.width + Math.abs(Math.cos(azimuth)) * shot.depth;
      const distance = Math.max(across / (2 * Math.tan(Math.PI * 35 / 360) * aspect), away * .79 / (2 * Math.tan(Math.PI * 35 / 360))) * 1.28;
      camera.position.set(shot.x + Math.sin(azimuth) * distance * .62, distance * .79, shot.z + Math.cos(azimuth) * distance * .62);
      camera.lookAt(shot.x, .3, shot.z); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      renderer.setScissorTest(false); renderer.setViewport(0, 0, width, height); renderer.clear();
      renderer.setViewport(0, height - top - viewHeight, width, viewHeight);
      renderer.setScissor(0, height - top - viewHeight, width, viewHeight); renderer.setScissorTest(true);
      renderer.render(scene, camera); renderer.setScissorTest(false);
      for (const { circuit, node, detail } of labelNodes) {
        projected.set(circuit.label[0], circuit.label[1], circuit.label[2]).project(camera);
        const labelAt = circuit.start + (circuit.id === 'lna' || circuit.id === 'pa' ? 14 : 3);
        const visible = time > labelAt && Math.abs(projected.x) < .88 && Math.abs(projected.y) < .90;
        node.style.opacity = visible ? String(ease(labelAt, labelAt + 1.2, time)) : '0';
        const anchor = width >= 650 && circuit.id === 'lna' ? '-100%' : '-50%';
        node.style.transform = `translate(${(projected.x + 1) * width / 2}px, ${top + (1 - projected.y) * viewHeight / 2}px) translate(-50%, ${anchor})`;
        detail.textContent = translate(circuit.role);
      }
      canvas.dataset.time = time.toFixed(2); canvas.dataset.renderer = 'webgl';
      canvas.dataset.candidate = String(designState(time).index);
      canvas.dataset.instances = String(Object.values(batches).reduce((count, batch) => count + batch.count, 0));
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
    },
    dispose() {
      disposed = true; labelNodes.forEach(({ node }) => node.remove());
      for (const { mesh } of Object.values(batches)) { scene.remove(mesh); mesh.dispose(); }
      cube.dispose(); cylinder.dispose(); Object.values(materials).forEach(material => material.dispose());
      key.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); scene.clear();
    },
  };
}
