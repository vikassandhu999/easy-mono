All six calls are correct. Quick confirmations with a note on one edge case:

**Q1. Client cannot edit their own goal — exclude from `@self_update_cast_fields`.** Correct. The self-update cast already only has `[:first_name, :last_name, :phone]`; keep it that way. Goal is the coach's lever — if the client could change it, the coach loses their most important tool for motivating adherence to the phase. The client changing their own goal mid-cut to "+5 kg because I gave up" defeats the entire coaching relationship.

**Q2. GET response includes the goal — yes, intended.** The client needs to see the goal line on their chart; that's core to the UX. Seeing ≠ setting. Include it.

**Q3. DELETE scoped by both `business_id` AND `client_id` — yes.** Standard tenant isolation plus ownership. The client's JWT carries both claims; both must match. 404 on mismatch (not 403 — don't reveal that the entry exists in some other context). Same scoping applies to the upsert path resolution when checking for an existing entry on that date.

**Q4. Coach list shape — same as client PLUS `adherence`.** Yes. Structure:

```json
{
  "entries": [...],
  "goal": {...},
  "summary": {...},
  "adherence": { "logged_days": 22, "window_days": 30 }
}
```

One note on `adherence`: compute over the last 30 days ending today (not "last 30 entries" or "since plan start"). Coaches want "is this client logging consistently right now?" not a lifetime average. Formula: count of distinct `date` values in the window where `entry.date >= today - 29 days AND entry.date <= today`.

**Q5. `date` required in payload — correct.** Frontend always sends it. The client device has local timezone knowledge the server doesn't. Server never infers "today."

Validation: `Date.from_iso8601/1` → `{:error, :invalid_format}` → 422 with a clear message. Also reject future dates — `date > Date.utc_today() + 1 day` should be rejected (the `+ 1 day` buffer accounts for clients in timezones ahead of server UTC). A client in India logging late Sunday night is still Sunday or Monday local, never Wednesday.

**Q6. Ecto.Enum handles string casts — correct.** `"kg"` / `"lbs"` on the wire, atoms in the schema. Ecto's changeset cast does this natively. Invalid → 422 via the existing changeset error path. No custom parsing needed.

---

**One thing the spec didn't spell out that you should decide now before implementing:**

**Q7 (from me): When the goal is unset, what does the JSON response return?**

Two reasonable options:
- `"goal": null`
- `"goal": { "value": null, "unit": null }`

Pick **`"goal": null`**. Cleaner to check in the frontend (`if (response.goal)` instead of `if (response.goal && response.goal.value)`). Matches how null-able nested objects typically behave in REST APIs. The controller can render it as `if client.goal_weight_value, do: %{value: ..., unit: ...}, else: nil`.

**Q8 (from me): What happens if `value` is 0 or negative?**

The changeset validator (`validate_number(:value, greater_than: 0, less_than: 1000)`) rejects both. Zero is nonsensical. Negatives are nonsensical. Upper bound of 1000 catches typos like "9140" when they meant "91.4" — no human weighs 914 kg. 422 with a readable message: "Weight must be between 0 and 1000." Same check applies to goal_weight_value.

You're ready to execute. Ship it.