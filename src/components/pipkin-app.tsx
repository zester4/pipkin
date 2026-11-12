import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowBigUp, ChevronLeft, ChevronRight, Pause, Volume2, VolumeX } from "lucide-react";
import { gameUrl } from "@/game/assets";
import { DIFFICULTIES, RANK_LABEL, clockText, type Difficulty, type Rank } from "@/game/constants";
import { createGame, type GameApi, type LayoutBox, type UiSnapshot } from "@/game/createGame";
import { LEVELS, STAGES } from "@/game/levels";

const INITIAL: UiSnapshot = {
  phase: "title",
  ready: false,
  score: 0,
  seeds: 0,
  found: 0,
  total: 0,
  lives: 3,
  time: 180,
  levelName: "Seed Lane",
  levelIndex: 0,
  levelCount: LEVELS.length,
  best: 0,
  muted: false,
  power: 0,
  message: "",
  hops: 2,
  difficulty: "normal",
  lane: 0,
  coach: "",
  rank: "none",
  ranks: LEVELS.map(() => "none" as Rank),
  unlocked: 0,
  stageName: "Orchard",
  stageLane: 0,
  stageLanes: 6,
  nextLabel: "Next lane",
  bossHp: 0,
  bossMax: 0,
  stageTime: 0,
  par: 360,
};

