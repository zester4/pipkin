import { loadArt, type Art } from "@/game/assets";
import { createAudio, type AudioBus } from "@/game/audio";
import {
  ACCEL,
  AIR_ACCEL,
  AIR_DRAG,
  APEX,
  BUFFER,
  COYOTE,
  DIFFICULTIES,
  FRICTION,
  G_APEX,
  G_FALL,
  G_RISE,
  JUMP,
  MAX_FALL,
  MAX_RUN,
  PH,
  PW,
  STEP,
  TILE,
  VIEW_H,
  VIEW_W,
  STAGE_META,
  clockText,
  type BossKind,
  type Difficulty,
  type Look,
  type Rank,
} from "@/game/constants";
import { LEVELS, locate, type LevelDef, type MoverDef } from "@/game/levels";

export type Phase = "title" | "playing" | "paused" | "dead" | "finish" | "clear" | "won" | "over";

export type UiSnapshot = {
  phase: Phase;
  ready: boolean;
  score: number;
  seeds: number;
  found: number;
  total: number;
  lives: number;
  time: number;
  levelName: string;
  levelIndex: number;
  levelCount: number;
  best: number;
  muted: boolean;
  power: number;
  message: string;
  hops: number;
  difficulty: Difficulty;
  lane: number;
  coach: string;
  rank: Rank;
  ranks: Rank[];
  unlocked: number;
  stageName: string;
  stageLane: number;
  stageLanes: number;
  nextLabel: string;
  bossHp: number;
  bossMax: number;
  stageTime: number;
  par: number;
};

export type LayoutBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  roomBelow: number;
  roomLeft: number;
  roomRight: number;
};

type Enemy = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
  dead: boolean;
  timer: number;
  kind: "walk" | "hop";
  hop: number;
};

type Mover = MoverDef & { dir: number; prevX: number; prevY: number };

type Shot = { x: number; y: number; vx: number; vy: number; r: number; life: number };
type Giant = { x: number; y: number; life: number; fireIn: number; shotsLeft: number };
type Coin = { x: number; y: number; taken: boolean };
type Boss = {
  kind: BossKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
  hp: number;
  maxHp: number;
  hop: number;
  hurt: number;
  mode: "walk" | "charge";
  modeT: number;
  shotT: number;
  dead: boolean;
};
type Mark = { x: number; y: number; got: boolean };
type Popup = { x: number; y: number; text: string; life: number };
type Bit = { x: number; y: number; vx: number; vy: number; life: number; color: string };

type World = {
  name: string;
  timeLeft: number;
  grid: string[][];
  spawn: { x: number; y: number };
  checkpoint: { x: number; y: number };
  flag: { x: number; y: number };
  coins: Coin[];
  checks: Mark[];
  enemies: Enemy[];
  initialEnemies: Enemy[];
  movers: Mover[];
  seedTotal: number;
  stage: 1 | 2 | 3;
  look: Look;
  bossKind: BossKind | null;
  giants: boolean;
};

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  canCut: boolean;
  jumpsLeft: number;
  iframe: number;
  powered: boolean;
  power: number;
  drop: number;
  ride: Mover | null;
  squashX: number;
  squashY: number;
  runDist: number;
};

const SAVE_KEY = "pipkin.v1";
const SOLID = new Set(["#", "B", "?", "!", "U", "P"]);

type SaveState = {
  best: number;
  muted: boolean;
  difficulty: Difficulty;
  lane: number;
  unlocked: number;
  ranks: Rank[];
};

function blankRanks(): Rank[] {
  return LEVELS.map(() => "none" as Rank);
}

function rankValue(rank: Rank) {
  if (rank === "perfect") return 3;
  if (rank === "ribbon") return 2;
  if (rank === "pip") return 1;
  return 0;
}

function asRank(value: unknown): Rank {
  return value === "pip" || value === "ribbon" || value === "perfect" ? value : "none";
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function approach(v: number, target: number, delta: number) {
  if (v < target) return Math.min(target, v + delta);
  if (v > target) return Math.max(target, v - delta);
  return target;
}

function readSave(): SaveState {
  const empty: SaveState = { best: 0, muted: false, difficulty: "normal", lane: 0, unlocked: 0, ranks: blankRanks() };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as {
      best?: number;
      muted?: boolean;
      difficulty?: string;
      lane?: number;
      unlocked?: number;
      ranks?: unknown[];
    };
    const difficulty = parsed.difficulty === "easy" || parsed.difficulty === "hard" ? parsed.difficulty : "normal";
    const lane = typeof parsed.lane === "number" ? parsed.lane : 0;
    let unlocked = typeof parsed.unlocked === "number" ? parsed.unlocked : 0;
    const ranks = blankRanks();
    if (Array.isArray(parsed.ranks)) {
      for (let i = 0; i < ranks.length; i++) ranks[i] = asRank(parsed.ranks[i]);
    }
    if (ranks[5] && ranks[5] !== "none" && unlocked < 6) unlocked = 6;
    return {
      best: typeof parsed.best === "number" ? parsed.best : 0,
      muted: Boolean(parsed.muted),
      difficulty,
      lane,
      unlocked,
      ranks,
    };
  } catch {
    return empty;
  }
}

function writeSave(state: SaveState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 3, ...state }));
  } catch {
    /* private mode */
  }
}

export type GameApi = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  retry: () => void;
  toggleMute: () => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setLane: (index: number) => void;
  map: () => void;
  pointer: (which: "left" | "right" | "jump", down: boolean) => void;
  destroy: () => void;
};

