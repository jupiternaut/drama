# AgentOS Theater Eval

Deterministic acceptance checks for the AgentOS Theater hackathon demo live under `eval/agentos-theater`.

## What It Checks

Each case loads Skill Moments artifacts from:

- `moments.jsonl`
- `critics.jsonl`
- `runs.jsonl`

The oracle checks the demo beats, next-round hooks, media fallback behavior, local actor participation, and the newer theater signals:

- `relationshipEvents`
- `actorStateCards`
- `showQualityIssues`
- `browserQueueSnapshot`

The `homelander-butcher-3run` case is the one-click demo preset guard. It requires at least three runs and adds per-run replay summaries so each round can be reconstructed as:

```text
角色目标 -> 行动 -> 关系变化 -> 下一轮钩子
```

Each `requiredRunSummaries` entry binds that human-readable chain back to structured artifact evidence:

- accepted `beatCompletion` items with evidence
- `relationshipEvents` with actor and reason
- `actorStateCards` with state, label, and reason
- `nextRoundHooks` with kind, actor, and reason
- `browserQueueSnapshot` state/counts for captured, idle, failed, or fallback browser work

Hook expectations are matched as artifact strings. This keeps the eval compatible when another branch adds a new hook kind before shared types are updated here.

## Hackathon Acceptance

Run the focused tests:

```sh
bun test apps/electron/src/main/skill-crew/__tests__/agentos-theater-eval.test.ts apps/electron/src/main/skill-crew/__tests__/agentos-theater-eval-fixtures.test.ts
```

Run the fixture eval CLI:

```sh
bun run eval:agentos-theater
```

Run a specific case:

```sh
bun run scripts/agentos-theater-eval.ts --case media-failure-fallback
```

Run against a real local artifact directory from a theater run:

```sh
bun run scripts/agentos-theater-eval.ts --case homelander-butcher-3run --artifacts /path/to/skill-moments
```

Acceptance is a zero exit code plus all printed checks marked `PASS`. A failure should name the missing beat, hook, relationship event, actor state card, show quality issue, or browser queue snapshot evidence.
