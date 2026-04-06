import { useEffect, useState } from "react";
import { fetchConfig } from "../api/client";

function JsonSyntax({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  const lines = json.split("\n");

  return (
    <pre className="text-sm leading-relaxed">
      <code>
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="select-none text-right text-gray-600 font-mono text-xs w-8 shrink-0 pr-3 border-r border-gray-800 mr-4">
              {i + 1}
            </span>
            <span className="whitespace-pre">{colorize(line)}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}

function colorize(line: string) {
  // Match key-value patterns
  const match = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)/);
  if (!match) {
    return <span className="text-gray-300">{line}</span>;
  }

  const [, indent, key, colon, rest] = match;
  return (
    <>
      <span className="text-gray-500">{indent}</span>
      <span className="text-claw-400">"{key}"</span>
      <span className="text-gray-500">{colon}</span>
      <ValueSpan value={rest} />
    </>
  );
}

function ValueSpan({ value }: { value: string }) {
  const trimmed = value.replace(/,\s*$/, "");
  const trailing = value.slice(trimmed.length);

  if (trimmed.startsWith('"')) {
    return (
      <>
        <span className="text-green-400">{trimmed}</span>
        <span className="text-gray-500">{trailing}</span>
      </>
    );
  }
  if (trimmed === "true" || trimmed === "false" || trimmed === "null") {
    return (
      <>
        <span className="text-yellow-400">{trimmed}</span>
        <span className="text-gray-500">{trailing}</span>
      </>
    );
  }
  if (/^-?\d/.test(trimmed)) {
    return (
      <>
        <span className="text-purple-400">{trimmed}</span>
        <span className="text-gray-500">{trailing}</span>
      </>
    );
  }
  return <span className="text-gray-300">{value}</span>;
}

export function ConfigPage() {
  const [config, setConfig] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail in some contexts
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Current running configuration (read-only, secrets masked)</p>
      </div>
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-auto max-h-[80vh]">
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 transition-colors z-10"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <JsonSyntax value={config} />
      </div>
    </div>
  );
}
