import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRpgServerTransport } from "@rpgjs/server/node";
import { WebSocketServer } from "ws";
import { disconnectMirrorIslandPrismaClient } from "./persistence/client.ts";
import { createForumSsoBridge } from "./sso/provider.ts";
import gameServer from "./server.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number.parseInt(process.env.PORT || "3001", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const transport = createRpgServerTransport(gameServer, {
  tiledBasePaths: [join(root, "src", "tiled")],
});
const webSocketServer = new WebSocketServer({ noServer: true });
const forumSsoBridge = await createForumSsoBridge();

/** Writes one fixed text response with explicit status and content type. */
function writeTextResponse(
  response: import("node:http").ServerResponse,
  status: number,
  body: string,
): void {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (await forumSsoBridge.handle(request, response)) return;
  if (request.url === "/health") {
    writeTextResponse(response, 200, "ok");
    return;
  }
  if (request.url?.startsWith("/parties/")) {
    await transport.handleNodeRequest(
      request,
      response,
      () => writeTextResponse(response, 404, "not found"),
      { mountedPath: "/parties" },
    );
    return;
  }
  writeTextResponse(response, 404, "not found");
});

server.on("upgrade", (request, socket, head) => {
  if (request.url?.startsWith("/parties/")) {
    void transport.handleUpgrade(webSocketServer, request, socket, head);
    return;
  }
  socket.destroy();
});

/** Stops accepting traffic and closes WebSocket resources during container termination. */
async function shutdown(): Promise<void> {
  webSocketServer.close();
  server.close();
  await disconnectMirrorIslandPrismaClient();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
server.listen(port, "0.0.0.0", () => {
  console.log(`Mirror Island RPGJS server listening on ${port}.`);
});
