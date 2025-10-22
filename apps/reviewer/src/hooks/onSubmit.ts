export function formatTranscript(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export type FollowUpPayload = {
  items: string[];
  type: "followUpPayload";
  createdAt: number;
};
export async function submitTranscriptToServer(
  items: string[],
): Promise<Response> {
  const wsUrl = "ws://localhost:3000";
  const data: FollowUpPayload = {
    items: items,
    type: "followUpPayload",
    createdAt: Date.now(),
  };
  const payload = JSON.stringify(data);

  return new Promise<Response>((resolve) => {
    let settled = false;
    const ws = new WebSocket(wsUrl);

    const settle = (body: string, status = 200) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {}
      resolve(
        new Response(body, {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    const timer = setTimeout(() => {
      settle(
        JSON.stringify({ ok: true, note: "sent, no reply within timeout" }),
        202,
      );
    }, 3000);

    ws.onopen = () => {
      ws.send(payload);
    };

    ws.onmessage = (ev) => {
      clearTimeout(timer);
      settle(
        typeof ev.data === "string" ? ev.data : JSON.stringify({ ok: true }),
      );
    };

    ws.onerror = () => {
      clearTimeout(timer);
      settle(JSON.stringify({ ok: false, error: "websocket error" }), 500);
    };

    ws.onclose = () => {
      if (!settled) {
        clearTimeout(timer);
        settle(JSON.stringify({ ok: true, note: "closed without reply" }), 204);
      }
    };
  });
}

export const onSubmit = async (transcript: string): Promise<string> => {
  const formatted = formatTranscript(transcript);
  try {
    const resp = await submitTranscriptToServer(formatted);
    const text = await resp.text();
    console.log(text);
    return text || JSON.stringify({ ok: true });
  } catch (err) {
    console.error("submit failed", err);
    return JSON.stringify({ ok: false, error: "submit failed" });
  }
};
