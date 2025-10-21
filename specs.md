Build withFrontend A: Reviewer (React + TypeScript)

    UI: Mic button + optional text fallback.
    Voice capture: Browser SpeechRecognition (Web Speech API) or stubbed recorder; fallback text input is acceptable.
    Normalization: Split on commas, trim, drop empties.
    Action: Send normalized list to the server over WebSocket.
    Status: Show simple sending/ack states.

Frontend B: Participant (React + TypeScript)

    Realtime: Subscribe over WebSocket.
    Display: Render the generated clarifying questions in a lightweight chat/feed.
    Speech: Use speechSynthesis to speak the received questions aloud; prevent overlapping playback.

Backend: Node.js (Fastify) + WebSockets (Socket.IO or ws)

    Endpoints: GET /health -> { ok: true }.
    WS events: receive followup:create (list of items), broadcast agent:questions (final text).
    OpenAI: On followup:create, call OpenAI Chat Completions with a fixed system prompt to turn the items into 2–4 concise, polite clarifying questions (no domain specifics).
    Ordering: Preserve message order; avoid duplicates on reconnect.
    Types: Share strict TS contracts with both clients (no any).

Shared Types

    Package /packages/shared exporting:
    FollowUpPayload { items: string[]; createdAt: number }
    AgentQuestions { text: string; createdAt: number }
    ClientToServerEvents, ServerToClientEvents

Environment / Config

    .env in server: OPENAI_API_KEY=...
    Reject empty lists; cap items (e.g., 8) and total char length (e.g., 300).

Hosting / Deploy (Local-only)

    Run all services on localhost:
    Reviewer: http://localhost:5173
    Participant: http://localhost:5174
    API/WS: http://localhost:3000
    Optional: docker-compose for one-command local run.

Deliverables

    GitHub repo with a top-level README including:
    Setup & scripts (pnpm/yarn workspaces recommended).
    Env vars (sample .env.example).
    How to run Reviewer, Participant, and Server locally.
    Brief note on OpenAI usage (model name, prompt strategy, token caps).
    Monorepo layout (suggested):/apps/reviewer /apps/participant /services/server /packages/shared
    Type-safe event contracts shared across apps.
    A 60–90s screen capture showing the acceptance test.

Acceptance Test (Happy Path)

    Start server and both frontends on localhost.
    Open Participant; it auto-connects to WS and shows “ready”.
    Open Reviewer; press Mic and say: “latency, retry logic, error states”.
    Server calls OpenAI and broadcasts.
    Participant displays and speaks something like:
    “Sorry to circle back — could you help me clarify latency, retry logic, and error states?”
    Send a second list quickly; messages play in order with no overlap.