export function createGame(
  canvas: HTMLCanvasElement,
  hooks: {
    onUi: (ui: UiSnapshot) => void;
    onLayout: (box: LayoutBox) => void;
  },
): GameApi {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const audio: AudioBus = createAudio();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let viewW = VIEW_W;
  let viewH = VIEW_H;

  function fitView() {
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const portrait = cssH > cssW * 1.08;
    if (portrait) {
      const deckCss = 132;
      const playH = Math.max(240, cssH - deckCss);
      viewW = 300;
      const scale = cssW / viewW;
      viewH = clamp(Math.round(playH / scale), 320, 14 * TILE);
    } else {
      viewW = VIEW_W;
      viewH = VIEW_H;
    }
  }
  const keys = new Set<string>();
  const touch = { left: false, right: false, jump: false };
  let probe: Set<string> | null = null;
  let art: Art | null = null;
  let alive = true;
  let ready = false;
  let phase: Phase = "title";
  let levelIndex = 0;
  let score = 0;
  let seeds = 0;
  let lives = 3;
  let combo = 0;
  let best = 0;
  let muted = false;
  let difficulty: Difficulty = "normal";
  let startLane = 0;
  let unlocked = 0;
  let ranks: Rank[] = blankRanks();
  let rank: Rank = "none";
  let levelSeeds = 0;
  let levelDeaths = 0;
  let coach = "";
  let stoodCrate = false;
  let didStomp = false;
  let rodePlank = false;
  let taughtHop = false;
  let hopSeen = 0;
  let taughtShot = false;
  let shotSeen = 0;
  let stageNow = 0;
  let stageTime = 0;
  let flagNag = false;
  let message = "";
  let cleared = false;
  let deadT = 0;
  let finishT = 0;
  let attract = 0;
  let time = 0;
  let hitStop = 0;
  let shake = 0;
  let hurtFlash = 0;
  let snapCam = false;
  let camX = 0;
  let camY = 80;
  let sig = "";
  let layoutSig = "";
  let wasJump = false;
  let suppressJump = false;
  let acc = 0;
  let last = performance.now();
  let raf = 0;

  const bumps = new Map<string, number>();
  const popups: Popup[] = [];
  const bits: Bit[] = [];

  const saved = readSave();
  best = saved.best;
  muted = saved.muted;
  difficulty = saved.difficulty;
  unlocked = clamp(saved.unlocked, 0, LEVELS.length - 1);
  ranks = saved.ranks;
  startLane = clamp(Math.min(saved.lane, unlocked), 0, LEVELS.length - 1);
  audio.setMuted(muted);

  let world = build(LEVELS[startLane]);
  let player = makePlayer(world.spawn.x, world.spawn.y);
  let boss: Boss | null = null;
  const shots: Shot[] = [];
  let giant: Giant | null = null;
  let giantTimer = 10;

  function makePlayer(x: number, y: number): Player {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      coyote: 0,
      jumpBuffer: 0,
      canCut: false,
      jumpsLeft: 2,
      iframe: 0,
      powered: false,
      power: 0,
      drop: 0,
      ride: null,
      squashX: 1,
      squashY: 1,
      runDist: 0,
    };
  }

  function speedFor(stage: number) {
    const mul = stage === 3 ? 1.18 : stage === 2 ? 1.08 : 1;
    return 42 * DIFFICULTIES[difficulty].enemy * mul;
  }

  function nubSpeed() {
    return speedFor(world.stage);
  }

  function makeEnemy(x: number, y: number, dir: number, kind: "walk" | "hop", speed: number): Enemy {
    return {
      x,
      y,
      w: 22,
      h: 18,
      vx: dir * speed,
      vy: 0,
      grounded: false,
      dead: false,
      timer: 0,
      kind,
      hop: kind === "hop" ? 0.7 : 0,
    };
  }

  function build(def: LevelDef): World {
    const grid = def.rows.map((row) => row.split(""));
    const worldW: World = {
      name: def.name,
      timeLeft: Math.max(30, Math.round(def.time * DIFFICULTIES[difficulty].time)),
      grid,
      spawn: { x: 80, y: 80 },
      checkpoint: { x: 80, y: 80 },
      flag: { x: 200, y: 80 },
      coins: [],
      checks: [],
      enemies: [],
      initialEnemies: [],
      movers: def.movers.map((m) => ({ ...m, dir: 1, prevX: m.x, prevY: m.y })),
      seedTotal: 0,
      stage: def.stage,
      look: def.look,
      bossKind: def.boss,
      giants: def.giants,
    };
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        const cell = grid[y][x];
        if (cell === "S" && difficulty === "easy" && x % 2 === 1) {
          grid[y][x] = ".";
          continue;
        }
        if (cell === "?" || cell === "c") worldW.seedTotal += 1;
        if (cell === "@") {
          worldW.spawn = { x: (x + 0.5) * TILE, y: (y + 1) * TILE };
          grid[y][x] = ".";
        } else if (cell === "e" || cell === "h") {
          const dir = x % 2 === 0 ? -1 : 1;
          worldW.enemies.push(
            makeEnemy((x + 0.5) * TILE, (y + 1) * TILE, dir, cell === "h" ? "hop" : "walk", speedFor(def.stage)),
          );
          grid[y][x] = ".";
        } else if (cell === "c") {
          worldW.coins.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
          grid[y][x] = ".";
        } else if (cell === "F") {
          worldW.flag = { x: (x + 0.5) * TILE, y: (y + 1) * TILE };
          grid[y][x] = ".";
        } else if (cell === "K") {
          grid[y][x] = ".";
          if (difficulty !== "hard") {
            worldW.checks.push({ x: (x + 0.5) * TILE, y: (y + 1) * TILE, got: false });
          }
        }
      }
    }
    worldW.checkpoint = { ...worldW.spawn };
    worldW.initialEnemies = worldW.enemies.map((e) => ({ ...e }));
    return worldW;
  }

  function mapW() {
    return world.grid[0].length * TILE;
  }
  function mapH() {
    return world.grid.length * TILE;
  }

  function surfaceTop(tx: number): number | null {
    if (tx < 1 || tx >= world.grid[0].length - 1) return null;
    for (let ty = 0; ty < world.grid.length; ty++) {
      const cell = world.grid[ty][tx];
      if (cell === "#" || cell === "P" || cell === "B" || cell === "U" || cell === "?" || cell === "!") return ty * TILE;
    }
    return null;
  }

  function beastSize(kind: BossKind) {
    const crown = kind === "crown";
    return { w: crown ? 104 : 80, h: crown ? 108 : 84, s: crown ? 1.55 : 1.22 };
  }

  function makeBoss(kind: BossKind): Boss {
    const bump = difficulty === "hard" ? 2 : difficulty === "easy" ? -1 : 0;
    const maxHp = Math.max(3, (kind === "crown" ? 8 : 5) + bump);
    const size = beastSize(kind);
    return {
      kind,
      x: Math.min(mapW() - 220, 390),
      y: 11 * TILE,
      w: size.w,
      h: size.h,
      vx: -34 * DIFFICULTIES[difficulty].enemy,
      vy: 0,
      grounded: false,
      hp: maxHp,
      maxHp,
      hop: 1,
      hurt: 0,
      mode: "walk",
      modeT: 2.2,
      shotT: kind === "crown" ? 1.8 : 99,
      dead: false,
    };
  }

  function fireShot(x: number, y: number, speed: number, r: number) {
    const dx = player.x - x;
    const dy = player.y - PH * 0.45 - y;
    const mag = Math.hypot(dx, dy) || 1;
    shots.push({ x, y, vx: (dx / mag) * speed, vy: (dy / mag) * speed, r, life: 4 });
    audio.bump();
  }

  function heavyHit() {
    if (player.iframe > 0 || phase !== "playing") return;
    audio.hurt();
    shake = 0.42;
    hurtFlash = 0.5;
    lives -= 2;
    levelDeaths += 1;
    player.iframe = 2;
    player.vy = -320;
    player.vx = -player.facing * 40;
    player.grounded = false;
    player.powered = false;
    player.power = 0;
    rememberBest();
    if (lives <= 0) {
      lives = 0;
      phase = "over";
      message = "That shot ended the run.";
    } else {
      phase = "dead";
      deadT = 1;
      message = lives === 1 ? "The shot took 2 lives. 1 left" : `The shot took 2 lives. ${lives} left`;
    }
    emit();
  }

  function shotBlocked(s: Shot) {
    const cell = world.grid[Math.floor(s.y / TILE)]?.[Math.floor(s.x / TILE)];
    return Boolean(cell && SOLID.has(cell));
  }

  function stepShots(dt: number) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0 || s.y < -40 || s.y > mapH() + 40 || shotBlocked(s)) {
        if (shotBlocked(s)) burst(s.x, s.y, "#f2b705");
        shots.splice(i, 1);
        continue;
      }
      const dx = player.x - s.x;
      const dy = player.y - PH * 0.5 - s.y;
      if (dx * dx + dy * dy < (s.r + 12) * (s.r + 12)) {
        shots.splice(i, 1);
        heavyHit();
        if (phase !== "playing") return;
      }
    }
  }

  function stepGiant(dt: number) {
    if (!world.giants) {
      giant = null;
      return;
    }
    if (!giant) {
      giantTimer -= dt;
      if (giantTimer > 0) return;
      const prefer = clamp(Math.floor(player.x / TILE) + 8, 2, world.grid[0].length - 3);
      let perch: { x: number; y: number } | null = null;
      for (let d = 0; d < 12 && !perch; d++) {
        for (const tx of [prefer + d, prefer - d]) {
          const top = surfaceTop(tx);
          if (top != null) {
            perch = { x: (tx + 0.5) * TILE, y: top };
            break;
          }
        }
      }
      giantTimer = 16;
      if (!perch) return;
      giant = { x: perch.x, y: perch.y, life: 5.2, fireIn: 0.85, shotsLeft: 3 };
      return;
    }
    giant.life -= dt;
    giant.fireIn -= dt;
    if (giant.fireIn <= 0 && giant.shotsLeft > 0) {
      fireShot(giant.x + (player.x < giant.x ? -20 : 20), giant.y - 90, 162, 13);
      giant.shotsLeft -= 1;
      giant.fireIn = 1.25;
    }
    if (giant.life <= 0) giant = null;
  }

  function stepBoss(dt: number, prevFeet: number) {
    if (!boss || boss.dead) return;
    boss.hurt = Math.max(0, boss.hurt - dt);
    boss.modeT -= dt;
    const walk = 36 * DIFFICULTIES[difficulty].enemy;
    if (boss.mode === "charge") {
      if (boss.modeT <= 0) {
        boss.mode = "walk";
        boss.modeT = 2.5;
        boss.vx = Math.sign(boss.vx || -1) * walk;
      }
    } else if (boss.modeT <= 0) {
      boss.mode = "charge";
      boss.modeT = 0.72;
      boss.vx = Math.sign(player.x - boss.x || 1) * 176 * DIFFICULTIES[difficulty].enemy;
    }
    if (boss.kind === "crown") {
      boss.shotT -= dt;
      if (boss.shotT <= 0) {
        boss.shotT = 2.45;
        fireShot(boss.x, boss.y - boss.h * 0.62, 190, 15);
      }
    }
    if (boss.x < 100 || boss.x > mapW() - 100) boss.vx = Math.sign(mapW() * 0.5 - boss.x) * Math.abs(boss.vx || walk);
    if (boss.grounded) {
      boss.hop -= dt;
      if (boss.hop <= 0) {
        boss.vy = boss.kind === "crown" ? -340 : -390;
        boss.hop = 1.25;
        boss.grounded = false;
      }
    }
    boss.vy = Math.min(MAX_FALL, boss.vy + G_FALL * dt);
    const ox = boss.x;
    boss.x += boss.vx * dt;
    if (overlaps(boss.x, boss.y, boss.w, boss.h)) {
      boss.x = ox;
      boss.vx *= -1;
    }
    boss.grounded = false;
    boss.y += boss.vy * dt;
    if (overlaps(boss.x, boss.y, boss.w, boss.h)) {
      let y = boss.y;
      const falling = boss.vy > 0;
      let guard = 0;
      while (overlaps(boss.x, y, boss.w, boss.h) && guard++ < 90) y += falling ? -1 : 1;
      boss.y = y;
      boss.vy = 0;
      if (falling) boss.grounded = true;
    }
    if (player.iframe <= 0 && boss.hurt <= 0 && phase === "playing") {
      const overlap =
        Math.abs(player.x - boss.x) < (PW + boss.w) / 2 - 8 &&
        player.y > boss.y - boss.h &&
        player.y - PH < boss.y - 6;
      if (overlap) {
        const top = boss.y - boss.h;
        if (player.vy > 20 && prevFeet <= top + 18) {
          boss.hp -= 1;
          boss.hurt = 0.55;
          player.vy = -400;
          player.grounded = false;
          player.canCut = false;
          audio.stomp();
          hitStop = 0.06;
          shake = 0.18;
          popup(boss.x, top, boss.hp <= 0 ? "Down" : `${boss.hp} left`);
          burst(boss.x, top + 10, "#e4572e");
          if (boss.hp <= 0) {
            boss.dead = true;
            burst(boss.x, boss.y - 20, "#f2b705");
            finishLevel(boss.kind === "crown" ? "The crown falls" : "The beast falls");
          }
        } else hurt();
      }
    }
  }

  function solidAt(tx: number, ty: number) {
    if (tx < 0 || tx >= world.grid[0].length) return true;
    if (ty < 0) return true;
    if (ty >= world.grid.length) return false;
    return SOLID.has(world.grid[ty][tx]);
  }

  function overlaps(x: number, feet: number, w: number, h: number) {
    const l = x - w / 2;
    const r = x + w / 2 - 0.001;
    const t = feet - h;
    const b = feet - 0.001;
    const x0 = Math.floor(l / TILE);
    const x1 = Math.floor(r / TILE);
    const y0 = Math.floor(t / TILE);
    const y1 = Math.floor(b / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (solidAt(tx, ty)) return true;
      }
    }
    return false;
  }

  function held(code: string) {
    return probe ? probe.has(code) : keys.has(code);
  }

  function moveXInput() {
    let mx = 0;
    if (held("KeyA") || held("ArrowLeft") || (!probe && touch.left)) mx -= 1;
    if (held("KeyD") || held("ArrowRight") || (!probe && touch.right)) mx += 1;
    if (!probe) {
      const pads = navigator.getGamepads?.() ?? [];
      for (const gp of pads) {
        if (!gp) continue;
        const ax = gp.axes[0] ?? 0;
        const mag = Math.abs(ax) < 0.18 ? 0 : Math.sign(ax) * ((Math.abs(ax) - 0.18) / 0.82);
        if (gp.buttons[14]?.pressed) mx -= 1;
        if (gp.buttons[15]?.pressed) mx += 1;
        if (Math.abs(mag) > Math.abs(mx)) mx = mag;
      }
    }
    return clamp(mx, -1, 1);
  }

  function jumpHeld() {
    let down = held("Space") || held("ArrowUp") || held("KeyW") || (!probe && touch.jump);
    if (!probe) {
      const pads = navigator.getGamepads?.() ?? [];
      for (const gp of pads) {
        if (gp?.buttons[0]?.pressed) down = true;
      }
    }
    return down;
  }

  function downHeld() {
    let down = held("ArrowDown") || held("KeyS");
    if (!probe) {
      const pads = navigator.getGamepads?.() ?? [];
      for (const gp of pads) {
        if ((gp?.buttons[13]?.pressed ?? false) || (gp?.axes[1] ?? 0) > 0.6) down = true;
      }
    }
    return down;
  }

  function popup(x: number, y: number, text: string) {
    popups.push({ x, y, text, life: 0.7 });
  }

  function burst(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i++) {
      bits.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 160,
        vy: -40 - Math.random() * 120,
        life: 0.35,
        color,
      });
    }
  }

  function persist() {
    writeSave({ best, muted, difficulty, lane: startLane, unlocked, ranks });
  }

  function rememberBest() {
    if (score > best) {
      best = score;
      persist();
    }
  }

  function doJump(air: boolean) {
    const base = (air ? JUMP * 1.05 : JUMP) * (player.powered ? 1.08 : 1);
    player.vy = base;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.canCut = !air;
    player.ride = null;
    player.squashX = 0.84;
    player.squashY = 1.18;
    if (air) burst(player.x, player.y - 8, "#f2b705");
    audio.jump();
  }

  function hitBlock(tx: number, ty: number) {
    const cell = world.grid[ty]?.[tx];
    if (!cell) return;
    const key = `${tx},${ty}`;
    if (cell === "?" || cell === "!") {
      world.grid[ty][tx] = "U";
      bumps.set(key, 0.16);
      if (cell === "?") {
        score += 100;
        seeds += 1;
        levelSeeds += 1;
        popup((tx + 0.5) * TILE, ty * TILE, "+100");
        audio.coin();
      } else {
        player.powered = true;
        player.power = 12;
        score += 1000;
        popup((tx + 0.5) * TILE, ty * TILE, "Amber!");
        audio.power();
      }
      shake = Math.max(shake, 0.08);
    } else if (cell === "B") {
      bumps.set(key, 0.16);
      if (player.powered) {
        world.grid[ty][tx] = ".";
        score += 50;
        burst((tx + 0.5) * TILE, (ty + 0.5) * TILE, "#c48a4a");
        audio.bump();
      } else audio.bump();
    } else if (cell === "U" || cell === "P") {
      bumps.set(key, 0.1);
      audio.bump();
    }
  }

  function bonk() {
    const head = player.y - PH;
    const ty = Math.floor((head - 0.5) / TILE);
    const x0 = Math.floor((player.x - PW / 2) / TILE);
    const x1 = Math.floor((player.x + PW / 2 - 0.001) / TILE);
    for (let tx = x0; tx <= x1; tx++) hitBlock(tx, ty);
  }

  function moveBodyX(dt: number) {
    let left = player.vx * dt;
    const sign = Math.sign(left);
    while (Math.abs(left) > 0.0001) {
      const dx = sign * Math.min(Math.abs(left), 6);
      left -= dx;
      const nx = player.x + dx;
      if (!overlaps(nx, player.y, PW, PH)) {
        player.x = nx;
        continue;
      }
      const max = player.grounded ? TILE : 8;
      let stepped = false;
      for (let s = 2; s <= max; s += 2) {
        if (!overlaps(nx, player.y - s, PW, PH)) {
          player.x = nx;
          player.y -= s;
          stepped = true;
          break;
        }
      }
      if (!stepped) {
        player.vx = 0;
        break;
      }
    }
  }

  function moveBodyY(dt: number) {
    let left = player.vy * dt;
    const sign = Math.sign(left);
    if (sign === 0) return;
    while (Math.abs(left) > 0.0001) {
      const dy = sign * Math.min(Math.abs(left), 6);
      left -= dy;
      const ny = player.y + dy;
      if (!overlaps(player.x, ny, PW, PH)) {
        player.y = ny;
        continue;
      }
      if (dy > 0) {
        let y = ny;
        let guard = 0;
        while (overlaps(player.x, y, PW, PH) && guard++ < 48) y -= 1;
        player.y = y;
        player.vy = 0;
        player.grounded = true;
      } else {
        let y = ny;
        let guard = 0;
        while (overlaps(player.x, y, PW, PH) && guard++ < 48) y += 1;
        player.y = y;
        player.vy = 0;
        bonk();
      }
      break;
    }
  }

  function landOneWays(prevFeet: number) {
    if (player.drop > 0 || player.vy < 0) return;
    const x0 = Math.floor((player.x - PW / 2) / TILE);
    const x1 = Math.floor((player.x + PW / 2 - 0.001) / TILE);
    const ty0 = Math.floor(prevFeet / TILE);
    const ty1 = Math.floor(player.y / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (world.grid[ty]?.[tx] !== "^") continue;
        const top = ty * TILE;
        if (prevFeet <= top + 2 && player.y >= top && player.y - top <= TILE) {
          player.y = top;
          player.vy = 0;
          player.grounded = true;
        }
      }
    }
  }

  function landPlatforms(prevFeet: number) {
    if (player.drop > 0 || player.vy < 0) return;
    for (const m of world.movers) {
      if (player.x + PW / 2 <= m.x || player.x - PW / 2 >= m.x + m.w) continue;
      if (prevFeet <= m.y + 3 && player.y >= m.y && player.y - m.y < 20) {
        player.y = m.y;
        player.vy = 0;
        player.grounded = true;
        player.ride = m;
        rodePlank = true;
      }
    }
  }

  function stick() {
    if (player.vy < 0 || player.drop > 0 || player.grounded) return;
    if (overlaps(player.x, player.y + 1, PW, PH)) {
      player.grounded = true;
      player.vy = 0;
    }
  }

  function die() {
    if (phase !== "playing") return;
    audio.hurt();
    shake = 0.25;
    hurtFlash = 0.3;
    lives -= 1;
    levelDeaths += 1;
    rememberBest();
    if (lives <= 0) {
      phase = "over";
      message = "The nubs kept the orchard.";
    } else {
      phase = "dead";
      deadT = 0.85;
      message = lives === 1 ? "1 life left" : `${lives} lives left`;
    }
    emit();
  }

  function hurt() {
    if (player.iframe > 0 || phase !== "playing") return;
    if (player.powered) {
      player.powered = false;
      player.power = 0;
      player.iframe = 1.35;
      player.vy = -240;
      player.vx = -player.facing * 120;
      player.grounded = false;
      audio.hurt();
      shake = 0.18;
      return;
    }
    die();
  }

  function finishLevel(word = "Ribbon") {
    if (cleared || phase !== "playing") return;
    cleared = true;
    phase = "finish";
    finishT = 0.95;
    message = word;
    coach = "";
    audio.win();
    emit();
  }

  function awardRank(): Rank {
    const total = world.seedTotal;
    const found = levelSeeds;
    if (total > 0 && found >= total && levelDeaths === 0) return "perfect";
    if (total === 0 || found * 3 >= total * 2) return "ribbon";
    return "pip";
  }

  function completeClear() {
    const bonus = Math.max(0, Math.floor(world.timeLeft)) * 25;
    score += bonus + 1000;
    const total = world.seedTotal;
    const found = levelSeeds;
    const left = Math.max(0, total - found);
    rank = awardRank();
    if (rankValue(rank) > rankValue(ranks[levelIndex] ?? "none")) ranks[levelIndex] = rank;
    if (levelIndex + 1 < LEVELS.length) unlocked = Math.max(unlocked, levelIndex + 1);
    const seedLine = left === 0 ? `Every seed. Time bonus +${bonus}` : `${found} of ${total} seeds, ${left} left behind. Time bonus +${bonus}`;
    const next = LEVELS[levelIndex + 1];
    const stageEnd = !next || next.stage !== world.stage;
    if (stageEnd) {
      const meta = STAGE_META[world.stage - 1];
      const clock = clockText(stageTime);
      const under = stageTime <= meta.par;
      const parLine =
        world.stage === 1 && under
          ? `${meta.name} in ${clock}. Under six minutes.`
          : under
            ? `${meta.name} in ${clock}. Under the par.`
            : `${meta.name} in ${clock}.`;
      message = `${seedLine} ${parLine}`;
    } else message = seedLine;
    rememberBest();
    persist();
    phase = "clear";
    emit();
  }

  function resetEnemies() {
    world.enemies = world.initialEnemies.map((e) => ({
      ...e,
      dead: false,
      timer: 0,
      vy: 0,
      grounded: false,
      hop: e.kind === "hop" ? 0.7 : 0,
    }));
  }

  function respawn() {
    player = makePlayer(world.checkpoint.x, world.checkpoint.y);
    player.iframe = 1.5;
    resetEnemies();
    if (world.bossKind) boss = makeBoss(world.bossKind);
    shots.length = 0;
    giant = null;
    giantTimer = world.giants ? 7 : 1e9;
    snapCam = true;
    phase = "playing";
    emit();
  }

  function loadLevel(index: number) {
    const nextStage = LEVELS[index].stage;
    if (nextStage !== stageNow) {
      stageTime = 0;
      stageNow = nextStage;
    }
    levelIndex = index;
    world = build(LEVELS[index]);
    player = makePlayer(world.spawn.x, world.spawn.y);
    boss = world.bossKind ? makeBoss(world.bossKind) : null;
    shots.length = 0;
    giant = null;
    giantTimer = world.giants ? 10 : 1e9;
    flagNag = false;
    cleared = false;
    combo = 0;
    levelSeeds = 0;
    levelDeaths = 0;
    rank = "none";
    stoodCrate = false;
    didStomp = false;
    rodePlank = false;
    hopSeen = 0;
    coach = "";
    popups.length = 0;
    bits.length = 0;
    bumps.clear();
    snapCam = true;
    message = "";
  }

  function physics(dt: number) {
    if (phase !== "playing") return;
    player.iframe = Math.max(0, player.iframe - dt);
    player.drop = Math.max(0, player.drop - dt);
    if (player.powered) {
      player.power -= dt;
      if (player.power <= 0) {
        player.powered = false;
        player.power = 0;
      }
    }
    world.timeLeft -= dt;
    stageTime += dt;
    if (world.timeLeft <= 0) {
      world.timeLeft = 0;
      die();
      return;
    }

    const jumping = jumpHeld();
    const pressed = jumping && !wasJump;
    wasJump = jumping;
    if (suppressJump) {
      if (!jumping) suppressJump = false;
    } else if (pressed) player.jumpBuffer = BUFFER;
    else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    if (player.grounded) {
      player.coyote = COYOTE;
      player.jumpsLeft = 2;
      combo = 0;
    } else player.coyote = Math.max(0, player.coyote - dt);

    const wantJump = player.jumpBuffer > 0 && (player.grounded || player.coyote > 0);
    const onSoft =
      player.ride !== null ||
      world.grid[Math.floor(player.y / TILE)]?.[Math.floor(player.x / TILE)] === "^";
    if (wantJump && downHeld() && player.grounded && onSoft) {
      player.drop = 0.22;
      player.grounded = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      player.jumpsLeft = 1;
      player.y += 3;
      player.ride = null;
    } else if (wantJump && player.jumpsLeft > 0) {
      doJump(false);
      player.jumpsLeft -= 1;
    } else if (pressed && player.jumpsLeft > 0 && !player.grounded && player.coyote <= 0 && player.drop <= 0) {
      doJump(true);
      player.jumpsLeft -= 1;
    }

    if (!jumping && player.canCut && player.vy < 0) {
      player.vy *= 0.48;
      player.canCut = false;
    }

    const mx = moveXInput();
    if (mx !== 0) player.facing = mx > 0 ? 1 : -1;
    const rate = mx === 0 ? (player.grounded ? FRICTION : AIR_DRAG) : player.grounded ? ACCEL : AIR_ACCEL;
    player.vx = approach(player.vx, mx === 0 ? 0 : mx * MAX_RUN, rate * dt);
    if (player.grounded) player.runDist += Math.abs(player.vx) * dt;

    if (!player.grounded) {
      let g = player.vy < 0 ? G_RISE : G_FALL;
      if (Math.abs(player.vy) < APEX) g = G_APEX;
      player.vy = Math.min(MAX_FALL, player.vy + g * dt);
    }

    for (const m of world.movers) {
      m.prevX = m.x;
      m.prevY = m.y;
      if (m.axis === "x") {
        m.x += m.dir * m.speed * dt;
        if (m.x < m.min || m.x > m.max) {
          m.x = clamp(m.x, m.min, m.max);
          m.dir *= -1;
        }
      } else {
        m.y += m.dir * m.speed * dt;
        if (m.y < m.min || m.y > m.max) {
          m.y = clamp(m.y, m.min, m.max);
          m.dir *= -1;
        }
      }
    }
    if (player.ride) {
      player.x += player.ride.x - player.ride.prevX;
      player.y += player.ride.y - player.ride.prevY;
    }
    player.ride = null;

    const prevFeet = player.y;
    const wasGrounded = player.grounded;
    player.grounded = false;
    moveBodyX(dt);
    moveBodyY(dt);
    landOneWays(prevFeet);
    landPlatforms(prevFeet);
    stick();
    if (player.grounded && !wasGrounded) {
      player.squashX = 1.16;
      player.squashY = 0.8;
      burst(player.x, player.y, "#d7b07a");
    }
    if (player.grounded) {
      const ty = Math.floor((player.y + 0.01) / TILE);
      const tx = Math.floor(player.x / TILE);
      if (world.grid[ty]?.[tx] === "P") stoodCrate = true;
    }

    for (const e of world.enemies) {
      if (e.dead) {
        e.timer -= dt;
        continue;
      }
      const dir = Math.sign(e.vx) || -1;
      const ahead = e.x + dir * (e.w * 0.5 + 2);
      const tx = Math.floor(ahead / TILE);
      const bodyTy = Math.floor((e.y - 4) / TILE);
      const floorTy = Math.floor((e.y + 2) / TILE);
      const floor = world.grid[floorTy]?.[tx];
      const floorOk = floor === "#" || floor === "B" || floor === "?" || floor === "!" || floor === "U" || floor === "P" || floor === "^";
      if (solidAt(tx, bodyTy) || world.grid[bodyTy]?.[tx] === "S" || (e.grounded && !floorOk)) {
        e.vx = -dir * nubSpeed();
      }
      if (e.kind === "hop" && e.grounded) {
        e.hop -= dt;
        if (e.hop <= 0) {
          e.vy = -460;
          e.hop = 1.05;
        }
      }
      e.vy = Math.min(MAX_FALL, e.vy + G_FALL * dt);
      const ox = e.x;
      e.x += e.vx * dt;
      if (overlaps(e.x, e.y, e.w, e.h)) {
        e.x = ox;
        e.vx *= -1;
      }
      e.grounded = false;
      e.y += e.vy * dt;
      if (overlaps(e.x, e.y, e.w, e.h)) {
        let y = e.y;
        const falling = e.vy > 0;
        let guard = 0;
        while (overlaps(e.x, y, e.w, e.h) && guard++ < 40) y += falling ? -1 : 1;
        e.y = y;
        e.vy = 0;
        if (falling) e.grounded = true;
      }
      if (e.y > mapH() + 40) e.dead = true;
    }
    world.enemies = world.enemies.filter((e) => !e.dead || e.timer > 0);

    if (player.iframe <= 0) {
      for (const e of world.enemies) {
        if (e.dead) continue;
        const overlap =
          Math.abs(player.x - e.x) < (PW + e.w) / 2 &&
          player.y > e.y - e.h &&
          player.y - PH < e.y;
        if (!overlap) continue;
        const enemyTop = e.y - e.h;
        if (player.vy > 20 && prevFeet <= enemyTop + 8) {
          e.dead = true;
          e.timer = 0.4;
          combo += 1;
          const gained = 200 * combo;
          score += gained;
          player.vy = -360;
          player.grounded = false;
          player.canCut = false;
          didStomp = true;
          if (e.kind === "hop") taughtHop = true;
          popup(e.x, enemyTop, `+${gained}`);
          audio.stomp();
          hitStop = 0.045;
          shake = 0.12;
        } else hurt();
      }
    }

    for (const c of world.coins) {
      if (c.taken) continue;
      if (Math.abs(player.x - c.x) < 16 && Math.abs(player.y - PH / 2 - c.y) < 18) {
        c.taken = true;
        score += 100;
        seeds += 1;
        levelSeeds += 1;
        popup(c.x, c.y, "+100");
        audio.coin();
      }
    }

    for (const k of world.checks) {
      if (!k.got && player.x > k.x - 8) {
        k.got = true;
        world.checkpoint = { x: k.x, y: k.y };
        audio.power();
        popup(k.x, k.y - 20, "Marked");
      }
    }

    if (player.iframe <= 0) {
      const x0 = Math.floor((player.x - PW / 2) / TILE);
      const x1 = Math.floor((player.x + PW / 2 - 0.001) / TILE);
      const y0 = Math.floor((player.y - PH) / TILE);
      const y1 = Math.floor((player.y - 0.001) / TILE);
      for (let ty = y0; ty <= y1 && phase === "playing"; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (world.grid[ty]?.[tx] === "S") hurt();
        }
      }
    }

    if (player.y > mapH() + 8) {
      die();
      return;
    }
    stepBoss(dt, prevFeet);
    if (phase !== "playing") return;
    stepGiant(dt);
    stepShots(dt);
    if (phase !== "playing") return;
    const atFlag = Math.abs(player.x - world.flag.x) < 22 && player.y > world.flag.y - 170;
    if (boss && !boss.dead) {
      if (atFlag && !flagNag) {
        flagNag = true;
        popup(world.flag.x, world.flag.y - 36, "Not yet");
      }
    } else if (atFlag) {
      finishLevel();
      return;
    }

    player.squashX = approach(player.squashX, 1, dt * 6);
    player.squashY = approach(player.squashY, 1, dt * 6);
    for (const [k, v] of bumps) {
      const n = v - dt;
      if (n <= 0) bumps.delete(k);
      else bumps.set(k, n);
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      popups[i].life -= dt;
      popups[i].y -= 30 * dt;
      if (popups[i].life <= 0) popups.splice(i, 1);
    }
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life -= dt;
      b.vy += 500 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) bits.splice(i, 1);
    }
    shake = Math.max(0, shake - dt);
    hurtFlash = Math.max(0, hurtFlash - dt);
    coach = coachLine();
    if (!taughtHop && world.enemies.some((e) => e.kind === "hop" && !e.dead && Math.abs(e.x - player.x) < 150)) {
      hopSeen += dt;
      if (hopSeen > 3) taughtHop = true;
    }
    if (!taughtShot && (giant || shots.length > 0)) {
      shotSeen += dt;
      if (shotSeen > 3.2) taughtShot = true;
    }
    rememberBest();
  }

  function coachLine() {
    if (phase !== "playing") return "";
    if (boss && !boss.dead) return "Stomp the beast's head. The ribbon waits.";
    if (!taughtShot && world.giants && (giant || shots.length > 0)) return "Jump the shot. It takes two lives.";
    if (levelIndex === 0) {
      if (!stoodCrate && player.x < 16 * TILE) return "Double-tap Jump. Land on the crate.";
      if (!didStomp && player.x >= 14 * TILE && player.x < 36 * TILE) return "Land on the nub.";
      if (!stoodCrate && player.x >= 36 * TILE && player.x < 52 * TILE) return "Double-tap Jump. The high crates need both hops.";
    }
    if (!taughtHop && world.enemies.some((e) => e.kind === "hop" && !e.dead && Math.abs(e.x - player.x) < 150)) {
      return "This nub jumps. Stomp it coming down.";
    }
    if (world.movers.length > 0 && !rodePlank) {
      const m = world.movers[0];
      if (player.x > m.min - 220 && player.x < m.max + 48) return "Ride the moving plank across.";
    }
    return "";
  }

  function placeCamera(dt: number) {
    const focus = player.x + player.facing * 40;
    let desiredX = camX;
    const sx = focus - camX;
    if (sx < viewW * 0.36) desiredX = focus - viewW * 0.36;
    if (sx > viewW * 0.58) desiredX = focus - viewW * 0.58;
    desiredX = clamp(desiredX, 0, Math.max(0, mapW() - viewW));
    const screenY = player.y - camY;
    let desiredY = camY;
    if (screenY < viewH * 0.38) desiredY = player.y - viewH * 0.38;
    if (screenY > viewH * 0.72) desiredY = player.y - viewH * 0.72;
    desiredY = clamp(desiredY, 0, Math.max(0, mapH() - viewH));
    if (snapCam) {
      camX = desiredX;
      camY = desiredY;
      snapCam = false;
    } else {
      const k = 1 - Math.exp(-dt * 8);
      camX += (desiredX - camX) * k;
      camY += (desiredY - camY) * k;
    }
  }

  function drawStrip(img: HTMLImageElement, tx: number, dx: number, dy: number) {
    const sw = 64;
    const sx = (tx * sw) % img.width;
    ctx!.drawImage(img, sx, 0, sw, img.height, dx, dy, TILE + 1, TILE + 1);
  }

  function blit(
    img: HTMLImageElement,
    worldX: number,
    worldFeet: number,
    height: number,
    flip: boolean,
    camXi: number,
    camYi: number,
  ) {
    const w = height * (img.width / img.height);
    const draw = ctx!;
    draw.save();
    draw.translate(Math.round(worldX - camXi), Math.round(worldFeet - camYi));
    if (flip) draw.scale(-1, 1);
    draw.drawImage(img, -w / 2, -height, w, height);
    draw.restore();
  }

  function titleBeast(): Boss {
    const kind = world.bossKind ?? "grove";
    const size = beastSize(kind);
    return {
      kind,
      x: Math.min(mapW() - 220, 390),
      y: 11 * TILE,
      w: size.w,
      h: size.h,
      vx: -1,
      vy: 0,
      grounded: true,
      hp: kind === "crown" ? 8 : 5,
      maxHp: kind === "crown" ? 8 : 5,
      hop: 0,
      hurt: 0,
      mode: "walk",
      modeT: 0,
      shotT: 0,
      dead: false,
    };
  }

  function drawBeast(b: Boss, camXi: number, camYi: number) {
    if (!art) return;
    const draw = ctx!;
    const frames = b.kind === "crown" ? art.crownBeast : art.groveBeast;
    const frame = frames[Math.floor(time * 8 + (b.mode === "charge" ? 1 : 0)) % frames.length];
    const height = b.kind === "crown" ? 168 : 132;
    const flash = b.hurt > 0 && Math.floor(time * 20) % 2 === 0;
    if (flash) draw.filter = "brightness(2.2)";
    blit(frame, b.x, b.y + 8, height, b.vx < 0, camXi, camYi);
    draw.filter = "none";
    const x = Math.round(b.x - camXi);
    const y = Math.round(b.y - camYi);
    const pips = Math.min(b.maxHp, 12);
    for (let i = 0; i < pips; i++) {
      draw.fillStyle = i < b.hp ? "#e4572e" : "rgba(255,244,224,0.35)";
      draw.fillRect(x - pips * 4 + i * 8, y - b.h - 18, 6, 6);
    }
  }

  function drawGiant(g: Giant, camXi: number, camYi: number) {
    if (!art) return;
    const draw = ctx!;
    const wind = g.shotsLeft > 0 && g.fireIn < 0.45;
    const frame = art.giant[Math.floor(time * 5 + (wind ? 2 : 0)) % art.giant.length];
    if (wind) draw.filter = "brightness(1.25)";
    blit(frame, g.x, g.y + 4, 168, false, camXi, camYi);
    draw.filter = "none";
  }

  function drawShot(s: Shot, camXi: number, camYi: number) {
    const draw = ctx!;
    const x = s.x - camXi;
    const y = s.y - camYi;
    draw.fillStyle = "rgba(228,87,46,0.35)";
    draw.beginPath();
    draw.arc(x, y, s.r + 7, 0, Math.PI * 2);
    draw.fill();
    draw.fillStyle = "#e4572e";
    draw.beginPath();
    draw.arc(x, y, s.r, 0, Math.PI * 2);
    draw.fill();
    draw.fillStyle = "#fff4e0";
    draw.beginPath();
    draw.arc(x, y, s.r * 0.45, 0, Math.PI * 2);
    draw.fill();
  }

  function drawWorld(camXi: number, camYi: number, showPlayer: boolean) {
    if (!art) return;
    const draw = ctx!;
    const look = world.look;
    const pack =
      look === "dusk"
        ? { sky: art.groveSky, hills: art.groveHills, trees: art.groveTrees, top: art.groveGroundTop, fill: art.groveGroundFill }
        : look === "storm"
          ? { sky: art.stormSky, hills: art.stormHills, trees: art.stormTrees, top: art.stormGroundTop, fill: art.stormGroundFill }
          : { sky: art.sky, hills: art.hills, trees: art.trees, top: art.groundTop, fill: art.groundFill };
    const maxCam = Math.max(1, mapW() - viewW);
    const t = camXi / maxCam;
    const layers: { img: HTMLImageElement; factor: number }[] = [
      { img: pack.sky, factor: 0.2 },
      { img: pack.hills, factor: 0.55 },
      { img: pack.trees, factor: 0.85 },
    ];
    for (const layer of layers) {
      const scale = Math.max(viewW / layer.img.width, viewH / layer.img.height);
      const dw = layer.img.width * scale;
      const dh = layer.img.height * scale;
      const x = -t * Math.max(0, dw - viewW) * layer.factor;
      draw.drawImage(layer.img, x, viewH - dh, dw, dh);
    }

    const x0 = Math.max(0, Math.floor(camXi / TILE) - 1);
    const x1 = Math.min(world.grid[0].length - 1, Math.floor((camXi + viewW) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(camYi / TILE) - 1);
    const y1 = Math.min(world.grid.length - 1, Math.floor((camYi + viewH) / TILE) + 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const cell = world.grid[ty][tx];
        const dx = tx * TILE - camXi;
        const bump = bumps.get(`${tx},${ty}`) ?? 0;
        const dy = ty * TILE - camYi - Math.sin((bump / 0.16) * Math.PI) * 8;
        if (cell === "#") {
          const surface = world.grid[ty - 1]?.[tx] !== "#";
          drawStrip(surface ? pack.top : pack.fill, tx, dx, ty * TILE - camYi);
        } else if (cell === "B" || cell === "P") draw.drawImage(art.crate, dx, dy, TILE + 1, TILE + 1);
        else if (cell === "?" || cell === "!") draw.drawImage(art.lantern, dx, dy, TILE + 1, TILE + 1);
        else if (cell === "U") draw.drawImage(art.used, dx, dy, TILE + 1, TILE + 1);
        else if (cell === "S") blit(art.stake, (tx + 0.5) * TILE, (ty + 1) * TILE, 34, false, camXi, camYi);
        else if (cell === "^") draw.drawImage(art.plank, dx, ty * TILE - camYi, TILE, 14);
      }
    }

    for (const m of world.movers) {
      draw.drawImage(art.plank, m.x - camXi, m.y - camYi, m.w, m.h);
    }
    if (look === "storm") {
      draw.strokeStyle = "rgba(186, 214, 220, 0.45)";
      draw.lineWidth = 1;
      const rain = Math.floor(time * 22);
      for (let i = 0; i < 36; i++) {
        const x = ((i * 53 + rain) % (viewW + 24)) - 12;
        const y = ((i * 37 + rain * 4) % viewH);
        draw.beginPath();
        draw.moveTo(x, y);
        draw.lineTo(x - 5, y + 14);
        draw.stroke();
      }
      if (Math.sin(time * 2.7) > 0.992) {
        draw.fillStyle = "rgba(232, 214, 180, 0.14)";
        draw.fillRect(0, 0, viewW, viewH);
      }
    }

    const seedFrame = art.seed[Math.floor(time * 8) % art.seed.length];
    for (const c of world.coins) {
      if (c.taken) continue;
      draw.drawImage(seedFrame, c.x - 12 - camXi, c.y - 12 - camYi, 24, 24);
    }

    for (const k of world.checks) {
      if (!k.got) blit(art.flag, k.x, k.y, 72, false, camXi, camYi);
    }
    blit(art.flag, world.flag.x, world.flag.y, 150, false, camXi, camYi);

    for (const e of world.enemies) {
      if (e.dead) {
        blit(art.nubFlat, e.x, e.y + 4, 22, false, camXi, camYi);
      } else {
        if (e.kind === "hop") {
          draw.fillStyle = "rgba(228,87,46,0.55)";
          draw.beginPath();
          draw.ellipse(e.x - camXi, e.y - camYi + 2, 11, 4, 0, 0, Math.PI * 2);
          draw.fill();
        }
        const frame = art.nub[Math.floor(time * 8 + e.x + (e.kind === "hop" ? 2 : 0)) % art.nub.length];
        const lift = e.kind === "hop" && e.vy < -40 ? 6 : 0;
        blit(frame, e.x, e.y - lift, e.kind === "hop" ? 42 : 40, e.vx < 0, camXi, camYi);
      }
    }

    if (giant) drawGiant(giant, camXi, camYi);
    for (const s of shots) drawShot(s, camXi, camYi);
    if (boss) drawBeast(boss, camXi, camYi);
    else if (phase === "title" && world.bossKind) drawBeast(titleBeast(), camXi, camYi);

    if (showPlayer && !(player.iframe > 0 && Math.floor(time * 14) % 2 === 0)) {
      let img = art.pipIdle[Math.floor(time * 6) % art.pipIdle.length];
      if (!player.grounded) {
        const idx = player.vy < -80 ? 1 : Math.abs(player.vy) < 90 ? 2 : 3;
        img = art.pipJump[idx] ?? art.pipJump[0];
      } else if (Math.abs(player.vx) > 24) {
        img = art.pipRun[Math.floor(player.runDist / 12) % art.pipRun.length];
      }
      const h = player.powered ? 62 : 54;
      draw.save();
      draw.translate(Math.round(player.x - camXi), Math.round(player.y - camYi));
      draw.scale((player.facing < 0 ? -1 : 1) * (reduce ? 1 : player.squashX), reduce ? 1 : player.squashY);
      if (player.powered) {
        draw.fillStyle = "rgba(242,183,5,0.35)";
        draw.beginPath();
        draw.ellipse(0, -20, 18, 22, 0, 0, Math.PI * 2);
        draw.fill();
      }
      const fw = h * (img.width / img.height);
      draw.drawImage(img, -fw / 2, -h, fw, h);
      draw.restore();
    }

    for (const b of bits) {
      draw.globalAlpha = Math.max(0, b.life * 2);
      draw.fillStyle = b.color;
      draw.fillRect(b.x - camXi, b.y - camYi, 4, 4);
      draw.globalAlpha = 1;
    }
    draw.font = "700 14px Fredoka, Nunito, sans-serif";
    draw.textAlign = "center";
    for (const p of popups) {
      draw.globalAlpha = Math.max(0, p.life * 1.6);
      draw.fillStyle = "#fff4e0";
      draw.fillText(p.text, p.x - camXi, p.y - camYi);
      draw.globalAlpha = 1;
    }
    if (hurtFlash > 0) {
      draw.fillStyle = `rgba(228,87,46,${hurtFlash})`;
      draw.fillRect(0, 0, viewW, viewH);
    }
  }

  function draw(dt: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const portrait = cssH > cssW * 1.08;
    const cssScale = Math.min(cssW / viewW, cssH / viewH);
    const boxW = viewW * cssScale;
    const boxH = viewH * cssScale;
    const cssOx = (cssW - boxW) / 2;
    const cssOy = portrait ? Math.min((cssH - boxH) / 2, cssH * 0.02) : (cssH - boxH) / 2;
    const scale = cssScale * dpr;
    const ox = cssOx * dpr;
    const oy = cssOy * dpr;
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.fillStyle = world.look === "dusk" ? "#0c1020" : world.look === "storm" ? "#10161c" : "#1c1410";
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
    ctx!.save();
    ctx!.setTransform(scale, 0, 0, scale, ox, oy);
    ctx!.imageSmoothingEnabled = true;
    ctx!.beginPath();
    ctx!.rect(0, 0, viewW, viewH);
    ctx!.clip();

    const mag = reduce ? 0 : shake * 5;
    const sx = Math.round(Math.sin(time * 47) * mag);
    const sy = Math.round(Math.cos(time * 39) * mag);
    if (phase === "title") {
      const max = Math.max(0, mapW() - viewW);
      const pan = reduce ? max * 0.35 : (attract * 28) % (max + 1);
      camY = clamp(11 * TILE - viewH * 0.78, 0, Math.max(0, mapH() - viewH));
      drawWorld(pan, camY, false);
    } else {
      drawWorld(Math.round(camX) + sx, Math.round(camY) + sy, phase !== "over");
    }

    const parent = canvas.parentElement?.getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    if (parent) {
      const box = {
        left: rect.left - parent.left + cssOx,
        top: rect.top - parent.top + cssOy,
        width: boxW,
        height: boxH,
        roomBelow: 0,
        roomLeft: 0,
        roomRight: 0,
      };
      box.roomBelow = parent.height - (box.top + box.height);
      box.roomLeft = box.left;
      box.roomRight = parent.width - (box.left + box.width);
      const next = `${box.left | 0}:${box.top | 0}:${box.width | 0}:${box.height | 0}:${box.roomBelow | 0}:${box.roomLeft | 0}:${box.roomRight | 0}`;
      if (next !== layoutSig) {
        layoutSig = next;
        hooks.onLayout(box);
      }
    }
    ctx!.restore();
    void dt;
  }

  function nextLabel() {
    const next = LEVELS[levelIndex + 1];
    if (!next) return "See the end";
    if (next.stage !== world.stage) return `Enter ${STAGE_META[next.stage - 1].name}`;
    return "Next lane";
  }

  function emit() {
    if (!alive) return;
    const power = player.powered ? player.power / 12 : 0;
    const next = [
      phase,
      ready ? 1 : 0,
      score,
      seeds,
      levelSeeds,
      world.seedTotal,
      lives,
      Math.ceil(world.timeLeft),
      levelIndex,
      best,
      muted ? 1 : 0,
      Math.round(power * 10),
      message,
      world.name,
      player.jumpsLeft,
      difficulty,
      startLane,
      unlocked,
      rank,
      ranks.join(","),
      coach,
      boss ? boss.hp : 0,
      boss ? boss.maxHp : 0,
      Math.floor(stageTime),
      world.stage,
    ].join("|");
    if (next === sig) return;
    sig = next;
    hooks.onUi({
      phase,
      ready,
      score,
      seeds,
      found: levelSeeds,
      total: world.seedTotal,
      lives,
      time: Math.ceil(world.timeLeft),
      levelName: world.name,
      levelIndex,
      levelCount: LEVELS.length,
      best,
      muted,
      power,
      message,
      hops: player.jumpsLeft,
      difficulty,
      lane: startLane,
      coach,
      rank,
      ranks: ranks.slice(),
      unlocked,
      stageName: STAGE_META[world.stage - 1].name,
      stageLane: locate(levelIndex).lane,
      stageLanes: locate(levelIndex).count,
      nextLabel: nextLabel(),
      bossHp: boss && !boss.dead ? boss.hp : 0,
      bossMax: boss && !boss.dead ? boss.maxHp : 0,
      stageTime,
      par: STAGE_META[world.stage - 1].par,
    });
  }

  function tick(now: number) {
    if (!alive) return;
    fitView();
    const frameDt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += frameDt;
    if (hitStop > 0) {
      hitStop -= frameDt;
    } else if (phase === "playing") {
      acc += frameDt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        physics(STEP);
        acc -= STEP;
        steps += 1;
      }
      if (steps === 5) acc = 0;
      placeCamera(frameDt);
    } else if (phase === "dead") {
      deadT -= frameDt;
      if (deadT <= 0) respawn();
    } else if (phase === "finish") {
      finishT -= frameDt;
      if (finishT <= 0) completeClear();
    } else if (phase === "title") {
      attract += frameDt;
    }
    audio.tickMusic(phase === "playing" && ready);
    draw(frameDt);
    emit();
    raf = requestAnimationFrame(tick);
  }

  function start() {
    audio.unlock();
    if (!ready) return;
    if (phase !== "title" && phase !== "over" && phase !== "won") return;
    score = 0;
    seeds = 0;
    taughtHop = false;
    hopSeen = 0;
    taughtShot = false;
    shotSeen = 0;
    stageNow = 0;
    stageTime = 0;
    lives = DIFFICULTIES[difficulty].lives;
    message = "";
    startLane = clamp(Math.min(startLane, unlocked), 0, LEVELS.length - 1);
    loadLevel(startLane);
    phase = "playing";
    suppressJump = jumpHeld();
    wasJump = jumpHeld();
    emit();
  }

  function togglePause() {
    if (phase === "playing") phase = "paused";
    else if (phase === "paused") phase = "playing";
    emit();
  }

  const GAME_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
    "KeyA",
    "KeyD",
    "KeyW",
    "KeyS",
    "KeyP",
  ]);

  function onKeyDown(e: KeyboardEvent) {
    audio.unlock();
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    keys.add(e.code);
    if ((e.code === "Enter" || e.code === "Space") && (phase === "title" || phase === "over" || phase === "won") && ready) {
      start();
    } else if ((e.code === "Enter" || e.code === "Space") && phase === "clear") {
      api.next();
    }
    if (e.code === "Escape" || e.code === "KeyP") togglePause();
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function onBlur() {
    keys.clear();
    touch.left = false;
    touch.right = false;
    touch.jump = false;
  }
  function onVis() {
    if (document.visibilityState === "visible") audio.unlock();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);

  window.__controlsTest = {
    getX: () => player.x,
    getY: () => player.y,
    getVx: () => player.vx,
    getSpeed: () => Math.abs(player.vx),
    getYaw: () => 0,
    getFacing: () => player.facing,
    getPhase: () => phase,
    setKeys: (codes: string[]) => {
      probe = new Set(codes);
    },
  };

  const api: GameApi = {
    start,
    pause() {
      if (phase === "playing") {
        phase = "paused";
        emit();
      }
    },
    resume() {
      if (phase === "paused") {
        phase = "playing";
        emit();
      }
    },
    next() {
      audio.unlock();
      if (phase !== "clear") return;
      if (levelIndex >= LEVELS.length - 1) {
        phase = "won";
        message = "Orchard, grove, and crown. The giants are quiet, and Pipkin stays.";
        emit();
        return;
      }
      loadLevel(levelIndex + 1);
      phase = "playing";
      suppressJump = true;
      emit();
    },
    retry() {
      start();
    },
    toggleMute() {
      audio.unlock();
      muted = !muted;
      audio.setMuted(muted);
      persist();
      sig = "";
      emit();
    },
    setDifficulty(next) {
      if (next !== "easy" && next !== "normal" && next !== "hard") return;
      difficulty = next;
      persist();
      if (phase === "title") world = build(LEVELS[startLane]);
      sig = "";
      emit();
    },
    setLane(index) {
      const next = clamp(Math.floor(index), 0, LEVELS.length - 1);
      if (next > unlocked) return;
      startLane = next;
      persist();
      if (phase === "title") {
        world = build(LEVELS[startLane]);
        snapCam = true;
      }
      sig = "";
      emit();
    },
    map() {
      if (phase === "title") return;
      phase = "title";
      message = "";
      coach = "";
      world = build(LEVELS[startLane]);
      sig = "";
      emit();
    },
    pointer(which, down) {
      audio.unlock();
      touch[which] = down;
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      audio.close();
      if (window.__controlsTest) delete window.__controlsTest;
    },
  };

  void loadArt().then(
    (loaded) => {
      if (!alive) return;
      art = loaded;
      ready = true;
      sig = "";
      emit();
    },
    (err: unknown) => {
      message = err instanceof Error ? err.message : "Pictures failed to load";
      sig = "";
      emit();
    },
  );

  emit();
  raf = requestAnimationFrame(tick);
  return api;
}

declare global {
  interface Window {
    __controlsTest?: {
      getX: () => number;
      getY: () => number;
      getVx: () => number;
      getSpeed: () => number;
      getYaw: () => number;
      getFacing: () => number;
      getPhase: () => string;
      setKeys: (codes: string[]) => void;
    };
  }
}
