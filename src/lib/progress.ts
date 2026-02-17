import { SkillStatus } from "./types";

const KEY = "frontend-skill-tree:progress:v1";

export type ProgressMap = Record<string, SkillStatus>;

export function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(progress));
}

export function cycleStatus(s: SkillStatus | undefined): SkillStatus {
  // todo -> learning -> done -> todo
  if (!s || s === "todo") return "learning";
  if (s === "learning") return "done";
  return "todo";
}
