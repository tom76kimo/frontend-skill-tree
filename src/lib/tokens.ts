export const TOKENS = {
  color: {
    bg: {
      base: 0x0b1020,
      grid: 0x101a33,
      fog: 0x5fa8ff,
    },
    text: {
      primary: 0xeaf0ff,
      muted: 0xb6c2ff,
    },
    magic: {
      cyan: 0x3ff2c5,
      purple: 0x8b5cff,
    },
    metal: {
      gold: 0xd6b25e,
    },
    branch: {
      base: 0x2a1e16,
      shadow: 0x000000,
      glow: 0x3ff2c5,
    },
    node: {
      todoFill: 0x0f172a,
      learningFill: 0x101f3f,
      doneFill: 0x1a2a1f,
      lockedFill: 0x2a2f3f,
      strokeDim: 0x2a3a55,
    },
  },
  size: {
    node: {
      w: 140,
      h: 52,
      icon: 16,
      badge: 16,
    },
    branch: {
      trunk: 9,
      branch: 6,
      twig: 4,
    },
  },
  motion: {
    hoverScale: 1.04,
  },
} as const;
