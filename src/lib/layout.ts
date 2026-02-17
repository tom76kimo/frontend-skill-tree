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
  bottomY?: number;
  topY?: number;
  nodeW?: number;
  nodeH?: number;
  xPadding?: number;
}): { positioned: PositionedSkill[]; worldHeight: number; worldWidth: number } {
  const worldWidth = opts?.worldWidth ?? 1400;
  const bottomY = opts?.bottomY ?? 760;
  const topY = opts?.topY ?? 120;
  const nodeW = opts?.nodeW ?? 128;
  const nodeH = opts?.nodeH ?? 32;
  const xPadding = opts?.xPadding ?? 40;

  const levels = [1, 2, 3] as const;

  // 排序：先 topo，再依 level 穩定分層
  const ordered = topoSort(skills);

  const byLevel = new Map<number, SkillNode[]>();
  for (const lv of levels) byLevel.set(lv, []);
  for (const s of ordered) {
    byLevel.get(s.level)?.push(s);
  }

  const levelCount = levels.length;
  const gapY = levelCount > 1 ? (bottomY - topY) / (levelCount - 1) : 0;

  const positioned: PositionedSkill[] = [];

  for (const lv of levels) {
    const items = byLevel.get(lv) ?? [];
    const count = items.length;

    const usableW = worldWidth - xPadding * 2;
    const stepX = count <= 1 ? 0 : usableW / (count - 1);
    const y = bottomY - (lv - 1) * gapY; // lv=1 在底部，lv=3 在上面

    items.forEach((s, idx) => {
      const x = count <= 1 ? worldWidth / 2 - nodeW / 2 : xPadding + idx * stepX - nodeW / 2;
      positioned.push({ ...s, x, y: y - nodeH / 2 });
    });
  }

  const worldHeight = Math.max(bottomY + 120, 900);
  return { positioned, worldHeight, worldWidth };
}
