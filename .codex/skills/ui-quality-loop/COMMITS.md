# Commit rules (authorized runs only)

Reached from [SKILL.md](SKILL.md) when the user has explicitly authorized
commits for the run.

- One commit per coherent root-cause group: shared component, theme seam, or complete interaction flow — never per screenshot, route, CSS property, or tiny follow-up, and never unrelated defects bundled into one giant commit.
- Commit once the group compiles and renders so work cannot be lost; amend only the latest unpushed agent-owned commit until its verification is green.
- Stage explicit paths only (no `git add -A`); leave baseline-dirty files unstaged.
- State the cause, affected routes/states, and validation in the commit body.
- After the branch passes its full audit, present the commit list and diff; prefer a squash merge so the target branch gets one clean commit while the audit branch keeps reversible checkpoints.
