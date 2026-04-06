import type { ToolDefinition } from "@superclaw-ai/types";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BODY_CHARS = 512_000;

export const definition: ToolDefinition = {
  name: "web-fetch",
  description:
    "Fetches a URL over HTTP(S) and returns the response body as text (truncated if very large). Optional timeout in milliseconds.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "HTTP or HTTPS URL to fetch",
      },
      timeoutMs: {
        type: "number",
        description: `Timeout in milliseconds (default ${DEFAULT_TIMEOUT_MS})`,
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
  source: "builtin",
};

function hostAllowed(hostname: string, allowedDomains?: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  const h = hostname.toLowerCase();
  for (const rule of allowedDomains) {
    const r = rule.toLowerCase().replace(/^\*\./, "");
    if (h === r || h.endsWith(`.${r}`)) return true;
  }
  return false;
}

export async function execute(
  args: Record<string, unknown>,
  ctx: { allowedDomains?: string[] },
): Promise<{
  url: string;
  status: number;
  contentType: string | null;
  body: string;
  truncated: boolean;
}> {
  const urlStr = typeof args.url === "string" ? args.url.trim() : "";
  if (!urlStr) {
    throw new Error("url is required");
  }
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (!hostAllowed(url.hostname, ctx.allowedDomains)) {
    throw new Error(`Host "${url.hostname}" is not allowed by agent sandbox.allowedDomains`);
  }

  const timeoutMs =
    typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs) && args.timeoutMs > 0
      ? Math.min(args.timeoutMs, 120_000)
      : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "SuperClaw-agent/0.1" },
    });
    const raw = await res.text();
    const truncated = raw.length > MAX_BODY_CHARS;
    const body = truncated ? raw.slice(0, MAX_BODY_CHARS) : raw;
    return {
      url: url.href,
      status: res.status,
      contentType: res.headers.get("content-type"),
      body,
      truncated,
    };
  } finally {
    clearTimeout(timer);
  }
}
