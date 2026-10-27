import type { ReactNode } from 'react';
import { C, B } from '../Brand';

// The GENESIS robot of the alternative ending, a calm, strong rescuer drawn as a bust of brushed grey metal with dark
// steel outlines, violet joints and a lit chip. A metal skull with cheekbones and deep eye sockets whose eyes glow, a
// skull nose and a row of even teeth; a segmented neck, a chest with a chip, a bead-chain arm on the left and a
// machine arm on the right (upper arm with bands and a piston, a geared elbow, a hydraulic forearm, a wrist ring
// and a skeletal hand). The body runs off the bottom of the picture. The right arm is built of parts that hang from each
// other (upper arm, forearm, hand), each turning about its own joint; every joint at 0 degrees is the pose with the hand
// raised, index finger up. Coordinates are the robot's own: 1000 wide, 1000 tall.
export type Pose = Record<string, number>;
export const ROBOT_SIZE = [1000, 1000] as const;
/** Scene points: the eyes (centres), an eye's half size, the face's centre and the index finger's tip. */
export const ROBOT = { eyes: [[425, 318], [575, 318]] as const, eye: [60, 28] as const, face: [500, 330] as const, finger: [871, 264] as [number, number] };

// Metal: a light and a mid grey for the plates, a dark steel for outlines and recesses, the chip's cyan as the one accent.
const LINE = '#1b2631', FILL = '#8d9aa8', DEEP = '#3a4652', BAND = '#6c7987', JOINT = B.brand3, TOOTH = '#eef3f7', CHIP = C.cyan, INK = 5;
const PLATE = 'url(#robot-metal)';
const detail = { stroke: LINE, strokeOpacity: .45, strokeWidth: 3, fill: 'none', strokeLinecap: 'round' } as const;
const outline = { fill: PLATE, stroke: LINE, strokeWidth: INK, strokeLinejoin: 'round' } as const;

/** A rounded limb from one point to another: outline, then fill, so neighbours overlap cleanly. */
const limb = (x1: number, y1: number, x2: number, y2: number, r: number, fill = FILL) => <g>
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={LINE} strokeWidth={2 * r + 2 * INK} strokeLinecap="round" />
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={fill} strokeWidth={2 * r} strokeLinecap="round" />
</g>;
const joint = (x: number, y: number, r: number) => <g>
  <circle cx={x} cy={y} r={r} fill={DEEP} stroke={JOINT} strokeWidth={INK} />
  <circle cx={x} cy={y} r={r * .38} fill={JOINT} fillOpacity={.8} />
</g>;
/** A geared joint: a ring of teeth around a joint. */
const gear = (x: number, y: number, r: number) => <g>
  {Array.from({ length: 12 }, (_, i) => <rect key={i} x={x - 7} y={y - r - 9} width={14} height={18} rx={3} fill={DEEP} stroke={JOINT} strokeWidth={3} transform={`rotate(${i * 30} ${x} ${y})`} />)}
  {joint(x, y, r)}
