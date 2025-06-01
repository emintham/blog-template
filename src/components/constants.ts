// src/components/react/constants.ts
// (Adjust path as needed in your Astro project)
import type { RhetoricalPurposesMap } from "./types";

export const RHETORICAL_PURPOSES: RhetoricalPurposesMap = {
  NONE: {
    name: "Select Purpose...",
    color: "transparent",
    isPlaceholder: true,
  },
  NARRATION: {
    name: "Narration / Exposition",
    color: "var(--purpose-narration)",
  },
  DESCRIPTION: {
    name: "Description / Imagery",
    color: "var(--purpose-description)",
  },
  ARGUMENTATION: {
    name: "Argumentation / Persuasion",
    color: "var(--purpose-argumentation)",
  },
  LOGICAL_APPEAL: {
    name: "Logical Appeal (Logos)",
    color: "var(--purpose-logical-appeal)",
  },
  EMOTIONAL_APPEAL: {
    name: "Emotional Appeal (Pathos)",
    color: "var(--purpose-emotional-appeal)",
  },
  ETHICAL_APPEAL: {
    name: "Ethical Appeal (Ethos)",
    color: "var(--purpose-ethical-appeal)",
  },
  FORESHADOWING: {
    name: "Foreshadowing / Suspense",
    color: "var(--purpose-foreshadowing)",
  },
  CHARACTER_DEV: {
    name: "Character Development",
    color: "var(--purpose-character-dev)",
  },
  WORLD_BUILDING: {
    name: "World-Building",
    color: "var(--purpose-world-building)",
  },
  METAPHOR_SIMILE: {
    name: "Metaphor / Simile",
    color: "var(--purpose-metaphor-simile)",
  },
  IRONY_SATIRE: {
    name: "Irony / Satire",
    color: "var(--purpose-irony-satire)",
  },
  JUXTAPOSITION: {
    name: "Juxtaposition / Contrast",
    color: "var(--purpose-juxtaposition)",
  },
  CALL_TO_ACTION: {
    name: "Call to Action",
    color: "var(--purpose-call-to-action)",
  },
  HUMOR: { name: "Humor", color: "var(--purpose-humor)" },
  SOCIAL_COMMENTARY: {
    name: "Social Commentary",
    color: "var(--purpose-social-commentary)",
  },
  TONE_SETTING: {
    name: "Tone Setting / Mood",
    color: "var(--purpose-tone-setting)",
  },
  PACING_CONTROL: {
    name: "Pacing Control",
    color: "var(--purpose-pacing-control)",
  },
  SEXUAL_TITILLATION: {
    name: "Sexual Titillation",
    color: "var(--purpose-sexual-titillation)",
  },
  SYMBOLISM: { name: "Symbolism", color: "var(--purpose-symbolism)" },
  ALLUSION: { name: "Allusion", color: "var(--purpose-allusion)" },
};

export const MAX_WAIT_ATTEMPTS = 10; // e.g., 10 attempts
export const WAIT_INTERVAL_MS = 500; // e.g., 500ms interval

// Helper function (can also be in a utils.ts)
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
