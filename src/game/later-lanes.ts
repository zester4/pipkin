import { TILE } from "@/game/constants";

const H = 14;

type Mover = {
  x: number;
  y: number;
  w: number;
  h: number;
  axis: "x";
  min: number;
  max: number;
  speed: number;
};

export type RawLane = {
  name: string;
  time: number;
  rows: string[];
  movers: Mover[];
  boss?: "grove" | "crown";
  giants?: boolean;
};

type Spec = {
  name: string;
  w: number;
  time: number;
  pits?: [number, number, number][];
  crates?: [number, number, number][];
  coins?: [number, number][];
  walkers?: number[];
  hoppers?: number[];
  stakes?: number[];
  checks?: number[];
  power?: [number, number];
  paint?: [number, number, string][];
  boss?: "grove" | "crown";
  giants?: boolean;
};

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

function onGround(g: string[][], x: number) {
  return x > 1 && x < g[0].length - 1 && g[11][x] === "#";
}

function ride(a: number, b: number, speed: number): Mover {
  const w = 104;
  const min = (a - 1) * TILE;
  const max = (b + 2) * TILE - w;
  if (max < min) throw new Error(`Plank too short ${a}-${b}`);
  return { x: min, y: 11 * TILE, w, h: 16, axis: "x", min, max, speed };
}

function gate(g: string[][], startCol: number) {
  const width = g[0].length;
  const start = Math.min(startCol, width - 14);
  for (let i = 0; i < 4; i++) {
    const surface = 10 - i;
    for (let y = surface; y <= 10; y++) g[y][start + i] = "#";
  }
  const top = 10 - 3;
  const hillStart = start + 4;
  const len = Math.min(8, width - hillStart - 1);
  for (let i = 0; i < len; i++) {
    for (let y = top; y <= 10; y++) g[y][hillStart + i] = "#";
  }
  g[top - 1][Math.min(width - 2, start + 8)] = "F";
}

function put(g: string[][], x: number, y: number, ch: string) {
  if (y < 0 || x < 0 || y >= H || x >= g[0].length) {
    throw new Error(`Out of bounds ${x},${y} on ${g[0].length}`);
  }
  g[y][x] = ch;
}

function buildSpec(spec: Spec): RawLane {
  const g = blank(spec.w);
  fillGround(g);
  const movers: Mover[] = [];
  for (const [a, b, speed] of spec.pits ?? []) {
    if (a < 8 || b >= spec.w - 16) throw new Error(`Pit ${spec.name} ${a}-${b}`);
    pit(g, a, b);
    movers.push(ride(a, b, speed));
  }
  for (const [x, y, len] of spec.crates ?? []) {
    for (let i = 0; i < len; i++) put(g, x + i, y, "P");
  }
  for (const [x, y, s] of spec.paint ?? []) {
    for (let i = 0; i < s.length; i++) put(g, x + i, y, s[i]);
  }
  if (spec.power) put(g, spec.power[0], spec.power[1], "!");
  for (const [x, y] of spec.coins ?? []) {
    if (g[y]?.[x] === ".") put(g, x, y, "c");
    else if (y > 0 && g[y - 1][x] === ".") put(g, x, y - 1, "c");
  }
  for (const x of spec.stakes ?? []) {
    if (onGround(g, x)) put(g, x, 10, "S");
  }
  for (const x of spec.walkers ?? []) {
    if (onGround(g, x) && g[10][x] === ".") put(g, x, 10, "e");
  }
  for (const x of spec.hoppers ?? []) {
    if (onGround(g, x) && g[10][x] === ".") put(g, x, 10, "h");
  }
  for (const x of spec.checks ?? []) {
    if (onGround(g, x) && g[10][x] === ".") put(g, x, 10, "K");
  }
  put(g, 4, 10, "@");
  gate(g, spec.w - 16);
  return {
    name: spec.name,
    time: spec.time,
    rows: g.map((r) => r.join("")),
    movers,
    boss: spec.boss,
    giants: spec.giants,
  };
}

