# Segmented client triage rail / unified coach inbox — mechanics research

**Research date:** 2026-08-04
**Status:** Complete. All sources accessed 2026-08-04 unless the source states its own date.
**Audience:** Product and engineering, feeding a UX spec.

**Concept under investigation:** a vertical rail of workflow segments in the coach app —
e.g. "Recently Added", "Missed for 2 days", "Expiring Soon", "Needs Programming",
"Check-in Submissions" — potentially absorbing the Messages tab into a single workflow surface.

**Headline findings:**

1. The proposed segment taxonomy is **industry consensus, not a bet** — "Needs Programming" is
   Everfit's literal segment name and "Missed for 2 days" is CoachRx's "Missed 2+ Workouts in a Row".
2. **Absorbing Messages is contradicted by every product surveyed**, fitness and adjacent alike,
   including Linear, which deliberately runs Triage and Inbox as two surfaces.
3. The hard problems are **definitional, not navigational**: count missed *scheduled sessions* not
   calendar days; define programming as a *lookahead* not a lapse; prefer *deltas* over *levels*; and
   give every segment a real exit.

## How this document relates to the 2026-07-25 research

[`2026-07-25-client-triage-messaging-research.md`](2026-07-25-client-triage-messaging-research.md)
already established the **market and evidence** picture: who ships triage-style rosters, pricing,
churn literature, and voice-of-customer. It concluded that the problem is validated, that Everfit's
Check-in Dashboard is close prior art, and that removing the Messages destination is **contradicted**
by the dominant product pattern.

This document deliberately does **not** re-litigate that. It covers the layer the earlier document
left thin — the **mechanics** of triage surfaces:

- what the segments/queues literally ARE, with exact documented names;
- how counts and badges behave;
- what clicking a queue item does (deep-link vs inline action vs preview pane);
- how an item LEAVES a queue (auto-resolve, manual dismiss, state transition, or never);
- the adjacent-domain triage canon (Front, Intercom, Superhuman, Linear, Gmail, GitHub);
- the UX principles that govern queue design, with primary citations.

Where the two documents disagree, the earlier one is authoritative on market/evidence claims and this
one on interaction mechanics.

## Source-access limitations (read this before trusting a citation)

- **`help.trainerize.com` returns HTTP 403 to automated fetching** (Cloudflare bot protection). Every
  Trainerize help-centre claim below was recovered from Google's indexed excerpt of the same
  first-party URL, not a full page read. The URL is first-party; the *completeness* of each list is
  not guaranteed. Claims resting on excerpts are marked **[excerpt]**.
- `help.truecoach.co`, `help.everfit.io`, `linear.app`, `help.front.com`, `intercom.com/help`,
  `docs.github.com` and `support.google.com` fetched cleanly.
- Anything not confirmed in a fetched or indexed first-party page is written as **NOT VERIFIED**.
  No behaviour has been inferred and presented as documented.

---

# Part 1 — Fitness coaching platforms

## ABC Trainerize

### The attention surface: "Auto Client Tags"

