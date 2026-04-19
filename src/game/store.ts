import { create } from "zustand";

export type Gender = "male" | "female";
export type WeaponType = "gun" | "sword";

export interface GameState {
  started: boolean;
  gender: Gender;
  playerName: string;
  health: number;
  maxHealth: number;
  level: number;
  xp: number;
  xpToNext: number;
  money: number;
  activeWeapon: WeaponType;
  gunLevel: number;
  swordLevel: number;
  // World
  timeOfDay: number; // 0-1, 0=midnight, 0.5=noon
  isNight: boolean;
  zombiesKilled: number;
  // Actions
  startGame: (gender: Gender, name: string) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  addXP: (amount: number) => void;
  addMoney: (amount: number) => void;
  switchWeapon: (w: WeaponType) => void;
  setTimeOfDay: (t: number) => void;
  killZombie: () => void;
  reset: () => void;
}

const xpForLevel = (lvl: number) => 50 + lvl * 75;

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
  timeOfDay: 0.3,
  isNight: false,
  zombiesKilled: 0,

  startGame: (gender, name) => set({ started: true, gender, playerName: name || "Survivor" }),
  takeDamage: (amount) =>
    set((s) => ({ health: Math.max(0, s.health - amount) })),
  heal: (amount) =>
    set((s) => ({ health: Math.min(s.maxHealth, s.health + amount) })),
  addXP: (amount) => {
    let { xp, level, xpToNext, gunLevel, swordLevel, activeWeapon, maxHealth } = get();
    xp += amount;
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level += 1;
      xpToNext = xpForLevel(level);
      maxHealth += 10;
      if (activeWeapon === "gun") gunLevel += 1;
      else swordLevel += 1;
    }
    set({ xp, level, xpToNext, gunLevel, swordLevel, maxHealth });
  },
  addMoney: (amount) => set((s) => ({ money: s.money + amount })),
  switchWeapon: (w) => set({ activeWeapon: w }),
  setTimeOfDay: (t) => {
    const wrapped = ((t % 1) + 1) % 1;
    set({ timeOfDay: wrapped, isNight: wrapped < 0.22 || wrapped > 0.78 });
  },
  killZombie: () => set((s) => ({ zombiesKilled: s.zombiesKilled + 1 })),
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
      timeOfDay: 0.3,
      isNight: false,
      zombiesKilled: 0,
    }),
}));

export const weaponDamage = (type: WeaponType, level: number) =>
  type === "gun" ? 15 + level * 5 : 22 + level * 7;
