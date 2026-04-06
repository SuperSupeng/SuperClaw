import type { ToolDefinition } from "@superclaw-ai/types";

export const definition: ToolDefinition = {
  name: "get-current-time",
  description:
    "Returns the current date and time as ISO 8601 string and human-readable formats for the server timezone.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  source: "builtin",
};

export async function execute(
  _args: Record<string, unknown>,
  _ctx?: { workspaceRoot: string; allowedDomains?: string[] },
): Promise<{ iso: string; human: string; locale: string }> {
  const now = new Date();
  return {
    iso: now.toISOString(),
    human: now.toString(),
    locale: now.toLocaleString(),
  };
}
