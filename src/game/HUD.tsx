import { useGame } from "./store";

export function HUD() {
  const {
    health,
    maxHealth,
    level,
    xp,
    xpToNext,
    money,
    activeWeapon,
    gunLevel,
    swordLevel,
    timeOfDay,
    isNight,
    zombiesKilled,
    playerName,
  } = useGame();

  const hours = Math.floor(timeOfDay * 24);
  const mins = Math.floor((timeOfDay * 24 * 60) % 60);
  const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-foreground">
      {/* Top-left: stats */}
      <div className="panel pointer-events-auto absolute left-4 top-4 rounded-md p-3 min-w-[260px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-xl text-glow text-primary">{playerName}</span>
          <span className="font-mono text-xs text-muted-foreground">LVL {level}</span>
        </div>
        {/* Health */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>HP</span><span>{Math.ceil(health)}/{maxHealth}</span>
          </div>
          <div className="h-2 rounded-sm bg-muted overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${(health / maxHealth) * 100}%`,
                background: "var(--health)",
                boxShadow: "0 0 8px var(--health)",
              }}
            />
          </div>
        </div>
        {/* XP */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>XP</span><span>{xp}/{xpToNext}</span>
          </div>
          <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${(xp / xpToNext) * 100}%`,
                background: "var(--xp)",
                boxShadow: "0 0 6px var(--xp)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Top-right: time + cash */}
      <div className="panel absolute right-4 top-4 rounded-md p-3 text-right">
        <div className="font-mono text-2xl font-bold tabular-nums">{timeStr}</div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: isNight ? "var(--accent)" : "var(--xp)" }}>
          {isNight ? "☾ ZOMBIE HOURS" : "☀ DAYTIME"}
        </div>
        <div className="mt-2 font-mono text-lg text-primary text-glow">${money}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{zombiesKilled} kills</div>
      </div>

      {/* Bottom-center: weapons */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        <WeaponSlot
          active={activeWeapon === "gun"}
          label="Pistol"
          level={gunLevel}
          icon="🔫"
          hotkey="1"
        />
        <WeaponSlot
          active={activeWeapon === "sword"}
          label="Blade"
          level={swordLevel}
          icon="🗡️"
          hotkey="2"
        />
      </div>

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-1 w-1 rounded-full bg-primary opacity-80" />
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 panel rounded-md px-3 py-2 text-[11px] font-mono text-muted-foreground">
        WASD move · SHIFT run · MOUSE look · CLICK attack · 1/2 weapon
      </div>
    </div>
  );
}

function WeaponSlot({
  active,
  label,
  level,
  icon,
  hotkey,
}: {
  active: boolean;
  label: string;
  level: number;
  icon: string;
  hotkey: string;
}) {
  return (
    <div
      className={`panel rounded-md px-4 py-2 transition-all ${
        active ? "ring-2 ring-primary scale-105" : "opacity-60"
      }`}
      style={active ? { boxShadow: "0 0 20px color-mix(in oklab, var(--primary) 40%, transparent)" } : {}}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-display text-sm leading-none">{label}</div>
          <div className="font-mono text-[10px] text-muted-foreground">LV {level}</div>
        </div>
        <span className="ml-2 font-mono text-[10px] text-muted-foreground border border-border rounded px-1">
          {hotkey}
        </span>
      </div>
    </div>
  );
}
