export type Domain = {
  id: string;
  name: string;
  color: number; // 0xRRGGBB
};

export type SkillStatus = "todo" | "learning" | "done";

export type SkillNode = {
  id: string;
  domainId: string;
  name: string;
  level: 1 | 2 | 3;
  desc: string;
  prereq: string[];
  // 位置可由 layout 自動計算；若提供則可當作 manual override（目前 v1 以自動為主）
  x?: number;
  y?: number;
  tags?: string[];
};

export type SkillTree = {
  version: string;
  domains: Domain[];
  skills: SkillNode[];
};
