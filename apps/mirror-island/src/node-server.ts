import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRpgServerTransport } from "@rpgjs/server/node";
import { WebSocketServer } from "ws";
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
function shutdown(): void {
  webSocketServer.close();
  server.close(() => process.exit(0));
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
server.listen(port, "0.0.0.0", () => {
  console.log(`Mirror Island RPGJS server listening on ${port}.`);
});
