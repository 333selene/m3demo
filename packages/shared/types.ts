export type FollowUpPayload = {
  items: string[];
  createdAt: number;
};

export type AgentQuestions = {
  text: string;
  createdAt: number;
};

export type ClientToServerMessage = {
  op: "followup:create";
  data: FollowUpPayload;
  id?: string;
};

export type ServerToClientMessage =
  | { op: "ready"; data: { ts: number } }
  | { op: "agent:questions"; data: AgentQuestions; seq: number }
  | { op: "error"; error: string };
