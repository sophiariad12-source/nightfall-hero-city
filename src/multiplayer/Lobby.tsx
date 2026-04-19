import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { useMultiplayer } from "./MultiplayerProvider";

interface RoomRow {
  id: string;
  code: string;
  name: string;
  is_public: boolean;
  max_players: number;
  host_id: string;
  created_at: string;
}

interface RoomWithCount extends RoomRow {
  member_count: number;
}

export function Lobby() {
  const { profile, signOut } = useAuth();
  const { joinRoom } = useMultiplayer();
  const [rooms, setRooms] = useState<RoomWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPublic, setNewRoomPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    const { data: roomData, error: rErr } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (rErr) {
      console.error(rErr);
      setLoading(false);
      return;
    }
    // Get member counts
    const ids = (roomData ?? []).map((r) => r.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: members } = await supabase
        .from("room_members")
        .select("room_id")
        .in("room_id", ids);
      counts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
        acc[m.room_id] = (acc[m.room_id] ?? 0) + 1;
        return acc;
      }, {});
    }
    setRooms((roomData ?? []).map((r) => ({ ...r, member_count: counts[r.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => {
    loadRooms();
    const id = setInterval(loadRooms, 8000);
    return () => clearInterval(id);
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!profile) return;
    const name = newRoomName.trim() || `${profile.username}'s game`;
    if (name.length > 40) {
      setError("Room name too long");
      return;
    }
    setBusy(true);
    try {
      // Generate a code via RPC
      const { data: codeData, error: codeErr } = await supabase.rpc("generate_room_code");
      if (codeErr) throw codeErr;
      const code = codeData as string;
      const { data: room, error: insErr } = await supabase
        .from("rooms")
        .insert({
          code,
          name,
          is_public: newRoomPublic,
          host_id: profile.id,
          max_players: 8,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      await joinRoom(room as RoomRow);
    } catch (e: any) {
      setError(e.message ?? "Failed to create room");
    } finally {
      setBusy(false);
    }
  };

  const handleJoinByCode = async () => {
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Code must be 6 characters");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setError("No room with that code");
        return;
      }
      await joinRoom(data as RoomRow);
    } catch (e: any) {
      setError(e.message ?? "Failed to join");
    } finally {
      setBusy(false);
    }
  };

  const handleJoinPublic = async (room: RoomRow) => {
    setBusy(true);
    try {
      await joinRoom(room);
    } catch (e: any) {
      setError(e.message ?? "Failed to join");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-40 overflow-y-auto px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at top, oklch(0.18 0.04 270) 0%, oklch(0.05 0.02 270) 80%)",
      }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="font-display text-5xl text-glow"
              style={{ color: "var(--accent)" }}
            >
              DEAD CITY
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
              Lobby
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-lg">{profile?.username ?? "..."}</div>
            <div className="font-mono text-xs text-muted-foreground">
              Lv {profile?.level ?? 1} · ${profile?.money ?? 0}
            </div>
            <button
              onClick={signOut}
              className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Create + Join code */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="panel rounded-lg p-5">
            <h2 className="font-display text-xl">Create a game</h2>
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              maxLength={40}
              placeholder="Room name"
              className="mt-3 w-full rounded-md bg-input px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <label className="mt-3 flex items-center gap-2 font-mono text-xs">
              <input
                type="checkbox"
                checked={newRoomPublic}
                onChange={(e) => setNewRoomPublic(e.target.checked)}
              />
              Public (show in lobby browser)
            </label>
            <button
              disabled={busy}
              onClick={handleCreate}
              className="mt-4 w-full rounded-md py-2 font-display text-base tracking-widest disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--primary))",
                color: "var(--background)",
              }}
            >
              {creating ? "..." : "CREATE ROOM"}
            </button>
          </div>

          <div className="panel rounded-lg p-5">
            <h2 className="font-display text-xl">Join with code</h2>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="mt-3 w-full rounded-md bg-input px-3 py-2 font-mono text-2xl text-center tracking-[0.3em] outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              disabled={busy || joinCode.length !== 6}
              onClick={handleJoinByCode}
              className="mt-4 w-full rounded-md py-2 font-display text-base tracking-widest disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              JOIN
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Public rooms */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Public rooms</h2>
            <button
              onClick={loadRooms}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              ↻ Refresh
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="font-mono text-sm text-muted-foreground">Loading...</p>
            ) : rooms.length === 0 ? (
              <p className="font-mono text-sm text-muted-foreground">
                No public rooms yet. Create one!
              </p>
            ) : (
              rooms.map((r) => (
                <button
                  key={r.id}
                  disabled={busy || r.member_count >= r.max_players}
                  onClick={() => handleJoinPublic(r)}
                  className="w-full rounded-md border border-border bg-muted/30 p-3 text-left transition hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-base">{r.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        Code: {r.code}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {r.member_count}/{r.max_players}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {r.member_count >= r.max_players ? "FULL" : "JOIN →"}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
