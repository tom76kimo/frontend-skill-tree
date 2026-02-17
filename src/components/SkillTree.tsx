"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

import styles from "./SkillTree.module.css";
import { SKILL_TREE } from "@/lib/skillTreeData";
import { layoutBottomUp } from "@/lib/layout";
import { TOKENS } from "@/lib/tokens";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const { positioned, worldWidth, worldHeight } = layoutBottomUp(SKILL_TREE.skills);

    // 避免 dev hot reload 疊加 multiple canvases
    el.innerHTML = "";

    const app = new PIXI.Application();
    appRef.current = app;

    (async () => {
      await app.init({
        width: el.clientWidth,
        height: el.clientHeight,
        background: `#${TOKENS.color.bg.base.toString(16).padStart(6, "0")}`,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });

      el.appendChild(app.canvas);

      const viewport = new Viewport({
        screenWidth: el.clientWidth,
        screenHeight: el.clientHeight,
        worldWidth,
        worldHeight,
        events: app.renderer.events,
        // mobile: 不要讓 viewport 在邊界卡住
        passiveWheel: false
      });

      viewportRef.current = viewport;
      app.stage.addChild(viewport);

      viewport.drag().pinch().wheel().decelerate();

      // --- Background layers (Style B: readable RPG UI) ---
      const bg = new PIXI.Container();
      viewport.addChild(bg);

      const base = new PIXI.Graphics();
      base.rect(0, 0, worldWidth, worldHeight).fill({ color: TOKENS.color.bg.base });
      bg.addChild(base);

      // soft fog blobs
      const fog = new PIXI.Graphics();
      for (let i = 0; i < 12; i++) {
        fog.circle((i / 12) * worldWidth + 60, worldHeight * 0.3 + (i % 4) * 26, 220 + (i % 5) * 24)
          .fill({ color: TOKENS.color.bg.fog, alpha: 0.06 });
      }
      bg.addChild(fog);

      // vignette
      const vignette = new PIXI.Graphics();
      vignette.rect(0, 0, worldWidth, worldHeight).fill({ color: TOKENS.color.bg.vignette, alpha: 0.22 });
      vignette.alpha = 0.35;
      bg.addChild(vignette);

      // particles
      const particles = new PIXI.Container();
      bg.addChild(particles);
      const sparkles: Array<{ g: PIXI.Graphics; vx: number; vy: number }> = [];
      for (let i = 0; i < 34; i++) {
        const p = new PIXI.Graphics();
        p.circle(0, 0, 1 + (i % 2)).fill({ color: TOKENS.color.magic.primary, alpha: 0.18 });
        p.x = Math.random() * worldWidth;
        p.y = Math.random() * worldHeight;
        particles.addChild(p);
        sparkles.push({ g: p, vx: (Math.random() - 0.5) * 0.10, vy: -0.04 - Math.random() * 0.07 });
      }

      // Layers for branches/nodes
      const edgesLayer = new PIXI.Container();
      viewport.addChild(edgesLayer);

      const nodesLayer = new PIXI.Container();
      viewport.addChild(nodesLayer);

      // Draw edges as smooth curved branches (Style B)
      const skillById = new Map(positioned.map((s) => [s.id, s] as const));
      for (const s of positioned) {
        for (const pre of s.prereq) {
          const a = skillById.get(pre);
          if (!a) continue;

          const ax = a.x;
          const ay = a.y;
          const bx = s.x;
          const by = s.y;

          const width = a.level === 1 ? TOKENS.size.branch.trunk : a.level === 2 ? TOKENS.size.branch.branch : TOKENS.size.branch.twig;

          const c1x = ax;
          const c1y = ay - Math.abs(by - ay) * 0.35;
          const c2x = bx;
          const c2y = by + Math.abs(by - ay) * 0.35;

          const branch = new PIXI.Graphics();
          // shadow
          branch.moveTo(ax + 2, ay + 2);
          branch.bezierCurveTo(c1x + 2, c1y + 2, c2x + 2, c2y + 2, bx + 2, by + 2);
          branch.stroke({ width: width + 2, color: 0x000000, alpha: 0.22 });

          // main line
          branch.clear();
          branch.moveTo(ax, ay);
          branch.bezierCurveTo(c1x, c1y, c2x, c2y, bx, by);
          branch.stroke({ width, color: TOKENS.color.wood.trunk, alpha: 0.80 });

          edgesLayer.addChild(branch);
        }
      }

      // Draw nodes (Style B: clear RPG nodes)
      const nodeSprites: Array<{ skill: SkillNode & { x: number; y: number }; g: PIXI.Graphics; label: PIXI.Text }> = [];

      const makeNode = (skill: SkillNode & { x: number; y: number }) => {
        const g = new PIXI.Graphics();
        g.x = skill.x;
        g.y = skill.y;

        const label = new PIXI.Text({
          text: skill.name,
          style: {
            fontFamily: "Inter, Noto Sans TC, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            fontSize: 12,
            fill: `#${TOKENS.color.text.primary.toString(16).padStart(6, "0")}`,
            align: "center"
          }
        });
        label.anchor.set(0.5, 0);
        label.x = 0;
        label.y = 32;

        g.eventMode = "static";
        g.cursor = "pointer";
        // larger hit area for mobile
        const r = skill.level === 1 ? TOKENS.size.node.r1 : skill.level === 2 ? TOKENS.size.node.r2 : TOKENS.size.node.r3;
        g.hitArea = new PIXI.Circle(0, 0, r + TOKENS.size.node.hitPad);

        g.on("pointertap", () => {
          const current = progress[skill.id] ?? "todo";
          setSelected({ skill, status: current });
          setSidebarOpen(true);
          setProgress((p) => {
            const next = { ...p, [skill.id]: cycleStatus(p[skill.id]) };
            saveProgress(next);
            return next;
          });
        });

        nodesLayer.addChild(g);
        nodesLayer.addChild(label);
        nodeSprites.push({ skill, g, label });
      };

      for (const s of positioned) makeNode(s);

      const refresh = (tMs: number) => {
        for (const { skill, g, label } of nodeSprites) {
          const st = progress[skill.id] ?? "todo";
          const locked = skill.prereq.some((id) => (progress[id] ?? "todo") !== "done");

          const r = skill.level === 1 ? TOKENS.size.node.r1 : skill.level === 2 ? TOKENS.size.node.r2 : TOKENS.size.node.r3;

          const border =
            locked && st !== "done"
              ? TOKENS.color.status.locked
              : st === "done"
                ? TOKENS.color.status.done
                : st === "learning"
                  ? TOKENS.color.status.learning
                  : TOKENS.color.status.todo;

          const fill = locked && st !== "done" ? 0x0b1220 : 0x0f172a;

          // label dim when locked
          label.alpha = locked && st !== "done" ? 0.45 : 0.95;

          g.clear();

          // node body
          g.circle(0, 0, r + 2).fill({ color: 0x000000, alpha: 0.28 });
          g.circle(0, 0, r).fill({ color: fill, alpha: 0.95 });
          g.circle(0, 0, r).stroke({ width: 2, color: border, alpha: 0.95 });

          // inner ring (style)
          g.circle(0, 0, Math.max(6, r - 7)).stroke({ width: 1, color: 0xffffff, alpha: 0.08 });

          // learning: animated progress ring
          if (st === "learning" && !locked) {
            const phase = (tMs % TOKENS.motion.pulsePeriodMs) / TOKENS.motion.pulsePeriodMs;
            const start = -Math.PI / 2;
            const end = start + Math.PI * 2 * (0.35 + 0.55 * phase);
            g.arc(0, 0, r + 6, start, end).stroke({ width: 3, color: TOKENS.color.magic.primary, alpha: 0.65 });
          }

          // done: small star spark
          if (st === "done") {
            g.circle(r - 6, -r + 6, 4).fill({ color: TOKENS.color.status.done, alpha: 0.95 });
            g.circle(r - 6, -r + 6, 7).stroke({ width: 2, color: 0xffffff, alpha: 0.10 });
          }

          // locked overlay seal
          if (locked && st !== "done") {
            g.circle(0, 0, r).fill({ color: 0x000000, alpha: 0.22 });
            g.arc(0, 0, r - 4, 0, Math.PI * 2).stroke({ width: 2, color: TOKENS.color.magic.secondary, alpha: 0.18 });
          }
        }
      };

      refresh(app.ticker.lastTime);

      const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        app.renderer.resize(w, h);
        viewport.resize(w, h, worldWidth, worldHeight);
      };

      window.addEventListener("resize", onResize);
      app.ticker.add(() => {
        // background motion
        for (const s of sparkles) {
          s.g.x += s.vx;
          s.g.y += s.vy;
          if (s.g.y < 0) s.g.y = worldHeight + 10;
          if (s.g.x < -10) s.g.x = worldWidth + 10;
          if (s.g.x > worldWidth + 10) s.g.x = -10;
        }
        fog.x = Math.sin(app.ticker.lastTime / 6000) * 12;

        refresh(app.ticker.lastTime);
      });

      // start position：先讓使用者看到「底部起點」
      viewport.moveCenter(worldWidth / 2, worldHeight * 0.85);
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
    <div className={styles.root}>
      <div ref={containerRef} className={styles.canvasWrap} />

      <div className={styles.mobileBar}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setSidebarOpen((v) => !v)}
        >
          {sidebarOpen ? "Close" : "Info"}
        </button>
        <button
          className={styles.btn}
          onClick={() => {
            setProgress({});
            saveProgress({});
            setSelected(null);
          }}
        >
          Reset
        </button>
      </div>

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
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

        <div style={{ height: 12 }} />

        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "transparent",
            border: "1px solid #334155",
            color: "#e5e7eb",
            cursor: "pointer"
          }}
        >
          Close
        </button>
      </aside>
    </div>
  );
}
