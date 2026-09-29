import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type { Publication } from '../shared/citations';
import { bannerCanvas, genesisCanvas, glowCanvas, palettes, posterCanvas, random, sparkleCanvas, yearAtlas, type Palette } from './art';
import { empireIds, laneX, layoutCity, type Building, type EmpireId } from './layout';

/** Seconds spent next to a building (slowly) before the visit prompt, how close counts, and how slow. */
export const DWELL_SECONDS = 1.3;
// The signal flies below 28 and the camera below 29: under the empire banners (29.3) and the year arches (34).
const NEAR = 12, SLOW = 10, ARC = 27, CEILING = 28, CAMERA_CEILING = 29;

export type FlightTarget = { kind: 'paper'; paper: Publication; empire: EmpireId } | { kind: 'genesis' };
export type FlightLabels = { empires: Record<EmpireId, string>; journal: string; conference: string; genesisLine: string };
export type FlightEvents = {
  impact(): void; ready(): void; moved(): void;
  near(target: FlightTarget | null): void;
  prompt(target: FlightTarget): void;
  place(year: number, empire: EmpireId | 'genesis' | null): void;
  /** Every frame: position on the timeline and dwell progress, both 0..1. */
  progress(timeline: number, dwell: number): void;
};
export type FlightTimeline = { start: number; end: number; years: { year: number; z: number }[]; papers: { id: string; year: number; title: string; empire: EmpireId; z: number }[] };
export type FlightHandle = {
  timeline: FlightTimeline;
  setInput(input: Partial<Record<'forward' | 'turn' | 'lift', number>>): void;
  nudge(forward: number, lift: number): void;
  step(direction: 1 | -1): void;
  flyTo(id: string): void;
  /** Fly to the building or poster under a screen point (a tap or a click); false if there is none. */
  pick(clientX: number, clientY: number): boolean;
  dispose(): void;
};
export type FlightOptions = { canvas: HTMLCanvasElement; papers: Publication[]; labels: FlightLabels; reducedMotion: boolean; events: FlightEvents };

const INK = '#0b0624';
const color = (hex: string) => new THREE.Color(hex);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/* Cel shading: a stepped gradient up each building (ink lines between the steps), three light levels, lit windows. */
const CEL_VERTEX = /* glsl */`
attribute vec3 aBottom;
attribute vec3 aTop;
attribute vec3 aSpan;
varying vec3 vBottom;
varying vec3 vTop;
varying vec3 vSpan;
varying vec3 vWorld;
varying vec3 vNormal;
#include <fog_pars_vertex>
void main() {
  vBottom = aBottom; vTop = aTop; vSpan = aSpan;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const CEL_FRAGMENT = /* glsl */`
