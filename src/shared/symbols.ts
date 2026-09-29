// Schematic symbols shared by the illustrations (story scene, design loop, stage screens): coils and ground in SVG path syntax.
export const coil = (x: number, y: number, turns: number, span: number) =>
  `M${x} ${y}` + `c0-7 ${span / turns} -7 ${span / turns} 0`.repeat(turns);
export const verticalCoil = (x: number, y: number, turns: number, span: number) =>
  `M${x} ${y}` + `c7 0 7 ${span / turns} 0 ${span / turns}`.repeat(turns);
export const ground = (x: number, y: number) => `M${x - 6} ${y}h12M${x - 3.5} ${y + 3}h7M${x - 1} ${y + 6}h2`;
