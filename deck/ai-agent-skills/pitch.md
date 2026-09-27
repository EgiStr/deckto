# Pitch — What AI agent skills are, and what you can build with them

## Master intent
Make engineers leave understanding what a skill actually is mechanically, and install or write their first one this week.

## Question framework
- **A. Goal**: Educate + drive adoption. Audience should be able to explain a skill in one sentence and ship a working first skill within the week. No approval to request — this is a knowledge + adoption session.
- **B. Audience**: Developer / engineering team. Fluent in agents, prompts, context windows; many have used MCP servers. Skepticism to overcome: "another prompt-wrapper layer", "another thing to maintain", "vendor lock-in".
- **C. Idea core**: Skills replace the specialized-agent arms race. Instead of building a customer-service agent, a research agent, a code agent, you keep ONE general-purpose agent and give it a library of folders it loads on demand. Why now: Anthropic published SKILL.md as an open standard on 2025-12-18 and competitors adopted it within 48 hours — the format stopped being proprietary. Evidence: Anthropic engineering blog + platform docs (three-level token table), corroborated by a VentureBeat interview and independent adoption trackers.
- **D. Data readiness**: Ready for mechanism and format facts (primary sources: Anthropic engineering blog and platform docs). Gaps: no org-internal adoption data — do not claim team-level numbers anywhere.
- **E. Assets**: Generate. SVG diagram strips produced by a generator script; no brand kit exists. Theme derived and contrast-validated with `deckto theme`, then locked in design-spec before build.
- **F. Constraints**: 10–12 slides, live presentation to an engineering team, technical depth expected — show the actual YAML, the actual token costs, the actual install command.

## Unknowns (recorded, never silently filled)
- Team's existing skill usage — unknown; assume zero and verify live
- Exact time slot — unknown; sized for 10–12 slides as confirmed
- Whether their stack is Claude Code vs Codex vs Cursor — unknown; the deck must show portability rather than assume one tool

## Success criteria
- Audience can state what a skill is, its three disclosure levels with real token costs, and where it runs
- At least one engineer installs or writes a skill within the week
- Every number on a slide traces to a cited source, not to memory
