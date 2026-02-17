import { SkillTree } from "./types";

// v1：先做精（但仍然包含資深前端常見的核心 domain）。
// 節點座標是為了在技能樹地圖上排版（可再調整）。
export const SKILL_TREE: SkillTree = {
  version: "0.1.0",
  domains: [
    { id: "js", name: "JavaScript", color: 0x4ade80 },
    { id: "ts", name: "TypeScript", color: 0x60a5fa },
    { id: "web", name: "Web Platform", color: 0xfbbf24 },
    { id: "react", name: "React/Next", color: 0xf472b6 },
    { id: "css", name: "CSS & UI", color: 0xa78bfa },
    { id: "perf", name: "Performance", color: 0xfb7185 },
    { id: "sec", name: "Security", color: 0xf97316 },
    { id: "test", name: "Testing", color: 0x34d399 },
    { id: "build", name: "Build & Tooling", color: 0x22c55e },
    { id: "eng", name: "Engineering", color: 0x94a3b8 }
  ],
  skills: [
    // --- JS ---
    { id: "js-basics", domainId: "js", name: "JS Fundamentals", level: 1, desc: "語法、型別、常用內建物件", prereq: [] },
    { id: "js-scope", domainId: "js", name: "Scope & Closure", level: 2, desc: "lexical scope、closure 的用途與陷阱", prereq: ["js-basics"] },
    { id: "js-this", domainId: "js", name: "this / bind / call", level: 2, desc: "this 綁定規則、常見踩雷", prereq: ["js-basics"] },
    { id: "js-proto", domainId: "js", name: "Prototype & Class", level: 2, desc: "prototype chain、class 語法糖", prereq: ["js-basics"] },
    { id: "js-eventloop", domainId: "js", name: "Event Loop", level: 3, desc: "microtask/macrotask、渲染與排程", prereq: ["js-scope", "js-this"] },
    { id: "js-async", domainId: "js", name: "Async Patterns", level: 3, desc: "promise、async/await、並發控制", prereq: ["js-eventloop"] },

    // --- TS ---
    { id: "ts-basics", domainId: "ts", name: "TS Basics", level: 1, desc: "基本型別、interface/type、工具型別", prereq: ["js-basics"] },
    { id: "ts-narrow", domainId: "ts", name: "Type Narrowing", level: 2, desc: "narrowing、guards、discriminated unions", prereq: ["ts-basics"] },
    { id: "ts-generics", domainId: "ts", name: "Generics", level: 2, desc: "泛型設計、約束、推導", prereq: ["ts-basics"] },
    { id: "ts-tsconfig", domainId: "ts", name: "tsconfig Mastery", level: 3, desc: "moduleResolution、paths、emit、build mode", prereq: ["ts-narrow", "ts-generics"] },

    // --- Web Platform ---
    { id: "web-html", domainId: "web", name: "Semantic HTML", level: 1, desc: "語意化結構、表單、可存取性基礎", prereq: [] },
    { id: "web-http", domainId: "web", name: "HTTP Basics", level: 1, desc: "methods/status/cookies/caching", prereq: [] },
    { id: "web-dom", domainId: "web", name: "DOM & Events", level: 2, desc: "事件捕獲/冒泡、delegation", prereq: ["web-html", "js-basics"] },
    { id: "web-storage", domainId: "web", name: "Web Storage", level: 2, desc: "localStorage/sessionStorage/indexedDB 取捨", prereq: ["web-http"] },
    { id: "web-workers", domainId: "web", name: "Workers", level: 3, desc: "Web Worker 基礎、主線程負載拆分", prereq: ["web-dom", "js-eventloop"] },

    // --- CSS & UI ---
    { id: "css-layout", domainId: "css", name: "Layout (Flex/Grid)", level: 1, desc: "flex、grid、responsive 佈局", prereq: ["web-html"] },
    { id: "css-architecture", domainId: "css", name: "CSS Architecture", level: 2, desc: "CSS Modules/BEM/utility 的取捨", prereq: ["css-layout"] },
    { id: "css-designsystem", domainId: "css", name: "Design System", level: 3, desc: "tokens、theme、component API", prereq: ["css-architecture"] },
    { id: "css-a11y", domainId: "css", name: "A11y UI Patterns", level: 3, desc: "focus management、keyboard nav", prereq: ["css-layout", "web-html"] },

    // --- React/Next ---
    { id: "react-basics", domainId: "react", name: "React Fundamentals", level: 1, desc: "component、props/state、render", prereq: ["js-basics"] },
    { id: "react-hooks", domainId: "react", name: "Hooks Mastery", level: 2, desc: "useEffect/useMemo/useCallback、依賴陷阱", prereq: ["react-basics", "js-eventloop"] },
    { id: "react-state", domainId: "react", name: "State Strategy", level: 2, desc: "local/global/server state 分層", prereq: ["react-basics"] },
    { id: "next-rendering", domainId: "react", name: "SSR/SSG/ISR", level: 3, desc: "Next 渲染模式與 tradeoff", prereq: ["react-hooks", "web-http"] },
    { id: "react-architecture", domainId: "react", name: "Frontend Architecture", level: 3, desc: "feature slicing、邊界、可維護性", prereq: ["react-state", "ts-tsconfig"] },

    // --- Performance ---
    { id: "perf-metrics", domainId: "perf", name: "Core Web Vitals", level: 2, desc: "LCP/INP/CLS 指標與改善手段", prereq: ["web-http", "react-basics"] },
    { id: "perf-render", domainId: "perf", name: "Render Pipeline", level: 3, desc: "layout/paint/composite、避免 reflow", prereq: ["web-dom", "css-layout"] },
    { id: "perf-bundle", domainId: "perf", name: "Bundle Optimization", level: 3, desc: "code split、tree-shake、動態載入", prereq: ["build-bundler", "react-architecture"] },

    // --- Security ---
    { id: "sec-xss", domainId: "sec", name: "XSS & CSP", level: 2, desc: "XSS 類型、CSP 策略", prereq: ["web-http", "web-dom"] },
    { id: "sec-csrf", domainId: "sec", name: "CSRF & Auth", level: 2, desc: "cookie、sameSite、token 思維", prereq: ["web-http"] },
    { id: "sec-oidc", domainId: "sec", name: "OAuth/OIDC Basics", level: 3, desc: "PKCE、redirect flow、風險", prereq: ["sec-csrf"] },

    // --- Testing ---
    { id: "test-unit", domainId: "test", name: "Unit Testing", level: 1, desc: "Vitest/Jest、pure logic", prereq: ["js-basics"] },
    { id: "test-rtl", domainId: "test", name: "RTL (React Testing)", level: 2, desc: "user-centric 測試、mock 策略", prereq: ["test-unit", "react-basics"] },
    { id: "test-e2e", domainId: "test", name: "E2E (Playwright)", level: 3, desc: "關鍵路徑、fixture、flaky 治理", prereq: ["test-rtl", "next-rendering"] },

    // --- Build & Tooling ---
    { id: "build-bundler", domainId: "build", name: "Bundler Concepts", level: 2, desc: "Vite/Webpack：module graph、HMR", prereq: ["js-basics"] },
    { id: "build-monorepo", domainId: "build", name: "Monorepo Basics", level: 3, desc: "pnpm workspaces、turborepo", prereq: ["build-bundler", "ts-tsconfig"] },
    { id: "build-ci", domainId: "build", name: "CI Quality Gates", level: 3, desc: "lint/typecheck/test 分層", prereq: ["build-bundler", "test-unit"] },

    // --- Engineering / Leadership ---
    { id: "eng-debug", domainId: "eng", name: "Debugging", level: 2, desc: "DevTools、perf profile、記錄問題", prereq: ["web-dom", "js-eventloop"] },
    { id: "eng-design", domainId: "eng", name: "Design Docs", level: 3, desc: "方案比較、tradeoff、風險控管", prereq: ["eng-debug", "react-architecture"] },
    { id: "eng-review", domainId: "eng", name: "Code Review", level: 3, desc: "可讀性、一致性、壞味道", prereq: ["eng-design"] }
  ]
};
