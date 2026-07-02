<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Session protocol (read before any change)

1. Read `docs/CONTEXT.md` end-to-end before touching anything.
2. For any frontend decision, also read `~/.opencode/skills/taste-skill/SKILL.md` (or this repo's mirrored path under `.opencode/skills/taste-skill/`).
3. Run `npm run verify:deploy` before any deploy.
4. Do not use emojis or em-dashes anywhere visible to the user.
5. End every session by appending to the "Last session log" section of `docs/CONTEXT.md`.
5a. Before ending the session, run `npm run graphify:update` (which calls `graphify update .`) so the knowledge graph at `graphify-out/` reflects every code change made this session. The graph ships with the repo from commit to commit.
5b. If the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before answering, and refresh the graph first if it has not been touched in 5+ commits since HEAD.
5c. Read `docs/SESSION-TODO.md` at the start of every session.
    For each entry with Status @todo / @inprogress / @blocked,
    decide: close, continue, split, or escalate. End the session
    by appending a session-end summary (closed + opened +
    severity-bumped). Every shipped code change is traceable
    through a TS-ID that closes on the matching commit OR
    carries a justification line in an active block.
    `docs/SESSION-TODO.md` is the structured gate;
    `docs/CONTEXT.md` §9 remains the prose narrative.
<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
