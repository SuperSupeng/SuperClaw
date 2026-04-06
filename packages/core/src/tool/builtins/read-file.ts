import { readFile } from "node:fs/promises";
import type { ToolDefinition } from "@superclaw-ai/types";
import { resolveSafeWorkspacePath } from "./workspace-path.js";

export const definition: ToolDefinition = {
  name: "read-file",
  description:
    "Reads the full text content of a file under the agent workspace directory. Path must be relative (no directory traversal).",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to the workspace root",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  source: "builtin",
};

export async function execute(
  args: Record<string, unknown>,
  ctx: { workspaceRoot: string },
): Promise<{ path: string; content: string }> {
  const abs = resolveSafeWorkspacePath(ctx.workspaceRoot, args.path);
  const content = await readFile(abs, "utf8");
  return { path: args.path as string, content };
}
