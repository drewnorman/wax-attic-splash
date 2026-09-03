export type QualityTierName = 'high' | 'medium' | 'low';

export type QualityTier = {
  name: QualityTierName;
  pixelRatioCap: number;
  targetFrameInterval: number;
  fieldInstances: number;
  fieldParticles: number;
  overlayParticles: number;
  fireParticles: number;
  smokeParticles: number;
  finaleFragments: number;
  finaleDrops: number;
  finaleSnow: number;
  expensiveCssEffects: boolean;
};

export const QUALITY_TIERS: Record<QualityTierName, QualityTier> = {
  high: {
    name: 'high',
    pixelRatioCap: 1.5,
    targetFrameInterval: 16.7,
    fieldInstances: 72,
    fieldParticles: 220,
    overlayParticles: 190,
    fireParticles: 280,
    smokeParticles: 240,
    finaleFragments: 360,
    finaleDrops: 80,
    finaleSnow: 220,
    expensiveCssEffects: true,
  },
  medium: {
    name: 'medium',
    pixelRatioCap: 1.25,
    targetFrameInterval: 16.7,
    fieldInstances: 48,
    fieldParticles: 140,
    overlayParticles: 112,
    fireParticles: 120,
    smokeParticles: 120,
    finaleFragments: 220,
    finaleDrops: 44,
    finaleSnow: 120,
    expensiveCssEffects: true,
  },
  low: {
    name: 'low',
    pixelRatioCap: 1,
    targetFrameInterval: 33.3,
    fieldInstances: 24,
    fieldParticles: 72,
    overlayParticles: 58,
    fireParticles: 64,
    smokeParticles: 48,
    finaleFragments: 104,
    finaleDrops: 24,
    finaleSnow: 64,
    expensiveCssEffects: false,
  },
};

export const selectInitialQuality = (reducedMotion = false): QualityTier => {
  if (reducedMotion) return QUALITY_TIERS.low;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (
    window.innerWidth < 720 ||
    navigator.hardwareConcurrency <= 4 ||
    (memory !== undefined && memory <= 4)
  )
    return QUALITY_TIERS.medium;
  return QUALITY_TIERS.high;
};
