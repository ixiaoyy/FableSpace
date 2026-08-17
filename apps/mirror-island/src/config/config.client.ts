import { Animation, Direction } from "@rpgjs/common";
import { provideClientGlobalConfig, provideClientModules } from "@rpgjs/client";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import { provideMain } from "../modules/main/index.ts";

/** Maps the reviewed 4-column direction by 7-row action sheet into RPGJS stand/walk textures. */
function mirrorIslandSpritesheet() {
  /** Resolves one RPGJS direction into the reviewed source-sheet column. */
  const directionColumn = (direction: Direction): number => ({
    [Direction.Down]: 0,
    [Direction.Up]: 1,
    [Direction.Left]: 2,
    [Direction.Right]: 3,
  })[direction] ?? 0;

  /** Returns the single idle frame for one direction. */
  const stand = (direction: Direction) => [{
    time: 0,
    frameX: directionColumn(direction),
    frameY: 0,
  }];
  /** Returns the four walking frames plus RPGJS' terminal duration marker. */
  const walk = (direction: Direction) => {
    const frames = [0, 1, 2, 3].map((frameY) => ({
      time: frameY * 10,
      frameX: directionColumn(direction),
      frameY,
    }));
    return [...frames, { time: 40 }];
  };

  return {
    framesWidth: 4,
    framesHeight: 7,
    textures: {
      [Animation.Stand]: {
        animations: ({ direction }: { direction: Direction }) => [stand(direction)],
      },
      [Animation.Walk]: {
        animations: ({ direction }: { direction: Direction }) => [walk(direction)],
      },
    },
  };
}

export default {
  providers: [
    provideTiledMap({
      basePath: "map",
    }),
    provideClientGlobalConfig(),
    provideMain(),
    provideClientModules([
      {
        spritesheets: [
          {
            id: "hero",
            image: "spritesheets/hero.png",
            ...mirrorIslandSpritesheet(),
          },
          {
            id: "female",
            image: "spritesheets/female.png",
            ...mirrorIslandSpritesheet(),
          },
        ],
      },
    ]),
  ],
};
