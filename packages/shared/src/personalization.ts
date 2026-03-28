export const PERSONALIZATION_PRESETS = [
  {
    id: "sea-glow",
    label: "Sea Glow",
    description: "Cool glass panels with pale cyan highlights."
  },
  {
    id: "ember-signal",
    label: "Ember Signal",
    description: "Warm archive tones with muted amber accents."
  },
  {
    id: "moon-glass",
    label: "Moon Glass",
    description: "Quiet silver-blue gradients with soft contrast."
  }
] as const;

export const PERSONALIZATION_PRESET_IDS = [
  "sea-glow",
  "ember-signal",
  "moon-glass"
] as const;

export type PersonalizationPresetId = (typeof PERSONALIZATION_PRESETS)[number]["id"];
