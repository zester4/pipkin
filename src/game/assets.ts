import { previewPathPrefix } from "@/lib/preview-path-prefix";

export function gameUrl(file: string) {
  const prefix =
    typeof window === "undefined"
      ? ""
      : (previewPathPrefix(window.location.hostname, window.location.pathname) ?? "");
  return `${prefix}/game/${file}`;
}

export type Art = {
  sky: HTMLImageElement;
  hills: HTMLImageElement;
  trees: HTMLImageElement;
  groundTop: HTMLImageElement;
  groundFill: HTMLImageElement;
  crate: HTMLImageElement;
  lantern: HTMLImageElement;
  used: HTMLImageElement;
  plank: HTMLImageElement;
  stake: HTMLImageElement;
  flag: HTMLImageElement;
  seed: HTMLImageElement[];
  pipIdle: HTMLImageElement[];
  pipRun: HTMLImageElement[];
  pipJump: HTMLImageElement[];
  nub: HTMLImageElement[];
  nubFlat: HTMLImageElement;
  groveSky: HTMLImageElement;
  groveHills: HTMLImageElement;
  groveTrees: HTMLImageElement;
  groveGroundTop: HTMLImageElement;
  groveGroundFill: HTMLImageElement;
  stormSky: HTMLImageElement;
  stormHills: HTMLImageElement;
  stormTrees: HTMLImageElement;
  stormGroundTop: HTMLImageElement;
  stormGroundFill: HTMLImageElement;
  groveBeast: HTMLImageElement[];
  crownBeast: HTMLImageElement[];
  giant: HTMLImageElement[];
};

function loadImage(file: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Missing picture ${file}`));
    img.src = gameUrl(file);
  });
}

function frames(prefix: string, count: number) {
  return Promise.all(Array.from({ length: count }, (_, i) => loadImage(`${prefix}-${i}.png`)));
}

export function loadArt() {
  return Promise.all([
    loadImage("sky.png"),
    loadImage("hills.png"),
    loadImage("trees.png"),
    loadImage("ground-top.png"),
    loadImage("ground-fill.png"),
    loadImage("crate.png"),
    loadImage("lantern.png"),
    loadImage("used.png"),
    loadImage("plank.png"),
    loadImage("stake.png"),
    loadImage("flag.png"),
    frames("seed", 4),
    frames("pip-idle", 4),
    frames("pip-run", 4),
    frames("pip-jump", 4),
    frames("nub", 4),
    loadImage("nub-flat.png"),
    loadImage("grove-sky.png"),
    loadImage("grove-hills.png"),
    loadImage("grove-trees.png"),
    loadImage("grove-ground-top.png"),
    loadImage("grove-ground-fill.png"),
    loadImage("storm-sky.png"),
    loadImage("storm-hills.png"),
    loadImage("storm-trees.png"),
    loadImage("storm-ground-top.png"),
    loadImage("storm-ground-fill.png"),
    frames("beast-grove", 4),
    frames("beast-crown", 4),
    frames("giant", 4),
  ]).then(
    ([
      sky,
      hills,
      trees,
      groundTop,
      groundFill,
      crate,
      lantern,
      used,
      plank,
      stake,
      flag,
      seed,
      pipIdle,
      pipRun,
      pipJump,
      nub,
      nubFlat,
      groveSky,
      groveHills,
      groveTrees,
      groveGroundTop,
      groveGroundFill,
      stormSky,
      stormHills,
      stormTrees,
      stormGroundTop,
      stormGroundFill,
      groveBeast,
      crownBeast,
      giant,
    ]) =>
      ({
        sky,
        hills,
        trees,
        groundTop,
        groundFill,
        crate,
        lantern,
        used,
        plank,
        stake,
        flag,
        seed,
        pipIdle,
        pipRun,
        pipJump,
        nub,
        nubFlat,
        groveSky,
        groveHills,
        groveTrees,
        groveGroundTop,
        groveGroundFill,
        stormSky,
        stormHills,
        stormTrees,
        stormGroundTop,
        stormGroundFill,
        groveBeast,
        crownBeast,
        giant,
      }) satisfies Art,
  );
}
