import { TILE } from "@/game/constants";
import type { BossKind, Look } from "@/game/constants";
import { STAGE_META } from "@/game/constants";
import { moonLanes, stormLanes } from "@/game/later-lanes";

export type MoverDef = {
  x: number;
  y: number;
  w: number;
  h: number;
  axis: "x" | "y";
  min: number;
  max: number;
  speed: number;
};

export type LevelDef = {
  name: string;
  time: number;
  rows: string[];
  movers: MoverDef[];
  stage: 1 | 2 | 3;
  look: Look;
  boss: BossKind | null;
  giants: boolean;
};

const H = 14;

function blank(w: number): string[][] {
  return Array.from({ length: H }, () => Array.from({ length: w }, () => "."));
}

function fillGround(g: string[][]) {
  for (let y = 11; y < H; y++) {
    for (let x = 0; x < g[0].length; x++) g[y][x] = "#";
  }
}

function pit(g: string[][], a: number, b: number) {
  for (let y = 11; y < H; y++) {
    for (let x = a; x <= b; x++) g[y][x] = ".";
  }
}

function stairs(g: string[][], x: number, steps: number) {
  for (let i = 0; i < steps; i++) {
    const surface = 10 - i;
    for (let y = surface; y <= 10; y++) g[y][x + i] = "#";
  }
  return 10 - (steps - 1);
}

function hill(g: string[][], x: number, surface: number, len: number) {
  for (let i = 0; i < len; i++) {
    for (let y = surface; y <= 10; y++) g[y][x + i] = "#";
  }
}

function paint(g: string[][], x: number, y: number, s: string) {
  for (let i = 0; i < s.length; i++) g[y][x + i] = s[i];
}

function levelSeed(): { name: string; time: number; rows: string[]; movers: MoverDef[] } {
  const g = blank(96);
  fillGround(g);
  pit(g, 22, 24);
  pit(g, 46, 48);
  pit(g, 68, 70);
  paint(g, 12, 8, "B?B?B");
  g[8][38] = "!";
  g[10][4] = "@";
  for (const x of [8, 9]) g[9][x] = "P";
  g[8][9] = "c";
  for (const x of [40, 41, 42]) g[7][x] = "P";
  g[6][41] = "c";
  for (const x of [13, 15]) g[9][x] = "c";
  for (const x of [28, 29, 30, 31, 50, 51, 60, 74]) g[9][x] = "c";
  for (const x of [18, 36, 56, 78]) g[10][x] = "e";
  g[10][52] = "K";
  const top = stairs(g, 82, 4);
  hill(g, 86, top, 8);
  g[top - 1][90] = "F";
  return { name: "Seed Lane", time: 180, rows: g.map((r) => r.join("")), movers: [] };
}

function levelCrates(): { name: string; time: number; rows: string[]; movers: MoverDef[] } {
  const g = blank(112);
  fillGround(g);
  pit(g, 32, 39);
  pit(g, 62, 64);
  for (const x of [14, 15, 50, 51]) {
    g[9][x] = "P";
    g[10][x] = "P";
  }
  paint(g, 22, 8, "?B?B?");
  g[8][44] = "!";
  g[10][3] = "@";
  for (const x of [23, 25, 45, 54]) g[9][x] = "c";
  for (const x of [10, 26, 46, 78, 92]) g[10][x] = "e";
  for (const x of [74, 75, 76, 77, 78, 79]) g[9][x] = "^";
  for (const x of [75, 77, 79]) g[8][x] = "c";
  g[10][72] = "S";
  g[10][73] = "S";
  g[10][68] = "K";
  const top = stairs(g, 98, 4);
  hill(g, 102, top, 8);
  g[top - 1][106] = "F";
  const w = 96;
  const min = 31 * TILE - 20;
  const max = 40 * TILE - w + 20;
  return {
    name: "Crate Rows",
    time: 200,
    rows: g.map((r) => r.join("")),
    movers: [{ x: min, y: 11 * TILE, w, h: 16, axis: "x", min, max, speed: 52 }],
  };
}

