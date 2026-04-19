import { useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { useMultiplayer } from "./MultiplayerProvider";
import { useGame, OUTFITS, type OutfitId, type Gender } from "@/game/store";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hydrates the local game store from the player's profile when they enter a room,
 * and persists changes back to the DB on a debounce.
 */
export function ProfileSync() {
  const { profile, refreshProfile } = useAuth();
  const { room } = useMultiplayer();
  const hydrated = useRef(false);

  // Hydrate on room enter
  useEffect(() => {
    if (!room || !profile || hydrated.current) return;
    const outfit = (OUTFITS.find((o) => o.id === profile.outfit)?.id ?? "default") as OutfitId;
    const outfitHp = OUTFITS.find((o) => o.id === outfit)!.hp;
    const baseHp = 100 + (profile.level - 1) * 15 + outfitHp;
    useGame.setState({
      started: true,
      gender: profile.gender as Gender,
      playerName: profile.username,
      level: profile.level,
      xp: profile.xp,
      money: profile.money,
      gunLevel: profile.gun_level,
      swordLevel: profile.sword_level,
      outfit,
      maxHealth: baseHp,
      health: baseHp,
      zombiesKilled: profile.zombies_killed,
      ownersKilled: 0,
      scene: "city",
      shopUIOpen: null,
    });
    hydrated.current = true;
  }, [room, profile]);

  // Reset hydration flag when leaving room
  useEffect(() => {
    if (!room) {
      hydrated.current = false;
      useGame.setState({ started: false });
    }
  }, [room]);

  // Persist on changes (debounced)
  const lastSaveRef = useRef(0);
  useEffect(() => {
    if (!room || !profile) return;
    const unsub = useGame.subscribe((state) => {
      const now = Date.now();
      if (now - lastSaveRef.current < 3000) return;
      lastSaveRef.current = now;
      supabase
        .rpc("save_player_stats", {
          _money: state.money,
          _xp: state.xp,
          _level: state.level,
          _gun_level: state.gunLevel,
          _sword_level: state.swordLevel,
          _outfit: state.outfit,
          _zombies_killed: state.zombiesKilled,
          _players_killed: 0,
          _deaths: 0,
        })
        .then(({ error }) => {
          if (error) console.warn("save_player_stats:", error.message);
        });
    });
    return unsub;
  }, [room, profile]);

  // Final save + refresh when leaving
  useEffect(() => {
    return () => {
      if (!profile) return;
      const s = useGame.getState();
      supabase
        .rpc("save_player_stats", {
          _money: s.money,
          _xp: s.xp,
          _level: s.level,
          _gun_level: s.gunLevel,
          _sword_level: s.swordLevel,
          _outfit: s.outfit,
          _zombies_killed: s.zombiesKilled,
          _players_killed: 0,
          _deaths: 0,
        })
        .then(() => refreshProfile());
    };
  }, [profile, refreshProfile]);

  return null;
}