export function PipkinApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<GameApi | null>(null);
  const [ui, setUi] = useState<UiSnapshot>(INITIAL);
  const [box, setBox] = useState<LayoutBox | null>(null);
  const [held, setHeld] = useState({ left: false, right: false, jump: false });
  const [panel, setPanel] = useState<"home" | "settings">("home");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const api = createGame(canvas, { onUi: setUi, onLayout: setBox });
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    function release() {
      setHeld({ left: false, right: false, jump: false });
      apiRef.current?.pointer("left", false);
      apiRef.current?.pointer("right", false);
      apiRef.current?.pointer("jump", false);
    }
    window.addEventListener("orientationchange", release);
    return () => window.removeEventListener("orientationchange", release);
  }, []);

  useEffect(() => {
    if (ui.phase === "playing" || ui.phase === "dead") return;
    setHeld({ left: false, right: false, jump: false });
    apiRef.current?.pointer("left", false);
    apiRef.current?.pointer("right", false);
    apiRef.current?.pointer("jump", false);
  }, [ui.phase]);

  function press(which: "left" | "right" | "jump", event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeld((h) => ({ ...h, [which]: true }));
    apiRef.current?.pointer(which, true);
  }
  function release(which: "left" | "right" | "jump") {
    setHeld((h) => ({ ...h, [which]: false }));
    apiRef.current?.pointer(which, false);
  }

  const showDeck = ui.phase === "playing" || ui.phase === "dead";
  const roomBelow = box?.roomBelow ?? 0;
  const roomy = roomBelow > 140;
  const sideGutters = (box?.roomLeft ?? 0) >= 72 && (box?.roomRight ?? 0) >= 72 && roomBelow < 88;
  const showCard = ui.phase === "title" || ui.phase === "paused" || ui.phase === "clear" || ui.phase === "won" || ui.phase === "over";
  const hudOn = ui.phase === "playing" || ui.phase === "paused" || ui.phase === "dead" || ui.phase === "finish";

  return (
    <main className="fixed inset-0 touch-manipulation overflow-hidden bg-ink text-cream">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Pipkin orchard" />

      {box && hudOn && (
        <div
          className="pointer-events-none absolute z-10"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        >
          <div className="flex items-start justify-between gap-2 p-2">
            <div className="rounded-2xl bg-ink/80 px-3 py-2 text-cream">
              <p className="font-display text-sm leading-none">{ui.score.toString().padStart(6, "0")}</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-sans">
                <img src={gameUrl("seed-0.png")} alt="" className="h-4 w-4 object-contain" />
                <span>
                  {ui.found}/{ui.total}
                </span>
                <span className="mx-1 text-gold">·</span>
                <span>{ui.lives} lives</span>
                <span className="mx-1 inline-flex items-center gap-0.5" aria-label="Jumps left">
                  <i className={"inline-block h-2 w-2 rounded-full " + (ui.hops >= 1 ? "bg-cream" : "bg-cream/30")} />
                  <i className={"inline-block h-2 w-2 rounded-full " + (ui.hops >= 2 ? "bg-gold" : "bg-cream/30")} />
                </span>
              </p>
              {ui.bossMax > 0 && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-extrabold">
                  <span>Beast</span>
                  {Array.from({ length: ui.bossMax }, (_, i) => (
                    <i key={i} className={"inline-block h-2 w-2 rounded-sm " + (i < ui.bossHp ? "bg-terracotta" : "bg-cream/30")} />
                  ))}
                </p>
              )}
              {ui.power > 0 && (
                <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-cream/20">
                  <div className="h-full bg-gold" style={{ width: `${Math.round(ui.power * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="rounded-2xl bg-ink/80 px-3 py-2 text-right">
                <p className="font-display text-sm leading-none">{ui.time}</p>
                <p className="text-xs text-cream/80">{ui.levelName}</p>
                <p className="text-[11px] text-cream/70">
                  {ui.stageName} {clockText(ui.stageTime)}/{clockText(ui.par)}
                </p>
              </div>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/80 text-cream"
                aria-label={ui.muted ? "Unmute" : "Mute"}
                onClick={() => apiRef.current?.toggleMute()}
              >
                {ui.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              {ui.phase !== "finish" && (
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-ink"
                  aria-label={ui.phase === "paused" ? "Resume" : "Pause"}
                  onClick={() => (ui.phase === "paused" ? apiRef.current?.resume() : apiRef.current?.pause())}
                >
                  <Pause className="size-5" />
                </button>
              )}
            </div>
          </div>
          {ui.phase === "playing" && ui.coach && (
            <p className="absolute inset-x-3 bottom-3 mx-auto w-fit max-w-[92%] rounded-full bg-ink/85 px-3 py-1.5 text-center font-sans text-sm font-extrabold text-cream">
              {ui.coach}
            </p>
          )}
        </div>
      )}

      {ui.phase === "dead" && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
          <p className="rounded-full bg-ink/80 px-4 py-2 font-display text-cream">{ui.message}</p>
        </div>
      )}

      {ui.phase === "finish" && box && (
        <div
          className="pointer-events-none absolute z-20 flex justify-center"
          style={{ left: box.left, top: box.top + box.height * 0.3, width: box.width }}
        >
          <p className="font-display text-4xl text-cream" style={{ textShadow: "0 2px 0 #1c1410" }}>
            {ui.message || "Ribbon"}
          </p>
        </div>
      )}

      {showCard && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-3 landscape:py-2">
          <div className="sheet fade-pop max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-cream px-6 py-7 text-ink shadow-xl">
            {ui.phase === "title" && panel === "settings" && (
              <Settings
                difficulty={ui.difficulty}
                lane={ui.lane}
                unlocked={ui.unlocked}
                muted={ui.muted}
                onDifficulty={(d) => apiRef.current?.setDifficulty(d)}
                onLane={(i) => apiRef.current?.setLane(i)}
                onMute={() => apiRef.current?.toggleMute()}
                onBack={() => setPanel("home")}
              />
            )}
            {ui.phase === "title" && panel === "home" && (
              <div className="sheet-home">
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-sans font-extrabold tracking-wide text-leaf">ORCHARD HOP</p>
                      <h1 className="sheet-title font-display text-5xl leading-none text-ink">Pipkin</h1>
                    </div>
                    <img src={gameUrl("pip-idle-0.png")} alt="" className="h-20 w-20 object-contain landscape:h-16 landscape:w-16" />
                  </div>
                  <p className="mt-3 text-base leading-snug text-ink">
                    Six orchard lanes, then Moon Grove, then a longer storm. Beat the beast before each crown.
                  </p>
                  <p className="mt-2 text-sm leading-snug text-ink/75">
                    {DIFFICULTIES[ui.difficulty].label} · {ui.stageName} · {LEVELS[ui.lane]?.name ?? "Seed Lane"}
                    {ui.best > 0 ? ` · Best ${ui.best}` : ""}
                  </p>
                </div>
                <div>
                  <LanePath
                    lane={ui.lane}
                    unlocked={ui.unlocked}
                    ranks={ui.ranks}
                    onPick={(index) => apiRef.current?.setLane(index)}
                  />
                  <div className="mt-3 grid grid-cols-1 gap-2 landscape:grid-cols-2">
                    <button
                      type="button"
                      className="min-h-12 w-full rounded-2xl bg-terracotta px-4 font-display text-lg text-cream hover:opacity-90"
                      onClick={(event) => {
                        event.currentTarget.blur();
                        setPanel("home");
                        apiRef.current?.start();
                      }}
                    >
                      {ui.ready ? (ui.lane === 0 ? "Play" : `Play ${LEVELS[ui.lane]?.name ?? ""}`) : "Loading"}
                    </button>
                    <button
                      type="button"
                      className="min-h-12 w-full rounded-2xl bg-ink/10 px-4 font-display text-lg text-ink"
                      onClick={() => setPanel("settings")}
                    >
                      Settings
                    </button>
                  </div>
                  {ui.message && <p className="mt-2 text-center text-sm text-terracotta">{ui.message}</p>}
                </div>
              </div>
            )}
            {ui.phase === "paused" && (
              <>
                <h2 className="font-display text-3xl">Paused</h2>
                <p className="mt-2 text-sm text-ink/80">
                  {ui.stageName} · {ui.levelName} · {DIFFICULTIES[ui.difficulty].label}
                </p>
                <p className="mt-2 text-sm text-ink/70">Double-tap Jump for a second hop. Down and Jump drops through a plank.</p>
                <button
                  type="button"
                  className="mt-5 min-h-12 w-full rounded-2xl bg-terracotta font-display text-lg text-cream"
                  onClick={() => apiRef.current?.resume()}
                >
                  Resume
                </button>
                <button
                  type="button"
                  className="mt-2 min-h-12 w-full rounded-2xl bg-ink/10 font-display text-lg text-ink"
                  onClick={() => {
                    setPanel("home");
                    apiRef.current?.map();
                  }}
                >
                  Back to map
                </button>
              </>
            )}
            {ui.phase === "clear" && (
              <>
                <p className="text-sm font-extrabold text-leaf">{ui.bossMax > 0 ? "BEAST DOWN" : "LANE CLEAR"}</p>
                <h2 className="font-display text-3xl">{ui.levelName}</h2>
                <p className="mt-1 text-sm text-ink/70">
                  {ui.stageName} · lane {ui.stageLane + 1} of {ui.stageLanes}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat label="Seeds" value={`${ui.found}/${ui.total}`} hint={ui.total - ui.found <= 0 ? "all of them" : `${ui.total - ui.found} left`} />
                  <Stat label="Time" value={`${ui.time}s`} hint="still on the clock" />
                  <Stat label="Rank" value={RANK_LABEL[ui.rank] || "Pip"} hint={rankHint(ui.rank)} />
                </div>
                <p className="mt-3 text-sm">{ui.message}</p>
                <p className="mt-1 font-display text-2xl">{ui.score}</p>
                <button
                  type="button"
                  className="mt-5 min-h-12 w-full rounded-2xl bg-terracotta font-display text-lg text-cream"
                  onClick={() => apiRef.current?.next()}
                >
                  {ui.nextLabel}
                </button>
                <button
                  type="button"
                  className="mt-2 min-h-12 w-full rounded-2xl bg-ink/10 font-display text-lg text-ink"
                  onClick={() => {
                    setPanel("home");
                    apiRef.current?.map();
                  }}
                >
                  Back to map
                </button>
              </>
            )}
            {ui.phase === "won" && (
              <>
                <p className="text-sm font-extrabold text-leaf">THE CROWN IS QUIET</p>
                <h2 className="font-display text-3xl">Three stages down</h2>
                <p className="mt-2 text-sm leading-snug text-ink/80">{ui.message}</p>
                <p className="mt-2 font-display text-2xl">{ui.score}</p>
                <p className="mt-1 text-sm text-ink/70">{ui.seeds} seeds this run</p>
                <ul className="mt-3 grid gap-1.5">
                  {STAGES.map((stage) => {
                    const ranks = stage.levels.map((_, i) => ui.ranks[stageOffset(stage.id) + i] ?? "none");
                    const cleared = ranks.filter((rank) => rank !== "none").length;
                    return (
                      <li key={stage.name} className="flex items-center justify-between rounded-xl bg-ink/5 px-3 py-2 text-sm">
                        <span className="font-extrabold">{stage.name}</span>
                        <span className="text-leaf">
                          {cleared}/{stage.levels.length}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="mt-4 min-h-12 w-full rounded-2xl bg-terracotta font-display text-lg text-cream"
                  onClick={() => {
                    setPanel("home");
                    apiRef.current?.setLane(0);
                    apiRef.current?.retry();
                  }}
                >
                  Run it back
                </button>
                <button
                  type="button"
                  className="mt-2 min-h-12 w-full rounded-2xl bg-ink/10 font-display text-lg text-ink"
                  onClick={() => {
                    setPanel("home");
                    apiRef.current?.map();
                  }}
                >
                  Back to map
                </button>
              </>
            )}
            {ui.phase === "over" && (
              <>
                <h2 className="font-display text-3xl">Out of lives</h2>
                <p className="mt-2 text-sm text-ink/80">{ui.message}</p>
                <p className="mt-1 text-sm text-ink/70">
                  {ui.found}/{ui.total} seeds in {ui.levelName}
                </p>
                <p className="mt-1 font-display text-2xl">{ui.score}</p>
                <button
                  type="button"
                  className="mt-5 min-h-12 w-full rounded-2xl bg-terracotta font-display text-lg text-cream"
                  onClick={() => apiRef.current?.retry()}
                >
                  Try again
                </button>
                <button
                  type="button"
                  className="mt-2 min-h-12 w-full rounded-2xl bg-ink/10 font-display text-lg text-ink"
                  onClick={() => {
                    setPanel("home");
                    apiRef.current?.map();
                  }}
                >
                  Back to map
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showDeck && sideGutters && box && (
        <>
          <div
            className="deck absolute z-30 flex flex-col gap-2"
            style={{
              left: `max(env(safe-area-inset-left), ${Math.max(8, (box.left - 72) / 2)}px)`,
              top: box.top + box.height / 2 - 72,
            }}
          >
            <Pad compact label="Left" pressed={held.left} onDown={(e) => press("left", e)} onUp={() => release("left")}>
              <ChevronLeft className="size-7" />
            </Pad>
            <Pad compact label="Right" pressed={held.right} onDown={(e) => press("right", e)} onUp={() => release("right")}>
              <ChevronRight className="size-7" />
            </Pad>
          </div>
          <div
            className="deck absolute z-30"
            style={{
              right: `max(env(safe-area-inset-right), ${Math.max(8, (box.roomRight - 96) / 2)}px)`,
              top: box.top + box.height / 2 - 32,
            }}
          >
            <Pad compact jump label="Jump" pressed={held.jump} onDown={(e) => press("jump", e)} onUp={() => release("jump")}>
              <ArrowBigUp className="size-7" />
            </Pad>
          </div>
        </>
      )}

      {showDeck && !sideGutters && (
        <div className="deck safe-bottom safe-x absolute inset-x-0 bottom-3 z-30 justify-center">
          <div className="flex w-full max-w-lg items-center justify-between gap-3">
            <div className="flex gap-3">
              <Pad roomy={roomy} label="Left" pressed={held.left} onDown={(e) => press("left", e)} onUp={() => release("left")}>
                <ChevronLeft className="size-8" />
              </Pad>
              <Pad roomy={roomy} label="Right" pressed={held.right} onDown={(e) => press("right", e)} onUp={() => release("right")}>
                <ChevronRight className="size-8" />
              </Pad>
            </div>
            <Pad roomy={roomy} label="Jump" jump pressed={held.jump} onDown={(e) => press("jump", e)} onUp={() => release("jump")}>
              <ArrowBigUp className="size-8" />
            </Pad>
          </div>
        </div>
      )}
    </main>
  );
}

function stageFill(id: number) {
  if (id === 2) return "bg-moon text-cream";
  if (id === 3) return "bg-storm text-cream";
  return "bg-leaf text-cream";
}

function rankHint(rank: Rank) {
  if (rank === "perfect") return "all seeds, no tumble";
  if (rank === "ribbon") return "most of the seeds";
  return "the lane is open";
}

function rankClass(rank: Rank) {
  if (rank === "perfect") return "font-extrabold text-terracotta";
  if (rank === "ribbon") return "font-extrabold text-leaf";
  if (rank === "pip") return "font-extrabold text-ink";
  return "text-ink/40";
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-ink/5 px-2 py-2 text-center">
      <p className="text-[11px] font-extrabold tracking-wide text-ink/55">{label}</p>
      <p className="font-display text-lg leading-tight">{value}</p>
      <p className="text-[11px] leading-tight text-ink/60">{hint}</p>
    </div>
  );
}

function stageOffset(id: number) {
  let count = 0;
  for (const stage of STAGES) {
    if (stage.id === id) return count;
    count += stage.levels.length;
  }
  return 0;
}

function LanePath({
  lane,
  unlocked,
  ranks,
  onPick,
}: {
  lane: number;
  unlocked: number;
  ranks: Rank[];
  onPick: (index: number) => void;
}) {
  const [view, setView] = useState(STAGES[0].id);
  useEffect(() => {
    const home = STAGES.find((stage) => {
      const offset = stageOffset(stage.id);
      return lane >= offset && lane < offset + stage.levels.length;
    });
    if (home) setView(home.id);
  }, [lane]);
  const stage = STAGES.find((item) => item.id === view) ?? STAGES[0];
  const offset = stageOffset(stage.id);
  return (
    <div className="mt-1">
      <div className="grid grid-cols-3 gap-2">
        {STAGES.map((item) => {
          const itemOffset = stageOffset(item.id);
          const locked = itemOffset > unlocked;
          const picked = view === item.id;
          return (
            <button
              key={item.name}
              type="button"
              disabled={locked}
              aria-pressed={picked}
              className={
                "min-h-12 rounded-2xl px-2 py-2 text-left " +
                (locked ? "bg-ink/5 text-ink/35" : picked ? stageFill(item.id) : "bg-ink/10 text-ink")
              }
              onClick={() => setView(item.id)}
            >
              <span className="block font-display text-sm leading-none">{item.name}</span>
              <span className="mt-1 block text-[11px] font-extrabold">
                {locked ? "Locked" : `${item.levels.filter((level) => !level.boss).length} lanes`}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {stage.levels.map((level, index) => {
          const flat = offset + index;
          const locked = flat > unlocked;
          const picked = lane === flat;
          const earned = ranks[flat] ?? "none";
          return (
            <button
              key={level.name}
              type="button"
              disabled={locked}
              aria-pressed={picked}
              className={
                "min-h-12 rounded-2xl px-2 py-2 text-left " +
                (locked ? "bg-ink/5 text-ink/35" : picked ? stageFill(stage.id) : "bg-ink/10 text-ink")
              }
              onClick={() => onPick(flat)}
            >
              <span className="block font-display text-lg leading-none">{index + 1}</span>
              <span className="mt-1 block text-xs font-extrabold leading-tight">{locked ? "Locked" : level.name}</span>
              {!locked && earned !== "none" && (
                <span className={"mt-1 block text-[11px] font-extrabold " + (picked ? "text-cream" : rankClass(earned))}>
                  {RANK_LABEL[earned]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Settings({
  difficulty,
  lane,
  unlocked,
  muted,
  onDifficulty,
  onLane,
  onMute,
  onBack,
}: {
  difficulty: Difficulty;
  lane: number;
  unlocked: number;
  muted: boolean;
  onDifficulty: (d: Difficulty) => void;
  onLane: (index: number) => void;
  onMute: () => void;
  onBack: () => void;
}) {
  const choices: Difficulty[] = ["easy", "normal", "hard"];
  return (
    <>
      <p className="text-sm font-sans font-extrabold tracking-wide text-leaf">SETTINGS</p>
      <h2 className="font-display text-3xl">Orchard</h2>
      <p className="mt-3 text-sm font-extrabold">Difficulty</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {choices.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={difficulty === id}
            className={
              "min-h-12 rounded-2xl px-2 font-display text-base " +
              (difficulty === id ? "bg-terracotta text-cream" : "bg-ink/10 text-ink")
            }
            onClick={() => onDifficulty(id)}
          >
            {DIFFICULTIES[id].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/70">{DIFFICULTIES[difficulty].blurb}</p>
      <p className="mt-4 text-sm font-extrabold">Start lane</p>
      {STAGES.map((stage) => {
        const offset = stageOffset(stage.id);
        const open = offset <= unlocked;
        return (
          <div key={stage.name} className="mt-3">
            <p className="text-xs font-extrabold tracking-wide text-leaf">{stage.name}</p>
            {open ? (
              <div className="mt-2 grid grid-cols-2 gap-2 landscape:grid-cols-3">
                {stage.levels.map((level, index) => {
                  const flat = offset + index;
                  const locked = flat > unlocked;
                  return (
                    <button
                      key={level.name}
                      type="button"
                      disabled={locked}
                      aria-pressed={lane === flat}
                      className={
                        "min-h-12 rounded-2xl px-3 text-left font-sans text-sm font-extrabold " +
                        (locked ? "bg-ink/5 text-ink/35" : lane === flat ? stageFill(stage.id) : "bg-ink/10 text-ink")
                      }
                      onClick={() => onLane(flat)}
                    >
                      {index + 1}. {locked ? "Locked" : level.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink/45">Locked until the stage before is clear.</p>
            )}
          </div>
        );
      })}
      <button type="button" className="mt-4 min-h-12 w-full rounded-2xl bg-ink/10 font-display text-lg text-ink" onClick={onMute}>
        {muted ? "Sound off" : "Sound on"}
      </button>
      <button
        type="button"
        className="sticky bottom-0 z-10 mt-2 min-h-12 w-full rounded-2xl bg-terracotta font-display text-lg text-cream"
        onClick={onBack}
      >
        Back
      </button>
    </>
  );
}

function Pad({
  label,
  jump,
  pressed,
  compact,
  roomy,
  onDown,
  onUp,
  children,
}: {
  label: string;
  jump?: boolean;
  pressed: boolean;
  compact?: boolean;
  roomy?: boolean;
  onDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onUp: () => void;
  children: ReactNode;
}) {
  const size = compact
    ? "h-16 w-16"
    : roomy
      ? jump
        ? "h-20 w-28"
        : "h-20 w-20"
      : jump
        ? "h-16 w-28"
        : "h-16 w-20";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={
        "pad flex touch-none flex-col items-center justify-center rounded-2xl font-sans text-xs font-extrabold " +
        size +
        " " +
        (jump ? "bg-terracotta text-cream" : "bg-cream text-ink")
      }
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) onUp();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
      {label}
    </button>
  );
}