uniform vec3 uLight;
uniform vec3 uSignal;
uniform float uTime;
varying vec3 vBottom;
varying vec3 vTop;
varying vec3 vSpan;
varying vec3 vWorld;
varying vec3 vNormal;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  float near = smoothstep(28.0, 6.0, distance(vWorld.xz, uSignal.xz));
  vec3 color;
  if (vSpan.z > 1.5) {
    color = vTop * (0.92 + 0.18 * sin(uTime * 3.0 + vWorld.x * 0.4 + vWorld.z * 0.3) + 0.35 * near);
  } else {
    float h = clamp((vWorld.y - vSpan.x) / max(vSpan.y, 0.001), 0.0, 1.0);
    float f = h * 5.0;
    vec3 base = mix(vBottom, vTop, min(floor(f), 4.0) / 4.0) * (1.0 + 0.16 * near);
    float l = dot(n, uLight);
    color = base * (n.y > 0.7 ? 1.14 : l > 0.45 ? 1.0 : l > -0.1 ? 0.8 : 0.62);
    if (vSpan.z > 0.5 && abs(n.y) < 0.4) {
      vec2 axis = normalize(vec2(-n.z, n.x));
      vec2 cell = vec2(dot(vWorld.xz, axis) / 1.5, (vWorld.y - vSpan.x) / 1.9);
      vec2 g = fract(cell), w = max(fwidth(cell) * 1.2, vec2(0.001));
      float pane = smoothstep(0.2 - w.x, 0.2 + w.x, g.x) * smoothstep(0.8 + w.x, 0.8 - w.x, g.x)
        * smoothstep(0.3 - w.y, 0.3 + w.y, g.y) * smoothstep(0.75 + w.y, 0.75 - w.y, g.y) * step(0.8, cell.y);
      float lit = step(0.4, hash(floor(cell) + vSpan.xy));
      vec3 glow = mix(vTop, vec3(1.0), 0.5) * (0.85 + 0.45 * near);
      color = mix(color, mix(base * 0.3, glow, lit), pane);
    }
    float edge = 1.0 - smoothstep(0.0, max(fwidth(f), 0.0001) * 1.5, min(fract(f), 1.0 - fract(f)));
    color = mix(color, color * 0.3, edge * step(0.02, h) * step(h, 0.98) * step(abs(n.y), 0.7) * 0.9);
  }
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
/* Ground traces: current pulses run along each trace; everything brightens around the signal. */
const TRACE_VERTEX = /* glsl */`
attribute vec3 aColor;
attribute float aDist;
varying vec3 vColor;
varying float vDist;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vColor = aColor; vDist = aDist;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const TRACE_FRAGMENT = /* glsl */`
uniform float uTime;
uniform vec3 uSignal;
varying vec3 vColor;
varying float vDist;
varying vec3 vWorld;
#include <fog_pars_fragment>
void main() {
  float pulse = smoothstep(0.82, 1.0, fract(vDist * 0.04 - uTime * 0.6));
  float near = smoothstep(32.0, 4.0, distance(vWorld.xz, uSignal.xz));
  gl_FragColor = vec4(vColor * (0.5 + 0.9 * pulse + 0.7 * near), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
/* The board under the city: a fine grid, empire districts tinted in steps. */
const GROUND_VERTEX = /* glsl */`
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GROUND_FRAGMENT = /* glsl */`
uniform vec3 uBase;
uniform vec3 uLine;
uniform vec3 uLaneColor[3];
uniform float uLaneX[3];
varying vec3 vWorld;
#include <fog_pars_fragment>
float grid(vec2 p, float size) {
  vec2 c = p / size;
  vec2 d = abs(fract(c - 0.5) - 0.5) / max(fwidth(c), vec2(0.0001));
  return 1.0 - min(min(d.x, d.y), 1.0);
}
void main() {
  vec3 color = uBase;
  for (int i = 0; i < 3; i++) {
    float d = abs(vWorld.x - uLaneX[i]);
    color = mix(color, uLaneColor[i], d < 3.4 ? 0.42 : d < 16.0 ? 0.24 : d < 19.0 ? 0.12 : 0.0);
  }
  color = mix(color, uLine, grid(vWorld.xz, 2.0) * 0.28);
  color = mix(color, uLine * 1.5, grid(vWorld.xz, 10.0) * 0.55);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
/* Sky in hard-edged bands that ripple around the horizon. */
const SKY_VERTEX = /* glsl */`
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAGMENT = /* glsl */`
uniform vec3 uBands[7];
uniform float uTime;
varying vec3 vDirection;
void main() {
  vec3 d = normalize(vDirection);
  float around = atan(d.x, -d.z);
  float wave = 0.04 * sin(around * 5.0 + uTime * 0.12) * (1.0 - smoothstep(0.0, 0.6, d.y));
  float t = clamp((d.y + wave) * 1.45 + 0.08, 0.0, 0.9999) * 7.0;
  vec3 color = uBands[int(t)];
  float f = fract(t);
  float seam = 1.0 - smoothstep(0.0, max(fwidth(t), 0.0001) * 1.5, min(f, 1.0 - f));
  color = mix(color, min(color * 1.6 + 0.08, vec3(1.0)), seam * 0.7 * step(0.5, t));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
/* The signal's trail: two tapered ribbons (a differential pair) with ink edges, fading towards the tail. */
const TRAIL_VERTEX = /* glsl */`
attribute float aT;
attribute float aV;
attribute float aPair;
varying float vT;
varying float vV;
varying float vPair;
void main() { vT = aT; vV = aV; vPair = aPair; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TRAIL_FRAGMENT = /* glsl */`
uniform vec3 uHead;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uInk;
varying float vT;
varying float vV;
varying float vPair;
void main() {
  vec3 body = mix(uHead, vPair < 0.5 ? uA : uB, smoothstep(0.0, 0.3, vT));
  vec3 color = mix(body, uInk, smoothstep(0.55, 0.7, abs(vV)));
  gl_FragColor = vec4(color, pow(1.0 - vT, 1.8));
  #include <colorspace_fragment>
}`;
/* The dwell ring fills clockwise while the signal stays next to a building. */
const RING_VERTEX = /* glsl */`
varying vec3 vLocal;
void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_FRAGMENT = /* glsl */`
uniform float uProgress;
uniform vec3 uColor;
varying vec3 vLocal;
void main() {
  float a = fract(0.25 - atan(vLocal.y, vLocal.x) / 6.2831853);
  gl_FragColor = vec4(a < uProgress ? uColor : uColor * 0.28, 1.0);
  #include <colorspace_fragment>
}`;

type Mode = 0 | 1 | 2; // plain, windows, glowing
/** Collects crisp parts (prisms, boxes, lathes) into one mesh and their hard edges into one outline set. */
class Kit {
  private position: number[] = []; private normal: number[] = []; private bottom: number[] = []; private top: number[] = []; private span: number[] = [];
  readonly edges: number[] = [];
  add(geometry: THREE.BufferGeometry, bottom: THREE.Color, top: THREE.Color, base: number, height: number, mode: Mode, outline = true) {
    if (outline) {
      const edges = new THREE.EdgesGeometry(geometry, 28), array = edges.getAttribute('position').array;
      for (let i = 0; i < array.length; i++) this.edges.push(array[i]);
      edges.dispose();
    }
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    flat.computeVertexNormals();
    const p = flat.getAttribute('position'), n = flat.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      this.position.push(p.getX(i), p.getY(i), p.getZ(i));
      this.normal.push(n.getX(i), n.getY(i), n.getZ(i));
      this.bottom.push(bottom.r, bottom.g, bottom.b);
      this.top.push(top.r, top.g, top.b);
      this.span.push(base, height, mode);
    }
    if (flat !== geometry) flat.dispose();
    geometry.dispose();
  }
  mesh(material: THREE.Material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3));
    geometry.setAttribute('aBottom', new THREE.Float32BufferAttribute(this.bottom, 3));
    geometry.setAttribute('aTop', new THREE.Float32BufferAttribute(this.top, 3));
    geometry.setAttribute('aSpan', new THREE.Float32BufferAttribute(this.span, 3));
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, material);
  }
}
/** Flat ground traces with the distance along each trace, so current pulses can run along them. */
class Traces {
  private position: number[] = []; private color: number[] = []; private dist: number[] = []; private index: number[] = [];
  readonly vias: { x: number; z: number; color: THREE.Color }[] = [];
  add(points: [number, number][], width: number, tint: THREE.Color, vias = true) {
    let dist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, z0] = points[i], [x1, z1] = points[i + 1], length = Math.hypot(x1 - x0, z1 - z0);
      if (!length) continue;
      const nx = (-(z1 - z0) / length) * width / 2, nz = ((x1 - x0) / length) * width / 2, base = this.position.length / 3;
      for (const [x, z] of [[x0 + nx, z0 + nz], [x0 - nx, z0 - nz], [x1 - nx, z1 - nz], [x1 + nx, z1 + nz]]) { this.position.push(x, 0.05, z); this.color.push(tint.r, tint.g, tint.b); }
      this.dist.push(dist, dist, dist + length, dist + length);
      this.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
      dist += length;
    }
    if (vias) for (const [x, z] of points) this.vias.push({ x, z, color: tint });
  }
  mesh(material: THREE.Material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(this.color, 3));
    geometry.setAttribute('aDist', new THREE.Float32BufferAttribute(this.dist, 1));
    geometry.setIndex(this.index);
    return new THREE.Mesh(geometry, material);
  }
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, turn = 0) => new THREE.BoxGeometry(w, h, d).rotateY(turn).translate(x, y + h / 2, z);
const prism = (radius: number, h: number, sides: number, x: number, y: number, z: number, taper = 1) =>
  new THREE.CylinderGeometry(radius * taper, radius, h, sides, 1).rotateY(Math.PI / sides).translate(x, y + h / 2, z);

type Colors = { ink: THREE.Color; deep: THREE.Color; mid: THREE.Color; bright: THREE.Color; light: THREE.Color; accent: THREE.Color; hot: THREE.Color };
function colors(palette: Palette, shift = 0): Colors {
  const result = {} as Colors;
  for (const key of Object.keys(palette) as (keyof Palette)[]) result[key] = color(palette[key]).offsetHSL(shift, 0, 0);
  return result;
}
/** A solid the signal can stand next to (and cannot fly through). */
type Solid = { x: number; z: number; radius: number; top: number; side: number; posterY: number; building: Building | null; target: FlightTarget };

