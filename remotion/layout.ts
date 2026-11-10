// the part of a diagram scene that layout needs
export type DiagramData = { nodes: { id: string; label: string }[]; edges: { from: string; to: string }[] };

/* ---------- layout ---------- */

export const W = 1280;
export const H = 720;
const TOP = 150; // below the title
const BOTTOM = 100; // room for the "From your slide" label
const MARGIN_X = 56;
const BAND_GAP = 64; // channel between the two rows when a diagram wraps
const MAX_COLS = 5; // more layers than this wrap into a second row
const ARROW_GAP = 6;

type Pt = { x: number; y: number };
type Box = { id: string; label: string; x: number; y: number; w: number; h: number; band: number; col: number };
type Edge = { from: string; to: string; d: string };

// rounded-corner path through orthogonal points
function roundedPath(pts: Pt[], r = 12) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const r1 = Math.min(r, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2);
    const p = { x: b.x - Math.sign(b.x - a.x) * r1, y: b.y - Math.sign(b.y - a.y) * r1 };
    const q = { x: b.x + Math.sign(c.x - b.x) * r1, y: b.y + Math.sign(c.y - b.y) * r1 };
    d += ` L ${p.x} ${p.y} Q ${b.x} ${b.y} ${q.x} ${q.y}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

// Layered left-to-right layout: columns by longest path from a source,
// ordered to reduce crossings, wrapped into two rows when there are many columns.
// Neighbouring columns get smooth curves; every other edge runs through the gaps
// between columns and the lanes above/below rows, so no arrow passes through a box.
export function layoutPlan(plan: DiagramData) {
  const ids = plan.nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const seen = new Set<string>();
  const edges = plan.edges.filter((e) => {
    const key = `${e.from}>${e.to}`;
    if (!idSet.has(e.from) || !idSet.has(e.to) || e.from === e.to || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // edges that close a cycle are drawn as back edges and ignored for layering
  const out = new Map(ids.map((id) => [id, [] as string[]]));
  edges.forEach((e) => out.get(e.from)!.push(e.to));
  const state = new Map<string, number>();
  const back = new Set<string>();
  const dfs = (u: string) => {
    state.set(u, 1);
    for (const v of out.get(u)!) {
      if (state.get(v) === 1) back.add(`${u}>${v}`);
      else if (!state.get(v)) dfs(v);
    }
    state.set(u, 2);
  };
  ids.forEach((id) => !state.get(id) && dfs(id));
  const forward = edges.filter((e) => !back.has(`${e.from}>${e.to}`));

  // longest-path layers
  const layer = new Map(ids.map((id) => [id, 0]));
  const indeg = new Map(ids.map((id) => [id, 0]));
  forward.forEach((e) => indeg.set(e.to, indeg.get(e.to)! + 1));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  while (queue.length) {
    const u = queue.shift()!;
    for (const e of forward.filter((f) => f.from === u)) {
      layer.set(e.to, Math.max(layer.get(e.to)!, layer.get(u)! + 1));
      indeg.set(e.to, indeg.get(e.to)! - 1);
      if (indeg.get(e.to) === 0) queue.push(e.to);
    }
  }
  const numLayers = Math.max(...layer.values()) + 1;
  const cols: string[][] = Array.from({ length: numLayers }, () => []);
  ids.forEach((id) => cols[layer.get(id)!].push(id));

  // barycenter ordering against the previous column
  for (let sweep = 0; sweep < 3; sweep++) {
    for (let l = 1; l < numLayers; l++) {
      const prev = cols[l - 1];
      const score = (id: string) => {
        const preds = forward.filter((e) => e.to === id && prev.includes(e.from)).map((e) => prev.indexOf(e.from));
        return preds.length ? preds.reduce((a, b) => a + b, 0) / preds.length : cols[l].indexOf(id);
      };
      const scores = new Map(cols[l].map((id) => [id, score(id)]));
      cols[l].sort((a, b) => scores.get(a)! - scores.get(b)!);
    }
  }

  // geometry
  const bands = numLayers > MAX_COLS ? 2 : 1;
  const perBand = Math.ceil(numLayers / bands);
  const bandH = (H - TOP - BOTTOM - (bands - 1) * BAND_GAP) / bands;
  const cw = (W - 2 * MARGIN_X) / perBand;
  const boxW = Math.min(270, cw - 72);
  const maxRows = Math.max(...cols.map((c) => c.length));
  const rowH = bandH / maxRows;
  const boxH = Math.min(112, rowH - 26);

  const labelOf = new Map(plan.nodes.map((n) => [n.id, n.label]));
  const boxes = new Map<string, Box>();
  const bandTop = (b: number) => TOP + b * (bandH + BAND_GAP);
  const x0 = (b: number) => {
    const n = Math.min(perBand, numLayers - b * perBand);
    return (W - n * cw) / 2;
  };

  cols.forEach((col, l) => {
    const band = Math.floor(l / perBand);
    const c = l % perBand;
    const cx = x0(band) + cw * (c + 0.5);
    col.forEach((id, j) => {
      const cy = bandTop(band) + bandH / 2 + (j - (col.length - 1) / 2) * rowH;
      boxes.set(id, { id, label: labelOf.get(id)!, x: cx - boxW / 2, y: cy - boxH / 2, w: boxW, h: boxH, band, col: c });
    });
  });

  // lanes and gap slots are handed out in order so parallel routes never overlap
  const counters = new Map<string, number>();
  const next = (key: string) => {
    const k = counters.get(key) ?? 0;
    counters.set(key, k + 1);
    return k;
  };
  const gapStep = Math.min(10, (cw - boxW - 32) / 6);

  const routed: Edge[] = edges.map((e) => {
    const a = boxes.get(e.from)!;
    const b = boxes.get(e.to)!;
    const s = { x: a.x + a.w, y: a.y + a.h / 2 };
    const t = { x: b.x - ARROW_GAP, y: b.y + b.h / 2 };
    const isBack = back.has(`${e.from}>${e.to}`);
    const adjacent = !isBack && a.band === b.band && b.col === a.col + 1;

    if (adjacent) {
      const mid = (s.x + t.x) / 2;
      return { ...e, d: `M ${s.x} ${s.y} C ${mid} ${s.y}, ${mid} ${t.y}, ${t.x} ${t.y}` };
    }

    let laneY: number;
    if (a.band !== b.band) {
      laneY = bandTop(0) + bandH + BAND_GAP / 2 + (next("channel") - 1) * 10;
    } else if (isBack && a.band < bands - 1) {
      // below a row only when the channel between rows is there; the bottom of the frame holds the slide label
      laneY = bandTop(a.band) + bandH + 18 + next(`below${a.band}`) * 10;
    } else {
      laneY = bandTop(a.band) - 18 - next(`above${a.band}`) * 10;
    }
    const g1 = s.x + 16 + next(`out${a.band}:${a.col}`) * gapStep;
    const g2 = b.x - 16 - ARROW_GAP - next(`in${b.band}:${b.col}`) * gapStep;
    const pts = [s, { x: g1, y: s.y }, { x: g1, y: laneY }, { x: g2, y: laneY }, { x: g2, y: t.y }, t];
    return { ...e, d: roundedPath(pts) };
  });

  return { boxes: [...boxes.values()], edges: routed };
}

// split a label into at most two balanced lines
export function wrapLabel(label: string) {
  const words = label.split(/\s+/);
  if (words.length < 2 || label.length <= 12) return [label];
  let best = [label];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(" ");
    const l2 = words.slice(i).join(" ");
    const diff = Math.abs(l1.length - l2.length);
    if (diff < bestDiff) [best, bestDiff] = [[l1, l2], diff];
  }
  return best;
}