Trainerize's triage surface is not a dashboard feed but a **computed tag system applied to client
rows**, documented as "Auto Client Tags — Attending To Clients Needing Attention". Tags are
colour-coded by urgency.
[Auto Client Tags](https://help.trainerize.com/hc/en-us/articles/208689156-Auto-Client-Tags-Attending-To-Clients-Needing-Attention) **[excerpt]**

| Colour | Tag / condition (verbatim where recovered) |
|---|---|
| **Red (urgent)** | "Haven't set up account" — client has not completed account setup within **3 days** of being added |
| **Red** | "Main program expired" |
| **Red** | "Add-on program expired" |
| **Orange (less urgent)** | Failing payments — "a client's latest invoice attempt has failed" |
| **Orange** | Client has not signed in for **more than 7 days** |
| **Grey** | "do not require immediate attention but are useful for monitoring client accounts" — individual grey tag names **NOT VERIFIED** |

A separate article documents **Program Auto-Tags**: "Main program expiring", "Add-on program
expiring", "Main program Expired", "Add-on program Expired", applied as a training phase ends.
Clients on on-demand programs are excluded from this tagging.
[Program Auto-Tags](https://help.trainerize.com/hc/en-us/articles/17504985272852-What-are-Program-Auto-Tags-and-How-Can-I-Use-Them) **[excerpt]**

Workout and nutrition **compliance** also drive auto-tags, applied "based on weekly performance".
[Measuring compliance with Auto Client Tags](https://help.trainerize.com/hc/en-us/articles/360001219886-How-to-Measure-Workout-and-Nutrition-Compliance-with-Auto-Client-Tags) **[excerpt]**

**Design reading:** Trainerize's segments are *reasons attached to clients*, not separate queues. The
client list stays one list; tags are the filter dimension.

### Segmentation mechanics

Filtering is via the Clients tab → **"ADD FILTER"** dropdown → **"By Tag"** (covers both auto-tags and
custom tags), plus a **"By Type"** filter (e.g. "Trial Client"). Custom Client Tags are a parallel
manually-applied system.
[Custom Client Tags](https://help.trainerize.com/hc/en-us/articles/360000653563-What-are-Custom-Client-Tags-and-How-Do-I-Use-Them) **[excerpt — body not verified]**

There is **no documented "saved view" or "smart list" object** — segmentation is ad-hoc
filter-by-tag, not a nameable, persistable query. NOT VERIFIED that saved views exist.

### Compliance and engagement

Two engagement metrics are documented: **"sign-ins per week"** and **"workouts per week"**, each
"calculated as the average number of [sign-ins/workouts] for the client in the week prior", visible
from the Clients page and an "engagement tab" on the client page. Trendlines are reviewable for up to
3 years, and the post cites a 75–90% "sweet spot" compliance range. Managers can see average
engagement and compliance per trainer.
[Trainerize compliance & engagement metrics](https://www.trainerize.com/blog/trainerize-update-drive-client-and-trainer-results-with-compliance-and-engagement-metrics/) (first-party blog)

A newer **"Insights Dashboard" (Early Access)** exists at the *client* level (reached from a client's
Progress tab, or the Insights icon beside a client's name), with three areas: **"Weekly Compliance"**
("a color-coded quick view of a client's completion rate of habits, nutrition goals, and workouts
throughout the week"), **"Activity"** ("a breakdown of clients' recently completed activities"), and
per-metric widgets with an average trend line. Clicking a widget "opens a more detailed graph within
the corresponding section of the client's Progress tab" — i.e. **deep-link, not inline action**.
[Client Insights Dashboard](https://help.trainerize.com/hc/en-us/articles/46648417703956-Using-the-Client-Insights-Dashboard-Early-Access) **[excerpt]**

Note this is a **per-client** dashboard, not a roster-level triage feed. Trainerize's roster-level
triage remains the tag system.

### Messaging

A dedicated top-level **"Messages"** tab (left-hand web menu; Messages icon in the mobile bottom nav)
— a cross-client surface, not confined to client detail. Supports real-time in-app/web messaging,
typing indicators, attachments, video and voice messages **[excerpt]**. Group messages and mass
messaging are separate documented features.
[Mass messaging](https://help.trainerize.com/hc/en-us/articles/360000359286),
[Group messages](https://help.trainerize.com/hc/en-us/articles/23608440326164-How-To-Create-a-Group-Message-With-Clients-and-Trainers) **[excerpt]**

**Trainerize keeps Messages as its own destination alongside the tagged client list.**

### Counts, badges, and queue exit

- In-app notifications exist and are described as behaving "like WhatsApp or Facebook Messenger";
  coaches configure which in-app/email notifications they receive under **My Account → Notifications**.
  [Notification settings](https://help.trainerize.com/hc/en-us/articles/208688826-Managing-General-Notification-and-Auto-Message-Settings) **[excerpt]**
- A **weekly "client needing attention" summary** notification is referenced; delivery channel and
  exact contents **NOT VERIFIED**.
- **How a tag is removed is NOT documented in any accessible source.** Because these are computed
  tags rather than an event log, they are structurally auto-resolving (the tag stops applying when the
  condition clears), but no first-party sentence states this. Treat as **NOT VERIFIED**.
- No coach-facing **task/to-do object** is documented. "Auto Messages and Events" (Settings → Auto
  Messages and Events) automates *client-facing* messages on triggers such as "new client added"; the
  full trigger list is **NOT VERIFIED**.
  [Business-level automated messages](https://help.trainerize.com/hc/en-us/articles/360035040012-Business-level-Automated-Messages-and-Events) **[excerpt]**

### Tier gating

**NOT VERIFIED.** No first-party pricing comparison table was successfully fetched confirming which
tier unlocks Auto Client Tags or the Insights Dashboard.

---

## TrueCoach

### The dashboard is the triage surface

TrueCoach puts triage on the **login screen**. Its first-party feature page names the sections:

- **"Dashboard Notifications"** — the first screen on login, showing "workouts, reminders, due soon,
  needs attention, and client comments"
- **"Workouts and Reminders"** — workouts sorted by client type ("in-person, dual (in-person +
  remote), and remote-only")
- **"Due Soon"** — "alerts when a client's current program is nearing its end"
- **"Needs Attention"**
- **"Quickview"** — overall compliance rate across the client portfolio

[TrueCoach Dashboard feature page](https://truecoach.co/features/dashboard/) (first-party marketing)

### "Needs Attention" has exactly one documented trigger

This is the most precisely documented triage rule found in any fitness product:

> "These percentages are calculated by number of exercises completed vs. number of exercises assigned
> in that time frame."

> "If a client has a sudden drop in compliance (-20%) in any of the three rates, we'll flag these for
> you and put them under **Needs Attention**."

[Compliance rates](https://help.truecoach.co/en/articles/2403738-compliance-rates) (fetched directly)

The three rates are **7-day, 30-day and 90-day**, computed simultaneously. Compliance is **coach-only
intel**: "Your clients do not have access to their compliance rates, so you have the freedom to
communicate this information with them as you see fit."
[Compliance tracking](https://truecoach.co/features/compliance-tracking/)

**How a client leaves "Needs Attention" is not stated.** The article explicitly does not cover
removal — verified by direct fetch. Structurally it is a recomputed derived view, but that is
inference, not documentation.

**Design reading worth stealing:** the segment is defined by a **delta, not a level**. "Compliance
dropped 20 points" is a different and more actionable signal than "compliance is below 60%", because
the second one permanently contains the same chronically-low clients while the first one clears
itself.

### Segmentation mechanics

Documented sort/filter options on the client list:

| Control | Behaviour (documented) |
|---|---|
| **Name** | alphabetical A–Z |
| **Due Date** | sorts by next workout due date, "to focus on clients who need your attention first" |
| **Compliance Rate** | 7/30/90-day exercise-completion percentage |
| **Client Type** | filter by "Remote, Dual, or In-Person" |
| **Groups** | "Organize your clients into groups for quick messaging, program assignment, and segmenting your dashboard feed" |
| **Status** | Active vs **"Archived"** ("Archive clients do not count toward your plan limit") |

Per-row quick actions: **Chat**, **Edit**, **Transfer Client**.
[Managing your clients](https://help.truecoach.co/en/articles/2403919-managing-your-clients)

Note "Groups ... segmenting your dashboard feed" — groups are a *cross-cutting* filter that also
reshapes the triage surface. No saved-view object; **NOT VERIFIED** that saved queries exist.

### Messaging — and the one genuinely unified inbox in this cohort

TrueCoach's inbox is the most interesting messaging finding, because it is **not messages-only**:

- Reached via a **message icon in the bottom-left** — a persistent cross-client surface.
- "Coaches can mark messages and activities as **read/unread** to keep track of what they still need
  to review and respond to."
- The inbox can be **filtered to unread-only**, and that filter covers **"messages, workout results
  and comments"**.

[Messaging your clients](https://help.truecoach.co/en/articles/2403915-messaging-your-clients)

So TrueCoach already ships a partial version of the concept under investigation: a single unread
queue spanning conversation *and* client activity. It did **not** do the reverse — it did not
dissolve messaging into the client roster; it **absorbed activity into the inbox**.

Coach notification types are documented as: "When a client sends a message", "When a client comments
on a workout", and a **"Total unread notifications alert"** bundling "workout completions, metric
updates, progress photo uploads, video uploads, etc." at a coach-configurable interval (e.g. hourly).
[Coach's notification settings](https://help.truecoach.co/en/articles/2403627-coach-s-notification-settings)

### Click-through behaviour

- Clicking a client name anywhere on the dashboard deep-links to that client's profile/program.
- Each listed workout on the dashboard is clickable "without navigating away from the Dashboard" —
  implying inline expansion; exact modal-vs-inline mechanics **NOT VERIFIED**.
- Quick-connect icons beside a flagged client open message/profile/edit **directly from the
  dashboard**.

[Dashboard](https://truecoach.co/features/dashboard/)

### Tasks and automation

No coach-facing task object is documented. **"Automation"** is marketed as gated to **"Standard+"**
plans and is client-facing (onboarding emails, check-ins, reminders, "automated follow-ups ... sent
if clients have missed a workout or two").
[Automation](https://truecoach.co/blog/the-power-of-automation-save-time-and-scale-your-coaching-business/)
Whether compliance tracking itself is tier-gated is **NOT VERIFIED**.


---

## Everfit

Everfit is the closest breadth competitor and the one the 2026-07-25 research called
"closest direct prior art". The mechanically important finding here is that **Everfit's triage
primitive is a saved filter over the client list, not a task queue.**

### Segments — the exact default set

Everfit ships five **default segments**, and one of them is almost the exact name under
consideration:

| Segment (verbatim) | Documented condition |
|---|---|
| **"Connected"** | client fully connected via account |
| **"Pending"** | invited, hasn't created an account |
| **"Offline"** | created but not yet invited |
| **"Need Programming"** | the client's "last assigned workout was less than 3 days away" |
| **"Waiting Activation"** | signed up via invite link/package after the coach ran out of client seats |

[Client list — how to use segments](https://help.everfit.io/en/articles/5608080-client-list-how-to-use-segments),
[Client list — filter and segment clients](https://help.everfit.io/en/articles/3365958-client-list-filter-and-segment-clients)

**"Need Programming" is direct prior art for the proposed "Needs Programming" segment**, and its
definition is instructive: it is a *lookahead* ("runs out within 3 days"), not a *lapsed* state
("has no plan"). A lookahead definition keeps the queue drainable — you can act before the client
is affected — whereas a lapsed definition means the queue only fills after you have already failed.

### Custom segments: the filter fields

Custom segments are built from these documented fields:

- **Training type / Category**: "Online", "In-person", "Hybrid"
- **Account status**: "Connected", "Pending", "Offline"
- **Owner** (gym managers only): individual trainer or all trainers
- **Groups**: workspace-wide custom tags, shared across the team

Segments can be marked **"Shared"** across the workspace via a sharing dropdown, and client-list
columns are user-customisable.
[Segments](https://help.everfit.io/en/articles/5608080-client-list-how-to-use-segments)

Note the filter vocabulary is **lifecycle and taxonomy**, not behaviour: there is no documented
"missed N workouts" or "hasn't logged in for N days" *segment filter field* in these two articles.
The behavioural triage lives in the separate Check-in Dashboard documented in the 2026-07-25
research (At Risk, Needs Attention, On Track, Program Ending, No Activity, Forms to Review, Review
Completed, Paused). **Everfit therefore runs two parallel triage surfaces** — lifecycle segments on
the client list, and behavioural risk buckets on the check-in dashboard.

### Inbox

Messenger-style layout, real-time web + app chat, reply-to-specific-message, up to 5 media files per
message, group chats, and Studio-plan **Broadcast Messages**. The only documented unread mechanic is
**manual "mark as unread"** via the "..." menu. Automatic unread-badge counting is **NOT VERIFIED**.
[Inbox walkthrough](https://help.everfit.io/en/articles/5567769-walkthrough-inbox-screen),
[Group messaging](https://help.everfit.io/en/articles/8186432-group-messaging),
[Broadcast messages](https://help.everfit.io/en/articles/8258414-inbox-broadcast-messages)

**Everfit keeps the Inbox as its own destination.**

### Form / check-in submissions

Coaches review submissions in the **"Responses" tab of a form** and can comment (text/video/image/GIF)
on an individual response. Submitting a form notifies the assigned coach; a coach comment notifies the
client back. **No pending/reviewed status field and no dedicated review queue are documented** —
review is a flat response list.
[Comment on a form's individual response](https://help.everfit.io/en/articles/7942826-comment-on-a-form-s-individual-response)

This is a notable gap: a check-in submission has no documented "reviewed" state in Everfit, which
means the surface cannot be drained. (The Check-in Dashboard's "Forms to Review" / "Review Completed"
views in the 2026-07-25 research suggest a state does exist there — the two docs are in tension and
this should be re-verified before relying on it.)

### Autoflow

Autoflow is a shared template (workouts + tasks + auto-messages) applied to many clients, structured
into tabs: **Settings, Training, Tasks, Announcements, In-App Auto Messages**, plus optional
**Leaderboard & Forums**. Two delivery models: **"Exact Date"** and **"By Day Sequence"**. Client
states inside an Autoflow: **Active, Paused, Completed**.
[Autoflow overview](https://help.everfit.io/en/articles/3661707-autoflow-overview-how-to-automate-your-training-business)

Autoflow **"Tasks"** are *client-facing* obligations (weekly check-ins, progress-photo checks, habit
reminders), authored by the coach and delivered to the client's task calendar — not a coach work queue.
[Autoflow tasks](https://help.everfit.io/en/articles/3661721-autoflow-tasks)

A **"To-do List for Coaches"** appeared in search summaries but **could not be confirmed against any
primary page — NOT VERIFIED.** Do not treat Everfit as having a coach-side task queue.

---

## CoachRx — the single most relevant precedent

CoachRx (OPEX Fitness) is the only product in this survey with a **documented, named, coach-facing
action-item queue whose filter names map almost one-to-one onto the proposed segments.**

The coach dashboard has **five sections**, verbatim:
**"Needs Attention", "Touchpoints", "Activity Feed", "My Stats", "My Tasks".**
[Navigating your CoachRx dashboard](https://intercom.help/coachrx/en/articles/10047306-navigating-your-coachrx-dashboard)

### "Needs Attention" — the filter taxonomy

Filterable by exactly these labels:

| CoachRx label (verbatim) | Kind of signal |
|---|---|
| **"Exercise Due"** | programming lookahead |
| **"Lifestyle Due"** | programming lookahead |
| **"Consults Due"** | scheduled obligation |
| **"Missed 2+ Workouts in a Row"** | behavioural streak |
| **"Missed 2+ Lifestyle Prescriptions in a Row"** | behavioural streak |
| **"Less than 50% Exercise Compliance"** | behavioural threshold |
| **"Less than 50% Lifestyle Compliance"** | behavioural threshold |
| **"All"** | escape hatch |

**This validates the proposed taxonomy more directly than anything else found.**
"Exercise Due" ≈ "Needs Programming". **"Missed 2+ Workouts in a Row" ≈ "Missed for 2 days"** — and
note CoachRx counts *consecutive missed prescribed sessions*, not *elapsed calendar days*. That
distinction matters enormously: a client programmed 3x/week who last trained Friday is not "missing"
on Sunday. **Counting calendar silence against a training schedule produces false positives on rest
days.** CoachRx counts scheduled-and-missed; Everfit counts activity; Trainerize counts sign-ins.

Urgent items carry **red indicators**. Clicking the **three-dot "..."** menu next to a client opens
service-management actions — **message, snooze, jump to calendar** — i.e. **inline action from the
queue row, not a forced navigation.** Note **snooze exists here**, the only fitness product in this
survey where it was found.

Auto-resolve mechanics are **NOT VERIFIED** — the article does not state whether "Exercise Due"
clears once a program is assigned.

### "My Tasks" — two provenances

- **Manual tasks**: coach clicks **"Add Task"**, sets description, due date, optional client assignment.
- **Automatic tasks**: system-generated for onboarding steps, payment alerts/failures, contract
  signatures, subscription expirations.

Tasks are **checked off** to complete — an explicit manual-dismiss model, distinct from the
auto-computed "Needs Attention" list.
[CoachRx dashboard](https://intercom.help/coachrx/en/articles/10047306-navigating-your-coachrx-dashboard)

**CoachRx runs two queue types side by side with different exit semantics**: computed conditions that
resolve themselves, and discrete tasks that are checked off. This is the cleanest answer found to the
"how do items leave the queue" question — *don't pick one, separate them and label the difference.*

### "Touchpoints" — a cadence queue, not an event queue

A distinct accountability layer for communication cadence. Set via **Organization Goals** (org-wide
minimum) and **Coach Goals** (individual, may exceed but not fall below the org minimum). The
dashboard shows completion % against the goal and lists **clients already reached vs still needing
contact**. A **green ring with checkmark** indicates the weekly goal is met; **the goal resets
Mondays.**
[Touchpoints](https://www.coachrx.app/articles/touchpoints-and-communication-tools-for-stronger-relationships)

This is a genuinely different queue shape and worth noting: it is **generated by the absence of coach
action, not by a client event.** Nothing happens to put a client in Touchpoints — they are there by
default each Monday until the coach contacts them. It is a *coverage* queue, not an *exception* queue.

### Other CoachRx surfaces

- **"Activity Feed"** — recent client completions; coach can comment, react with emoji, record **Loom**
  video feedback inline.
- **"My Stats"** — "Total Client Compliance %", "Exercise Client Compliance %", "Lifestyle Client
  Compliance %" across 30/60/90-day windows, plus total client count.
- **Messaging** — via the messages icon (top-right) or from a client's calendar via keyboard shortcut
  **'C'**. Supports Loom recording, **Scheduled Messages**, and Broadcast to all clients or a
  tag-filtered subset. Unread-badge mechanics and conversation sort order **NOT VERIFIED**.
  [Messaging in CoachRx](https://intercom.help/coachrx/en/articles/5829021-messaging-in-coachrx),
  [Scheduled messages](https://intercom.help/coachrx/en/articles/9764697-scheduled-messages)
- Client sorting by **name, compliance, or to-do status**; tags for training frequency and client type.
  [Platform walkthrough](https://intercom.help/coachrx/en/articles/7904184-coachrx-platform-walkthrough)

**CoachRx also keeps messaging as its own destination**, reached from a persistent top-right icon.

---

## PT Distinction, FitBudd, Hevy Coach (quicker pass)

### PT Distinction

The **features page confirms (direct fetch) a "program health traffic light system"** letting trainers
"see when all of your clients need new programs at a glance."
[Features](https://www.ptdistinction.com/features)

A four-colour mapping — **red** = clients waiting for a new program, **orange** = due within 7 days,
**grey** = no program scheduled yet, **green** = all good — was triangulated from search summaries of
two first-party blog URLs but **could not be verbatim-confirmed; NOT VERIFIED.**

The **Communication Center** is verbatim-confirmed and organises messages into **"Scheduled messages",
"Sent messages", "Outbox (failed to send)", "Drafts"**. Delivery options: **"Send now", "Send once
only", "Repeat weekly", "Custom repeat"**. Three formats: in-app, SMS, email. Supports placeholder
personalisation and bulk/group send, with a two-way/one-way messaging toggle.
[Upgraded Communication Center guide](https://www.ptdistinction.com/blog/upgraded-communication-center-guide)

Note this is an **outbound** taxonomy (drafts/scheduled/sent/failed), which is a different axis from
an inbound triage queue — a useful reminder that "messages" is not one surface.

### FitBudd

Client status filters, grouped by lifecycle stage — **corroborated across two search queries but not
verbatim-confirmed from a single primary page; treat as likely-accurate, NOT primary-verified**:

- Leads: "Onboarding Pending", "Onboard Done"
- Plans to assign: "Signup Pending", "Onboarding Pending", "Onboard Done"
- Active: "Plans to Update", "Completing Soon", "Payment Pending", "In Trial"
- Inactive: "Plan Completed", "Deactivated"

Filterable by **Client Type, Plans, Tags**. Messaging is a **"Messages"** item in the left main menu
with a client list in a second panel. Main dashboard section names **NOT VERIFIED** — the help-centre
collection found was nutrition tooling, not the coach dashboard.

"Plans to Update" and "Completing Soon" are again the lookahead-programming and expiry segments,
confirming those two as an industry-standard pair.

### Hevy Coach

Dashboard sections (direct fetch): **"Latest Activities"** (recent client workouts, measurements,
accepted invitations, PRs shown inline), **"Weekly Active Clients"** (12-week activity trend),
**"Total Clients"**. Top-of-dashboard metrics: total clients, **active clients in past 7 days**,
**inactive clients in past 7 days**.
[Coach dashboard](https://hevycoach.com/features/coach-dashboard/)

**No alert/attention feed and no badge system beyond the active/inactive counts is documented.**
Chat is a **per-client conversation model** reached via a "Chats" section, not a unified triage inbox.
Notifications (email + browser) fire on new client message, program end, or workout completion.
[Client chat](https://hevycoach.com/features/client-chat/)

Hevy is the useful negative case: **"Latest Activities" is a stream, not a queue.** It has no
dismissal, no state, and no count. It cannot be drained and is not meant to be.

---

# Part 2 — Triage/inbox UX from adjacent domains

These products have spent far more design effort on queue mechanics than any fitness platform. The
mechanics below are the transferable part.

## Front

### Vocabulary (and a naming trap)

- **Individual inbox** — a user's own connected email; "unshared by default unless you delegate your
  individual inbox to a teammate". Tabs: Open / Later / Done / All.
  [Individual inbox](https://help.front.com/en/articles/2054), [Inbox tabs](https://help.front.com/en/articles/2257)
- **Shared inbox** — "an inbox is a shared organizational space that holds conversations", with
  channels (email, SMS, chat, social, WhatsApp) connected so the team "sees, assigns, and replies to
  conversations from one place".
  [Shared inboxes](https://help.front.com/en/articles/2057), [Inbox types](https://help.front.com/en/articles/2137)
- **Empty inbox** — an inbox with **no channels attached**, used purely as an organisational space to
  move conversations into via rules, e.g. "an Urgent inbox for escalations".
  [Empty inboxes](https://help.front.com/en/articles/2157)

**Naming trap:** Front's "split inboxes" is **not** the Superhuman concept. In Front it is a
duplicate-copy setting — default behaviour merges an email addressed to multiple shared-inbox
addresses into one master copy; turning "split inboxes" on creates **separate copies** in each
addressed inbox.
[Split inboxes setting](https://help.front.com/en/articles/2026)
**Do not borrow the term "split inbox" from Front.** Front's triage primitive is **Views**.

### Views — the actual queue primitive

A view "creates a tailored work queue in users' sidebars" by "saving a refined set of criteria that's
customized across specific inboxes, tags, and assignees". Filterable by inboxes, tags
(include/exclude), topics (include/exclude), assignees (include/exclude), and custom fields. Private
or workspace-level. Limits: **50 views per sidebar**, 50 inboxes/tags/teammates per view, single
workspace per view.

> "Views can be used for their message counters, so that no conversation goes unanswered."

[Views](https://help.front.com/en/articles/2243)

That sentence is the clearest first-party statement found anywhere that **a segment's count is the
point** — the count is what converts a filter into a commitment.

### Conversation states — and the to-do metaphor stated outright

Tab sets vary by inbox type:

| Configuration | Tabs |
|---|---|
| Individual inbox | Open, Later, Done, All |
| Shared inbox (option A) | Unassigned, Assigned, Snoozed, Archived, Trash, Spam |
| Shared inbox (option B) | Open, Archived, Snoozed, Trash, Spam |
| Ticketing enabled | Unassigned, Assigned, Open, Waiting, Resolved, Trash, Spam |

> "Each inbox in Front has a set of tabs that filter conversations by status... Changing a
> conversation's status will move the conversation between the appropriate tabs."

[Inbox tabs](https://help.front.com/en/articles/2159)

Exit mechanics, verbatim:

> "You can think of the Open tab of your inbox as a to-do list."
> "The Archived tab of your inbox represents tasks you've checked off your to-do list."

[Open and archived](https://help.front.com/en/articles/2257)

**Critically: archived conversations auto-reopen.** If new activity arrives on an archived
conversation it moves back to Open. Snoozed items reappear "at the exact time and date you want". An
assigned conversation shows "until you archive or snooze it".
[Archive](https://help.front.com/en/articles/2350), [Snooze](https://help.front.com/en/articles/2088)

This is the answer to "how does a conversation leave a queue when conversations never really end":
**it leaves provisionally and comes back on new activity.** Done is not terminal for a conversation
the way it is for a task.

### Rules

Three scopes — **workspace rules**, **individual rules**, **company rules**. Structure: **Triggers**
("the types of events that will cause Front to start evaluating the conditions") → **Conditions**
("the criteria that determine whether a rule will be actioned on") → **Actions**. Rules chain: a
tag-add action in one rule can trigger another; a **"Stop processing other rules"** checkbox halts
the chain.
[Rules](https://help.front.com/en/articles/2105), [Rule structure](https://help.front.com/en/articles/1999)

### Tags

> "Tags make it easy to track certain topics in your inboxes, set up rules to sort messages
> automatically, report on trends in analytics, and use as private folders to file your messages into."

Three scopes: **Private tags** (individual, lock icon), **Shared tags** (workspace), **Company tags**
(Enterprise). Archived tags remain visible in Analytics and on historical conversations.
[Tags](https://help.front.com/en/articles/2100)

### Badge behaviour

- Individual inbox counters are **user-configurable**: Settings → Personal settings → Preferences →
  **"Inbox counters"** → choose **"Unread conversations"** or **"Open conversations"**.
- Shared-inbox tab layout (separate Unassigned/Assigned vs combined Open) changes what the counter
  reflects.
- Sidebar items can be individually **hidden** ("Hide in sidebar" from the three-dot menu, or bulk
  "Edit sidebar"), which removes the counter entirely.
- **There is no documented toggle to keep an item visible but suppress its count** — hiding is the
  only suppression mechanism.

[Sidebar](https://help.front.com/en/articles/2234), [Preferences](https://help.front.com/en/articles/2232)

### SLA — "Time goal rules"

Formerly "SLA rules". Two kinds: **Reply time goal** and **Resolution time goal**. On breach, the rule
**auto-tags** the conversation (e.g. "🔥SLA Breach", "🔥 Resolution goal overdue"), and "conversations
tagged by your time goal rules will include a timer" showing time-to-breach or overdue duration. A
"warn when goal is at risk" option fires before breach. Shared-inbox only.
[Time goal rules](https://help.front.com/en/articles/3038464)

**Mechanically elegant:** the SLA doesn't create a new queue — it applies a tag, and the tag feeds the
existing view system. One primitive, composed.

### Unified timeline — verify before relying on it

Front's marketing describes email, SMS, social, WhatsApp, live chat and voice merged into shared
inboxes with internal @-comments in-thread and shared drafts.
[Omnichannel inbox](https://front.com/product/omnichannel-support-inbox) (marketing)
**No help-centre article documenting the technical merge mechanism was found — NOT VERIFIED** at a
primary-doc level.

Front also has a documented **limitation** worth taking seriously for this project: a whole
conversation is assigned to a single teammate, and there is no way to break a conversation into
multiple smaller tasks, so complex issues push users to a third-party task manager — hence the
official Asana integration.
[Asana + Front](https://asana.com/apps/front)
**Conversations do not decompose into tasks.** This is the strongest practical argument found against
making a conversation a first-class item in a task queue.

---

## Intercom

### Views are queries; Folders are sidebar furniture

> "Inbox Views allow you to define a set of filters, including conversation attributes, and then show
> all conversations that match those filters in real time."

[Custom views and folders](https://www.intercom.com/help/en/articles/6588834-organize-your-inbox-with-custom-views-and-folders)

Filter dimensions: teammate/team assignment, tags, **SLA due timing**, waiting-for-reply status,
conversation start time, channel, ticket type/state/category, custom conversation-data attributes.
Filters combine with **OR** or **AND**.

Default views:

| View | Documented definition |
|---|---|
| **All** | "lists all conversations and tickets regardless of team or teammate assignment" |
| **Unassigned** | "lists all conversations and tickets that don't have a team or teammate assigned" |
| **Your inbox** | "lists all conversations and tickets assigned to you" |

[The Inbox explained](https://www.intercom.com/help/en/articles/6258745-the-inbox-explained)

**Folders are the inverse of what the name suggests:** "Custom folders in the Inbox allow you to
organize your own sidebar by pinning teams, teammates, or views to the folder. They are personal to
you and are not visible to other teammates." A folder **contains views**; it is not a destination
conversations get filed into.

### States and priority

Three states: **Open, Snoozed, Closed.**

> "You should only ever close a conversation when it's been fully resolved for the customer."
[Close a conversation](https://www.intercom.com/help/en/articles/8363763-close-a-conversation)

> "You should snooze a conversation if you're waiting on an answer from a customer or a teammate."
[Snooze](https://www.intercom.com/help/en/articles/6564538-snooze-a-conversation)

**Conversation priority** is a separate five-tier axis: None (default) → Low → Medium → High →
Urgent, set manually (header icon, table view, bulk action, **P** shortcut) or automatically via
Workflows/Rules/Macros.
[Priority levels](https://www.intercom.com/help/en/articles/15517604-conversation-priority-levels)

### SLA mechanics worth copying

Four metrics: **First Response Time (FRT)**, **Next Response Time (NRT)**, **Time to Close (TTC)**,
**Time to Resolution (TTR**, tickets only).

Colour-coded breach indicators: **Red** = overdue, **Orange** = under 5 minutes left, **Grey** = more
than 5 minutes left. SLAs **pause** on snooze / "waiting on customer". If an SLA is missed while
snoozed, "the conversation will be automatically unsnoozed and re-opened". SLA targets respect
configured office hours.
[SLAs](https://www.intercom.com/help/en/articles/6546152-set-slas-for-conversations-and-tickets)

Two ideas transfer directly to coaching: **the clock pauses while you're legitimately waiting on the
other party**, and **a missed deadline forcibly un-snoozes the item.** A coach waiting on a client's
check-in should not accrue "overdue coach" debt.

### Counts

Counts are documented **only for default views**:

> "The number next to 'All' represents all open conversations and tickets." "The number shown next to
> the 'Unassigned' view represents all open conversations/tickets that don't yet have an
> assignment... those conversations/tickets will be removed from the 'Unassigned' View immediately,
> and will no longer count towards the number."

[The Inbox explained](https://www.intercom.com/help/en/articles/6258745-the-inbox-explained)

Whether **custom** views carry counts is **NOT VERIFIED**.

### Rationale

**No first-party Intercom post arguing "views beat folders" was found — NOT VERIFIED.** The closest
design writeup is an IA restructuring post: features were grouped "based on how users think and work
rather than how they were built, aligning structure with user goals and simplifying navigation paths",
and labels were made legible "simultaneously, rather than requiring users to hover over each one
individually... reducing cognitive load".
[Designing for clarity](https://www.intercom.com/blog/designing-for-clarity-restructuring-intercoms-information-architecture/)

---

## Superhuman — the splits philosophy

`help.superhuman.com` returned **HTTP 403** to automated fetching; help-centre wording below is
search-synthesised and marked accordingly. `blog.superhuman.com` and `new.superhuman.com` (their
changelog) fetched cleanly.

### The splits-vs-folders argument

The sharpest formulation, from the help centre (**approximately verified — exact wording should be
re-checked in a browser**):

> "Split Inboxes should contain emails that still require action, while folders are best for storing
> messages you've already actioned."

This is the single most useful sentence in this entire research pass. **A split is defined by
*pending action*, a folder by *completed action*.** That is the actionable-vs-informational rule,
stated as product doctrine.

The positive case, from the blog (directly fetched):

> "Viewing all your emails in one single list is overwhelming. If you reply to messages in the order
> they appear in your inbox, your brain is constantly forced to switch gears."

Split Inbox lets you "divide your inbox into different areas of focus — based on the types of email
you receive most often" so you "choose a workstream and process those messages together", which
"reduces task switching [that] costs you valuable time".
[How to split your inbox](https://blog.superhuman.com/how-to-split-your-inbox-in-superhuman/)

From the changelog:

> Split Inbox lets users "quickly get to the messages that matter most" and "experience fewer context
> switches and stay in flow longer." For high-volume users it is "infeasible to Inbox Zero the whole
> stream" as one list — "some of the best splits are the ones you make yourself." The goal is to
> "achieve Inbox Zero in specific splits" even at extreme total volume.

[Split Inbox](https://new.superhuman.com/split-inbox-88255)

**The core insight: splits exist to make zero *achievable per-lane* when it is unachievable globally.**
Splitting is a batching device against task-switching cost, not a filing system.

The argument against folders as a triage tool, from the same corpus: "If you keep it out of sight it
will stay out of sight" — illustrated by a user who missed rare critical system alerts after filtering
them for months. Foldering "takes time to maintain if [it's] going to be effective", costing "time and
mental energy to determine where an email goes, and trying to remember where you placed it later."

### Splits are saved queries

Built-in splits: **Important • Other, Team, VIP, News.** "Important" = "all person-to-person and
high-priority messages"; "Other" = mailing lists, marketing, social, automated updates.

Custom splits are defined by **query filters** — `From:`, `To:`, `Subject:`, `Bcc:`, `Cc:`, combinable
with **OR**/**AND**, and can also be defined from built-in or custom **Auto Labels** "in addition to or
instead of traditional Definitions".
[Custom Split Inbox](https://help.superhuman.com/hc/en-us/articles/38458483333907-Custom-Split-Inbox) (403 to fetch; search-synthesised)

A **Split Inbox Library** of 60+ premade splits exists.

### Counts: total, not unread — a deliberate reversal

> "It is faster to mark finished email as done than to mark unfinished email as unread. It requires
> fewer actions overall, and leads — eventually — to Inbox Zero!"

[Counts](https://new.superhuman.com/counts-48718)

On Desktop/Android "the badge shows the count of total emails in your current Split, both read and
unread". Superhuman also documents that **removing counts entirely caused anxiety** (e.g. returning
from holiday with no sense of catch-up volume), which is why they kept a total count rather than going
countless.

**This is the opposite of the conventional unread badge and it is the right model for a coach triage
rail.** An unread badge answers "what's new?"; a total badge answers "how much work is left?" Only the
second one can reach zero by working.

### Items leave a split by action, not by reading

Composited from the review-workflow docs: **Done/Archive (E)**, **folder it (V)**, or **Reminder (H)**
to resurface later. The review flow explicitly asks "Is this message done? Hit E." **Splits are action
queues, not read-state queues.**

### Inbox Zero stance

> "The goal is to reduce the mental energy you spend thinking about email so you can focus on work
> that actually matters" — and explicitly not perfectionism: "obsessing over maintaining inbox zero
> can create more stress than it relieves."

[Inbox Zero method](https://blog.superhuman.com/inbox-zero-method/)

**Auto Archive** lets selected Auto Labels skip the inbox entirely, landing in the label plus an
"Auto Archived" folder.

---

## Linear — Triage

### Definition and intake

> "Triage is a special inbox for your team. When an issue is created by integration or by a workspace
> member not belonging to your specific Linear team, it will appear here."

[Triage](https://linear.app/docs/triage)

What enters Triage: integrations (Slack, Sentry, Intercom, Front, Zendesk), workspace members outside
the team, issues created from inside the Triage view, and **Linear Asks** — "people can submit an Ask
through Slack, email, or web forms. Each Ask becomes an issue... When an Ask is created for a Linear
team, it starts in the team's Triage for review, prioritization, and assignment."
[Linear Asks](https://linear.app/docs/linear-asks),
[Asks fields and Triage routing](https://linear.app/changelog/2025-06-05-asks-fields-and-triage-routing)

**The defining property: Triage holds items that have not yet been accepted into the workflow.** It is
an intake airlock, not a to-do list. Everything in Triage is awaiting a *decision about whether it is
work at all*.

### Exactly four exits

| Action | Shortcut | Effect (verbatim) |
|---|---|---|
| **Accept** | `1` | "will offer the option to leave a comment and then move the issue to your team's default status" |
| **Mark as Duplicate** | `2` or `MM` | "will offer a choice of which existing issue to merge the duplicate into" and moves "the new issue's attachments to the canonical issue" |
| **Decline** | `3` | "will update the issue to a *Canceled* status type and present the option of adding a comment" |
| **Snooze** | `H` | "will hide the issue from the triage queue to return at a time of your choosing" |

[Triage](https://linear.app/docs/triage)

**Every exit is an explicit, recorded decision, and each is one keystroke.** There is no "mark as read"
and no passive decay. Whether an accepted or declined issue can be manually pushed back into Triage is
**NOT VERIFIED**.

### Triage responsibility

> "Triage is your team's shared inbox for new issues in Linear. Many teams use it as a staging ground
> for accepting or rejecting issues from other teams or created by integrations. To better manage the
> queue, we added the ability to assign a [person]..."

[Triage responsibility](https://linear.app/changelog/2023-10-12-triage-responsibility)

Teams "either notify or assign the issue to specific workspace members". Linear's own recommendation:
"We recommend notifications for most product teams, but assignment works well for teams that typically
handle small requests that anyone can pick up." PagerDuty schedules can rotate responsibility;
otherwise round-robin or notify-everyone. "Triage responsibility is indicated in issue history, so
anyone can easily see who was responsible for handling an issue." Business and Enterprise plans only.

(Not directly applicable to a solo coach, but the *principle* — a queue with no owner does not get
drained — applies the moment a coach has an assistant.)

### Inbox ≠ Triage

> "The Inbox is your notification center in Linear and where you'll find important updates on issues
> in your workspace." / "Inbox shows in-app notifications for work that needs attention."

[Inbox](https://linear.app/docs/inbox)

- Auto-subscription: "automatically subscribed to issues when you create them, are assigned them, or
  are mentioned in an issue description or comment."
- `U` marks read/unread; `Alt/Option+U` marks all read.
- "Snoozing hides a notification from your Inbox until the selected time. When that time arrives, the
  notification reappears in Inbox." And: "notifications are automatically un-snoozed if there are new
  comments or other activity in the issue."
  [Notifications](https://linear.app/docs/notifications)
- **"You cannot choose which notifications go to your Inbox. All notifications will arrive there."**

**Linear runs a work-decision queue (Triage) and a personal activity stream (Inbox) as two separate
surfaces and never merges them.** Triage items require a decision; Inbox items require awareness. This
is the single most directly applicable precedent for the "should Messages be absorbed?" question, from
the product most admired for its queue design.

### Badges: user's choice of count or dot

The personalised sidebar lets you "reorder items, hide items you don't use often, and decide **how
unread notifications should be shown with a count or dot**."
[Personalized sidebar](https://linear.app/changelog/2024-12-18-personalized-sidebar)
Whether Triage itself always shows a count is **NOT VERIFIED**.

### Custom Views

> "Create durable filtered views of issues, projects, or initiatives that you can save and share with
> others in your workspace."

[Custom views](https://linear.app/docs/custom-views), [Filters](https://linear.app/docs/filters)

Created via sidebar **Views** → **New view**, or by filtering any list and saving with `Option/Alt+V`.
Filters narrow by "assignees, statuses, labels, projects, cycles, and more". **Applied filters reflect
in the URL** (shareable), though "only the main filters are included in the URL. View options, quick
filters, and Insights filters aren't included." Scope is **Workspace views** or **Team views**.
Starring a view pins it to the sidebar; a favourited view can be set as the default landing page.
Default team views: **All Issues, Active, Backlog** (plus Triage and Cycles when enabled).

**No primary linear.app/method essay stating "keep triage small" or "issues should be actionable" was
located — NOT VERIFIED.** Secondary paraphrases of such a principle should not be attributed to Linear.

---

## Gmail — Priority Inbox and Multiple Inboxes

Priority Inbox sections are **"Important and unread", "Starred", "Everything else"** (or a custom
label); users pick which sections show via **Customize**, and "The Everything else section always
appears last."
[Priority Inbox](https://support.google.com/mail/answer/186531)

**Multiple Inboxes** confirms the saved-query model outright (directly fetched):

> "Enter the search criteria you want to add for each section."

Each section is configured under Settings → Inbox type → **Multiple inboxes** → **Customize**, with a
**Section name**, a **search-query field**, a **Maximum page size**, and a **Multiple Inbox position**.
Desktop-only: "You can only set up multiple inboxes with a computer."
[Multiple inboxes](https://support.google.com/mail/answer/9694882)

**A Gmail inbox section is literally a saved search string.** The commonly-cited five-section cap
appears only in secondary sources and is **NOT VERIFIED**.

Gmail also has **no folders at all** — only labels (multi-assignable), filters, and search. A message
carries multiple labels simultaneously.
[Labels](https://support.google.com/mail/answer/9259770), [Filters](https://support.google.com/mail/answer/6579)

The research paper — Aberdeen, Pacovsky & Slater, "The Learning Behind Gmail Priority Inbox", NIPS
2010 LCCC workshop — is at [research.google/pubs/pub36955](https://research.google/pubs/pub36955/).
**PDF text extraction failed; the abstract could not be verified verbatim.** The widely-reported
findings (ranking mail "by the probability that the user will perform an action on that mail"; users
spending 6% less time reading mail overall and 13% less on unimportant mail) are **NOT VERIFIED**
against primary text and should be re-checked before being quoted.

Note the framing that *is* consistent across sources: Priority Inbox ranks by **probability of user
action**, not by importance-in-the-abstract. That is the actionability principle again, expressed as a
model objective.

---

## GitHub Notifications

Model: **Inbox / Saved / Done.**

- **Inbox** — notifications not unsubscribed from or marked Done.
- **Done** — removes from Inbox; viewable via sidebar **Done** or `is:done`; "notifications marked as
  Done are saved for 5 months."
- **Saved** — "kept indefinitely" for later review; `is:saved`; if unsaved they disappear within a day
  once past the 5-month window.
- **Unsubscribe** — removes it, but it reappears if you are @mentioned again, your team is tagged, or
  your review is requested again.

[Managing notifications from your inbox](https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox)

**Reasons — the taxonomy of why an item is in your queue** (from the REST API, authoritative):

| `reason:` | Description (verbatim) |
|---|---|
| `approval_requested` | "You were requested to review and approve a deployment." |
| `assign` | "You were assigned to the issue." |
| `author` | "You created the thread." |
| `ci_activity` | "A GitHub Actions workflow run that you triggered was completed." |
| `comment` | "You commented on the thread." |
| `invitation` | "You accepted an invitation to contribute to the repository." |
| `manual` | "You subscribed to the thread (via an issue or pull request)." |
| `member_feature_requested` | "Organization members have requested to enable a feature such as Copilot." |
| `mention` | "You were specifically **@mentioned** in the content." |
| `review_requested` | "You, or a team you're a member of, were requested to review a pull request." |
| `security_advisory_credit` | "You were credited for contributing to a security advisory." |
| `security_alert` | "GitHub discovered a security vulnerability in your repository." |
| `state_change` | "You changed the thread state (for example, closing an issue or merging a pull request)." |
| `subscribed` | "You're watching the repository." |
| `team_mention` | "You were on a team that was mentioned." |

[Notifications API](https://docs.github.com/en/rest/activity/notifications)

Triage-state filters: `is:unread`, `is:read`, `is:done`, `is:saved`. Custom saved filters appear in the
left sidebar beside the defaults (assigned, participating, review requested, direct mentions), capped
at **15 custom filters**; the default sidebar filters "cannot be reordered or changed".
[Inbox filters](https://docs.github.com/en/subscriptions-and-notifications/reference/inbox-filters)

Note the spelling inconsistency between the API (`review_requested`, `team_mention`, `ci_activity`) and
the Inbox query syntax (`reason:review-requested`, etc.) — a cautionary tale about letting a filter
vocabulary drift between layers.

**The transferable idea: every item carries a machine-readable REASON for being in the queue.** The
reason is what the segments are built from, and it is stored on the item, not derived at render time.

---

# Part 3 — UX principles, with sources

## 3.1 Inbox zero means zero attention, not zero items

Merlin Mann's original framing, from his own site:

> "That 'zero'? It's not how many messages are in your inbox — it's how much of your own brain is in
> that inbox."

[43 Folders — Inbox Zero](http://www.43folders.com/2007/07/25/merlins-inbox-zero-talk),
[Inbox Zero topic index](http://www.43folders.com/topics/inbox-zero)

**Design consequence:** the success metric for a triage rail is not an empty list. It is that nothing
in the list is holding an unresolved decision. A segment with 12 items that each have an obvious next
action is healthier than a segment with 2 items you don't know what to do with.

## 3.2 Filing has a cost most users refuse to pay

Whittaker & Sidner, "Email Overload: Exploring Personal Information Management of Email", CHI '96,
pp. 276–283 — the root citation for email being co-opted for task management and archiving beyond its
design intent.
[ACM DL](https://dl.acm.org/doi/10.1145/238386.238530) (paywalled; abstract verified)

Its best-known finding is the three filing behaviours: **no filers (33%), frequent filers (28%),
spring cleaners (39%** — who file only once volume becomes unmanageable).
[Summary record](https://www.researchgate.net/publication/221519353_Email_Overload_Exploring_Personal_Information_Management_of_Email)

Ten years on, Fisher, Brush, Gleave & Smith, "Revisiting Whittaker & Sidner's 'Email Overload' Ten
Years Later", CSCW 2006, studied 600 real mailboxes and found inbox counts stayed roughly stable while
total archived volume grew ~10x.
[Microsoft Research](https://www.microsoft.com/en-us/research/publication/revisiting-whittaker-sidners-email-overload-ten-years-later/),
[ACM DL](https://dl.acm.org/doi/10.1145/1180875.1180922)

**NOT VERIFIED:** the exact wording on folders-vs-search being low-value could not be extracted from
the paywalled full text. The three-filer-categories finding is verified; the "search beats filing"
framing is the standard interpretation, not a quotable sentence.

**Design consequence:** never require the coach to file a client into a segment by hand. Two thirds of
users won't do it consistently, and the segment will be wrong.

Microsoft's own Outlook guidance says the same thing operationally:

> "Reduce the mental tax of filing by relying on search to locate messages."
> "By having a single folder, you don't have to think about which folder holds which messages."

[Best practices for Outlook](https://support.microsoft.com/en-us/office/best-practices-for-outlook-f90e5f69-8832-4d89-95b3-bfdf76c82ef8)

## 3.3 Views = saved queries

Verified across four independent primary sources:

- **Linear**: views are "durable filtered views ... that you can save and share", built from filters,
  saved with `Option/Alt+V`, with filter state encoded in the URL.
  [Custom views](https://linear.app/docs/custom-views)
- **Gmail**: a Multiple Inboxes section is configured by "the search criteria you want to add for each
  section" — literally a saved search string.
  [Multiple inboxes](https://support.google.com/mail/answer/9694882)
- **Gmail labels**: no folders exist; a message carries many labels at once.
  [Labels](https://support.google.com/mail/answer/9259770)
- **Front**: a view saves "a refined set of criteria ... across specific inboxes, tags, and assignees"
  and exists to provide "message counters, so that no conversation goes unanswered".
  [Views](https://help.front.com/en/articles/2243)
- **Superhuman**: custom splits are query filters (`From:`, `To:`, `Subject:`, `Bcc:`, `Cc:`) combined
  with OR/AND.
  [Custom Split Inbox](https://help.superhuman.com/hc/en-us/articles/38458483333907-Custom-Split-Inbox) (403; search-synthesised)

**The three properties that make this the right model:** an item can be in many views at once; there
is no filing cost; and a view stays correct as the underlying data changes without anyone maintaining
it.

GitHub's saved-filter UI is thinner and is **weaker evidence** for this specific point.

## 3.4 Badge and count fatigue

**Apple HIG** (authoritative, verbatim):

> "Use a badge only to show people how many unread notifications they have."
> "Use badging to supplement notifications, not to denote critical information, and keep in mind that
> badging of your app can be turned off."
> "Keep badges up to date by updating your app's badge as soon as the corresponding information is
> read."

[Apple HIG — Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)

Note the direct tension with Superhuman's deliberate choice of **total** counts over unread counts
(§Part 2). Apple's rule is written for an app icon competing on a home screen; Superhuman's is written
for a work surface you are already inside. **For an in-app triage rail, Superhuman's model is the
right one** — but it means the number is a workload figure, not a novelty figure, and the copy must
say so.

**Material Design 3** distinguishes **dot badges** (signal "something happened" without quantifying)
from **number badges** (quantify, e.g. unread count) — use a dot when the exact count does not change
the decision.
[M3 badges](https://m3.material.io/components/badges/guidelines) (**moderate confidence** — retrieved
via search snippet, not direct fetch)

**Linear** ships this as a user preference: decide "how unread notifications should be shown with a
count or dot".
[Personalized sidebar](https://linear.app/changelog/2024-12-18-personalized-sidebar)

**Alarm fatigue — the hard evidence.** This is a mature clinical literature and it is the strongest
available warning against badging many segments at once:

- AHRQ PSNet: **80–99% of ECG monitor alarms are false or clinically insignificant**; 72–99% of all
  patient-monitoring alarms are false or not actionable.
  [Reducing safety hazards: monitor alert and alarm fatigue](https://psnet.ahrq.gov/perspective/reducing-safety-hazards-monitor-alert-and-alarm-fatigue)
- NCBI Bookshelf / AHRQ *Making Healthcare Safer III*, "Alarm Fatigue" — desensitisation from high
  false-positive rates leads to delayed or dismissed alarms and threshold tampering.
  [NBK555522](https://www.ncbi.nlm.nih.gov/books/NBK555522/)
- BMC Nursing scoping review (2025).
  [Springer](https://link.springer.com/article/10.1186/s12912-025-03369-2)
- ICU alarm-fatigue systematic review.
  [PMC9424650](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9424650/)

**NN/g translates this to product UI:**

> "Dashboards that monitor vast masses of data should guide users' attention to critical values but
> not by flashing endless alerts without prioritization."

[Alert fatigue in user interfaces](https://www.nngroup.com/videos/alert-fatigue-user-interfaces/)

And the **"cry wolf" effect**: excessive low-value alerts train users to ignore notifications
wholesale, causing them to miss genuinely critical ones or revoke permissions entirely.
[Smart home notifications](https://www.nngroup.com/articles/smart-home-notifications/)

**Design consequence:** badging every segment in a rail simultaneously is the exact failure mode this
literature describes. Badge few segments, and only ones where the count changes what the coach does
next.

## 3.5 Actionable vs informational

**GOV.UK Design System — "Complete multiple tasks"** is the strongest primary guidance found. (Note:
the older "Task list pages" URL is dead; use the current one.)
[Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)

Key guidance, verbatim:

> "Try to simplify the transaction before you use a complete multiple tasks page."
> "Start with the smallest number of different statuses you think might work."

Its status vocabulary is explicitly actionability-coded: **Not yet started**, **In progress**,
**Cannot start yet** (the link is *removed entirely* — you cannot click into a non-actionable item),
**There is a problem**, **Completed** (rendered as plain black text with no coloured tag, specifically
"to draw more attention to tasks that require action").

**Three transferable rules:** a queue is a heavyweight pattern — simplify before reaching for it;
non-actionable items should be visually *and interactively* demoted; and completed items must recede
rather than compete.

**HEY (Basecamp/37signals)** operationalises actionable-vs-informational as the *primary* top-level
split, ahead of sender or topic: **Imbox** (needs attention), **The Feed** (bulk/newsletter,
browse-on-your-terms), **Paper Trail** (receipts/transactional, pure record-keeping).
[Paper Trail](https://www.hey.com/features/paper-trail/), [Help](https://help.hey.com/article/787-paper-trail)

**Superhuman** states the same rule for splits vs folders (§Part 2): splits hold what "still requires
action"; folders hold "messages you've already actioned".

## 3.6 Empty states for queues

**Atlassian** is the most direct:

> "Use empty states to show when there is nothing to display in a view, for example, when a board has
> no tasks, someone clears their inbox, or a search returns no results."
> "If there is nothing for them to do, celebrate finishing a task."

[Atlassian empty state](https://atlassian.design/components/empty-state),
[Designing messages — empty state](https://atlassian.design/content/designing-messages/empty-state/)

**Shopify Polaris** treats zero-data/onboarding and zero-results as the same component family with
different copy jobs, and adds a tone rule:

> "Be encouraging and never make merchants feel unsuccessful or guilty because they haven't used a
> product or feature."

[Polaris empty state](https://polaris-react.shopify.com/components/layout-and-structure/empty-state)

**Design consequence:** a triage segment needs **two** distinct empty states — *drained* ("You're all
caught up") and *never-populated* ("Clients appear here when their plan is ending"). Shipping only
"No items" reads as a dead end or a bug in both cases. Treat Polaris and Atlassian as the load-bearing
citations; the ubiquitous "You're all caught up" copy convention is well-attested across Gmail, Slack,
Asana and Todoist but has no single authoritative source.

## 3.7 How many segments is too many — 7±2 does not apply

**NN/g addresses this head-on**, and the headline is that the common rule is a myth: "it's not 7,
despite a common myth", with four context-dependent factors determining the right count.
[How many items in a navigation menu](https://www.nngroup.com/videos/number-items-navigation-menu/)

The textually richer companion article:

> "The number of categories should be determined by what makes it easiest for people to discover and
> access information — not by some preordained decision."

Concrete data points cited: 5 categories sufficed for a narrow-scope site; a broader retailer used 7
top-nav links plus 17 in a vertical submenu; alphabetisation becomes worthwhile only past roughly 20
items and isn't worth it under ~10.
[IA questions: navigation menus](https://www.nngroup.com/articles/ia-questions-navigation-menus)

**Why the myth is wrong, mechanistically:** Miller's 7±2 governs immediate recall of unidimensional
stimuli, not scanning a persistently visible list. **A visible rail is a recognition task, not a recall
task.** Miller himself objected to the misapplication.
[UX Collective](https://uxdesign.cc/ux-myth-millers-law-the-magical-seven-was-only-an-allegory-6283505f758d),
[Stéphanie Walter](https://stephaniewalter.design/blog/your-menu-doesnt-need-millers-7-plus-minus-2-rule/)
(both practitioner blogs — **moderate trust**, converging on the same documented Miller objection)

**Design consequence:** do not cap the rail at 5–9 "because of 7±2". Cap it because each additional
segment dilutes attention and adds a badge source (§3.4), and because a segment nobody drains teaches
the coach to ignore the rail. Real evidence for the cap should come from usage, not folklore.

## 3.8 Combining chat and tasks in one rail

**Where a unified surface works: HubSpot's CRM timeline.** It stacks emails, calls, meetings, notes
and tasks chronologically on a single record, with a filter bar to show/hide types.
[Associate activities with records](https://knowledge.hubspot.com/crm-setup/associate-activities-with-records),
[Filter activity index pages and record timelines](https://knowledge.hubspot.com/crm-setup/customize-activities-on-a-contact-company-deal-ticket-record-timeline)

**It works because the unifying object is a RECORD, not a QUEUE.** A timeline is a history view;
nothing in it demands "clear this". This is a real and important distinction for the coaching case:
merging messages into a *client detail timeline* is well-precedented; merging them into a *work queue*
is not.

**Where it strains: Front.** Front's design intent is that "everything stays on one conversation
record, so whoever touches it ... sees the same history, and context is never lost in a hand-off".
[Meet the new Front](https://front.com/blog/meet-the-new-front),
[Front's inbox experience](https://help.front.com/en/articles/3889728)
But a whole conversation is assigned to a single teammate and **cannot be broken into multiple smaller
tasks**, which pushes users to a third-party task manager — hence the Asana integration.
[Asana + Front](https://asana.com/apps/front)

**Arguments against merging messaging into a task queue.** No single authoritative source states this
outright — **flagged as reasoned synthesis, not a citable finding** — but each strand below rests on a
verified source:

1. **Different response-time expectations.** Intercom models messaging urgency with SLA clocks that
   *pause* when you are waiting on the other party
   ([SLAs](https://www.intercom.com/help/en/articles/6546152-set-slas-for-conversations-and-tickets));
   task queues use fixed due dates. Interleaving them in one sorted rail collapses two incompatible
   urgency models.
2. **A conversation is never structurally "done".** Front archives auto-reopen on new activity
   ([Archive](https://help.front.com/en/articles/2350)), whereas GOV.UK's task pattern treats
   "Completed" as terminal and visually demoted
   ([Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)).
   Mixing them breaks the status vocabulary.
3. **Volume asymmetry.** Message threads out-volume discrete tasks, and per the alarm-fatigue
   literature (§3.4) high-volume low-signal items drown rarer high-stakes ones once they share a sort
   order and a badge count.
4. **Conversations don't decompose.** Front's documented limitation above.
5. **Shipped counter-examples.** HEY splits Imbox/Feed/Paper Trail by actionability rather than
   merging; Basecamp keeps chat, message boards and to-dos as separate primitives; **Linear keeps
   Triage and Inbox separate**; and every fitness platform surveyed in Part 1 retains a distinct
   messaging destination.

**37signals states the underlying rule directly.** From their public internal-communication guide:

> Point 2: "Real-time sometimes, asynchronous most of the time."
> Point 16: "'Now' is often the wrong time to say what just popped into your head."
> Point 21: "Urgency is overrated, ASAP is poison."
> Point 29: "Consider where you put things. The right communication in the wrong place might as well
> not exist at all."

[The 37signals Guide to Internal Communication](https://37signals.com/how-we-communicate)

And on why chat specifically resists queue semantics:

> "It's professional pressure to stay logged into chat. It's saying 'if you aren't green, you aren't
> at work'."
> "Most teams keep a chat window open all day on the side of their screen or on a second monitor. This
> invites you to keep one eye on the chat window, and the other on your work."
> "Complete thoughts have to unfold one line-at-a-time."

[Group Chat: The Best Way to Totally Stress Out Your Team](https://basecamp.com/guides/group-chat-problems)

**Microsoft's Outlook guidance is the clearest first-party statement of the separation:**

> "After you process your messages, the best place to do work in Outlook (reply to messages and so on)
> is in Tasks. By switching to Tasks, you won't be distracted by messages arriving in your Inbox."
> "Reduce your to-do list to one list. Use a single to-do list and a single calendar to manage what
> you need to do."

[Best practices for Outlook](https://support.microsoft.com/en-us/office/best-practices-for-outlook-f90e5f69-8832-4d89-95b3-bfdf76c82ef8)

Note the two rules together: **one to-do list, but the to-do list is not the inbox.** That is a
different claim from "merge everything", and it is the one the evidence supports.

## 3.9 Prioritisation and sorting

Weakest-evidenced section here — no design-system or NN/g source addresses SLA-based sort order; the
material is support-ops practice literature (**vendor content marketing, lower trust**, but
directionally consistent):

> "When priority levels match, work the older ticket or the one closest to its SLA target, as simple,
> automatic tie-breakers make the top of the ticket queue obvious and instantly defensible."

[Supportbench — queue design](https://www.supportbench.com/queue-design-by-severity-team-product-customer-tier/),
[Supportbench — queue strategy](https://www.supportbench.com/support-queue-strategy-triage-routing-ownership/)

Standard tiered severity models (P1–P5) generally recommend SLA-deadline proximity over raw creation
date as the default sort key, specifically to prevent old-but-low-value items permanently occupying
the top.
[Whatfix](https://whatfix.com/blog/support-ticket-priority-levels/),
[Jitbit](https://www.jitbit.com/news/helpdesk-ticket-priority-levels/)

Intercom's shipped model corroborates: a five-tier priority axis **separate from** state, plus colour
-coded time-to-breach.
[Priority levels](https://www.intercom.com/help/en/articles/15517604-conversation-priority-levels)

**On user-driven reordering: NOT VERIFIED.** No authoritative source was found on manual-reorder vs
system-sort trade-offs. Note only that Front, Intercom and Linear all let users reorder *the segments*
in the sidebar, while none documents letting users reorder *items within* a computed queue.

## 3.10 Progressive disclosure and preview-vs-navigate

**NN/g on progressive disclosure** (the umbrella principle): a technique introduced by Nielsen in 1995
that "defers advanced or rarely used features to a secondary screen, making applications easier to
learn and less error-prone".
[Progressive disclosure](https://www.nngroup.com/videos/progressive-disclosure/)

**NOT VERIFIED:** no NN/g or design-system article specifically addressing three-pane list/detail
layouts, or the cost of losing queue position on navigate-away, could be located. Do not cite NN/g for
that claim.

**Indirect support** comes from interruption research: Mark, Gudith & Klocke, "The Cost of Interrupted
Work: More Speed and Stress", CHI 2008 — people complete interrupted tasks in comparable or less time
but "compensate for interruptions by working faster at a price: experiencing more stress, higher
frustration, time pressure and effort".
[ACM DL](https://dl.acm.org/doi/10.1145/1357054.1357072)

The widely-quoted **"23 minutes to regain focus"** figure could not be verified against the primary
PDF and should **not** be quoted as fact.

**Design consequence** (an inference bridging HCI research to a UI choice, not a sourced claim):
favour inline preview and inline action over full navigation for triage steps, because each
navigate-away is a context switch with real recovery cost. CoachRx's "..." row menu (message / snooze /
jump to calendar) and TrueCoach's dashboard quick-connect icons are the shipped versions of this;
Trainerize's widget-to-Progress-tab deep link is the counter-example.

---

# Part 4 — Synthesis

## 4.1 Segment taxonomy across products

Names are **verbatim where quoted**. Entries marked † come from the
[2026-07-25 research](2026-07-25-client-triage-messaging-research.md) rather than this pass. Blank
means no equivalent was documented.

| Semantic segment | Trainerize | TrueCoach | Everfit | CoachRx | PT Distinction | FitBudd | Hevy | Coach Catalyst† | Kahunas† |
|---|---|---|---|---|---|---|---|---|---|
| **New / not set up** | "Haven't set up account" (3 days) | — | "Pending", "Offline", "Waiting Activation" | automatic onboarding tasks | — | "Signup Pending", "Onboarding Pending", "Onboard Done" | — | status tabs | new clients |
| **Needs programming** | — | — | **"Need Programming"** (last assigned workout <3 days away) | **"Exercise Due"**, **"Lifestyle Due"** | traffic light: waiting for new program (NOT VERIFIED) | "Plans to Update" | — | "Needs Workout" | — |
| **Missed / silence** | no sign-in >7 days | — | "No Activity"† | **"Missed 2+ Workouts in a Row"**, **"Missed 2+ Lifestyle Prescriptions in a Row"** | missed schedules† | — | inactive in past 7 days | 3 consecutive inactive days | last activity |
| **Compliance drop / low** | compliance auto-tags | **"Needs Attention"** = −20% drop in 7/30/90-day rate | "At Risk" (training <60%)† | **"Less than 50% Exercise Compliance"**, **"Less than 50% Lifestyle Compliance"** | adherence summaries | — | — | 60% low / 75% high | — |
| **Expiring / ending** | "Main program expiring/expired", "Add-on program expiring/expired" | **"Due Soon"** | "Program Ending"† | subscription-expiry auto-task | orange = due within 7 days (NOT VERIFIED) | "Completing Soon" | program finishing next week | "Programs Ending" | renewing in 7 days |
| **Forms / check-ins to review** | — | — | "Forms to Review", "Review Completed"† | **"Consults Due"** | — | — | — | forms | new check-ins |
| **Unread / waiting on coach** | Messages tab | unread filter across **messages + workout results + comments** | Inbox, manual mark-unread | messages icon | — | Messages | Chats | Messages Inbox | inline chat |
| **On track / positive** | high-compliance tags | — | "On Track"† | — | System Groups† | — | PRs in activity feed | high-performing, streaks | — |
| **Payment problems** | failing payments | delinquency (in Payments) | — | payment alerts/failures auto-task | — | "Payment Pending" | — | — | package/offline payment |
| **Paused / archived** | — | "Archived" | "Paused"† | — | — | "Plan Completed", "Deactivated" | — | status tabs | deactivated |
| **Coverage / cadence** | — | — | — | **"Touchpoints"** (weekly goal, resets Mondays) | — | — | — | — | — |
| **Escape hatch** | — | Name A–Z | "Connected" / All | **"All"** | — | — | Total Clients | — | All Clients |

### What this table says

1. **Five categories are effectively universal**: not-set-up, needs-programming, missed/silent,
   expiring, and low-compliance. Every product has at least three of them.
2. **The proposed segments are all precedented, and two are near-verbatim.** "Needs Programming" is
   Everfit's literal segment name. "Missed for 2 days" is CoachRx's "Missed 2+ Workouts in a Row".
   "Expiring Soon" is TrueCoach's "Due Soon" / Everfit's "Program Ending". "Check-in Submissions" is
   Everfit's "Forms to Review". "Recently Added" is the lifecycle head that everyone has.
   **There is no novelty risk and no adoption risk in this taxonomy — it is the industry consensus.**
3. **Nobody merges messaging into it.** In all nine products, the unread/waiting row is a *separate
   destination*, not a segment of the triage list. TrueCoach comes closest and went the *other* way:
   it widened the inbox to include workout results and comments rather than dissolving the inbox into
   the roster.
4. **Only CoachRx has a coverage queue** ("Touchpoints"). It is the one genuinely differentiated
   segment shape in the market, and it is generated by coach inaction rather than client events.

## 4.2 Queue mechanics across the adjacent-domain canon

| | Front | Intercom | Superhuman | Linear Triage | Gmail | GitHub |
|---|---|---|---|---|---|---|
| **Segment primitive** | View (saved criteria) | View (saved filters) | Split (saved query) | Triage (single queue) | Multiple Inboxes section (saved search) | Custom filter (saved query) |
| **How items enter** | rules + channels | assignment + workflows | query match | integrations, Asks, out-of-team issues | query match | subscription + `reason:` |
| **States** | Open / Assigned / Snoozed / Archived / (Waiting / Resolved) | Open / Snoozed / Closed | in-split / Done / foldered / reminder | in-Triage / accepted / duplicate / declined / snoozed | read/unread | Inbox / Saved / Done / unsubscribed |
| **Exits** | archive, snooze, assign | close, snooze | `E` done, `V` folder, `H` reminder | Accept `1`, Duplicate `2`, Decline `3`, Snooze `H` | read / archive | Done (5-mo retention), Saved (indefinite), Unsubscribe |
| **Re-entry** | **auto-reopen on new activity** | **auto-unsnooze on SLA breach**; snooze expiry | reminder fires | snooze expiry | new mail | re-mention / re-review-request |
| **Counts** | configurable: unread *or* open; hide to suppress | documented on default views only | **total, not unread** | count *or* dot, user choice | section page size | per-filter |
| **Segment cap** | 50 views | not documented | 60+ library, unlimited custom | n/a (one Triage) | ~5 (NOT VERIFIED) | **15 custom filters** |
| **Priority axis** | Time goal rules → auto-tag + timer | 5 tiers, separate from state | none | issue priority, separate | importance model | none |

### Six mechanics worth stealing

1. **Provisional exit with automatic re-entry** (Front, Intercom, GitHub). A coaching item cleared
   today should come back if the condition recurs. This is what makes "done" safe when the underlying
   object is a living relationship.
2. **Snooze is the pressure valve.** Every serious triage product has it; only CoachRx has it in
   fitness. Without snooze, a coach's only options for "not now" are ignore (queue rots) or fake-resolve
   (data lies).
3. **Total counts, not unread counts** (Superhuman). Unread answers "what's new"; total answers "how
   much work is left". Only the second can be driven to zero by working.
4. **The reason is stored on the item** (GitHub `reason:`). Segments are then *derived* from reasons
   rather than each being a bespoke query. This is the difference between five segments and five
   endpoints.
5. **Priority is a separate axis from state** (Intercom). Do not encode urgency by which segment
   something is in.
6. **The clock pauses when you're legitimately waiting on the other party** (Intercom). A coach who
   has asked a client for their check-in is not overdue.

## 4.3 Pitfalls

1. **Calendar-day silence is the wrong signal.** "Missed for 2 days" counts elapsed days; CoachRx
   counts **consecutive missed prescribed sessions**. A client programmed 3×/week who trained Friday
   is not missing on Sunday. **Day-based silence produces false positives on every rest day**, and per
   the alarm-fatigue literature (§3.4) false positives are how a queue gets ignored. Define the
   segment against the *schedule*, not the calendar.
2. **Level-based thresholds never drain; delta-based ones do.** "Compliance below 60%" permanently
   contains the same chronically-low clients. TrueCoach's "−20% drop" clears itself once the client
   stabilises at the new level. **A segment that can never reach zero trains the coach to ignore it.**
3. **Lapsed definitions are too late.** Everfit's "Need Programming" fires when the last assigned
   workout is **less than 3 days away** — before the client is affected. A segment defined as "has no
   active plan" only fills after you have already failed.
4. **Badging every segment recreates alarm fatigue.** §3.4. Pick the one or two segments where the
   number changes the coach's next action.
5. **"No items" is not an empty state.** Every segment needs both a drained state and a
   never-populated state (§3.6).
6. **Informational feeds masquerading as queues.** Hevy's "Latest Activities" and CoachRx's "Activity
   Feed" are streams — no state, no count, not drainable, and correctly so. Do not put a stream in the
   rail next to drainable queues; the coach will try to clear it and fail.
7. **Two queue types with different exit semantics need different affordances.** CoachRx separates
   computed "Needs Attention" (auto-resolving) from "My Tasks" (checked off). Mixing auto-resolving
   and manually-dismissed items in one list makes the dismiss affordance a lie half the time.
8. **Don't borrow Front's "split inbox" name** — it means duplicate-copy routing there, not a queue.
9. **Keep the filter vocabulary identical across layers.** GitHub's `review_requested` (API) vs
   `review-requested` (search) is a small permanent tax.
10. **A queue with no owner does not get drained** (Linear's Triage responsibility). Irrelevant for a
    solo coach, load-bearing the moment there is an assistant — and this app already has
    `assigned_coach_id`.

## 4.4 The Messages question

**The evidence is one-sided: do not absorb Messages into the triage rail.**

- **All nine fitness products retain a separate messaging destination** (§4.1, and the 2026-07-25
  research reached the same verdict independently).
- **Linear — the product most admired for queue design — deliberately runs two surfaces**: Triage
  (items awaiting a *decision*) and Inbox (items awaiting *awareness*), and never merges them
  ([Triage](https://linear.app/docs/triage), [Inbox](https://linear.app/docs/inbox)).
- **Conversations do not decompose into tasks** (Front's documented limitation, §3.8) and **never
  become terminally done** (Front archives auto-reopen on new activity).
- **Volume asymmetry** drowns the rare high-stakes signal (§3.4, §3.8).
- **Response-time models are incompatible**: message urgency is elapsed-since-last-reply with pause
  semantics; task urgency is a due date (§3.9).

**But two narrower moves ARE well-precedented:**

1. **A "Waiting on you" segment that surfaces only conversations where the client sent the last
   message and the coach has not replied.** This is *not* the inbox — it is one derived, drainable
   condition, exactly like Everfit's documented 24-hour no-reply alert† and Intercom's "waiting for
   reply" filter. It has a clear exit (coach replies) and a bounded count.
2. **Widening the inbox rather than dissolving it** — TrueCoach's actual shipped move: one unread
   queue spanning "messages, workout results and comments"
   ([Messaging](https://help.truecoach.co/en/articles/2403915-messaging-your-clients)). If the goal is
   one place to catch everything client-originated, **the inbox is the surface that should grow, not
   the roster.**

The distinction that resolves the whole question: **HubSpot's unified timeline works because the
unifying object is a record, not a queue** (§3.8). Merging messages into *client detail* is
well-precedented. Merging them into a *work queue* is not.

## 4.5 Assessment of the five proposed segments

Mechanics recommendations per segment, grounded in the sources above.

| Proposed segment | Precedent | Recommended definition | Exit | Badge? |
|---|---|---|---|---|
| **Recently Added** | universal lifecycle head | Client added within N days **AND** onboarding incomplete (intake or first plan missing). Time-only is informational, not actionable. | Auto: onboarding completes. Manual: dismiss "I'll get to it". | No — arrivals are self-evidently paced |
| **Missed for 2 days** | CoachRx "Missed 2+ Workouts in a Row" | **Consecutive missed *scheduled* sessions**, not calendar days (§4.3 #1) | Auto: client completes a session. Snooze: "on holiday" | Yes — this is the churn signal |
| **Expiring Soon** | TrueCoach "Due Soon", Everfit "Program Ending", Kahunas 7-day renewal† | Subscription ends within N days. **Already implemented** — `@expiring_soon_days 7` in `backend/lib/easy/clients.ex` | Auto: renewed or ended. Manual: "not renewing" | Yes — revenue-bearing and time-boxed |
| **Needs Programming** | Everfit **"Need Programming"**, CoachRx "Exercise Due" | **Lookahead**: assigned plan runs out within N days. Not "has no plan" (§4.3 #3). Current `needs_plan` is the lapsed form — worth revisiting | Auto: plan assigned/extended | Yes |
| **Check-in Submissions** | Everfit "Forms to Review" | Submitted and not yet reviewed — **requires a reviewed state**, which Everfit's form-response docs notably lack (§Everfit) | Manual: coach marks reviewed / responds | Yes — has a true zero |

Two additions worth considering, both precedented:

- **"Waiting on you"** — client sent last message, no coach reply (§4.4).
- **"Not contacted this week"** — CoachRx's Touchpoints coverage model: a *coverage* queue that fills
  by default each Monday and drains as the coach makes contact. Different shape from the others and
  the only differentiated pattern found in the market.

## 4.6 Mapping to the current implementation

Verified from the codebase on 2026-08-04:

- **Server-side attention signals already exist** and are exactly three: `intake_incomplete`,
  `needs_plan`, `expiring_soon` (`backend/lib/easy/clients.ex:302-319`; virtual fields on
  `backend/lib/easy/clients/client.ex:34-36`; exposed via
  `backend/lib/easy_web/open_api/schemas/client.ex:94-96`). The list endpoint returns clients matching
  **any** of the three. `@expiring_soon_days 7`.
- **The dashboard priority queue** ranks these client-side as expiring → needs plan → new prospects →
  intake incomplete, with per-row action verbs "Renew", "Assign", "Review", "Nudge", a severity stripe
  and a chip (`frontend/apps/coachapp-v2/src/dashboard/components/priority-queue.tsx`). It already
  implements inline action from the row and severity tone — both aligned with the research.
- **The clients list** has five filter options — `All`, `Active`, `Needs attention`, `Invited`,
  `Inactive` — where "Needs attention" is a *different endpoint*, not a status value
  (`frontend/apps/coachapp-v2/src/clients/list-clients.tsx:32-37`).
- **Messages** is a separate destination at `/messages` with `/clients/:id/messages` for context,
  and per-conversation `unread_count` summed into a total in
  `frontend/apps/coachapp-v2/src/messages/messages-inbox.tsx`. **This is the market-standard shape and
  the research supports keeping it.**

**Gaps between the proposal and the data model:**

| Proposed segment | Data available today? |
|---|---|
| Recently Added | Yes — `inserted_at` + `intake_incomplete` |
| Missed for 2 days | **No** — no server-side notion of consecutive missed *scheduled* sessions |
| Expiring Soon | Yes — `expiring_soon` |
| Needs Programming | **Partial** — `needs_plan` is lapsed ("no active plan"), not lookahead ("runs out within N days") |
| Check-in Submissions | **Partial** — submissions exist and there is a review route (`CHECKIN_REVIEW`), but a persisted **reviewed** state must be confirmed before this segment can drain |

The three signals that already exist map cleanly onto three of the five proposed segments. The two
that don't (missed sessions, lookahead programming) are the two that most need a **schedule-aware**
backend query — and per §4.3 they are also the two most likely to be defined wrongly if rushed.

## 4.7 Open questions this research does not answer

- Whether a coach with 10–200 clients prefers a rail of 5 segments to the current
  dashboard-plus-filters shape. No source establishes this; it is a product test.
- Everfit's form-review state: its Check-in Dashboard has "Forms to Review" / "Review Completed"†
  while its form-response docs document no status field. **The two first-party sources are in tension
  and this should be re-verified.**
- Trainerize's grey auto-tag names, and whether any fitness product documents an explicit dismiss
  action on a computed attention flag. Nothing in this pass found one.
- Whether Intercom's custom views carry counts.
- Whether a Linear Triage issue can be manually returned to Triage after Accept/Decline.
