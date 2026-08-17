import { createModule } from "@rpgjs/common";
import server from "./server.ts";

/** Creates the isolated Mirror Island spike module for both client and server runtimes. */
export function provideMain() {
  return createModule("main", [
    {
      server,
    },
  ]);
}
