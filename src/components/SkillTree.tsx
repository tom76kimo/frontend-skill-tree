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
        background: "#0b1020",
        antialias: false,
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

      // --- Background layers (fantasy tree vibe) ---
      const bg = new PIXI.Container();
      viewport.addChild(bg);

      const far = new PIXI.Graphics();
      // base
      far.rect(0, 0, worldWidth, worldHeight).fill({ color: TOKENS.color.bg.base });
      // simple silhouettes (cheap but effective)
      const horizonY = worldHeight * 0.78;
      far.rect(0, horizonY, worldWidth, worldHeight - horizonY).fill({ color: 0x070b17 });
      for (let i = 0; i < 18; i++) {
        const x = (i / 18) * worldWidth + ((i % 2) * 40 - 20);
        const h = 90 + (i % 5) * 28;
        const w = 60 + (i % 4) * 20;
        // trunk
        far.roundRect(x, horizonY - h, w * 0.22, h, 6).fill({ color: 0x0a0f1e, alpha: 0.8 });
        // canopy
        far.circle(x + w * 0.11, horizonY - h - 20, w * 0.55).fill({ color: 0x0a0f1e, alpha: 0.55 });
      }
      bg.addChild(far);

      const fog = new PIXI.Graphics();
      for (let i = 0; i < 10; i++) {
        fog.circle((i / 10) * worldWidth + 80, horizonY - 40 + (i % 3) * 10, 180 + (i % 4) * 30)
          .fill({ color: TOKENS.color.bg.fog, alpha: 0.035 });
      }
      fog.alpha = 1;
      bg.addChild(fog);

      const particles = new PIXI.Container();
      bg.addChild(particles);
      const sparkles: Array<{ g: PIXI.Graphics; vx: number; vy: number }> = [];
      for (let i = 0; i < 40; i++) {
        const p = new PIXI.Graphics();
        p.circle(0, 0, 1 + (i % 3)).fill({ color: TOKENS.color.magic.cyan, alpha: 0.22 });
        p.x = Math.random() * worldWidth;
        p.y = Math.random() * worldHeight;
        particles.addChild(p);
        sparkles.push({ g: p, vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.08 });
      }

      // subtle grid (optional)
      const grid = new PIXI.Graphics();
      const step = 40;
      for (let x = 0; x <= worldWidth; x += step) grid.moveTo(x, 0).lineTo(x, worldHeight);
      for (let y = 0; y <= worldHeight; y += step) grid.moveTo(0, y).lineTo(worldWidth, y);
      grid.stroke({ width: 1, color: TOKENS.color.bg.grid, alpha: 0.18 });
      bg.addChild(grid);

      // Layers for branches/nodes
      const edgesLayer = new PIXI.Container();
      viewport.addChild(edgesLayer);

      const knotsLayer = new PIXI.Container();
      viewport.addChild(knotsLayer);

      const nodesLayer = new PIXI.Container();
      viewport.addChild(nodesLayer);

      // Draw edges as "branches" (vary thickness, add knots)
      const skillById = new Map(positioned.map((s) => [s.id, s] as const));
      for (const s of positioned) {
        for (const pre of s.prereq) {
          const a = skillById.get(pre);
          if (!a) continue;

          const ax = a.x + TOKENS.size.node.w / 2;
          const ay = a.y + TOKENS.size.node.h / 2;
          const bx = s.x + TOKENS.size.node.w / 2;
          const by = s.y + TOKENS.size.node.h / 2;

          const midY = (ay + by) / 2;

          // thickness: closer to root (lower level) = thicker
          const width = a.level === 1 ? TOKENS.size.branch.trunk : a.level === 2 ? TOKENS.size.branch.branch : TOKENS.size.branch.twig;

          const branch = new PIXI.Graphics();
          // shadow pass
          branch.moveTo(ax + 2, ay + 2).lineTo(ax + 2, midY + 2).lineTo(bx + 2, midY + 2).lineTo(bx + 2, by + 2);
          branch.stroke({ width: width + 2, color: TOKENS.color.branch.shadow, alpha: 0.25 });
          // bark pass
          branch.clear();
          branch.moveTo(ax, ay).lineTo(ax, midY).lineTo(bx, midY).lineTo(bx, by);
          branch.stroke({ width, color: TOKENS.color.branch.base, alpha: 0.95 });

          edgesLayer.addChild(branch);

          // knot at fork joint (mid point)
          const knot = new PIXI.Graphics();
          knot.circle(ax, midY, Math.max(4, width)).fill({ color: 0x1b120c, alpha: 0.9 });
          knot.circle(ax, midY, Math.max(4, width) + 2).stroke({ width: 2, color: 0x3a2b20, alpha: 0.8 });
          knotsLayer.addChild(knot);
        }
      }

      // Draw nodes
      const nodeSprites: Array<{ skill: SkillNode & { x: number; y: number }; g: PIXI.Graphics; label: PIXI.Text }> = [];

      const makeNode = (skill: SkillNode & { x: number; y: number }) => {
        const domain = domainById.get(skill.domainId);
        const domainColor = domain?.color ?? 0x94a3b8;

        const g = new PIXI.Graphics();
        g.x = skill.x;
        g.y = skill.y;

        const label = new PIXI.Text({
          text: skill.name,
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            fontSize: 12,
            fill: "#eaf0ff",
            align: "left"
          }
        });
        label.x = 16;
        label.y = 18;

        g.eventMode = "static";
        g.cursor = "pointer";

        // domain marker (small gem)
        const gem = new PIXI.Graphics();
        gem.circle(14, 14, 6).fill({ color: domainColor, alpha: 0.95 });
        gem.circle(14, 14, 8).stroke({ width: 2, color: 0xffffff, alpha: 0.10 });

        g.addChild(gem);
        g.addChild(label);
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

        // (legacy marker removed; we use gem icon instead)

        nodesLayer.addChild(g);
        nodeSprites.push({ skill, g, label });
      };

      for (const s of positioned) makeNode(s);

      const refresh = () => {
        for (const { skill, g } of nodeSprites) {
          const st = progress[skill.id] ?? "todo";
          const domain = domainById.get(skill.domainId);
          const base = domain?.color ?? 0x94a3b8;

          g.clear();

          const locked = skill.prereq.some((id) => (progress[id] ?? "todo") !== "done");

          // fills
          const fill =
            locked && st !== "done"
              ? TOKENS.color.node.lockedFill
              : st === "done"
                ? TOKENS.color.node.doneFill
                : st === "learning"
                  ? TOKENS.color.node.learningFill
                  : TOKENS.color.node.todoFill;

          const border =
            st === "done"
              ? TOKENS.color.metal.gold
              : st === "learning"
                ? TOKENS.color.magic.cyan
                : TOKENS.color.node.strokeDim;

          const w = TOKENS.size.node.w;
          const h = TOKENS.size.node.h;

          // shadow
          g.roundRect(4, 5, w, h, 14).fill({ color: 0x000000, alpha: 0.28 });

          // shape per level: leaf / rune / fruit
          if (skill.level === 1) {
            // leaf-like capsule
            g.roundRect(0, 0, w, h, 26).fill({ color: fill, alpha: 0.95 });
            g.roundRect(0, 0, w, h, 26).stroke({ width: 2, color: border, alpha: 0.85 });
          } else if (skill.level === 2) {
            // rune: hex-ish
            const x0 = 0, y0 = 0;
            const pts = [
              x0 + 18, y0,
              x0 + w - 18, y0,
              x0 + w, y0 + h / 2,
              x0 + w - 18, y0 + h,
              x0 + 18, y0 + h,
              x0, y0 + h / 2,
            ];
            g.poly(pts).fill({ color: fill, alpha: 0.95 });
            g.poly(pts).stroke({ width: 2, color: border, alpha: 0.85 });
          } else {
            // fruit: circle badge with plate
            g.roundRect(0, 0, w, h, 14).fill({ color: fill, alpha: 0.85 });
            g.roundRect(0, 0, w, h, 14).stroke({ width: 2, color: border, alpha: 0.85 });
            g.circle(18, h / 2, 10).fill({ color: st === "done" ? TOKENS.color.metal.gold : TOKENS.color.magic.purple, alpha: locked ? 0.35 : 0.95 });
            g.circle(18, h / 2, 12).stroke({ width: 2, color: 0xffffff, alpha: 0.10 });
          }

          // subtle inner rune lines (learning)
          if (st === "learning" && !locked) {
            g.roundRect(8, 10, w - 16, h - 20, 10).stroke({ width: 1, color: TOKENS.color.magic.cyan, alpha: 0.25 });
          }

          // locked overlay fog
          if (locked && st !== "done") {
            g.roundRect(0, 0, w, h, 16).fill({ color: 0x000000, alpha: 0.18 });
            // small lock badge
            g.roundRect(w - 22, 6, 16, 14, 4).fill({ color: 0x000000, alpha: 0.35 });
            g.roundRect(w - 22, 6, 16, 14, 4).stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
          }

          // done badge
          if (st === "done") {
            g.circle(w - 14, 14, 8).fill({ color: TOKENS.color.metal.gold, alpha: 0.95 });
            g.circle(w - 14, 14, 10).stroke({ width: 2, color: 0xffffff, alpha: 0.10 });
          }

          // domain gem (re-draw on top)
          g.circle(14, 14, 6).fill({ color: base, alpha: locked ? 0.25 : 0.95 });
          g.circle(14, 14, 8).stroke({ width: 2, color: 0xffffff, alpha: 0.10 });
        }
      };

      refresh();

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

        refresh();
      });

      // start position：先讓使用者看到「底部起點」
      viewport.moveCenter(worldWidth / 2, worldHeight - 120);
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
