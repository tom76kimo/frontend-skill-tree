export const TOKENS = {
  // Style B: game-like hand-drawn fantasy, high readability
  color: {
    bg: {
      base: 0x0a1b24,
      fog: 0x9fb6c4,
      vignette: 0x05080f,
    },
    wood: {
      trunk: 0x6a4b32,
      leaf: 0x1f3b2d,
    },
    magic: {
      primary: 0x4de1c1, // mint-cyan
      secondary: 0x6fa8ff, // blue
    },
    text: {
      primary: 0xf2ede1,
      muted: 0x9fb6c4,
    },
    ui: {
      panel: 0x0b1220,
      border: 0x213043,
    },
    status: {
      todo: 0x334155,
      learning: 0x4de1c1,
      done: 0xd6b25e,
      locked: 0x64748b,
      warning: 0xff6b4a,
    },
  },
  size: {
    node: {
      r1: 18,
      r2: 22,
      r3: 26,
      hitPad: 14,
    },
    branch: {
      trunk: 8,
      branch: 5,
      twig: 3,
    },
  },
  motion: {
    hoverScale: 1.06,
    pulsePeriodMs: 1400,
  },
} as const;
