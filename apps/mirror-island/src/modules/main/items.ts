import type { RpgPlayer } from "@rpgjs/server";
import { beginHouseStakePlacement } from "./house.ts";
import { HOUSE_STAKE_ID } from "./onboarding-contract.ts";

/** Restores RPGJS' eager-consumed item immediately, then lets the transaction remove it only on success. */
function restoreStakeAndStartPlacement(player: RpgPlayer): void {
  if (!player.hasItem(HOUSE_STAKE_ID)) player.addItem(HOUSE_STAKE_ID, 1);
  void beginHouseStakePlacement(player);
}

export const HouseStake = {
  id: HOUSE_STAKE_ID,
  name: "选址木桩",
  description: "站在未来房门南侧并面向北方使用；取消或失败不会消耗。",
  price: 0,
  consumable: true,
  _type: "item" as const,
  /** Defers until RPGJS finishes its built-in eager removal, preserving the stake until a committed build. */
  onUse(player: RpgPlayer) {
    queueMicrotask(() => restoreStakeAndStartPlacement(player));
  },
};
