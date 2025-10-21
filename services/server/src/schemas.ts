export interface FollowUpPayload {
  items: string[];
  type: "followUpPayload";
  createdAt: number;
}

export interface AgentQuestions {
  query: string;
  type: "agentQuestions";
  createdAt: number;
}
