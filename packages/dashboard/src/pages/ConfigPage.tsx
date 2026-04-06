import { useEffect, useState } from "react";
import { fetchConfig } from "../api/client";

function JsonSyntax({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  // Simple syntax highlighting without dangerouslySetInnerHTML
  const lines = json.split("\n");

  return (
    <pre className="text-sm leading-relaxed">
      <code>
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            {colorize(line)}
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

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-auto max-h-[80vh]">
        <JsonSyntax value={config} />
      </div>
    </div>
  );
}
