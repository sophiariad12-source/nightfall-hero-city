import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/game/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dead City — NYC Zombie Survival" },
      {
        name: "description",
        content:
          "Survive the streets of a low-poly NYC. Roam by day, fight zombies by night. Level up your gun and blade.",
      },
      { property: "og:title", content: "Dead City — NYC Zombie Survival" },
      {
        property: "og:description",
        content:
          "Roam a low-poly NYC by day, fight zombies by night. Level up your weapons and survive.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Game />;
}
