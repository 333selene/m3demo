import fastify from "fastify";
import { WebSocketServer } from "ws";
import { FollowUpPayload } from "./schemas";

const PORT = Number(process.env.PORT ?? 3000);

const app = fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

const openAiKey = process.env.OPENAI_API_KEY ?? "temp";
const openAiModel = "gpt-4.1-nano";

async function OpenAPICall(data: FollowUpPayload): Promise<string> {
  void data;
  return "";
}

async function start() {
  try {
    await app.listen({ port: PORT });

    const wss = new WebSocketServer({
      server: app.server,
    });

    wss.on("connection", (ws) => {
      ws.send("message from server");

      ws.on("message", (data) => {
        app.log.info(`received from client: ${data}`);
        ws.send(`echo: ${data}`);
      });

      ws.on("error", (err) => app.log.error(err));
    });

    const shutdown = async (sig: string) => {
      app.log.info(`${sig} received, shutting down...`);
      wss.clients.forEach((client) => client.close());
      wss.close(() => app.log.info("ws closed"));
      await app.close();
      process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