function levelStakes(): { name: string; time: number; rows: string[]; movers: MoverDef[] } {
  const g = blank(124);
  fillGround(g);
  pit(g, 58, 66);
  for (const x of [16, 17, 24, 25, 42, 43, 80, 81, 90, 91]) g[10][x] = "S";
  paint(g, 10, 8, "B!B");
  g[10][3] = "@";
  for (const x of [11, 20, 34, 50, 74, 86]) g[9][x] = "c";
  for (const x of [20, 34, 50, 76, 96]) g[10][x] = "e";
  g[10][72] = "K";
  const top = stairs(g, 108, 4);
  hill(g, 112, top, 8);
  g[top - 1][116] = "F";
  const w = 100;
  const min = 57 * TILE - 16;
  const max = 67 * TILE - w + 16;
  return {
    name: "Stake Rise",
    time: 210,
    rows: g.map((r) => r.join("")),
    movers: [{ x: min, y: 11 * TILE, w, h: 16, axis: "x", min, max, speed: 58 }],
  };
}

function levelLoft(): { name: string; time: number; rows: string[]; movers: MoverDef[] } {
  const g = blank(108);
  fillGround(g);
  g[10][3] = "@";
  for (const x of [9, 10, 11]) g[9][x] = "P";
  g[8][10] = "c";
  for (const x of [16, 17, 18, 19]) g[7][x] = "P";
  g[6][17] = "c";
  g[6][18] = "c";
  for (const x of [26, 27, 28]) g[7][x] = "P";
  g[6][27] = "!";
  pit(g, 34, 37);
  for (const x of [42, 43]) {
    g[10][x] = "P";
    g[9][x] = "P";
  }
  g[8][43] = "c";
  for (const x of [50, 51, 52, 53]) g[8][x] = "P";
  g[7][51] = "c";
  g[7][52] = "c";
  for (const x of [60, 61, 62]) g[6][x] = "P";
  g[5][61] = "c";
  for (const x of [14, 46, 70, 86]) g[10][x] = "e";
  g[10][14] = "h";
  g[10][58] = "K";
  pit(g, 74, 77);
  const top = stairs(g, 94, 4);
  hill(g, 98, top, 8);
  g[top - 1][102] = "F";
  return { name: "Crate Loft", time: 200, rows: g.map((r) => r.join("")), movers: [] };
}

function levelPlanks(): { name: string; time: number; rows: string[]; movers: MoverDef[] } {
  const g = blank(120);
  fillGround(g);
  g[10][3] = "@";
  for (const x of [10, 11]) g[9][x] = "P";
  for (const x of [16, 17, 18]) g[7][x] = "P";
  g[6][17] = "c";
  g[6][18] = "c";
  pit(g, 26, 34);
  for (const x of [40, 41, 42, 43]) g[8][x] = "P";
  g[7][41] = "c";
  g[7][42] = "!";
  g[10][48] = "K";
  pit(g, 52, 58);
  g[10][62] = "S";
  g[10][63] = "S";
  for (const x of [66, 67]) {
    g[10][x] = "P";
    g[9][x] = "P";
  }
  g[8][67] = "c";
  for (const x of [74, 75, 76]) g[7][x] = "P";
  g[6][75] = "c";
  for (const x of [14, 46, 70, 90]) g[10][x] = "e";
  g[10][70] = "h";
  const top = stairs(g, 104, 4);
  hill(g, 108, top, 8);
  g[top - 1][112] = "F";
  const w = 96;
  const min1 = 25 * TILE - 16;
  const max1 = 35 * TILE - w + 16;
  const w2 = 88;
  const min2 = 51 * TILE - 12;
  const max2 = 59 * TILE - w2 + 12;
  return {
    name: "Twin Planks",
    time: 210,
    rows: g.map((r) => r.join("")),
    movers: [
      { x: min1, y: 11 * TILE, w, h: 16, axis: "x", min: min1, max: max1, speed: 56 },
      { x: min2, y: 11 * TILE, w: w2, h: 16, axis: "x", min: min2, max: max2, speed: 64 },
    ],
  };
}

