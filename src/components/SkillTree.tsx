"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

import { SKILL_TREE } from "@/lib/skillTreeData";
import { cycleStatus, loadProgress, saveProgress, type ProgressMap } from "@/lib/progress";
import type { SkillNode, SkillStatus } from "@/lib/types";

type Selected = {
  skill: SkillNode;
  status: SkillStatus;
} | null;

function hexToCss(hex: number) {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

export default function SkillTree() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);

  const [progress, setProgress] = useState<ProgressMap>({});
  const [selected, setSelected] = useState<Selected>(null);

  const domainById = useMemo(() => {
    const m = new Map(SKILL_TREE.domains.map((d) => [d.id, d] as const));
    return m;
  }, []);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 避免 dev hot reload 疊加 multiple canvases
    el.innerHTML = "";

    const app = new PIXI.Application();
    appRef.current = app;

    (async () => {
      await app.init({
        width: el.clientWidth,
        height: el.clientHeight,
        background: "#0b1020",
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });

      el.appendChild(app.canvas);

      const viewport = new Viewport({
        screenWidth: el.clientWidth,
        screenHeight: el.clientHeight,
        worldWidth: 1400,
        worldHeight: 900,
        events: app.renderer.events
      });

      viewportRef.current = viewport;
      app.stage.addChild(viewport);

      viewport.drag().pinch().wheel().decelerate();

      // pixel-ish grid background
      const grid = new PIXI.Graphics();
      grid.rect(0, 0, 1400, 900).fill({ color: 0x0b1020 });
      const step = 40;
      for (let x = 0; x <= 1400; x += step) {
        grid.moveTo(x, 0).lineTo(x, 900);
      }
      for (let y = 0; y <= 900; y += step) {
        grid.moveTo(0, y).lineTo(1400, y);
      }
      grid.stroke({ width: 1, color: 0x101a33, alpha: 1 });
      viewport.addChild(grid);

      const edges = new PIXI.Graphics();
      viewport.addChild(edges);

      const nodesLayer = new PIXI.Container();
      viewport.addChild(nodesLayer);

      // Draw edges
      const skillById = new Map(SKILL_TREE.skills.map((s) => [s.id, s] as const));
      for (const s of SKILL_TREE.skills) {
        for (const pre of s.prereq) {
          const a = skillById.get(pre);
          if (!a) continue;
          edges.moveTo(a.x + 64, a.y + 16);
          edges.lineTo(s.x, s.y + 16);
        }
      }
      edges.stroke({ width: 3, color: 0x233057, alpha: 1 });

      // Draw nodes
      const nodeSprites: Array<{ skill: SkillNode; g: PIXI.Graphics; label: PIXI.Text }> = [];

      const makeNode = (skill: SkillNode) => {
        const domain = domainById.get(skill.domainId);
        const color = domain?.color ?? 0x94a3b8;

        const g = new PIXI.Graphics();
        g.x = skill.x;
        g.y = skill.y;

        // (will be filled by refresh)
        g.rect(0, 0, 128, 32);

        const label = new PIXI.Text({
          text: skill.name,
          style: {
            fontFamily: "monospace",
            fontSize: 12,
            fill: "#dbeafe",
            align: "left"
          }
        });
        label.x = 8;
        label.y = 8;

        g.eventMode = "static";
        g.cursor = "pointer";
        g.on("pointertap", () => {
          const current = progress[skill.id] ?? "todo";
          setSelected({ skill, status: current });
          setProgress((p) => {
            const next = { ...p, [skill.id]: cycleStatus(p[skill.id]) };
            saveProgress(next);
            return next;
          });
        });

        // domain marker
        const marker = new PIXI.Graphics();
        marker.rect(0, 0, 6, 32).fill({ color });
        g.addChild(marker);
        g.addChild(label);

        nodesLayer.addChild(g);
        nodeSprites.push({ skill, g, label });
      };

      for (const s of SKILL_TREE.skills) makeNode(s);

      const refresh = () => {
        for (const { skill, g } of nodeSprites) {
          const st = progress[skill.id] ?? "todo";
          const domain = domainById.get(skill.domainId);
          const base = domain?.color ?? 0x94a3b8;

          g.clear();

          const fill = st === "done" ? 0x123b2a : st === "learning" ? 0x1a2a52 : 0x0f172a;
          const border = st === "done" ? base : 0x334155;

          // shadow
          g.rect(3, 3, 128, 32).fill({ color: 0x000000, alpha: 0.35 });
          // body
          g.rect(0, 0, 128, 32).fill({ color: fill });
          g.rect(0, 0, 128, 32).stroke({ width: 2, color: border, alpha: 1 });

          // left marker
          g.rect(0, 0, 6, 32).fill({ color: base });

          // lock-ish overlay when prereq not done
          const locked = skill.prereq.some((id) => (progress[id] ?? "todo") !== "done");
          if (locked && st !== "done") {
            g.rect(0, 0, 128, 32).fill({ color: 0x000000, alpha: 0.25 });
          }
        }
      };

      refresh();

      const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        app.renderer.resize(w, h);
        viewport.resize(w, h, 1400, 900);
      };

      window.addEventListener("resize", onResize);
      app.ticker.add(() => refresh());

      // start position
      viewport.moveCenter(700, 450);
      viewport.setZoom(1);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    })();

    return () => {
      viewportRef.current?.destroy();
      appRef.current?.destroy(true);
      appRef.current = null;
      viewportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainById]);

  const stats = useMemo(() => {
    const total = SKILL_TREE.skills.length;
    const done = SKILL_TREE.skills.filter((s) => (progress[s.id] ?? "todo") === "done").length;
    const learning = SKILL_TREE.skills.filter((s) => (progress[s.id] ?? "todo") === "learning").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, learning, pct };
  }, [progress]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <aside
        style={{
          padding: 16,
          borderLeft: "1px solid #1f2a44",
          background: "#070b17",
          color: "#e5e7eb",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 14, color: "#93c5fd" }}>Frontend Skill Tree</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>v{SKILL_TREE.version}</div>
        </div>

        <div style={{ marginTop: 12, lineHeight: 1.6 }}>
          <div>Progress: <b>{stats.pct}%</b></div>
          <div>Done: <b>{stats.done}</b> / {stats.total}</div>
          <div>Learning: <b>{stats.learning}</b></div>
        </div>

        <hr style={{ margin: "16px 0", borderColor: "#1f2a44" }} />

        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
          點技能節點可循環切換狀態：todo → learning → done
        </div>

        {selected ? (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.skill.name}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>{selected.skill.desc}</div>
            <div style={{ marginTop: 10, fontSize: 12 }}>
              Domain: <span style={{ color: hexToCss(domainById.get(selected.skill.domainId)?.color ?? 0x94a3b8) }}>{domainById.get(selected.skill.domainId)?.name}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>Level: {selected.skill.level}</div>
            <div style={{ marginTop: 6, fontSize: 12 }}>Prereq: {selected.skill.prereq.length ? selected.skill.prereq.join(", ") : "(none)"}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            點左邊技能節點看詳情。
          </div>
        )}

        <hr style={{ margin: "16px 0", borderColor: "#1f2a44" }} />

        <button
          onClick={() => {
            setProgress({});
            saveProgress({});
            setSelected(null);
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#111827",
            border: "1px solid #334155",
            color: "#e5e7eb",
            cursor: "pointer"
          }}
        >
          Reset progress
        </button>
      </aside>
    </div>
  );
}
