import type { RpgPlayer, RpgPlayerHooks } from "@rpgjs/server";

let connectionOrdinal = 0;

/** Returns alternating nearby spawn positions so simultaneous players are immediately distinguishable. */
function nextSpikeSpawn(): { x: number; y: number } {
  const x = connectionOrdinal % 2 === 0 ? 280 : 320;
  connectionOrdinal += 1;
  return { x, y: 300 };
}

export const player: RpgPlayerHooks = {
  async onConnected(player: RpgPlayer) {
    player.name = `岛民-${player.id.slice(-4)}`;
    player.setGraphic("hero");
    await player.changeMap("simplemap", nextSpikeSpawn());
  },
  onInput(player: RpgPlayer, { action }) {
    if (action === "escape") {
      player.callMainMenu();
    }
  },
};
