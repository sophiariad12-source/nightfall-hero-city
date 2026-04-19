import { useEffect, useState } from "react";
import { useMultiplayer } from "./MultiplayerProvider";

interface FeedItem {
  id: string;
  text: string;
  expires: number;
}

export function KillFeed() {
  const { onKillFeed } = useMultiplayer();
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    return onKillFeed((e) => {
      const item: FeedItem = {
        id: `${Date.now()}-${Math.random()}`,
        text: `${e.killerName} 💀 ${e.victimName}`,
        expires: Date.now() + 5000,
      };
      setItems((prev) => [...prev, item].slice(-5));
    });
  }, [onKillFeed]);

  useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => prev.filter((i) => i.expires > Date.now()));
    }, 500);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-20 z-20 space-y-1">
      {items.map((i) => (
        <div
          key={i.id}
          className="rounded-md border border-border bg-black/60 px-3 py-1 font-mono text-xs"
        >
          {i.text}
        </div>
      ))}
    </div>
  );
}
