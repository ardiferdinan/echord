// Geometry for "blobby" cards: a rectangle with rectangular cuts at its corners (or top-center),
// every vertex rounded by a tangent arc. Convex vs concave falls out of the turn direction, so the
// outline is smooth everywhere: no sharp tips where a cut meets the edge.

export type Corner = "tl" | "tr" | "bl" | "br" | "t";
export type Cut = { w: number; h: number };
type P = [number, number];

export function blobPoints(W: number, H: number, cuts: Partial<Record<Corner, Cut>>): P[] {
  const { tl, tr, bl, br, t } = cuts;
  const pts: P[] = [];
  // clockwise from the top-left
  if (tl) pts.push([0, tl.h], [tl.w, tl.h], [tl.w, 0]);
  else pts.push([0, 0]);
  if (t) {
    const x0 = (W - t.w) / 2, x1 = (W + t.w) / 2;
    pts.push([x0, 0], [x0, t.h], [x1, t.h], [x1, 0]);
  }
  if (tr) pts.push([W - tr.w, 0], [W - tr.w, tr.h], [W, tr.h]);
  else pts.push([W, 0]);
  if (br) pts.push([W, H - br.h], [W - br.w, H - br.h], [W - br.w, H]);
  else pts.push([W, H]);
  if (bl) pts.push([bl.w, H], [bl.w, H - bl.h], [0, H - bl.h]);
  else pts.push([0, H]);
  return pts;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** SVG path of the polygon with each corner rounded by up to `radius` (clamped to half of each adjacent edge). */
export function roundedPath(pts: P[], radius: number) {
  const n = pts.length;
  const seg = pts.map((v, i) => {
    const p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    const l1 = Math.hypot(v[0] - p[0], v[1] - p[1]), l2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
    const d1: P = [(v[0] - p[0]) / l1, (v[1] - p[1]) / l1];
    const d2: P = [(q[0] - v[0]) / l2, (q[1] - v[1]) / l2];
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const a: P = [v[0] - d1[0] * r, v[1] - d1[1] * r];
    const b: P = [v[0] + d2[0] * r, v[1] + d2[1] * r];
    const sweep = d1[0] * d2[1] - d1[1] * d2[0] > 0 ? 1 : 0; // right turn on screen = convex
    return { a, b, r, sweep };
  });
  let d = `M${r2(seg[n - 1].b[0])} ${r2(seg[n - 1].b[1])}`;
  for (const s of seg) d += `L${r2(s.a[0])} ${r2(s.a[1])}A${r2(s.r)} ${r2(s.r)} 0 0 ${s.sweep} ${r2(s.b[0])} ${r2(s.b[1])}`;
  return d + "Z";
}

export const blobPath = (W: number, H: number, cuts: Partial<Record<Corner, Cut>>, radius: number) =>
  roundedPath(blobPoints(W, H, cuts), radius);
