export const TILE = 32;
export const VIEW_W = 512;
export const VIEW_H = 288;
export const PW = 18;
export const PH = 26;
export const MAX_RUN = 188;
export const ACCEL = 2400;
export const AIR_ACCEL = 1500;
export const FRICTION = 2200;
export const AIR_DRAG = 300;
export const JUMP = -552;
export const G_RISE = 1300;
export const G_FALL = 2720;
export const G_APEX = 620;
export const APEX = 80;
export const MAX_FALL = 740;
export const COYOTE = 0.11;
export const BUFFER = 0.13;
export const STEP = 1 / 60;

export type Difficulty = "easy" | "normal" | "hard";
export type Rank = "none" | "pip" | "ribbon" | "perfect";

export const DIFFICULTIES: Record<
  Difficulty,
  { lives: number; enemy: number; time: number; label: string; blurb: string }
> = {
  easy: { lives: 5, enemy: 0.7, time: 1.4, label: "Easy", blurb: "5 lives, slower nubs, thinned stakes, more time" },
  normal: { lives: 3, enemy: 1, time: 1, label: "Normal", blurb: "3 lives, every stake, the regular orchard" },
  hard: { lives: 2, enemy: 1.4, time: 0.72, label: "Hard", blurb: "2 lives, fast nubs, no ribbons to mark, a short clock" },
};

export const RANK_LABEL: Record<Rank, string> = {
  none: "",
  pip: "Pip",
  ribbon: "Ribbon",
  perfect: "Perfect",
};

export type Look = "orchard" | "dusk" | "storm";
export type BossKind = "grove" | "crown";

export const STAGE_META: { id: 1 | 2 | 3; name: string; par: number; blurb: string }[] = [
  { id: 1, name: "Orchard", par: 360, blurb: "Six lanes. Under six minutes is a fine clear." },
  { id: 2, name: "Moon Grove", par: 600, blurb: "Eight night lanes, then the grove beast." },
  { id: 3, name: "Storm Crown", par: 840, blurb: "Longer and harder. Giants shoot. The crown waits." },
];

export function clockText(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
