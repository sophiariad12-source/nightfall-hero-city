import { useMultiplayer } from "./MultiplayerProvider";

export function RoomBar() {
  const { room, leaveRoom, remotePlayers } = useMultiplayer();
  if (!room) return null;
  return (
    <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <div className="panel rounded-md px-4 py-2 flex items-center gap-4">
        <div>
          <div className="font-display text-sm leading-tight">{room.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground tracking-wider">
            CODE: {room.code} · {remotePlayers.size + 1}/{room.max_players}
          </div>
        </div>
        <button
          onClick={leaveRoom}
          className="rounded-md border border-destructive/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/10"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
