import assert from "node:assert/strict";
import { test } from "node:test";
import { GuideNpc } from "../src/modules/main/event.ts";

test("guide NPC composes inventory, dynamic tile, save, and dialogue APIs", async () => {
  const calls = [];
  const player = {
    addItem(id, quantity) {
      calls.push(["addItem", id, quantity]);
    },
    getCurrentMap() {
      return {
        tiled: {
          setTile(x, y, layer, tile) {
            calls.push(["setTile", x, y, layer, tile]);
          },
        },
      };
    },
    async save(slot, meta, context) {
      calls.push(["save", slot, meta, context]);
    },
    async showText(message) {
      calls.push(["showText", message]);
    },
  };

  const definition = GuideNpc();
  assert.equal(typeof definition.onAction, "function");
  await definition.onAction.call({}, player);

  assert.deepEqual(calls.slice(0, 3), [
    ["addItem", "Potato", 1],
    ["setTile", 10, 10, "Dynamic", { gid: 178 }],
    ["save", 0, { label: "镜像岛尖峰存档" }, { reason: "manual", source: "guide-npc" }],
  ]);
  assert.equal(calls[3][0], "showText");
  assert.match(calls[3][1], /欢迎来到镜像岛/);
});