export function createFlight({ canvas, papers, labels, reducedMotion, events }: FlightOptions): FlightHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  const scene = new THREE.Scene();
  const fogColor = color('#57d2ec');
  scene.fog = new THREE.Fog(fogColor, 110, 430);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 2600);
  const city = layoutCity(papers);
  const shared = { uTime: { value: 0 }, uSignal: { value: new THREE.Vector3() } };
  const lineMaterials: LineMaterial[] = [];
  const textures: THREE.Texture[] = [];
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const texture = (source: HTMLCanvasElement) => {
    const result = new THREE.CanvasTexture(source);
    result.colorSpace = THREE.SRGBColorSpace; result.anisotropy = anisotropy;
    textures.push(result);
    return result;
  };
  const lines = (parameters: ConstructorParameters<typeof LineMaterial>[0]) => {
    const material = new LineMaterial({ fog: true, ...parameters });
    lineMaterials.push(material);
    return material;
  };

  const celMaterial = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), uLight: { value: new THREE.Vector3(0.5, 0.85, 0.35).normalize() }, ...shared },
    vertexShader: CEL_VERTEX, fragmentShader: CEL_FRAGMENT, fog: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const traceMaterial = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), ...shared },
    vertexShader: TRACE_VERTEX, fragmentShader: TRACE_FRAGMENT, fog: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  const inkLines = lines({ color: INK, linewidth: 2.2 });
  const neonLines = lines({ vertexColors: true, linewidth: 2.4 });

  // Sky, stars and the GENESIS spiral at the end of time.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), new THREE.ShaderMaterial({
    uniforms: { uBands: { value: ['#63e6ee', '#3fbdf0', '#4f86f2', '#6d59e6', '#8043cf', '#4e2596', '#190e4c'].map(color) }, uTime: shared.uTime },
    vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false,
  }));
  sky.renderOrder = -1;
  scene.add(sky);
  const starPositions: number[] = [], starRandom = random(99);
  for (let i = 0; i < 420; i++) {
    const a = starRandom() * Math.PI * 2, y = 0.42 + starRandom() * 0.58, r = Math.sqrt(1 - y * y);
    starPositions.push(Math.cos(a) * r * 1500, y * 1500, Math.sin(a) * r * 1500);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#e9fdff', size: 2, sizeAttenuation: false, fog: false, depthWrite: false }));
  sky.add(stars);

  const spiralPoints = (turns: number, outer: number, inner: number) => {
    const points: number[] = [], steps = turns * 8;
    for (let k = 0; k <= steps; k++) { const a = (k * Math.PI) / 4 + Math.PI / 8, r = outer - ((outer - inner) * k) / steps; points.push(r * Math.cos(a), r * Math.sin(a), 0); }
    return points;
  };
  const spiralColors = (count: number, from: THREE.Color, to: THREE.Color) => {
    const values: number[] = [];
    for (let i = 0; i < count; i++) { const c = from.clone().lerp(to, i / Math.max(1, count - 1)); values.push(c.r, c.g, c.b); }
    return values;
  };
  const beacon = new THREE.Group();
  beacon.position.set(0, 120, city.genesisZ - 620);
  const beaconSpiral = new Line2(new LineGeometry(), lines({ vertexColors: true, linewidth: 4, fog: false }));
  const beaconPoints = spiralPoints(6, 190, 20);
  beaconSpiral.geometry.setPositions(beaconPoints);
  beaconSpiral.geometry.setColors(spiralColors(beaconPoints.length / 3, color('#e6fdff'), color('#b08af4')));
  beacon.add(beaconSpiral);
  const waves: Line2[] = [];
  for (let i = 0; i < 3; i++) {
    const octagon = spiralPoints(1, 200, 200);
    const wave = new Line2(new LineGeometry(), lines({ color: '#e6fdff', linewidth: 2.5, fog: false, transparent: true, depthWrite: false }));
    wave.geometry.setPositions(octagon);
    waves.push(wave); beacon.add(wave);
  }
  scene.add(beacon);

  // The board and its districts.
  const length = city.startZ - city.genesisZ;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, length + 900).rotateX(-Math.PI / 2).translate(0, 0, (city.startZ + city.genesisZ) / 2), new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
      uBase: { value: color('#070f2a') }, uLine: { value: color('#1a3574') },
      uLaneColor: { value: empireIds.map(id => color(palettes[id].deep)) }, uLaneX: { value: empireIds.map(id => laneX[id]) },
    },
    vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, fog: true,
  }));
  scene.add(ground);

  const kit = new Kit(), neon: number[] = [], neonColors: number[] = [], traces = new Traces();
  const addNeon = (points: number[], tint: THREE.Color, closed = false) => {
    const count = points.length / 3;
    for (let i = 0; i < count - (closed ? 0 : 1); i++) {
      const j = (i + 1) % count;
      neon.push(points[i * 3], points[i * 3 + 1], points[i * 3 + 2], points[j * 3], points[j * 3 + 1], points[j * 3 + 2]);
      neonColors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b);
    }
  };
  const solids: Solid[] = [];
  const drones: { x: number; y: number; z: number; phase: number; tint: THREE.Color }[] = [];

  // Buildings: one per paper, in its empire's style.
  for (const b of city.buildings) {
    const c = colors(palettes[b.empire], (((b.seed % 11) - 5) * 0.008));
    const rnd = random(b.seed), H = b.height, { x, z } = b;
    let top = H, posterY = H + 6.6;
    if (b.empire === 'circuit') {
      kit.add(prism(4.9, 1.2, 8, x, 0, z), c.deep, c.bright, 0, H, 0);
      for (let side = 0; side < 4; side++) for (let k = -2; k <= 2; k++) {
        const a = (side * Math.PI) / 2, along = k * 1.25;
        kit.add(box(0.34, 0.42, 1.3, x + Math.cos(a) * 5.2 - Math.sin(a) * along, 0, z + Math.sin(a) * 5.2 + Math.cos(a) * along, -a), c.ink, c.accent, 0, H, 2, false);
      }
      const tiers = 2 + (b.seed % 3), weights = [0.44, 0.3, 0.26, 0.2].slice(0, tiers), sum = weights.reduce((s, w) => s + w, 0);
      let y = 1.2, r = 4.2, inner = r;
      weights.forEach((weight, t) => {
        const h = ((H - 1.2) * weight) / sum, sides = (b.seed >> t) & 1 ? 8 : 4, radius = sides === 4 ? r * 0.92 : r;
        kit.add(prism(radius, h, sides, x, y, z), c.deep, c.bright, 0, H, 1);
        if (t < tiers - 1) kit.add(prism(radius * 1.09, 0.34, sides, x, y + h - 0.17, z), c.ink, c.light, 0, H, 2);
        inner = radius * Math.cos(Math.PI / sides);
        y += h; r *= 0.76;
      });
      // An inductor spiral on the roof, inside the top tier's walls.
      const spiral = spiralPoints(2, inner * 0.9, 0.45), roof: number[] = [];
      for (let i = 0; i < spiral.length; i += 3) roof.push(x + spiral[i], H + 0.12, z + spiral[i + 1]);
      addNeon(roof, c.accent);
      if (b.paper.type === 'Journal') {
        kit.add(box(0.26, 5.5, 0.26, x + inner * 0.62, H, z + inner * 0.62), c.ink, c.light, 0, H, 2);
        kit.add(new THREE.OctahedronGeometry(0.45).translate(x + inner * 0.62, H + 5.8, z + inner * 0.62), c.ink, c.hot, 0, H, 2);
      }
      kit.add(box(0.4, 2.1, 0.4, x, H, z), c.ink, c.deep, 0, H, 0);
    } else if (b.empire === 'signal') {
      const mast = H * 0.78;
      kit.add(box(8.6, 1, 8.6, x, 0, z), c.deep, c.bright, 0, H, 0);
      kit.add(prism(3.5, mast - 1, 4, x, 1, z, 0.5), c.deep, c.bright, 0, H, 1);
      kit.add(prism(2.9, 0.7, 6, x, mast, z), c.ink, c.light, 0, H, 0);
      for (let face = 0; face < 4; face++) {
        const a = (face * Math.PI) / 2, zig: number[] = [];
        for (let k = 0; k <= 6; k++) {
          const t = k / 6, half = 3.5 * (1 - t * 0.5) * 0.707 * 1.02, y = 1 + t * (mast - 1), lateral = (k % 2 ? 1 : -1) * half * 0.8;
          zig.push(x + Math.cos(a) * half - Math.sin(a) * lateral, y, z + Math.sin(a) * half + Math.cos(a) * lateral);
        }
        addNeon(zig, c.accent);
      }
      // A hexagonal dish on the platform (a flat-faced cone), turned towards the lane and tilted up.
      const dish = new THREE.CylinderGeometry(3.1, 0.5, 1.3, 6, 1, true).translate(0, 0.65, 0);
      dish.rotateX(-Math.PI / 2 + 0.7).rotateY(b.side > 0 ? Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5).translate(x, mast + 3, z);
      kit.add(dish, c.accent, c.light, mast + 2, 3, 0);
      kit.add(box(0.3, 2.3, 0.3, x, mast + 0.7, z), c.ink, c.light, 0, H, 2);
      for (let i = 0; i < 9; i++) {
        const level = 0.8 + 2.4 * Math.abs(Math.sin(i * 0.7 + i * i * 0.12));
        kit.add(box(0.46, level, 0.46, x - 3.6 + i * 0.9, 1, z + 5.1), c.ink, c.accent, 0, H, 2, false);
      }
      top = mast + 0.7; posterY = mast + 9.4;
    } else {
      const tower = H * 0.8;
      kit.add(prism(5, 1.3, 6, x, 0, z), c.deep, c.bright, 0, H, 0);
      kit.add(prism(3.1, tower, 6, x, 1.3, z), c.deep, c.bright, 0, H, 1);
      kit.add(prism(3.6, 0.45, 6, x, 1.3 + tower * 0.45, z), c.ink, c.accent, 0, H, 2);
      const pad = 1.3 + tower;
      kit.add(prism(4.6, 0.5, 6, x, pad, z), c.mid, c.light, pad - 3, 3.5, 0);
      const ring: number[] = [];
      for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; ring.push(x + Math.cos(a) * 3.3, pad + 0.56, z + Math.sin(a) * 3.3); }
      addNeon(ring, c.accent, true);
      for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; kit.add(box(0.34, 0.34, 0.34, x + Math.cos(a) * 4.3, pad + 0.5, z + Math.sin(a) * 4.3), c.ink, c.hot, 0, H, 2, false); }
      kit.add(box(0.4, 2.1, 0.4, x, pad + 0.5, z), c.ink, c.deep, 0, H, 0);
      drones.push({ x: x + (rnd() > 0.5 ? 2.2 : -2.2), y: pad + 2.4, z: z + 2.2, phase: rnd() * Math.PI * 2, tint: c.hot });
      top = pad + 0.5; posterY = top + 6.6;
    }
    // Wires from the empire's bus into the building, plus a few short traces around it.
    const bus = laneX[b.empire], side = b.side;
    for (const dz of [-0.8, 0.8]) traces.add([[bus + side * 2.4, b.z + dz + 2.2], [bus + side * 4.6, b.z + dz], [b.x - side * (b.radius + 0.4), b.z + dz]], 0.28, c.bright);
    for (let k = 0; k < 3; k++) {
      const z0 = b.z - 3 + rnd() * 6, x1 = b.x + side * (b.radius + 2.5 + rnd() * 5), jog = (rnd() > 0.5 ? 1 : -1) * (3 + rnd() * 6);
      traces.add([[b.x + side * (b.radius + 0.4), z0], [x1, z0], [x1 + side * Math.abs(jog) * 0.5, z0 + jog], [x1 + side * Math.abs(jog) * 0.5, z0 + jog * 1.8]], 0.22, c.mid);
    }
    solids.push({ x, z, radius: b.radius, top, side: b.side, posterY, building: b, target: { kind: 'paper', paper: b.paper, empire: b.empire } });
  }

  // Year arches across the whole city: posts outside the districts, a beam over all three empires, a year board above each lane.
  const atlas = yearAtlas(city.years.map(year => year.year));
  const labelPositions: number[] = [], labelUvs: number[] = [], labelIndex: number[] = [];
  const addLabel = (i: number, cx: number, cy: number, cz: number, facing: 1 | -1) => {
    const u0 = (i % atlas.cols) / atlas.cols, v1 = 1 - Math.floor(i / atlas.cols) / atlas.rows, u1 = u0 + 1 / atlas.cols, v0 = v1 - 1 / atlas.rows, w = 3.8, h = 1.9;
    const base = labelPositions.length / 3;
    for (const [dx, dy, u, v] of [[-w, -h, u0, v0], [w, -h, u1, v0], [w, h, u1, v1], [-w, h, u0, v1]]) { labelPositions.push(cx + dx * facing, cy + dy, cz); labelUvs.push(u, v); }
    labelIndex.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const ink = color(INK);
  const archDeep = color('#1c2a6b'), archLight = color('#bdf6ff'), archDim = color('#5a7bc0');
  city.years.forEach((year, i) => {
    const glow = year.papers ? archLight : archDim;
    for (const side of [-1, 1]) {
      kit.add(box(1, 34, 1, side * 64, 0, year.z), archDeep, glow, 0, 36, 0);
      kit.add(prism(1.6, 0.8, 8, side * 64, 0, year.z), ink, archDeep, 0, 36, 0);
    }
    kit.add(box(129, 0.7, 0.9, 0, 34, year.z), ink, glow, 0, 36, 2);
    for (const empire of empireIds) {
      const x = laneX[empire];
      kit.add(box(8.6, 4.2, 0.4, x, 34.7, year.z), ink, ink, 0, 36, 0);
      addLabel(i, x, 36.8, year.z + 0.22, 1); addLabel(i, x, 36.8, year.z - 0.22, -1);
    }
    const pale = year.papers ? color('#bdf6ff') : color('#3f64a8');
    traces.add([[0, year.z], [-66, year.z]], 0.3, pale, false); traces.add([[0, year.z], [66, year.z]], 0.3, pale, false);
  });
  const labelGeometry = new THREE.BufferGeometry();
  labelGeometry.setAttribute('position', new THREE.Float32BufferAttribute(labelPositions, 3));
  labelGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(labelUvs, 2));
  labelGeometry.setIndex(labelIndex);
  scene.add(new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ map: texture(atlas.element), transparent: true, depthWrite: false })));

  // Each empire's banner hangs under the arch of the year its first paper appeared, above the flight path.
  for (const empire of empireIds) {
    const first = city.buildings.filter(b => b.empire === empire).sort((a, b) => b.z - a.z)[0];
    if (!first) continue;
    const gate = city.years.find(year => year.year === first.paper.year)!, x = laneX[empire], c = colors(palettes[empire]);
    for (const side of [-1, 1]) kit.add(box(0.2, 1.3, 0.2, x + side * 6.4, 33.1, gate.z), c.ink, c.light, 0, 36, 2, false);
    const banner = new THREE.MeshBasicMaterial({ map: texture(bannerCanvas(labels.empires[empire], empire)), alphaTest: 0.5 });
    for (const facing of [0, Math.PI]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), banner);
      plane.position.set(x, 31.3, gate.z + (facing ? -0.3 : 0.3)); plane.rotation.y = facing;
      scene.add(plane);
    }
  }

  // Buses: each empire's lane runs the whole timeline, then bends into GENESIS.
  for (const empire of empireIds) {
    const c = colors(palettes[empire]), x = laneX[empire];
    for (const offset of [-1.9, -0.95, 0, 0.95, 1.9]) traces.add([[x + offset, city.startZ + 60], [x + offset, city.endZ + 8], [x * 0.3 + offset * 0.8, city.genesisZ + 34], [x * 0.3 + offset * 0.8, city.genesisZ + 23]], 0.34, c.bright);
    for (const side of [-1, 1]) traces.add([[x + side * 19, city.startZ + 60], [x + side * 19, city.endZ + 8]], 0.2, c.mid, false);
  }

  // GENESIS: where the three empires meet.
  const g = colors(palettes.genesis), gz = city.genesisZ;
  kit.add(prism(22, 0.3, 8, 0, 0, gz), g.ink, g.deep, 0, 32, 0);
  let gy = 0.3;
  for (const [radius, h] of [[9, 12], [6.6, 10], [4.4, 8]]) {
    kit.add(prism(radius, h, 8, 0, gy, gz), g.deep, g.bright, 0, 31, 1);
    gy += h;
    kit.add(prism(radius * 1.09, 0.5, 8, 0, gy - 0.25, gz), g.ink, g.accent, 0, 31, 2);
  }
  const crown = new Line2(new LineGeometry(), lines({ vertexColors: true, linewidth: 3.2 }));
  const crownPoints = spiralPoints(5, 11, 1.2);
  crown.geometry.setPositions(crownPoints);
  crown.geometry.setColors(spiralColors(crownPoints.length / 3, g.bright, g.accent));
  crown.rotation.x = -Math.PI / 2; crown.position.set(0, gy + 0.6, gz);
  scene.add(crown);
  const genesisBanner = new THREE.MeshBasicMaterial({ map: texture(genesisCanvas(labels.genesisLine)), alphaTest: 0.5 });
  for (const facing of [0, Math.PI]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(22, 6.9), genesisBanner);
    plane.position.set(0, gy + 8, gz + (facing ? -0.05 : 0.05)); plane.rotation.y = facing;
    scene.add(plane);
  }
  solids.push({ x: 0, z: gz, radius: 9.5, top: gy, side: 0, posterY: gy + 8, building: null, target: { kind: 'genesis' } });

  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), armTurn = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1), spot = new THREE.Vector3();

  // Vias at trace ends and bends.
  const viaGeometry = new THREE.CircleGeometry(0.5, 8).rotateX(-Math.PI / 2);
  const vias = new THREE.InstancedMesh(viaGeometry, new THREE.MeshBasicMaterial({ color: '#ffffff' }), traces.vias.length);
  const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.2, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: INK }), traces.vias.length);
  traces.vias.forEach((via, i) => {
    vias.setMatrixAt(i, matrix.makeTranslation(via.x, 0.07, via.z)); vias.setColorAt(i, via.color);
    holes.setMatrixAt(i, matrix.makeTranslation(via.x, 0.09, via.z));
  });
  scene.add(traces.mesh(traceMaterial), vias, holes, kit.mesh(celMaterial));
  const outlineGeometry = new LineSegmentsGeometry();
  outlineGeometry.setPositions(kit.edges);
  scene.add(new LineSegments2(outlineGeometry, inkLines));
  const neonGeometry = new LineSegmentsGeometry();
  neonGeometry.setPositions(neon); neonGeometry.setColors(neonColors);
  scene.add(new LineSegments2(neonGeometry, neonLines));

  // Drones hovering over the landing pads: boxes and flat rotor rings only.
  const droneBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.34, 1.1), new THREE.MeshBasicMaterial({ color: '#f4efff' }), drones.length);
  const droneArms = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.12, 0.16), new THREE.MeshBasicMaterial({ color: INK }), drones.length * 2);
  const droneRotors = new THREE.InstancedMesh(new THREE.RingGeometry(0.34, 0.6, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), drones.length * 4);
  drones.forEach((drone, i) => { droneBody.setColorAt(i, color('#f4efff')); for (let k = 0; k < 4; k++) droneRotors.setColorAt(i * 4 + k, drone.tint); });
  scene.add(droneBody, droneArms, droneRotors);

  // Posters: one picture per paper, always turned towards the camera.
  const posterSize = Math.min(window.innerWidth, window.innerHeight) < 700 ? 384 : 512;
  const posterGeometry = new THREE.PlaneGeometry(7.2, 9);
  const posters = solids.filter(solid => solid.building).map(solid => {
    const b = solid.building!;
    const map = texture(posterCanvas({
      year: b.paper.year, kind: b.paper.type === 'Journal' ? labels.journal : labels.conference, title: b.paper.title, venue: b.paper.venue,
      empireName: labels.empires[b.empire], empire: b.empire, glyph: b.glyph, seed: b.seed, keywords: b.paper.keywords,
    }, posterSize));
    const mesh = new THREE.Mesh(posterGeometry, new THREE.MeshBasicMaterial({ map, alphaTest: 0.5 }));
    mesh.position.set(solid.x, solid.posterY, solid.z);
    scene.add(mesh);
    return { solid, mesh };
  });

  // The signal: a faceted core, two rings, a soft light and a differential pair of sine trails.
  const avatar = new THREE.Group();
  const coreGeometry = new THREE.OctahedronGeometry(0.8);
  coreGeometry.computeVertexNormals();
  const coreShade: number[] = [], light = new THREE.Vector3(0.5, 0.85, 0.35).normalize(), normals = coreGeometry.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    const l = normals.getX(i) * light.x + normals.getY(i) * light.y + normals.getZ(i) * light.z;
    const c = color(l > 0.45 ? '#ffffff' : l > -0.1 ? '#9ff6ff' : '#41dce8');
    coreShade.push(c.r, c.g, c.b);
  }
  coreGeometry.setAttribute('color', new THREE.Float32BufferAttribute(coreShade, 3));
  const core = new THREE.Mesh(coreGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  const coreEdges = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(coreGeometry)), lines({ color: '#0a3a66', linewidth: 1.8, fog: false }));
  core.add(coreEdges);
  const ringMaterial = (tint: string) => new THREE.MeshBasicMaterial({ color: tint, side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false });
  const pulses = ['#41dce8', '#b08af4'].map(tint => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 48).rotateX(-Math.PI / 2), ringMaterial(tint));
    avatar.add(ring);
    return ring;
  });
  const electrons = [0, 1, 2].map(i => {
    const orbit = new THREE.Group();
    orbit.rotation.set(0.5 + i * 0.9, i * 2.1, 0.3 * i);
    const electron = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), new THREE.MeshBasicMaterial({ color: i === 1 ? '#ffe45c' : '#e6fdff', fog: false }));
    electron.position.x = 1.35;
    orbit.add(electron);
    avatar.add(orbit);
    return orbit;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture(glowCanvas()), color: '#dffcff', transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  halo.scale.set(4.6, 4.6, 1);
  const sparkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture(sparkleCanvas()), transparent: true, depthWrite: false, fog: false }));
  avatar.add(sparkle, core, halo);
  scene.add(avatar);
  const TRAIL = 34, TRAIL_STEP = 0.34;
  const history = Array.from({ length: TRAIL }, () => new THREE.Vector3());
  const ribbon = new THREE.BufferGeometry(), ribbonPosition = new Float32Array(2 * TRAIL * 2 * 3);
  const ribbonT: number[] = [], ribbonV: number[] = [], ribbonPair: number[] = [], ribbonIndex: number[] = [];
  for (let pair = 0; pair < 2; pair++) for (let i = 0; i < TRAIL; i++) {
    for (const v of [-1, 1]) { ribbonT.push(i / (TRAIL - 1)); ribbonV.push(v); ribbonPair.push(pair); }
    const a = (pair * TRAIL + i) * 2;
    if (i < TRAIL - 1) ribbonIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  ribbon.setAttribute('position', new THREE.BufferAttribute(ribbonPosition, 3).setUsage(THREE.DynamicDrawUsage));
  ribbon.setAttribute('aT', new THREE.Float32BufferAttribute(ribbonT, 1));
  ribbon.setAttribute('aV', new THREE.Float32BufferAttribute(ribbonV, 1));
  ribbon.setAttribute('aPair', new THREE.Float32BufferAttribute(ribbonPair, 1));
  ribbon.setIndex(ribbonIndex);
  const trail = new THREE.Mesh(ribbon, new THREE.ShaderMaterial({
    uniforms: { uHead: { value: color('#f4feff') }, uA: { value: color('#41dce8') }, uB: { value: color('#b08af4') }, uInk: { value: color(INK) } },
    vertexShader: TRAIL_VERTEX, fragmentShader: TRAIL_FRAGMENT, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  trail.frustumCulled = false;
  scene.add(trail);
  const side = new THREE.Vector3(), tangent = new THREE.Vector3(), toCamera = new THREE.Vector3(), point = new THREE.Vector3(), right = new THREE.Vector3(), lift = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const marker = new THREE.Mesh(new THREE.RingGeometry(1, 1.24, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#41dce8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(marker);
  const dwellRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.16, 96), new THREE.ShaderMaterial({ uniforms: { uProgress: { value: 0 }, uColor: { value: color('#ffe45c') } }, vertexShader: RING_VERTEX, fragmentShader: RING_FRAGMENT, side: THREE.DoubleSide }));
  dwellRing.rotation.x = -Math.PI / 2;
  dwellRing.visible = false;
  scene.add(dwellRing);

  // State.
  const pos = new THREE.Vector3(0, 9, city.startZ), vel = new THREE.Vector3();
  let yaw = 0, yawRate = 0, time = 0, clock = 0, moved = false;
  const keys = new Set<string>(), external = { forward: 0, turn: 0, lift: 0 };
  const spawn = pos.clone();
  const introCam = new THREE.Vector3(0, 12, city.startZ + 46), introFrom = new THREE.Vector3(0, 13, city.startZ - 70), introVia = new THREE.Vector3(-14, 22, city.startZ - 12);
  const introTo = introCam.clone().add(new THREE.Vector3(0, -0.2, -1.7));
  const HOLD = 0.6, APPROACH = 1.8;
  let mode: 'intro' | 'fly' = reducedMotion ? 'fly' : 'intro', introTime = 0;
  let pilot: { from: THREE.Vector3; via: THREE.Vector3; to: THREE.Vector3; yaw: number; t: number; duration: number; target: Solid } | null = null;
  let focus: Solid | null = null, prompted: Solid | null = null, dwell = 0, lastYear = 0, lastEmpire: EmpireId | 'genesis' | null | undefined;
  const look = new THREE.Vector3(), lookTarget = new THREE.Vector3(), want = new THREE.Vector3(), tmp = new THREE.Vector3();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  history.forEach(point => point.copy(reducedMotion ? pos : introFrom));

  const bezier = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number, out: THREE.Vector3) =>
    out.set((1 - t) ** 2 * a.x + 2 * t * (1 - t) * b.x + t * t * c.x, (1 - t) ** 2 * a.y + 2 * t * (1 - t) * b.y + t * t * c.y, (1 - t) ** 2 * a.z + 2 * t * (1 - t) * b.z + t * t * c.z);
  const forward = (angle: number, out = tmp) => out.set(-Math.sin(angle), 0, -Math.cos(angle));
  const chase = (snap: boolean) => {
    const f = forward(yaw).clone(), back = focus?.building ? 8.5 : 11;
    want.set(pos.x - f.x * back, clamp(pos.y + 4.4, 1.6, CAMERA_CEILING), pos.z - f.z * back);
    look.set(pos.x + f.x * 9, pos.y + 1.2, pos.z + f.z * 9);
    if (focus) look.lerp(tmp.set(focus.x, focus.posterY, focus.z), 0.3);
    // Keep the camera outside buildings and clear of the posters above them.
    for (const solid of solids) {
      const dx = want.x - solid.x, dz = want.z - solid.z, distance = Math.hypot(dx, dz);
      const min = want.y < solid.top + 1.5 ? solid.radius + 1.8 : want.y < solid.posterY + 5.5 ? 4.6 : 0;
      if (distance < min) {
        const nx = distance ? dx / distance : 1, nz = distance ? dz / distance : 0;
        want.x = solid.x + nx * min; want.z = solid.z + nz * min;
      }
    }
    if (snap) { camera.position.copy(want); lookTarget.copy(look); }
    return f;
  };
  const markMoved = () => { if (!moved) { moved = true; events.moved(); } };
  const cancelPilot = () => { pilot = null; };
  const pilotTo = (solid: Solid) => {
    let to: THREE.Vector3, heading: number;
    if (solid.building) {
      to = new THREE.Vector3(laneX[solid.building.empire] + 0.5 * solid.side, clamp(solid.top + 3, 7, ARC), solid.z + 1.5);
      heading = Math.atan2(-(solid.x - to.x), -(solid.z - to.z));
    } else { to = new THREE.Vector3(0, Math.min(solid.top + 5, CEILING), solid.z + solid.radius + 9); heading = 0; }
    const distance = pos.distanceTo(to);
    // Arc over the buildings but stay under the year arches (beam at 34), so the camera never runs into a year board.
    const arc = Math.max(Math.min(Math.max(pos.y, to.y) + 12, ARC), pos.y, to.y);
    pilot = { from: pos.clone(), via: pos.clone().lerp(to, 0.5).setY(arc), to, yaw: heading, t: 0, duration: clamp(distance / 28, 0.9, 3.5), target: solid };
    vel.set(0, 0, 0);
    markMoved();
  };
  const order = solids.filter(solid => solid.building).sort((a, b) => a.building!.paper.year - b.building!.paper.year || b.z - a.z || a.x - b.x);
  const genesis = solids.find(solid => !solid.building)!;

  const flightKeys: Record<string, [keyof typeof external, number]> = {
    KeyW: ['forward', 1], ArrowUp: ['forward', 1], KeyS: ['forward', -1], ArrowDown: ['forward', -1],
    KeyA: ['turn', -1], ArrowLeft: ['turn', -1], KeyD: ['turn', 1], ArrowRight: ['turn', 1],
    Space: ['lift', 1], KeyE: ['lift', 1], ShiftLeft: ['lift', -1], ShiftRight: ['lift', -1], KeyQ: ['lift', -1],
  };
  const onKey = (event: KeyboardEvent) => {
    if (!(event.code in flightKeys) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space' && document.activeElement instanceof HTMLButtonElement) return;
    event.preventDefault();
    if (event.type === 'keydown') { keys.add(event.code); cancelPilot(); } else keys.delete(event.code);
  };
  const clearKeys = () => keys.clear();
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', clearKeys);
  const axis = (name: keyof typeof external) => {
    let value = external[name];
    for (const code of keys) if (flightKeys[code][0] === name) value += flightKeys[code][1];
    return clamp(value, -1, 1);
  };

  function sense(dt: number) {
    let best: Solid | null = null, bestDistance = NEAR;
    for (const solid of solids) {
      if (pos.y > solid.top + 20) continue;
      const distance = Math.hypot(pos.x - solid.x, pos.z - solid.z) - solid.radius;
      if (distance < bestDistance) { best = solid; bestDistance = distance; }
    }
    if (best !== focus) {
      focus = best; dwell = 0;
      if (prompted && prompted !== best) prompted = null;
      events.near(best ? best.target : null);
    }
    if (focus && prompted !== focus) {
      dwell = vel.length() < SLOW && !pilot ? dwell + dt : Math.max(0, dwell - dt * 2);
      if (dwell >= DWELL_SECONDS) { prompted = focus; events.prompt(focus.target); }
    }
    dwellRing.visible = Boolean(focus);
    if (focus) {
      dwellRing.position.set(focus.x, 0.14, focus.z);
      dwellRing.scale.setScalar(focus.radius + 2.4);
      (dwellRing.material as THREE.ShaderMaterial).uniforms.uProgress.value = prompted === focus ? 1 : dwell / DWELL_SECONDS;
    }
  }

  function fly(dt: number) {
    const input = { forward: axis('forward'), turn: axis('turn'), lift: axis('lift') };
    if (input.forward || input.turn || input.lift) { markMoved(); cancelPilot(); }
    if (pilot) {
      pilot.t = Math.min(1, pilot.t + dt / pilot.duration);
      const e = pilot.t < 0.5 ? 2 * pilot.t * pilot.t : 1 - (-2 * pilot.t + 2) ** 2 / 2;
      const previous = pos.clone();
      bezier(pilot.from, pilot.via, pilot.to, e, pos);
      const heading = pilot.t < 0.7 && Math.hypot(pos.x - previous.x, pos.z - previous.z) > 0.01 ? Math.atan2(-(pos.x - previous.x), -(pos.z - previous.z)) : pilot.yaw;
      const turn = angleTo(yaw, heading) * (1 - Math.exp(-dt * 5));
      yaw += turn; yawRate = turn / Math.max(dt, 1e-3);
      if (pilot.t >= 1) { yaw = pilot.yaw; yawRate = 0; pilot = null; }
    } else {
      yawRate += (-input.turn * 1.9 - yawRate) * (1 - Math.exp(-dt * 6));
      yaw += yawRate * dt;
      const f = forward(yaw);
      vel.x += f.x * input.forward * 44 * dt; vel.z += f.z * input.forward * 44 * dt; vel.y += input.lift * 30 * dt;
      vel.multiplyScalar(Math.exp(-dt * 1.7));
      pos.addScaledVector(vel, dt);
      for (const solid of solids) {
        if (pos.y > solid.top + 1.2) continue;
        const dx = pos.x - solid.x, dz = pos.z - solid.z, distance = Math.hypot(dx, dz), min = solid.radius + 1.3;
        if (distance >= min) continue;
        const nx = distance ? dx / distance : 1, nz = distance ? dz / distance : 0, into = vel.x * nx + vel.z * nz;
        pos.x = solid.x + nx * min; pos.z = solid.z + nz * min;
        if (into < 0) { vel.x -= into * nx; vel.z -= into * nz; }
      }
    }
    pos.set(clamp(pos.x, -80, 80), clamp(pos.y, 2, CEILING), clamp(pos.z, city.genesisZ - 40, city.startZ + 50));
    sense(dt);
    chase(false);
    camera.position.lerp(want, 1 - Math.exp(-dt * 5));
    lookTarget.lerp(look, 1 - Math.exp(-dt * 6));
    camera.lookAt(lookTarget);
    if (!reducedMotion) camera.rotateZ(clamp(yawRate * 0.1, -0.2, 0.2));
    const year = city.years.reduce((current, entry) => (entry.z >= pos.z - 0.5 ? entry.year : current), city.years[0].year);
    const empire = pos.z < city.endZ ? 'genesis' : empireIds.find(id => Math.abs(pos.x - laneX[id]) < 20) ?? null;
    if (year !== lastYear || empire !== lastEmpire) { lastYear = year; lastEmpire = empire; events.place(year, empire); }
    events.progress(clamp((city.startZ - pos.z) / length, 0, 1), focus && prompted !== focus ? dwell / DWELL_SECONDS : focus ? 1 : 0);
  }

  function intro(dt: number) {
    introTime += dt;
    const u = clamp((introTime - HOLD) / APPROACH, 0, 1);
    bezier(introFrom, introVia, introTo, u ** 1.8, pos);
    camera.position.copy(introCam);
    camera.lookAt(tmp.set(0, 11, city.startZ - 60).lerp(pos, 0.8));
    if (u >= 1) {
      mode = 'fly';
      pos.copy(spawn); vel.set(0, 0, -4); yaw = 0;
      history.forEach(point => point.copy(pos));
      chase(true);
      camera.position.set(pos.x, pos.y + 1.6, pos.z + 4.5); // lock on close behind the signal, then ease back
      events.impact(); events.ready();
    }
  }

  function animate(dt: number) {
    if (!reducedMotion) time += dt;
    clock += dt;
    shared.uTime.value = time;
    shared.uSignal.value.copy(pos);
    if (mode === 'intro') intro(dt); else fly(dt);
    const hover = reducedMotion || mode === 'intro' ? 0 : Math.sin(clock * 2.2) * 0.16;
    avatar.position.set(pos.x, pos.y + hover, pos.z);
    avatar.rotation.y = yaw;
    const spin = reducedMotion ? 0 : mode === 'intro' ? 7 : 1.6;
    core.rotation.y += dt * spin;
    electrons.forEach((orbit, i) => { orbit.rotation.y += dt * spin * (1.6 + i * 0.4); });
    pulses.forEach((ring, i) => {
      const phase = reducedMotion ? 0.35 + i * 0.3 : (clock * 0.9 + i / 2) % 1;
      ring.scale.setScalar(0.9 + phase * 1.9);
      (ring.material as THREE.MeshBasicMaterial).opacity = reducedMotion ? 0.7 : 1 - phase;
    });
    halo.scale.setScalar(4.6);
    avatar.scale.setScalar(mode === 'intro' ? 1.7 : 1);
    sparkle.visible = mode === 'intro';
    if (sparkle.visible) {
      sparkle.scale.setScalar(5.5 * (1 + 0.18 * Math.sin(clock * 14)));
      (sparkle.material as THREE.SpriteMaterial).rotation = clock * 1.5;
    }
    // Trails: the newest point at the head, an alternating sine between the pair.
    // Sample the path by distance (not by frame), so the trail has the same length at any frame rate.
    for (let gap = avatar.position.distanceTo(history[1]), guard = 0; gap >= TRAIL_STEP && guard < TRAIL; gap = avatar.position.distanceTo(history[1]), guard++) {
      for (let i = TRAIL - 1; i > 1; i--) history[i].copy(history[i - 1]);
      history[1].lerp(avatar.position, TRAIL_STEP / gap);
    }
    history[0].copy(avatar.position);
    if (vel.length() < 2 && !pilot && mode === 'fly') for (let i = 1; i < TRAIL; i++) history[i].lerp(history[i - 1], 1 - Math.exp(-dt * 5));
    const speed = clamp(vel.length() / 8, pilot || mode === 'intro' ? 1 : 0, 1);
    for (let pair = 0; pair < 2; pair++) for (let i = 0; i < TRAIL; i++) {
      const t = i / (TRAIL - 1), radius = (0.12 + 0.62 * t) * speed, phase = i * 0.55 - clock * 8 + pair * Math.PI;
      tangent.subVectors(history[Math.max(0, i - 1)], history[Math.min(TRAIL - 1, i + 1)]);
      right.crossVectors(tangent, up);
      if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
      right.normalize(); lift.crossVectors(right, tangent).normalize();
      if (lift.lengthSq() < 0.5) lift.set(0, 1, 0);
      point.copy(history[i]).addScaledVector(right, Math.cos(phase) * radius).addScaledVector(lift, Math.sin(phase) * radius);
      toCamera.subVectors(camera.position, point);
      side.crossVectors(tangent, toCamera);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      side.normalize().multiplyScalar(0.22 * (1 - t * 0.8));
      const a = ((pair * TRAIL + i) * 2) * 3;
      ribbonPosition[a] = point.x - side.x; ribbonPosition[a + 1] = point.y - side.y; ribbonPosition[a + 2] = point.z - side.z;
      ribbonPosition[a + 3] = point.x + side.x; ribbonPosition[a + 4] = point.y + side.y; ribbonPosition[a + 5] = point.z + side.z;
    }
    (ribbon.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    marker.position.set(pos.x, 0.12, pos.z);
    (marker.material as THREE.MeshBasicMaterial).opacity = clamp(1 - pos.y / 44, 0.2, 0.9);
    for (const { solid, mesh } of posters) {
      mesh.rotation.y = Math.atan2(camera.position.x - mesh.position.x, camera.position.z - mesh.position.z);
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, solid === focus ? 1.16 : 1, 1 - Math.exp(-dt * 6)));
    }
    drones.forEach((drone, i) => {
      const y = drone.y + (reducedMotion ? 0 : Math.sin(clock * 1.6 + drone.phase) * 0.35), turn = reducedMotion ? drone.phase : clock * 0.4 + drone.phase;
      quaternion.setFromAxisAngle(tmp.set(0, 1, 0), turn);
      droneBody.setMatrixAt(i, matrix.compose(spot.set(drone.x, y, drone.z), quaternion, scale));
      for (let k = 0; k < 2; k++) {
        armTurn.setFromAxisAngle(tmp.set(0, 1, 0), turn + Math.PI / 4 + (k * Math.PI) / 2);
        droneArms.setMatrixAt(i * 2 + k, matrix.compose(spot.set(drone.x, y, drone.z), armTurn, scale));
      }
      for (let k = 0; k < 4; k++) {
        const a = turn + Math.PI / 4 + (k * Math.PI) / 2;
        droneRotors.setMatrixAt(i * 4 + k, matrix.compose(spot.set(drone.x + Math.cos(a) * 1.5, y + 0.12, drone.z - Math.sin(a) * 1.5), quaternion, scale));
      }
    });
    droneBody.instanceMatrix.needsUpdate = true; droneArms.instanceMatrix.needsUpdate = true; droneRotors.instanceMatrix.needsUpdate = true;
    beaconSpiral.rotation.z = -time * 0.12;
    crown.rotation.z = time * 0.5;
    waves.forEach((wave, i) => {
      const phase = (time * 0.25 + i / 3) % 1;
      wave.scale.setScalar(0.3 + phase * 1.6);
      (wave.material as LineMaterial).opacity = reducedMotion ? 0 : (1 - phase) * 0.8;
    });
    sky.position.copy(camera.position);
  }

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth, height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.fov = camera.aspect < 0.75 ? 74 : 62;
    camera.updateProjectionMatrix();
    for (const material of lineMaterials) material.resolution.set(width, height);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  if (mode === 'fly') { chase(true); events.ready(); }
  // On a slow device, render fewer pixels rather than drop frames: step the pixel ratio down towards 1.
  let frame = 0, last = performance.now(), slowFrames = 0;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const elapsed = (now - last) / 1000, dt = Math.min(elapsed, 0.05);
    last = now;
    if (document.hidden) return;
    slowFrames = elapsed > 1 / 30 && elapsed < 0.5 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 45 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25)); resize(); slowFrames = 0; }
    animate(dt);
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(loop);

  return {
    timeline: {
      start: city.startZ, end: city.genesisZ, years: city.years.map(({ year, z }) => ({ year, z })),
      papers: order.map(solid => ({ id: solid.building!.paper.id, year: solid.building!.paper.year, title: solid.building!.paper.title, empire: solid.building!.empire, z: solid.z })),
    },
    setInput(input) { Object.assign(external, input); if (input.forward || input.turn || input.lift) { cancelPilot(); markMoved(); } },
    nudge(amount, lift) { cancelPilot(); markMoved(); vel.addScaledVector(forward(yaw), amount); vel.y += lift; },
    step(direction) {
      if (mode !== 'fly') return;
      // Step from where the signal is heading if it is already on its way, otherwise from where it is.
      const current = pilot ? pilot.target : focus;
      const index = current?.building ? order.indexOf(current) : -1;
      let target: Solid | undefined;
      if (index >= 0) target = direction > 0 ? order[index + 1] ?? genesis : order[index - 1];
      else if (current === genesis) target = direction < 0 ? order[order.length - 1] : undefined;
      else if (direction > 0) target = order.find(solid => solid.z < pos.z - 2) ?? genesis;
      else target = [...order].reverse().find(solid => solid.z > pos.z + 2);
      if (target) pilotTo(target);
    },
    flyTo(id) {
      const target = order.find(solid => solid.building!.paper.id === id);
      if (target && mode === 'fly') pilotTo(target);
    },
    pick(clientX, clientY) {
      if (mode !== 'fly') return false;
      const rect = canvas.getBoundingClientRect();
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const { origin, direction } = raycaster.ray;
      let best: Solid | null = null, nearest = Infinity;
      for (const { solid, mesh } of posters) {
        const hit = raycaster.intersectObject(mesh, false)[0];
        if (hit && hit.distance < nearest) { best = solid; nearest = hit.distance; }
      }
      // Buildings count as upright cylinders from the ground to the roof: a tap on a wall or on the roof.
      for (const solid of solids) {
        const ox = origin.x - solid.x, oz = origin.z - solid.z, a = direction.x ** 2 + direction.z ** 2, hits: number[] = [];
        if (a > 1e-9) {
          const b = 2 * (ox * direction.x + oz * direction.z), c = ox * ox + oz * oz - solid.radius ** 2, disc = b * b - 4 * a * c;
          if (disc >= 0) hits.push((-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a));
        }
        if (Math.abs(direction.y) > 1e-9) hits.push((solid.top - origin.y) / direction.y);
        for (const t of hits) {
          if (t <= 0 || t >= nearest) continue;
          const x = ox + direction.x * t, y = origin.y + direction.y * t, z = oz + direction.z * t;
          if (y >= -0.01 && y <= solid.top + 0.01 && x * x + z * z <= solid.radius ** 2 + 0.01) { best = solid; nearest = t; }
        }
      }
      if (best) pilotTo(best);
      return Boolean(best);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', clearKeys);
      scene.traverse(object => {
        const item = object as THREE.Mesh;
        item.geometry?.dispose();
        const materials = Array.isArray(item.material) ? item.material : item.material ? [item.material] : [];
        materials.forEach(material => material.dispose());
      });
      textures.forEach(entry => entry.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
