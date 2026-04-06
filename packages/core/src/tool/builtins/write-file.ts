import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ToolDefinition } from "@superclaw-ai/types";
import { resolveSafeWorkspacePath } from "./workspace-path.js";

export const definition: ToolDefinition = {
  name: "write-file",
  description:
    "Writes text content to a file under the agent workspace directory, creating parent directories if needed. Path must be relative (no directory traversal).",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to the workspace root",
      },
      content: {
        type: "string",
        description: "Full file content to write",
      },
    },
    required: ["path", "content"],
    additionalProperties: false,
  },
  source: "builtin",
};

export async function execute(
  args: Record<string, unknown>,
  ctx: { workspaceRoot: string },
): Promise<{ path: string; bytesWritten: number }> {
  const content = typeof args.content === "string" ? args.content : String(args.content ?? "");
  const abs = resolveSafeWorkspacePath(ctx.workspaceRoot, args.path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf8");
  return { path: args.path as string, bytesWritten: Buffer.byteLength(content, "utf8") };
}
