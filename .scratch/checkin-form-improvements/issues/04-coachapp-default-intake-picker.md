# 04 — Coach app: default intake picker in settings + default badge on forms list

**What to build:** From the coach app's settings surface, a coach chooses which intake form new clients automatically receive, changes it at any time, or clears it to return to the automatic default. The picker offers only active intake-purpose templates, so the coach can never select an archived or check-in template. On the forms list, the current default template is visibly marked, so the coach doesn't have to open settings to remember which one it is. Reads and writes go through the existing business update endpoint.

**Blocked by:** 03 — Backend: business default intake template setting + invite flow.

**Status:** ready-for-agent

- [ ] Settings surface shows the current default intake template (or that none is set)
- [ ] Picker offers only active intake-purpose templates
- [ ] Coach can change the default at any time and clear it back to unset
- [ ] Forms list marks the current default template
- [ ] React Query invalidation lives in the src/api mutation hooks, not at call sites
- [ ] Typecheck and build gates pass (existing frontend gates; no new test seam)