const MOON: Spec[] = [
  {
    name: "Moon Gate",
    w: 132,
    time: 210,
    crates: [
      [9, 9, 2],
      [64, 7, 3],
    ],
    coins: [
      [9, 8],
      [65, 6],
      [28, 9],
      [46, 9],
      [86, 9],
      [100, 9],
    ],
    paint: [[18, 8, "B?B"]],
    walkers: [22, 52, 92],
    hoppers: [26, 104],
    pits: [[34, 42, 56]],
    stakes: [48, 49, 58, 72],
    checks: [80],
    power: [56, 8],
  },
  {
    name: "Blue Crossing",
    w: 148,
    time: 225,
    pits: [
      [24, 34, 60],
      [86, 98, 66],
    ],
    crates: [
      [14, 9, 2],
      [48, 8, 3],
      [70, 7, 2],
    ],
    coins: [
      [15, 8],
      [49, 7],
      [71, 6],
      [40, 9],
      [62, 9],
      [108, 9],
      [120, 9],
    ],
    walkers: [18, 44, 78],
    hoppers: [66, 112],
    stakes: [40, 41, 74, 75],
    checks: [80],
    power: [50, 7],
  },
  {
    name: "Lantern Loft",
    w: 140,
    time: 230,
    crates: [
      [10, 9, 3],
      [20, 7, 3],
      [32, 6, 3],
      [48, 7, 2],
      [60, 5, 3],
    ],
    coins: [
      [11, 8],
      [21, 6],
      [33, 5],
      [49, 6],
      [61, 4],
      [80, 9],
      [90, 9],
    ],
    paint: [[40, 8, "?B?"]],
    pits: [[100, 110, 62]],
    walkers: [74, 92],
    hoppers: [16, 84],
    checks: [96],
    power: [34, 5],
  },
  {
    name: "Stake Choir",
    w: 150,
    time: 235,
    stakes: [12, 13, 14, 20, 21, 28, 29, 36, 37, 44, 45, 52, 53, 90, 91, 98, 99, 108, 109, 116, 117],
    crates: [
      [16, 8, 3],
      [32, 7, 2],
      [48, 8, 2],
      [102, 8, 3],
    ],
    coins: [
      [17, 7],
      [33, 6],
      [49, 7],
      [64, 9],
      [80, 9],
      [103, 7],
      [122, 9],
    ],
    pits: [[68, 80, 64]],
    walkers: [24, 60, 94],
    hoppers: [40, 112],
    checks: [86],
    power: [34, 6],
  },
  {
    name: "Night Boards",
    w: 156,
    time: 240,
    pits: [
      [28, 40, 62],
      [100, 114, 72],
    ],
    crates: [
      [16, 8, 2],
      [50, 7, 3],
      [70, 6, 2],
      [88, 8, 2],
    ],
    coins: [
      [17, 7],
      [51, 6],
      [71, 5],
      [46, 9],
      [84, 9],
      [122, 9],
      [130, 9],
    ],
    walkers: [20, 48, 92],
    hoppers: [64, 124],
    stakes: [22, 23, 84, 85],
    checks: [96],
    paint: [[54, 6, "!"]],
  },
  {
    name: "Leaping Moon",
    w: 142,
    time: 230,
    pits: [
      [36, 40, 54],
      [78, 82, 58],
    ],
    crates: [
      [12, 9, 2],
      [22, 7, 3],
      [52, 7, 3],
      [96, 6, 3],
    ],
    coins: [
      [13, 8],
      [23, 6],
      [53, 6],
      [64, 9],
      [90, 9],
      [97, 5],
      [112, 9],
    ],
    hoppers: [18, 30, 60, 70, 104],
    walkers: [46, 88],
    stakes: [48, 66, 108],
    checks: [92],
    power: [24, 6],
  },
  {
    name: "Long Grove",
    w: 172,
    time: 260,
    pits: [
      [34, 46, 64],
      [108, 122, 70],
    ],
    crates: [
      [14, 9, 2],
      [22, 7, 2],
      [56, 7, 3],
      [74, 6, 2],
      [96, 8, 2],
      [132, 7, 3],
    ],
    coins: [
      [15, 8],
      [23, 6],
      [57, 6],
      [75, 5],
      [88, 9],
      [100, 9],
      [133, 6],
      [146, 9],
    ],
    walkers: [18, 52, 90, 128],
    hoppers: [28, 80, 140],
    stakes: [64, 65, 84, 85, 128, 129],
    checks: [102],
    paint: [[58, 6, "?!"]],
  },
  {
    name: "Grove Door",
    w: 154,
    time: 245,
    pits: [[62, 76, 76]],
    crates: [
      [12, 9, 2],
      [24, 7, 3],
      [42, 6, 2],
      [88, 7, 3],
      [108, 6, 2],
    ],
    coins: [
      [13, 8],
      [25, 6],
      [43, 5],
      [54, 9],
      [84, 9],
      [89, 6],
      [109, 5],
      [122, 9],
    ],
    stakes: [16, 17, 34, 35, 50, 51, 80, 81, 100, 101, 118, 119],
    walkers: [20, 46, 96],
    hoppers: [30, 114],
    checks: [84],
    power: [26, 6],
  },
  {
    name: "Grove Beast",
    w: 88,
    time: 200,
    boss: "grove",
    crates: [
      [18, 7, 3],
      [52, 7, 3],
    ],
    coins: [
      [19, 6],
      [30, 9],
      [40, 9],
      [53, 6],
      [64, 9],
    ],
    paint: [[34, 8, "?"]],
  },
];