</g>;
/** Bands across a limb from a to b: n rings at even steps. */
const bands = (x1: number, y1: number, x2: number, y2: number, r: number, n: number) => {
  const len = Math.hypot(x2 - x1, y2 - y1), [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
  return Array.from({ length: n }, (_, i) => { const t = (i + 1) / (n + 1), cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
    return <line key={i} x1={cx - uy * (r + 2) - ux * 7} y1={cy + ux * (r + 2) - uy * 7} x2={cx + uy * (r + 2) - ux * 7} y2={cy - ux * (r + 2) - uy * 7} stroke={LINE} strokeWidth={10} strokeLinecap="round" />; });
};
/** A four-point star centred on (x, y). */
const star = (x: number, y: number, r: number) => <path d={`M${x} ${y - r}L${x + r * .3} ${y - r * .3}L${x + r} ${y}L${x + r * .3} ${y + r * .3}L${x} ${y + r}L${x - r * .3} ${y + r * .3}L${x - r} ${y}L${x - r * .3} ${y - r * .3}Z`} fill={JOINT} />;

// A skull of metal: a round cranium, cheekbones out at the sides and a narrower jaw.
const HEAD = 'M500 60C642 60 702 170 698 292C696 362 670 402 642 422L622 502C602 542 562 558 500 558C438 558 398 542 378 502L358 422C330 402 304 362 302 292C298 170 358 60 500 60Z';

/** The head: a metal skull with a crown seam, deep eye sockets with glowing eyes, cheekbones, temple hollows, a skull
 * nose and a jaw with a row of even teeth. */
function Head() {
  const teeth = [436, 457, 478, 499, 520, 541];
  return <g>
    <defs>
      <linearGradient id="robot-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c9d2db" /><stop offset=".45" stopColor="#94a1ae" /><stop offset="1" stopColor="#5f6c79" /></linearGradient>
      <radialGradient id="robot-face" cx=".42" cy=".32" r=".8"><stop offset="0" stopColor="#dde4ea" /><stop offset=".55" stopColor="#a2aebb" /><stop offset="1" stopColor="#5e6a77" /></radialGradient>
      <clipPath id="robot-skull"><path d={HEAD} /></clipPath>
    </defs>
    <path d={HEAD} fill="url(#robot-face)" stroke={LINE} strokeWidth={INK} />
    <g clipPath="url(#robot-skull)">
      {/* Temple hollows and the shade under the cheekbones. */}
      {[-1, 1].map(d => <g key={d}>
        <ellipse cx={500 + d * 182} cy={318} rx={34} ry={62} fill={DEEP} opacity={.35} />
        <path d={`M${500 + d * 150} 392Q${500 + d * 110} 430 ${500 + d * 96} 500`} stroke={DEEP} strokeOpacity={.3} strokeWidth={22} fill="none" strokeLinecap="round" />
      </g>)}
    </g>
    {/* The crown seam and the jaw's seams. */}
    <path d="M500 64V200M358 420Q406 428 424 520M642 420Q594 428 576 520" {...detail} stroke={LINE} strokeOpacity={.4} />
    {/* Eye sockets: the skull's orbits, deep and round, the eyes glowing in them. */}
    {ROBOT.eyes.map(([x, y], i) => { const d = i ? 1 : -1;
      return <g key={x}>
        <path d={`M${x - 80} ${y - 4}C${x - 76} ${y - 44} ${x + 76} ${y - 48} ${x + 80} ${y - 6}C${x + 84} ${y + 36} ${x + d * 30} ${y + 50} ${x} ${y + 46}C${x - d * 30} ${y + 50} ${x - 84} ${y + 36} ${x - 80} ${y - 4}Z`} fill={DEEP} stroke={LINE} strokeWidth={INK} />
        <ellipse cx={x} cy={y} rx={ROBOT.eye[0]} ry={ROBOT.eye[1]} fill="#1d5fa8" fillOpacity={.85} />
        <ellipse cx={x} cy={y} rx={ROBOT.eye[0] * .55} ry={ROBOT.eye[1] * .55} fill="none" stroke="#9fd6ff" strokeWidth={3} strokeOpacity={.85} />
        <circle cx={x} cy={y} r={7} fill="#e9f6ff" />
        {/* The cheekbone under the socket, out to the temple. */}
        <path d={`M${x - d * 40} ${y + 58}Q${x + d * 40} ${y + 50} ${x + d * 104} ${y + 18}`} stroke="#e4eaf0" strokeOpacity={.7} strokeWidth={9} fill="none" strokeLinecap="round" />
      </g>; })}
    {/* The skull nose. */}
    <path d="M500 374C490 390 480 404 484 413C488 420 496 418 500 410C504 418 512 420 516 413C520 404 510 390 500 374Z" fill={DEEP} stroke={LINE} strokeWidth={4} strokeLinejoin="round" />
    {/* The mouth: a dark slot with an upper and a lower row of even teeth, hinge bolts at the corners. */}
    <rect x={420} y={438} width={160} height={66} rx={14} fill="#11181f" stroke={LINE} strokeWidth={INK} />
    {teeth.map(x => <g key={x}><rect x={x - 8} y={443} width={18} height={26} rx={3} fill={TOOTH} stroke={LINE} strokeWidth={2} /><rect x={x - 8} y={473} width={18} height={26} rx={3} fill={TOOTH} stroke={LINE} strokeWidth={2} /></g>)}
    {[404, 596].map(x => <g key={x}><circle cx={x} cy={471} r={12} fill={DEEP} stroke={LINE} strokeWidth={4} /><circle cx={x} cy={471} r={4} fill={JOINT} /></g>)}
  </g>;
}

/** The body: the bead-chain left arm, the torso with its chip, the shoulders and the segmented neck. */
function Body() {
  // The left arm: a chain of round links with stars, hanging from the shoulder and off the picture.
  const chain = [[300, 680], [262, 722], [234, 772], [216, 826], [206, 882], [204, 938], [210, 994], [220, 1050]];
  const pins = [770, 805, 840, 875, 910];
  return <g>
    <path d={chain.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')} stroke={LINE} strokeWidth={14} fill="none" strokeLinejoin="round" />
    <path d={chain.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')} stroke={DEEP} strokeWidth={6} fill="none" strokeLinejoin="round" />
    {chain.slice(1).map(([x, y]) => <g key={y}><circle cx={x} cy={y} r={24} fill={FILL} stroke={LINE} strokeWidth={INK} />{star(x, y, 13)}</g>)}
    {/* The torso: shoulders down past the picture's edge, with ribs. */}
    <path d="M300 640L700 640L676 1100L324 1100Z" {...outline} />
    {[0, 1, 2, 3].map(i => <g key={i}><path d={`M${336 + i * 4} ${720 + i * 46}Q${364} ${708 + i * 46} ${396} ${716 + i * 46}`} {...detail} strokeWidth={6} />
      <path d={`M${664 - i * 4} ${720 + i * 46}Q${636} ${708 + i * 46} ${604} ${716 + i * 46}`} {...detail} strokeWidth={6} /></g>)}
    {/* The chip on the chest: pins, traces from the die and a lit core. */}
    {pins.map(y => <g key={y}><line x1={404} x2={424} y1={y} y2={y} stroke={CHIP} strokeWidth={8} strokeLinecap="round" /><line x1={576} x2={596} y1={y} y2={y} stroke={CHIP} strokeWidth={8} strokeLinecap="round" /></g>)}
    <rect x={422} y={748} width={156} height={184} rx={20} fill={DEEP} stroke={LINE} strokeWidth={INK} />
    <path d="M470 790H436M470 830H436M470 870H436M470 905H436M530 790H564M530 830H564M530 870H564M530 905H564" {...detail} stroke={CHIP} />
    <rect x={466} y={784} width={68} height={118} rx={10} fill="#0b2238" stroke={CHIP} strokeWidth={4} />
    <circle cx={500} cy={843} r={24} fill={CHIP} fillOpacity={.18} stroke={CHIP} strokeWidth={3} />
    <circle cx={500} cy={843} r={9} fill={CHIP} />
    <rect x={292} y={624} width={416} height={40} rx={20} fill={FILL} stroke={LINE} strokeWidth={INK} />
    {/* The neck: discs on a spine, with two cables from the jaw to the shoulders. */}
    <path d="M440 520C432 570 404 600 372 628M560 520C568 570 596 600 628 628" stroke={JOINT} strokeOpacity={.7} strokeWidth={7} fill="none" strokeLinecap="round" />
    <rect x={488} y={540} width={24} height={90} fill={DEEP} stroke={LINE} strokeWidth={3} />
    {[552, 576, 600].map(y => <rect key={y} x={462} y={y} width={76} height={16} rx={8} fill={FILL} stroke={LINE} strokeWidth={INK} />)}
    {joint(300, 650, 34)}
  </g>;
}

/** A skeletal finger from (x, y) up along angle a (degrees from straight up): three bones with joints between them. */
const finger = (x: number, y: number, a: number, lengths: number[]) => {
  const r = a * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r);
  let px = x, py = y;
  return <g>{lengths.map((l, i) => { const qx = px + ux * l, qy = py + uy * l, bone = <g key={i}>{limb(px, py, qx, qy, 7 - i)}<circle cx={qx} cy={qy} r={5 - i} fill={JOINT} /></g>;
    [px, py] = [qx, qy]; return bone; })}</g>;
};

/** The right arm, part by part: its pivot, its parent and its drawing. */
const PARTS: { name: string; parent: string | null; pivot: [number, number] | null; draw: () => ReactNode }[] = [
  { name: 'body', parent: null, pivot: null, draw: () => <><Body /><Head /></> },
  { name: 'upper_arm', parent: 'body', pivot: [700, 650], draw: () => <g>
    {limb(700, 650, 900, 650, 30)}{bands(700, 650, 900, 650, 30, 3)}
    {/* The piston along the upper arm. */}
    <line x1={736} y1={606} x2={866} y2={606} stroke={LINE} strokeWidth={12} strokeLinecap="round" /><line x1={736} y1={606} x2={800} y2={606} stroke={DEEP} strokeWidth={5} strokeLinecap="round" />
    <line x1={736} y1={606} x2={736} y2={624} stroke={LINE} strokeWidth={6} /><line x1={866} y1={606} x2={866} y2={624} stroke={LINE} strokeWidth={6} />
    {joint(700, 650, 36)}
  </g> },
  { name: 'forearm', parent: 'upper_arm', pivot: [900, 650], draw: () => <g>
    {/* The hydraulic forearm: a cylinder below, a bright rod above. */}
    {limb(900, 650, 900, 540, 27)}{limb(900, 545, 900, 440, 15, BAND)}{bands(900, 650, 900, 540, 27, 2)}
    {gear(900, 650, 30)}
  </g> },
  { name: 'hand', parent: 'forearm', pivot: [900, 440], draw: () => <g>
    {/* The wrist ring, a palm plate and skeletal fingers: the index finger nearest the thumb. */}
    <rect x={872} y={426} width={56} height={24} rx={8} fill={DEEP} stroke={JOINT} strokeWidth={4} />
    {finger(878, 362, -4, [40, 32, 26])}{finger(899, 360, 0, [44, 34, 26])}{finger(920, 362, 4, [40, 32, 24])}{finger(938, 368, 9, [32, 26, 20])}
    {finger(866, 404, -52, [30, 26])}
    <rect x={862} y={356} width={86} height={72} rx={16} fill={FILL} stroke={LINE} strokeWidth={INK} />
    <path d="M878 372V412M899 372V412M920 372V412" {...detail} />
    {joint(900, 440, 18)}
  </g> },
];

function Part({ name, pose }: { name: string; pose: Pose }) {
  const part = PARTS.find(p => p.name === name)!, turn = pose[name] ?? 0;
  const body = <>{part.draw()}{PARTS.filter(p => p.parent === name).map(p => <Part key={p.name} name={p.name} pose={pose} />)}</>;
  return part.pivot && turn ? <g transform={`rotate(${turn} ${part.pivot[0]} ${part.pivot[1]})`}>{body}</g> : <g>{body}</g>;
}

/** The whole robot in its own coordinates (ROBOT_SIZE). */
export function Robot({ pose }: { pose: Pose }) {
  return <Part name="body" pose={pose} />;
}

/** Where a point of a part lies once the pose has turned its chain of joints. */
export function posed(name: string, point: [number, number], pose: Pose): [number, number] {
  let [x, y] = point;
  for (let part = PARTS.find(p => p.name === name); part; part = PARTS.find(p => p.name === part!.parent)) {
    const turn = (pose[part.name] ?? 0) * Math.PI / 180;
    if (!part.pivot || !turn) continue;
    const [px, py] = part.pivot, dx = x - px, dy = y - py;
    [x, y] = [px + dx * Math.cos(turn) - dy * Math.sin(turn), py + dx * Math.sin(turn) + dy * Math.cos(turn)];
  }
  return [x, y];
}
