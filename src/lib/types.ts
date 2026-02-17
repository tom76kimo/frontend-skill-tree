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
  x: number;
  y: number;
  tags?: string[];
};

export type SkillTree = {
  version: string;
  domains: Domain[];
  skills: SkillNode[];
};
