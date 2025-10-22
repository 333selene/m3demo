import { z } from "zod";

export const FollowUpPayloadSchema = z.object({
  items: z.array(z.string().trim()).min(1).max(8),
  createdAt: z.number().int().nonnegative(),
});

export type FollowUpPayload = z.infer<typeof FollowUpPayloadSchema>;