function levelGarden(): { name: string; time: number; rows: string[]; movers: MoverDef[] } {
  const g = blank(128);
  fillGround(g);
  g[10][3] = "@";
  for (const x of [12, 13, 14, 20, 21, 28, 29, 36, 37]) g[10][x] = "S";
  for (const x of [16, 17, 18]) g[8][x] = "P";
  g[7][17] = "c";
  for (const x of [23, 24, 25]) g[7][x] = "P";
  g[6][24] = "c";
  for (const x of [31, 32, 33]) g[8][x] = "P";
  g[7][32] = "!";
  pit(g, 42, 50);
  g[10][54] = "K";
  for (const x of [56, 57, 66, 67, 76, 77]) g[10][x] = "S";
  for (const x of [60, 61, 62]) g[8][x] = "P";
  g[7][61] = "c";
  for (const x of [70, 71, 72]) g[7][x] = "P";
  g[6][71] = "c";
  for (const x of [8, 38, 64, 90]) g[10][x] = "e";
  g[10][38] = "h";
  g[10][90] = "h";
  const top = stairs(g, 110, 4);
  hill(g, 114, top, 10);
  g[top - 1][118] = "F";
  const w = 100;
  const min = 41 * TILE - 16;
  const max = 51 * TILE - w + 16;
  return {
    name: "Stake Garden",
    time: 220,
    rows: g.map((r) => r.join("")),
    movers: [{ x: min, y: 11 * TILE, w, h: 16, axis: "x", min, max, speed: 60 }],
  };
}

function dress(
  raw: {
    name: string;
    time: number;
    rows: string[];
    movers: MoverDef[];
    boss?: BossKind | null;
    giants?: boolean;
  },
  stage: 1 | 2 | 3,
  look: Look,
): LevelDef {
  return {
    name: raw.name,
    time: raw.time,
    rows: raw.rows,
    movers: raw.movers,
    stage,
    look,
    boss: raw.boss ?? null,
    giants: Boolean(raw.giants),
  };
}

const stageOrchard = [levelSeed(), levelCrates(), levelStakes(), levelLoft(), levelPlanks(), levelGarden()].map((level) =>
  dress(level, 1, "orchard"),
);
const stageGrove = moonLanes().map((level) => dress(level, 2, "dusk"));
const stageStorm = stormLanes().map((level) => dress(level, 3, "storm"));

export const STAGES: {
  id: 1 | 2 | 3;
  name: string;
  par: number;
  blurb: string;
  levels: LevelDef[];
}[] = [
  { ...STAGE_META[0], levels: stageOrchard },
  { ...STAGE_META[1], levels: stageGrove },
  { ...STAGE_META[2], levels: stageStorm },
];

export const LEVELS: LevelDef[] = STAGES.flatMap((stage) => stage.levels);

export function locate(index: number) {
  let offset = 0;
  for (const stage of STAGES) {
    if (index < offset + stage.levels.length) {
      return {
        stageId: stage.id,
        name: stage.name,
        par: stage.par,
        blurb: stage.blurb,
        lane: index - offset,
        count: stage.levels.length,
        offset,
      };
    }
    offset += stage.levels.length;
  }
  const stage = STAGES[0];
  return { stageId: stage.id, name: stage.name, par: stage.par, blurb: stage.blurb, lane: 0, count: stage.levels.length, offset: 0 };
}

for (const level of LEVELS) {
  const width = level.rows[0].length;
  if (level.rows.length !== H || level.rows.some((r) => r.length !== width)) {
    throw new Error(`Bad rows in ${level.name}`);
  }
  if (!level.rows.some((r) => r.includes("@"))) throw new Error(`No spawn in ${level.name}`);
  if (!level.rows.some((r) => r.includes("F"))) throw new Error(`No ribbon in ${level.name}`);
  for (const mover of level.movers) {
    if (mover.min > mover.max) throw new Error(`Bad plank in ${level.name}`);
  }
}