const STORM: Spec[] = [
  {
    name: "First Rain",
    w: 176,
    time: 255,
    giants: true,
    pits: [[42, 54, 70]],
    crates: [
      [12, 9, 2],
      [28, 7, 3],
      [66, 7, 3],
      [90, 6, 2],
    ],
    coins: [
      [13, 8],
      [29, 6],
      [67, 6],
      [91, 5],
      [78, 9],
      [110, 9],
      [130, 9],
      [148, 9],
    ],
    stakes: [18, 19, 34, 35, 60, 74, 75, 104, 105, 120, 121],
    walkers: [22, 70, 114],
    hoppers: [32, 100, 140],
    checks: [80],
    paint: [[30, 6, "B?B"]],
    power: [68, 6],
  },
  {
    name: "Broken Bridge",
    w: 188,
    time: 270,
    giants: true,
    pits: [
      [32, 48, 74],
      [112, 130, 82],
    ],
    crates: [
      [14, 8, 3],
      [22, 6, 2],
      [60, 7, 3],
      [86, 6, 2],
      [100, 8, 2],
      [142, 7, 3],
    ],
    coins: [
      [15, 7],
      [23, 5],
      [61, 6],
      [87, 5],
      [78, 9],
      [104, 9],
      [143, 6],
      [158, 9],
    ],
    walkers: [18, 64, 96, 148],
    hoppers: [26, 90, 156],
    stakes: [56, 57, 92, 93, 138, 139],
    checks: [106],
    power: [62, 6],
  },
  {
    name: "Red Loft",
    w: 180,
    time: 265,
    giants: true,
    crates: [
      [10, 9, 3],
      [20, 7, 3],
      [32, 5, 3],
      [48, 7, 2],
      [60, 5, 4],
      [80, 6, 3],
      [100, 4, 3],
    ],
    coins: [
      [11, 8],
      [21, 6],
      [33, 4],
      [49, 6],
      [61, 4],
      [81, 5],
      [101, 3],
      [120, 9],
      [140, 9],
    ],
    pits: [[128, 142, 78]],
    walkers: [46, 92, 122],
    hoppers: [16, 74, 150],
    stakes: [90, 91, 118, 119],
    checks: [124],
    paint: [[34, 4, "!"]],
  },
  {
    name: "Stake Gale",
    w: 186,
    time: 275,
    giants: true,
    stakes: [12, 13, 14, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55, 110, 111, 118, 119, 128, 129, 138, 139, 148, 149],
    crates: [
      [16, 8, 3],
      [26, 7, 2],
      [34, 6, 2],
      [50, 7, 2],
      [114, 8, 3],
      [132, 6, 3],
    ],
    coins: [
      [17, 7],
      [27, 6],
      [35, 5],
      [51, 6],
      [70, 9],
      [90, 9],
      [115, 7],
      [133, 5],
      [160, 9],
    ],
    pits: [[74, 90, 76]],
    walkers: [20, 64, 108, 156],
    hoppers: [42, 100, 144],
    checks: [96],
    power: [36, 5],
  },
  {
    name: "Three Boards",
    w: 200,
    time: 290,
    giants: true,
    pits: [
      [30, 42, 72],
      [84, 98, 80],
      [140, 156, 86],
    ],
    crates: [
      [14, 8, 2],
      [20, 6, 2],
      [52, 7, 3],
      [70, 6, 2],
      [108, 7, 3],
      [124, 5, 2],
      [166, 7, 3],
    ],
    coins: [
      [15, 7],
      [21, 5],
      [53, 6],
      [71, 5],
      [76, 9],
      [109, 6],
      [125, 4],
      [132, 9],
      [167, 6],
    ],
    walkers: [16, 56, 112, 170],
    hoppers: [24, 74, 120, 164],
    stakes: [48, 49, 104, 105, 162, 163],
    checks: [78, 136],
    power: [54, 6],
  },
  {
    name: "Leaping Dark",
    w: 178,
    time: 265,
    giants: true,
    pits: [
      [46, 56, 70],
      [112, 126, 78],
    ],
    crates: [
      [12, 9, 2],
      [22, 7, 3],
      [34, 5, 2],
      [68, 7, 3],
      [90, 6, 2],
      [136, 6, 3],
    ],
    coins: [
      [13, 8],
      [23, 6],
      [35, 4],
      [69, 6],
      [91, 5],
      [104, 9],
      [137, 5],
      [150, 9],
    ],
    hoppers: [18, 30, 40, 64, 84, 104, 132, 148],
    walkers: [62, 100],
    stakes: [38, 60, 86, 108],
    checks: [108],
    paint: [[24, 6, "?B!"]],
  },
  {
    name: "Long Thunder",
    w: 214,
    time: 310,
    giants: true,
    pits: [
      [40, 54, 74],
      [102, 118, 82],
      [160, 176, 88],
    ],
    crates: [
      [12, 8, 3],
      [24, 6, 2],
      [64, 7, 3],
      [80, 5, 2],
      [128, 7, 3],
      [144, 5, 2],
      [186, 6, 3],
    ],
    coins: [
      [13, 7],
      [25, 5],
      [65, 6],
      [81, 4],
      [92, 9],
      [129, 6],
      [145, 4],
      [152, 9],
      [187, 5],
      [196, 9],
    ],
    walkers: [18, 70, 96, 136, 190],
    hoppers: [30, 88, 124, 150, 184],
    stakes: [34, 35, 74, 75, 124, 125, 154, 155, 180, 181],
    checks: [98, 156],
    power: [66, 6],
    paint: [[26, 5, "?"]],
  },
  {
    name: "Crown Path",
    w: 192,
    time: 280,
    giants: true,
    pits: [
      [48, 64, 80],
      [124, 142, 88],
    ],
    crates: [
      [12, 9, 2],
      [22, 7, 3],
      [34, 5, 2],
      [74, 7, 3],
      [96, 6, 2],
      [112, 8, 2],
      [152, 6, 3],
    ],
    coins: [
      [13, 8],
      [23, 6],
      [35, 4],
      [75, 6],
      [97, 5],
      [108, 9],
      [118, 9],
      [153, 5],
      [168, 9],
    ],
    stakes: [16, 17, 30, 31, 40, 41, 70, 84, 85, 108, 109, 148, 149, 164, 165],
    walkers: [20, 78, 116, 160],
    hoppers: [28, 90, 120, 158],
    checks: [120],
    paint: [[24, 6, "B!B"]],
  },
  {
    name: "The Crown",
    w: 100,
    time: 240,
    boss: "crown",
    crates: [
      [16, 6, 3],
      [58, 6, 4],
    ],
    coins: [
      [17, 5],
      [28, 9],
      [40, 9],
      [48, 9],
      [60, 5],
      [72, 9],
    ],
    paint: [[36, 8, "?"]],
  },
];

export function moonLanes(): RawLane[] {
  return MOON.map(buildSpec);
}

export function stormLanes(): RawLane[] {
  return STORM.map(buildSpec);
}
