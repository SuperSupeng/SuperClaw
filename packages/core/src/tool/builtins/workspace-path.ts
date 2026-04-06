import { normalize, relative, resolve } from "node:path";

/**
 * Resolve a user-supplied relative path inside workspaceRoot, rejecting traversal.
 */
export function resolveSafeWorkspacePath(workspaceRoot: string, userPath: unknown): string {
  if (typeof userPath !== "string" || userPath.trim() === "") {
    throw new Error('Invalid path: expected non-empty string');
  }
  const root = resolve(workspaceRoot);
  const normalized = normalize(userPath.replace(/\\/g, "/"));
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error("Path must be relative to the workspace directory");
  }
  const candidate = resolve(root, normalized);
  const rel = relative(root, candidate);
  if (rel === ".." || rel.startsWith(`..${resolve.sep}`) || rel.startsWith("../")) {
    throw new Error("Path escapes workspace directory");
  }
  return candidate;
}
