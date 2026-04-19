import { create } from "zustand";

export type Gender = "male" | "female";
export type WeaponType = "gun" | "sword";
export type SceneId = "city" | "gun_shop" | "blade_shop" | "clothing_shop" | "bodega";
export type OutfitId = "default" | "street" | "tactical" | "kingpin";

export interface ShopLocation {
  id: SceneId;
  x: number;
  z: number;
  label: string;
  color: string; // neon sign
}

export interface GameState {
  started: boolean;
  gender: Gender;
  playerName: string;
  // Player
  health: number;
  maxHealth: number;
  level: number;
  xp: number;
  xpToNext: number;
  money: number;
  activeWeapon: WeaponType;
  gunLevel: number;
  swordLevel: number;
  outfit: OutfitId;
  // World
  timeOfDay: number;
  isNight: boolean;
  zombiesKilled: number;
  ownersKilled: number;
  // Scene
  scene: SceneId;
  shopUIOpen: SceneId | null;
  // Actions
  startGame: (gender: Gender, name: string) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  addXP: (amount: number) => void;
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean;
  switchWeapon: (w: WeaponType) => void;
  setTimeOfDay: (t: number) => void;
  killZombie: () => void;
  killOwner: () => void;
  enterScene: (s: SceneId) => void;
  exitToCity: () => void;
  openShopUI: (s: SceneId) => void;
  closeShopUI: () => void;
  upgradeGun: () => boolean;
  upgradeSword: () => boolean;
  buyOutfit: (o: OutfitId) => boolean;
  reset: () => void;
}

const xpForLevel = (lvl: number) => 50 + lvl * 75;

// Shop locations on the city map (scattered around)
export const SHOPS: ShopLocation[] = [
  { id: "gun_shop", x: -30, z: -10, label: "GUNS", color: "#ff5544" },
  { id: "blade_shop", x: 30, z: -10, label: "BLADES", color: "#55aaff" },
  { id: "clothing_shop", x: 0, z: -40, label: "THREADS", color: "#ffaa33" },
  { id: "bodega", x: 0, z: 10, label: "BODEGA", color: "#33ff88" },
];

// Pricing
export const gunUpgradeCost = (lvl: number) => 50 + lvl * 75;
export const swordUpgradeCost = (lvl: number) => 40 + lvl * 60;
export const OUTFITS: { id: OutfitId; name: string; price: number; shirt: string; pants: string; hat: string | null; hp: number }[] = [
  { id: "default", name: "Street Clothes", price: 0, shirt: "#2d4a6b", pants: "#1a1d24", hat: null, hp: 0 },
  { id: "street", name: "Bronx Hoodie", price: 150, shirt: "#3a3a3a", pants: "#1f1f25", hat: "#2a2a2a", hp: 15 },
  { id: "tactical", name: "Tactical Vest", price: 500, shirt: "#3a4530", pants: "#252820", hat: "#1a1a1a", hp: 40 },
  { id: "kingpin", name: "Kingpin Suit", price: 2000, shirt: "#1a1a1a", pants: "#1a1a1a", hat: "#5a3a1a", hp: 80 },
];

export const useGame = create<GameState>((set, get) => ({
  started: false,
  gender: "male",
  playerName: "Survivor",
  health: 100,
  maxHealth: 100,
  level: 1,
  xp: 0,
  xpToNext: xpForLevel(1),
  money: 0,
  activeWeapon: "gun",
  gunLevel: 1,
  swordLevel: 1,
  outfit: "default",
  timeOfDay: 0.3,
  isNight: false,
  zombiesKilled: 0,
  ownersKilled: 0,
  scene: "city",
  shopUIOpen: null,

  startGame: (gender, name) => set({ started: true, gender, playerName: name || "Survivor" }),

  takeDamage: (amount) => set((s) => ({ health: Math.max(0, s.health - amount) })),
  heal: (amount) => set((s) => ({ health: Math.min(s.maxHealth, s.health + amount) })),

  addXP: (amount) => {
    let { xp, level, xpToNext, maxHealth, health } = get();
    xp += amount;
    let leveledUp = false;
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level += 1;
      xpToNext = xpForLevel(level);
      maxHealth += 15;
      health = Math.min(maxHealth, health + 25);
      leveledUp = true;
    }
    set({ xp, level, xpToNext, maxHealth, health });
    return leveledUp;
  },
  addMoney: (amount) => set((s) => ({ money: s.money + amount })),
  spendMoney: (amount) => {
    const { money } = get();
    if (money < amount) return false;
    set({ money: money - amount });
    return true;
  },
  switchWeapon: (w) => set({ activeWeapon: w }),
  setTimeOfDay: (t) => {
    const wrapped = ((t % 1) + 1) % 1;
    set({ timeOfDay: wrapped, isNight: wrapped < 0.22 || wrapped > 0.78 });
  },
  killZombie: () => set((s) => ({ zombiesKilled: s.zombiesKilled + 1 })),
  killOwner: () => set((s) => ({ ownersKilled: s.ownersKilled + 1 })),

  enterScene: (s) => set({ scene: s, shopUIOpen: null }),
  exitToCity: () => set({ scene: "city", shopUIOpen: null }),
  openShopUI: (s) => set({ shopUIOpen: s }),
  closeShopUI: () => set({ shopUIOpen: null }),

  upgradeGun: () => {
    const { gunLevel, money } = get();
    const cost = gunUpgradeCost(gunLevel);
    if (money < cost) return false;
    set({ money: money - cost, gunLevel: gunLevel + 1 });
    return true;
  },
  upgradeSword: () => {
    const { swordLevel, money } = get();
    const cost = swordUpgradeCost(swordLevel);
    if (money < cost) return false;
    set({ money: money - cost, swordLevel: swordLevel + 1 });
    return true;
  },
  buyOutfit: (o) => {
    const { money, outfit, maxHealth, health } = get();
    if (outfit === o) return false;
    const item = OUTFITS.find((x) => x.id === o);
    if (!item) return false;
    if (money < item.price) return false;
    const oldItem = OUTFITS.find((x) => x.id === outfit)!;
    const newMax = maxHealth - oldItem.hp + item.hp;
    set({
      money: money - item.price,
      outfit: o,
      maxHealth: newMax,
      health: Math.min(newMax, health),
    });
    return true;
  },

  reset: () =>
    set({
      started: false,
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      xpToNext: xpForLevel(1),
      money: 0,
      gunLevel: 1,
      swordLevel: 1,
      outfit: "default",
      timeOfDay: 0.3,
      isNight: false,
      zombiesKilled: 0,
      ownersKilled: 0,
      scene: "city",
      shopUIOpen: null,
    }),
}));

export const weaponDamage = (type: WeaponType, level: number) =>
  type === "gun" ? 15 + level * 7 : 22 + level * 9;
