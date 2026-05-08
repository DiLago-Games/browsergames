export const CROWD_LIGHT_CONFIG = {
  maxVisitors: 1200,
  baseRadius: 1.5,
  highHypeRadius: 2.5,
  panicRadius: 2.0,
  baseGlowRadius: 6,
  highHypeGlowRadius: 14,
  panicGlowRadius: 9,
  baseSpeed: 40,
  panicSpeed: 90,
  enteringSpeed: 50,
  dancingDriftSpeed: 12,
  colors: {
    idle: 0x88aaff,
    entering: 0x99ddff,
    dancing: 0x00ffe0,
    highHype: 0xff4fd8,
    panic: 0xff2a2a,
  },
  beatPulseScale: {
    idle: 0.1,
    entering: 0.15,
    dancing: 0.25,
    highHype: 0.5,
    panic: 0.2,
  },
  pathJitter: { normal: 15, panic: 30, highHype: 10 }
};
