import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";

export interface RoomInfo {
  id: string;
  code: string;
  name: string;
  is_public: boolean;
  max_players: number;
  host_id: string;
}

export interface RemotePlayerState {
  userId: string;
  username: string;
  gender: "male" | "female";
  outfit: string;
  level: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  weapon: "gun" | "sword";
  lastUpdate: number;
}

export interface ShotEvent {
  shooterId: string;
  shooterName: string;
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
  weapon: "gun" | "sword";
  damage: number;
  shotId: string;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
}

interface MpCtx {
  room: RoomInfo | null;
  joinRoom: (r: RoomInfo) => Promise<void>;
  leaveRoom: () => Promise<void>;
  remotePlayers: Map<string, RemotePlayerState>;
  // Sending
  broadcastPosition: (state: Omit<RemotePlayerState, "userId" | "username" | "gender" | "outfit" | "level" | "lastUpdate">) => void;
  broadcastShot: (s: Omit<ShotEvent, "shooterId" | "shooterName" | "shotId">) => void;
  broadcastDamageReport: (victimId: string, damage: number) => void;
  broadcastKill: (victimId: string, victimName: string) => void;
  // Listening (set by Game)
  onIncomingDamage: (handler: (damage: number, fromName: string) => void) => () => void;
  onKillFeed: (handler: (e: KillEvent) => void) => () => void;
  onRemoteShot: (handler: (s: ShotEvent) => void) => () => void;
}

const Ctx = createContext<MpCtx | null>(null);

const POSITION_THROTTLE_MS = 80; // ~12 Hz

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayerState>>(
    new Map()
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastPositionSentRef = useRef(0);
  const damageHandlersRef = useRef<Set<(d: number, n: string) => void>>(new Set());
  const killHandlersRef = useRef<Set<(e: KillEvent) => void>>(new Set());
  const shotHandlersRef = useRef<Set<(s: ShotEvent) => void>>(new Set());

  const cleanup = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRemotePlayers(new Map());
  }, []);

  const joinRoom = useCallback(
    async (r: RoomInfo) => {
      if (!user || !profile) throw new Error("Not signed in");
      // Insert membership (ignore conflict)
      const { error: memErr } = await supabase
        .from("room_members")
        .upsert({ room_id: r.id, user_id: user.id }, { onConflict: "room_id,user_id" });
      if (memErr) throw memErr;

      await cleanup();

      const channel = supabase.channel(`room:${r.id}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: user.id },
        },
      });

      channel.on("broadcast", { event: "pos" }, (payload) => {
        const p = payload.payload as RemotePlayerState;
        if (p.userId === user.id) return;
        setRemotePlayers((prev) => {
          const next = new Map(prev);
          next.set(p.userId, { ...p, lastUpdate: Date.now() });
          return next;
        });
      });

      channel.on("broadcast", { event: "shot" }, (payload) => {
        const s = payload.payload as ShotEvent;
        if (s.shooterId === user.id) return;
        shotHandlersRef.current.forEach((h) => h(s));
      });

      channel.on("broadcast", { event: "dmg" }, (payload) => {
        const { victimId, damage, fromId, fromName } = payload.payload as {
          victimId: string;
          damage: number;
          fromId: string;
          fromName: string;
        };
        if (victimId !== user.id) return;
        damageHandlersRef.current.forEach((h) => h(damage, fromName));
      });

      channel.on("broadcast", { event: "kill" }, (payload) => {
        const e = payload.payload as KillEvent;
        killHandlersRef.current.forEach((h) => h(e));
      });

      channel.on("presence", { event: "leave" }, ({ key }) => {
        setRemotePlayers((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, username: profile.username });
        }
      });

      channelRef.current = channel;
      setRoom(r);
    },
    [user, profile, cleanup]
  );

  const leaveRoom = useCallback(async () => {
    if (!user || !room) {
      await cleanup();
      setRoom(null);
      return;
    }
    await supabase
      .from("room_members")
      .delete()
      .eq("room_id", room.id)
      .eq("user_id", user.id);
    await cleanup();
    setRoom(null);
  }, [user, room, cleanup]);

  // Cleanup on unmount or sign out
  useEffect(() => {
    if (!user && room) {
      cleanup();
      setRoom(null);
    }
  }, [user, room, cleanup]);

  // Prune stale remote players (no update in 5s)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setRemotePlayers((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [k, v] of next) {
          if (now - v.lastUpdate > 5000) {
            next.delete(k);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const broadcastPosition: MpCtx["broadcastPosition"] = useCallback(
    (state) => {
      const now = Date.now();
      if (now - lastPositionSentRef.current < POSITION_THROTTLE_MS) return;
      if (!channelRef.current || !user || !profile) return;
      lastPositionSentRef.current = now;
      const payload: RemotePlayerState = {
        userId: user.id,
        username: profile.username,
        gender: profile.gender,
        outfit: profile.outfit,
        level: profile.level,
        ...state,
        lastUpdate: now,
      };
      channelRef.current.send({ type: "broadcast", event: "pos", payload });
    },
    [user, profile]
  );

  const broadcastShot: MpCtx["broadcastShot"] = useCallback(
    (s) => {
      if (!channelRef.current || !user || !profile) return;
      const payload: ShotEvent = {
        shooterId: user.id,
        shooterName: profile.username,
        shotId: `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...s,
      };
      channelRef.current.send({ type: "broadcast", event: "shot", payload });
    },
    [user, profile]
  );

  const broadcastDamageReport = useCallback(
    (victimId: string, damage: number) => {
      if (!channelRef.current || !user || !profile) return;
      channelRef.current.send({
        type: "broadcast",
        event: "dmg",
        payload: { victimId, damage, fromId: user.id, fromName: profile.username },
      });
    },
    [user, profile]
  );

  const broadcastKill = useCallback(
    (victimId: string, victimName: string) => {
      if (!channelRef.current || !user || !profile) return;
      const payload: KillEvent = {
        killerId: user.id,
        killerName: profile.username,
        victimId,
        victimName,
      };
      channelRef.current.send({ type: "broadcast", event: "kill", payload });
    },
    [user, profile]
  );

  const onIncomingDamage: MpCtx["onIncomingDamage"] = useCallback((h) => {
    damageHandlersRef.current.add(h);
    return () => {
      damageHandlersRef.current.delete(h);
    };
  }, []);
  const onKillFeed: MpCtx["onKillFeed"] = useCallback((h) => {
    killHandlersRef.current.add(h);
    return () => {
      killHandlersRef.current.delete(h);
    };
  }, []);
  const onRemoteShot: MpCtx["onRemoteShot"] = useCallback((h) => {
    shotHandlersRef.current.add(h);
    return () => {
      shotHandlersRef.current.delete(h);
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        room,
        joinRoom,
        leaveRoom,
        remotePlayers,
        broadcastPosition,
        broadcastShot,
        broadcastDamageReport,
        broadcastKill,
        onIncomingDamage,
        onKillFeed,
        onRemoteShot,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMultiplayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMultiplayer must be used inside MultiplayerProvider");
  return v;
}
