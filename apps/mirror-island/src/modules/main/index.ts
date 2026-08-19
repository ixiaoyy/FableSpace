import { createModule } from "@rpgjs/common";
import server from "./server.ts";

/** Creates the Mirror Island gameplay module for both client and server runtimes. */
export function provideMain() {
  return createModule("main", [
    {
      server,
    },
  ]);
}
