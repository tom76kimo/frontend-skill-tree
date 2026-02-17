import type { SkillNode } from "./types";

export type PositionedSkill = SkillNode & { x: number; y: number };

function topoSort(skills: SkillNode[]): SkillNode[] {
  const byId = new Map(skills.map((s) => [s.id, s] as const));
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();

  for (const s of skills) {
    indeg.set(s.id, 0);
    out.set(s.id, []);
  }

  for (const s of skills) {
    for (const p of s.prereq) {
      if (!byId.has(p)) continue;
      indeg.set(s.id, (indeg.get(s.id) ?? 0) + 1);
      out.get(p)?.push(s.id);
    }
  }

  const q: string[] = [];
  for (const [id, d] of indeg) if (d === 0) q.push(id);

  const res: SkillNode[] = [];
  while (q.length) {
    const id = q.shift()!;
    const s = byId.get(id);
    if (s) res.push(s);
    for (const nxt of out.get(id) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) q.push(nxt);
    }
  }

  // 若有 cycle 或不完整，fallback to original order
  return res.length === skills.length ? res : skills;
}

export function layoutBottomUp(skills: SkillNode[], opts?: {
  worldWidth?: number;
  worldHeight?: number;
}): { positioned: PositionedSkill[]; worldHeight: number; worldWidth: number } {
  const worldWidth = opts?.worldWidth ?? 1400;
  const worldHeight = opts?.worldHeight ?? 1200;

  // Style B: enforce a single "tree" silhouette (root -> trunk -> branches -> canopy)
  const ordered = topoSort(skills);

  const lv1 = ordered.filter((s) => s.level === 1);
  const lv2 = ordered.filter((s) => s.level === 2);
  const lv3 = ordered.filter((s) => s.level === 3);

  const xCenter = worldWidth / 2;

  // Zones (percent of height)
  const yRoot = worldHeight * 0.90;
  const yTrunk = worldHeight * 0.66;
  const yBranch = worldHeight * 0.42;
  const yCanopy = worldHeight * 0.24;

  // Slight trunk sway for organic feel
  const trunkX = (t: number) => xCenter + Math.sin(t * 2.2) * 18;

  const positioned: PositionedSkill[] = [];

  const reorderCenterOut = (items: SkillNode[]) => {
    const n = items.length;
    const ids = [...items];
    const centerFirst: SkillNode[] = [];
    const mid = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const j = i % 2 === 0 ? mid + i / 2 : mid - (i + 1) / 2;
      if (ids[j]) centerFirst.push(ids[j]);
    }
    return centerFirst;
  };

  const placeRows = (items: SkillNode[], y: number, spread: number, rows: number, rowGap: number) => {
    if (items.length === 0) return;
    const orderedItems = reorderCenterOut(items);

    const perRow = Math.ceil(orderedItems.length / rows);
    for (let row = 0; row < rows; row++) {
      const slice = orderedItems.slice(row * perRow, (row + 1) * perRow);
      const n = slice.length;
      if (n === 0) continue;
      const step = n === 1 ? 0 : (spread * 2) / (n - 1);
      const yy = y + (row - (rows - 1) / 2) * rowGap;
      slice.forEach((s, idx) => {
        const x = xCenter - spread + idx * step;
        positioned.push({ ...s, x, y: yy });
      });
    }
  };

  // Root: narrow (1 row)
  placeRows(lv1, yRoot, 220, 1, 0);

  // Trunk: 1~2 rows depending on count
  placeRows(lv2, yTrunk, 360, lv2.length > 10 ? 2 : 1, 110);

  // Branch/Canopy: split into multiple rows to reduce crowding
  placeRows(lv3, yBranch, 520, lv3.length > 12 ? 2 : 1, 130);
  if (lv3.length > 22) {
    // extra canopy row for very dense top
    placeRows(lv3.slice(Math.floor(lv3.length / 2)), yCanopy, 460, 1, 0);
  }

  // Nudge nodes onto a "tree" silhouette curve by level
  const result = positioned.map((s) => {
    const t = s.level === 1 ? 0.07 : s.level === 2 ? 0.50 : 0.83;
    const tx = trunkX(t);
    const dx = s.x - xCenter;
    // pull slightly towards trunk to avoid extreme spread looking like a row
    const x = tx + dx * (s.level === 3 ? 0.92 : 0.82);
    return { ...s, x };
  });

  return { positioned: result, worldHeight, worldWidth };
}
