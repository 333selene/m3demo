import "dotenv/config";
import fastify from "fastify";
import { RawData, WebSocketServer, WebSocket } from "ws";
import { FollowUpPayload } from "../../../packages/shared/types";
import { FollowUpPayloadSchema } from "./schemas";

const PORT = Number(process.env.PORT ?? 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-nano";

const MAX_TOTAL_CHARS = 300;

const app = fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

let globalSeq = 0;
const seenCreateHashes = new Set<string>();
const ROLLING_LIMIT = 500;

function wsSendError(ws: WebSocket, err: string) {
  try {
    ws.send(JSON.stringify({ op: "error", error: err }));
  } catch {}
}

function broadcast(wss: WebSocketServer, msg: unknown) {
  const str = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(str);
  }
}

async function OpenAPICall(data: FollowUpPayload): Promise<string> {
  const sys = [
    "Please turn short item lists into 2–4 concise, neutral clarifying questions.",
    "Avoid domain specific information. Each question stands alone.",
    "If items look like topics, ask for scope and constraints. Keep under 80 words total.",
  ].join(" ");

  const user = `items: ${data.items.join(", ")}`;

  if (!OPENAI_API_KEY || OPENAI_API_KEY === "temp") {
    const qs = data.items
      .slice(0, 4)
      .map((t) => `can you clarify your expectations around “${t}”?`)
      .join(" ");
    return qs;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 160,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`openai ${res.status}: ${text || res.statusText}`);
  }

  const json = await res.json();
  const out =
    json?.choices?.[0]?.message?.content?.toString().trim() ??
    "could you clarify the items you mentioned?";
  return out;
}

async function handleMessage(
  wss: WebSocketServer,
  ws: WebSocket,
  raw: RawData,
): Promise<void> {
  let msg: unknown;
  try {
    msg = JSON.parse(raw.toString("utf8"));
  } catch {
    wsSendError(ws, "invalid json");
    return;
  }

  const op = (msg as any)?.op;
  if (op !== "followup:create") {
    wsSendError(ws, "unsupported operation");
    return;
  }

  const data = (msg as any)?.data;
  const parsed = FollowUpPayloadSchema.safeParse(data);
  if (!parsed.success) {
    wsSendError(ws, "invalid payload");
    return;
  }

  const payload = parsed.data;

  const totalChars = payload.items.join(",").length;
  if (totalChars > MAX_TOTAL_CHARS) {
    wsSendError(ws, "payload too large");
    return;
  }

  const dedupeKey = `${payload.createdAt}::${payload.items.join("|").toLowerCase()}`;
  if (seenCreateHashes.has(dedupeKey)) {
    return;
  }
  seenCreateHashes.add(dedupeKey);
  if (seenCreateHashes.size > ROLLING_LIMIT) {
    const first = seenCreateHashes.values().next().value;
    seenCreateHashes.delete(first);
  }

  let text: string;
  try {
    text = await OpenAPICall(payload);
  } catch (err: any) {
    wsSendError(ws, String(err?.message ?? err));
    return;
  }

  const message = {
    op: "agent:questions" as const,
    seq: ++globalSeq,
    data: {
      text,
      createdAt: Date.now(),
    },
  };

  broadcast(wss, message);
}

async function start() {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });

    const wss = new WebSocketServer({ server: app.server });

    wss.on("connection", (ws) => {
      ws.send(JSON.stringify({ op: "ready", data: { ts: Date.now() } }));

      ws.on("message", (data) => {
        await handleMessage(wss, ws, data);
      });

      ws.on("error", (err) => app.log.error({ err }, "ws error"));
    });

    const shutdown = async (sig: string) => {
      app.log.info(`${sig} received, shutting down...`);
      for (const client of wss.clients) client.close();
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
