import { useGame, OUTFITS, gunUpgradeCost, swordUpgradeCost, type SceneId } from "./store";

export function ShopUI() {
  const shopUIOpen = useGame((s) => s.shopUIOpen);
  const closeShopUI = useGame((s) => s.closeShopUI);
  const exitToCity = useGame((s) => s.exitToCity);

  if (!shopUIOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="panel rounded-lg p-6 max-w-lg w-[92%]">
        <Header sceneId={shopUIOpen} />
        <div className="mt-5 max-h-[60vh] overflow-y-auto pr-1">
          {shopUIOpen === "gun_shop" && <GunShop />}
          {shopUIOpen === "blade_shop" && <BladeShop />}
          {shopUIOpen === "clothing_shop" && <ClothingShop />}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={closeShopUI}
            className="flex-1 rounded-md border border-border py-2 font-mono text-xs uppercase tracking-wider hover:bg-muted"
          >
            Browse more
          </button>
          <button
            onClick={exitToCity}
            className="flex-1 rounded-md py-2 font-mono text-xs uppercase tracking-wider"
            style={{ background: "var(--accent)", color: "var(--background)" }}
          >
            ← Leave shop
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ sceneId }: { sceneId: SceneId }) {
  const money = useGame((s) => s.money);
  const titles: Record<string, { name: string; tag: string; color: string }> = {
    gun_shop: { name: "GUN SHOP", tag: "Heat for the streets", color: "#ff5544" },
    blade_shop: { name: "BLADE WORKS", tag: "Steel since '88", color: "#55aaff" },
    clothing_shop: { name: "THREADS", tag: "Drip up", color: "#ffaa33" },
  };
  const t = titles[sceneId] ?? titles.gun_shop;
  return (
    <div className="flex items-end justify-between border-b border-border pb-3">
      <div>
        <h2 className="font-display text-4xl text-glow" style={{ color: t.color }}>
          {t.name}
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {t.tag}
        </p>
      </div>
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Wallet</div>
        <div className="font-mono text-2xl text-primary text-glow">${money}</div>
      </div>
    </div>
  );
}

function GunShop() {
  const gunLevel = useGame((s) => s.gunLevel);
  const money = useGame((s) => s.money);
  const upgradeGun = useGame((s) => s.upgradeGun);
  const cost = gunUpgradeCost(gunLevel);
  const canBuy = money >= cost;
  const nextDmg = 15 + (gunLevel + 1) * 7;
  const curDmg = 15 + gunLevel * 7;
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔫</span>
            <div>
              <div className="font-display text-lg">Pistol — Lv {gunLevel}</div>
              <div className="font-mono text-xs text-muted-foreground">
                Damage: <span className="text-foreground">{curDmg}</span>
                <span className="mx-2">→</span>
                <span style={{ color: "var(--xp)" }}>{nextDmg}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          disabled={!canBuy}
          onClick={() => upgradeGun()}
          className="mt-3 w-full rounded-md py-3 font-display text-lg tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canBuy ? "linear-gradient(135deg,#ff5544,#aa2222)" : "var(--muted)",
            color: "var(--foreground)",
          }}
        >
          UPGRADE — ${cost}
        </button>
      </div>
      <Tip text="🩸 Tip: Bigger guns drop store owners faster. Rob bodegas for cash." />
    </div>
  );
}

function BladeShop() {
  const swordLevel = useGame((s) => s.swordLevel);
  const money = useGame((s) => s.money);
  const upgradeSword = useGame((s) => s.upgradeSword);
  const cost = swordUpgradeCost(swordLevel);
  const canBuy = money >= cost;
  const nextDmg = 22 + (swordLevel + 1) * 9;
  const curDmg = 22 + swordLevel * 9;
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗡️</span>
            <div>
              <div className="font-display text-lg">Blade — Lv {swordLevel}</div>
              <div className="font-mono text-xs text-muted-foreground">
                Damage: <span className="text-foreground">{curDmg}</span>
                <span className="mx-2">→</span>
                <span style={{ color: "var(--xp)" }}>{nextDmg}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          disabled={!canBuy}
          onClick={() => upgradeSword()}
          className="mt-3 w-full rounded-md py-3 font-display text-lg tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canBuy ? "linear-gradient(135deg,#55aaff,#2255aa)" : "var(--muted)",
            color: "var(--foreground)",
          }}
        >
          UPGRADE — ${cost}
        </button>
      </div>
      <Tip text="🔪 Tip: Blades hit harder per swing but you have to get close. Best vs zombies." />
    </div>
  );
}

function ClothingShop() {
  const outfit = useGame((s) => s.outfit);
  const money = useGame((s) => s.money);
  const buyOutfit = useGame((s) => s.buyOutfit);
  return (
    <div className="space-y-3">
      {OUTFITS.map((o) => {
        const isWearing = outfit === o.id;
        const canBuy = money >= o.price;
        return (
          <div
            key={o.id}
            className={`rounded-md border p-3 flex items-center justify-between ${
              isWearing ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded"
                style={{ background: `linear-gradient(135deg,${o.shirt},${o.pants})` }}
              />
              <div>
                <div className="font-display text-base">{o.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  +{o.hp} max HP
                </div>
              </div>
            </div>
            {isWearing ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                Equipped
              </span>
            ) : (
              <button
                disabled={!canBuy}
                onClick={() => buyOutfit(o.id)}
                className="rounded-md px-4 py-2 font-mono text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canBuy ? "var(--accent)" : "var(--muted)",
                  color: "var(--background)",
                }}
              >
                {o.price === 0 ? "Equip" : `$${o.price}`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <p className="font-mono text-[11px] text-muted-foreground italic">{text}</p>
  );
}
