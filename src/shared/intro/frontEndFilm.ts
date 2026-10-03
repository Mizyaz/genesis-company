/** Real mesh geometry, perspective, lighting and depth-tested shadows. No flattened circuit texture. */
import {
  BoxGeometry, CylinderGeometry, PlaneGeometry, Scene, PerspectiveCamera, WebGLRenderer, MeshPhysicalMaterial,
  InstancedMesh, Object3D, Vector3, HemisphereLight, DirectionalLight, PCFSoftShadowMap,
  SRGBColorSpace, ACESFilmicToneMapping, DynamicDrawUsage, PMREMGenerator, Mesh, Color, type BufferGeometry,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ease } from './timeline';
import { parts, circuits, partState, connections, connectionState, pixelCandidates, cameraState,
  designState, type Part, type Point3 } from './frontEndScene';
import type { FilmPalette } from './filmPalette';

type Finish = 'silicon' | 'oxide' | 'metal' | 'gold' | 'gate' | 'well' | 'ground' | 'changed' | 'via';
export type CircuitFilm = {
  resize: (width: number, height: number, ratio: number) => void;
  theme: (palette: FilmPalette) => void;
  render: (time: number, translate: (value: string) => string) => void;
  dispose: () => void;
};

export function createCircuitFilm(canvas: HTMLCanvasElement, labels: HTMLDivElement): CircuitFilm {
  const renderer = new WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene(), camera = new PerspectiveCamera(40, 16 / 9, .1, 250);
  const composer = new EffectComposer(renderer), beauty = new RenderPass(scene, camera), ao = new SSAOPass(scene, camera, 640, 360, 16), output = new OutputPass();
  composer.renderTarget1.samples = 2; composer.renderTarget2.samples = 2;
  ao.kernelRadius = .7; ao.minDistance = .0005; ao.maxDistance = .035;
  composer.addPass(beauty); composer.addPass(ao); composer.addPass(output);
  const studio = new RoomEnvironment(), pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .04); scene.environment = environment.texture;
  scene.environmentIntensity = .55; studio.dispose(); pmrem.dispose();
  const ambient = new HemisphereLight(0xb9d9ff, 0x080d16, .18); scene.add(ambient);
  const key = new DirectionalLight(0xffe5b6, 3.2); key.position.set(-18, 16, -12); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -28; key.shadow.camera.right = 28;
  key.shadow.camera.top = 25; key.shadow.camera.bottom = -25; key.shadow.camera.far = 85;
  key.shadow.normalBias = .012; key.shadow.bias = -.00008; key.shadow.radius = 3; scene.add(key);
  const rim = new DirectionalLight(0x79cfff, 3.4); rim.position.set(12, 6, 16); scene.add(rim);
  const cube = new BoxGeometry(1, 1, 1), cylinder = new CylinderGeometry(.5, .5, 1, 12);
  const rounded = new RoundedBoxGeometry(1, 1, 1, 2, .055);
  const materials = Object.fromEntries((['silicon', 'oxide', 'metal', 'gold', 'gate', 'well', 'ground', 'changed', 'via'] as Finish[]).map(name => [name,
    new MeshPhysicalMaterial({ metalness: ['metal', 'gold', 'gate', 'via', 'ground'].includes(name) ? .92 : .12,
      roughness: name === 'oxide' ? .8 : name === 'silicon' ? .4 : .26,
      clearcoat: name === 'silicon' ? .4 : .04, clearcoatRoughness: .3 }),
  ])) as Record<Finish, MeshPhysicalMaterial>;
  materials.oxide.envMapIntensity = .15;
  const floorGeometry = new PlaneGeometry(180, 180), floorMaterial = new MeshPhysicalMaterial({ roughness: 1, metalness: 0, envMapIntensity: .12 });
  const floor = new Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.y = -.58;
  floor.receiveShadow = true; scene.add(floor);
  const batches = Object.fromEntries((Object.keys(materials) as Finish[]).map(name => {
    const mesh = new InstancedMesh<BufferGeometry, MeshPhysicalMaterial>(name === 'via' ? cylinder : name === 'gold' ? rounded : cube, materials[name], name === 'metal' || name === 'changed' ? 6500 : 2200);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled = false;
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    return [name, { mesh, count: 0 }];
  })) as Record<Finish, { mesh: InstancedMesh<BufferGeometry, MeshPhysicalMaterial>; count: number }>;
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
      box('gate', xx, y + .15, z, .045, .20 * appear, d * .92);
      box('metal', xx + .045, y + .10, z, .035, .13 * appear, d * .69);
      for (const sign of [-1, 1]) for (const offset of [-.06, .06]) via(xx, y + .12, z + sign * d * .37 + offset, .22 * appear, .045);
    }
    trace([[x - w / 2, y + .18, z - d * .46], [x + w / 2, y + .18, z - d * .46]], 'gate', .1);
    trace([[x - w / 2, y + .17, z + d * .37], [x + w / 2, y + .17, z + d * .37]], 'metal', .13);
    trace([[x - w / 2, y, z], [x - w / 2, y, z - d * .46]], 'gate');
    trace([[x + w / 2, y, z], [x + w / 2, y, z + d * .37]], 'metal');
    // Local guard-ring metal and repeated substrate contacts remain actual geometry in the close-up.
    trace([[x - w / 2 - .2, y - .02, z - d / 2 - .2], [x + w / 2 + .2, y - .02, z - d / 2 - .2], [x + w / 2 + .2, y - .02, z + d / 2 + .2], [x - w / 2 - .2, y - .02, z + d / 2 + .2], [x - w / 2 - .2, y - .02, z - d / 2 - .2]], 'ground', .065, appear);
    for (let i = 0; i < 9; i++) for (const sign of [-1, 1]) via(x + sign * (w / 2 + .2), y - .04, z - d / 2 + i * d / 8, .16 * appear, .055);
  }
  function passive(part: Part, time: number) {
    const s = partState(part, time), variants = pixelCandidates.get(part.id)!;
    const before = variants[s.before], after = variants[s.index];
    const cw = s.width / after.columns, cd = s.depth / after.rows, y = 1.03 + s.lift;
    box('oxide', part.x, y - .21, part.z, s.width + .38, .22 * s.appear, s.depth + .38);
    for (let r = 0; r < after.rows; r++) for (let col = 0; col < after.columns; col++) {
      const a = Number(before.metal[r][col]), b = Number(after.metal[r][col]), on = a + (b - a) * s.blend;
      const grow = ease(part.start + col * .018, part.start + .32 + col * .018, time);
      if (on * grow < .005) continue;
      const hh = .085 * on * grow, changing = a !== b && s.blend > .01 && s.blend < .99;
      box(changing ? 'changed' : 'metal', part.x - s.width / 2 + (col + .5) * cw, y + hh / 2,
        part.z - s.depth / 2 + (r + .5) * cd, cw * 1.001, hh, cd * 1.001);
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
    const reveal = ease(2.7, 3.6, time);
    box('silicon', 0, -.05, 0, 42, .85 * reveal, 26);
    box('oxide', 0, .70, 0, 41.6, .60 * reveal, 25.6);
    const rail = ease(20, 25.4, time);
    trace([[-20, 1.07, -12], [20, 1.07, -12], [20, 1.07, 12], [-20, 1.07, 12], [-20, 1.07, -12]], 'ground', .16, rail);
    for (let i = 0; i < 100 * rail; i++) for (const sign of [-1, 1]) via(-19.5 + i * .395, .91, sign * 12, .3, .07);
    for (let i = 0; i < 60 * rail; i++) for (const sign of [-1, 1]) via(sign * 20, .91, -11.7 + i * .39, .3, .07);
    // Recessed peripheral metal fill and scribe markings give the die an edge at macro scale.
    for (let i = 0; i < 90 * rail; i++) for (const sign of [-1, 1]) {
      box('ground', -19.5 + i * .44, 1.005, sign * 12.5, .19, .018, .24);
      box('gold', -19.5 + i * .44, .17, sign * 13.02, .13, .065, .02);
    }
    // Dicing-edge layers remain visible under real shadows and grazing light.
    for (const y of [-.15, .07, .28]) for (const z of [-13.01, 13.01]) box('ground', 0, y, z, 41.8, .035 * reveal, .04);
  }
  return {
    resize(w, h, ratio) {
      width = w; height = h; renderer.setPixelRatio(ratio); renderer.setSize(w, h, false);
      composer.setPixelRatio(ratio); composer.setSize(w, h);
      // AO is half-resolution; the beauty image and typography retain their full sampling density.
      ao.setSize(Math.ceil(w * ratio / 2), Math.ceil(h * ratio / 2));
      ao.enabled = ratio >= .65;
    },
    theme(palette) {
      renderer.setClearColor(palette.page);
      const light = new Color(palette.page).r > .5;
      floorMaterial.color.set(palette.page);
      materials.silicon.color.set('#060b12'); materials.oxide.color.set(light ? '#1c2b3a' : '#081522');
      materials.metal.color.set('#b6b9b7'); materials.gold.color.set('#caa568');
      materials.gate.color.set('#c8ac77'); materials.well.color.set('#231e35');
      materials.ground.color.set(palette.subtle); materials.changed.color.set(palette.cyan);
      materials.changed.emissive.set(palette.cyan); materials.changed.emissiveIntensity = .75;
      materials.via.color.set(palette.highlight);
      ambient.groundColor.set(palette.page); scene.fog = null;
    },
    render(time, translate) {
      if (disposed) return;
      for (const batch of Object.values(batches)) batch.count = 0;
      drawDie(time); parts.forEach(part => drawPart(part, time));
      for (const edge of connections) {
        const { points, progress } = connectionState(edge, time);
        trace(points, edge.bias ? 'gate' : 'metal', edge.bias ? .085 : .18, progress);
        if (progress === 1 && !edge.bias) {
          // A restrained current packet follows the actual connected route, never an arbitrary orbit.
          const p = ((time * .7) + connections.indexOf(edge) * .13) % 1;
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
      const shot = cameraState(time), horizontal = Math.cos(shot.elevation) * shot.distance;
      camera.aspect = 16 / 9;
      camera.position.set(shot.x + Math.sin(shot.azimuth) * horizontal, Math.sin(shot.elevation) * shot.distance,
        shot.z + Math.cos(shot.azimuth) * horizontal);
      camera.lookAt(shot.x, .7, shot.z); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      key.position.x = -18 + 5 * ease(12, 18, time); rim.intensity = 1.8 + .4 * Math.sin(time * .45);
      renderer.setViewport(0, 0, width, height); composer.render(0);
      for (const { circuit, node, detail } of labelNodes) {
        projected.set(circuit.label[0], circuit.label[1], circuit.label[2]).project(camera);
        const visible = time >= 21 && time < 26 && Math.abs(projected.x) < .88 && Math.abs(projected.y) < .90;
        node.style.opacity = visible ? String(ease(21, 22, time) * (1 - ease(25, 26, time))) : '0';
        node.style.transform = `translate(${(projected.x + 1) * width / 2}px, ${(1 - projected.y) * height / 2}px) translate(-50%, -100%)`;
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
      cube.dispose(); cylinder.dispose(); rounded.dispose(); Object.values(materials).forEach(material => material.dispose());
      floorGeometry.dispose(); floorMaterial.dispose(); environment.dispose();
      ao.dispose(); ao.ssaoMaterial.dispose(); ao.noiseTexture?.dispose(); output.dispose(); beauty.dispose(); composer.dispose();
      key.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); scene.clear();
    },
  };
}
