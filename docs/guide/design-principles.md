# Design Principles

SuperClaw is built on six principles that shape every architectural decision.

## 1. Hourglass Principle

Humans are the bottleneck, not agents. The framework distinguishes two decision types:

- **Type 1 (irreversible)** — requires human approval before execution (e.g., deploying to production, sending external emails).
- **Type 2 (reversible)** — agents execute autonomously and report after the fact (e.g., creating a draft PR, updating a ticket).

Configure per-agent in `superclaw.config.ts`:

```ts
agent: {
  approvalPolicy: {
    type1: "human-in-the-loop",
    type2: "auto"
  }
}
```

The goal: maximize agent throughput while keeping humans in control of what matters.

## 2. Ball Possession

Every agent response must include `nextActions` — a list of suggested follow-ups. There is no "dead end" in a conversation. The ball is always in someone's court.

```json
{
  "result": "PR #42 created",
  "nextActions": [
    { "action": "review-pr", "target": "reviewer-agent" },
    { "action": "notify", "target": "channel-slack", "message": "PR ready for review" }
  ]
}
```

This keeps workflows flowing without human prompting at every step.

## 3. Signal Protocol

Agents communicate asynchronously via Signals. Each Signal has:

- A **sender** and **receiver** (agent or team).
- A **type** (`request`, `response`, `broadcast`).
- An **SLA** — a deadline by which the receiver must respond.

```ts
signal.send({
  to: "qa-agent",
  type: "request",
  payload: { task: "run-e2e", pr: 42 },
  sla: "10m"
});
```

If the SLA expires, the system escalates automatically (retry, fallback agent, or human alert).

## 4. Layered Loading

Agents boot through an 8-step sequence that progressively loads context:

1. **SOUL** — identity, role, personality
2. **COMPANY-STATE** — org-wide context (company goals, current quarter priorities)
3. **RULES** — hard constraints and policies
4. **TOOLS** — available CLI tools and APIs
5. **BINDINGS** — channel subscriptions
6. **MEMORY** — long-term knowledge
7. **HEARTBEAT** — recent activity feed
8. **TASK** — the current request

Each layer is loaded only when needed. An agent handling a simple CLI command may skip COMPANY-STATE entirely.

## 5. Memory Decay

Not all memories are permanent. Each memory entry has a `valid_until` timestamp.

```ts
memory.store({
  key: "deploy-freeze",
  value: "No deploys until 2026-04-10",
  valid_until: "2026-04-10T00:00:00Z"
});
```

Expired memories are not deleted — they are consolidated by the **autoDream** process, which runs periodically to:

- Archive expired entries.
- Merge related memories into summaries.
- Promote frequently accessed short-term memories to long-term.

This prevents context bloat without losing institutional knowledge.

## 6. Challenge Directive

Agents are expected to flag inconsistencies between stated values and actual actions. If a team says "quality first" but keeps skipping code review, the agent should surface that contradiction.

```ts
agent: {
  challengeDirective: true,
  challengeThreshold: "medium" // low | medium | high
}
```

At `medium` threshold, the agent will raise a concern when it detects a pattern (not a one-off). At `high`, it flags every instance.

This is opt-in per agent and designed for coaching, not enforcement.
