import { useState } from "react";
import { useGame, type Gender } from "./store";

export function StartScreen() {
  const startGame = useGame((s) => s.startGame);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at center, oklch(0.18 0.04 270) 0%, oklch(0.05 0.02 270) 80%)",
      }}
    >
      <div className="panel rounded-lg p-8 max-w-md w-[90%] text-center">
        <h1
          className="font-display text-6xl text-glow"
          style={{ color: "var(--accent)" }}
        >
          DEAD CITY
        </h1>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mt-1">
          NYC · After Dark
        </p>

        <div className="mt-6 text-left">
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Survivor name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="Your name"
            className="mt-1 w-full rounded-md bg-input px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="mt-4">
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Choose your survivor
          </label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["male", "female"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`rounded-md border-2 p-4 transition-all ${
                  gender === g
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-border opacity-60 hover:opacity-100"
                }`}
              >
                <div className="text-4xl">{g === "male" ? "🧔" : "👩"}</div>
                <div className="mt-1 font-display text-lg capitalize">{g}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => startGame(gender, name)}
          className="mt-6 w-full rounded-md py-3 font-display text-2xl tracking-widest transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--primary))",
            color: "var(--background)",
            boxShadow: "0 0 30px color-mix(in oklab, var(--accent) 50%, transparent)",
          }}
        >
          ENTER THE CITY
        </button>

        <p className="mt-4 text-[11px] font-mono text-muted-foreground">
          Day: explore the streets · Night: <span style={{ color: "var(--accent)" }}>fight zombies</span>
        </p>
      </div>
    </div>
  );
}

export function DeathScreen() {
  const reset = useGame((s) => s.reset);
  const { level, zombiesKilled, money } = useGame();
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="panel rounded-lg p-8 text-center max-w-sm">
        <h2 className="font-display text-5xl text-glow" style={{ color: "var(--destructive)" }}>
          YOU DIED
        </h2>
        <div className="mt-4 font-mono text-sm text-muted-foreground space-y-1">
          <div>Level reached: <span className="text-foreground">{level}</span></div>
          <div>Zombies killed: <span className="text-foreground">{zombiesKilled}</span></div>
          <div>Cash earned: <span className="text-foreground">${money}</span></div>
        </div>
        <button
          onClick={reset}
          className="mt-6 w-full rounded-md py-3 font-display text-xl tracking-widest"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          RESPAWN
        </button>
      </div>
    </div>
  );
}
