# UX Spec: Client Onboarding (Invite-Only)

**Date:** 2026-04-15
**Version:** 2 — revised for accurate identity model based on backend reality
**Scope:** From the coach sharing an invite link to the client being logged in
**Design principle:** A client should go from WhatsApp link to logged-in app in under 60 seconds.

---

## The Three-Layer Mental Model

Everything in this spec rests on one idea: **User, Client, and Session are three different things**. Conflating them produces bad UX. Keeping them separate makes edge cases obvious.

### Layer 1: User (global identity)

A User is one real human being. One row per person in the entire system — NOT per coach, NOT per business.

- Owns: email, first and last name, email confirmation status
- Lives forever once created
- Globally unique email
- A single User can be connected to multiple Clients (one per coach they've worked with — now or in the past)

### Layer 2: Client (membership in one business)

A Client is the relationship between a User and a coaching business. If Vikas trains with Rajat, there's one Client row linking Vikas (the User) to Rajat's business. If Vikas later also trains with Ritu, a second Client row is created — same User, different business.

- Owns: invitation token, status (pending/active/inactive/archived), coach-set contact info, notes
- Lives as long as the coaching relationship
- Many Clients can share one User

### Layer 3: Session (current authenticated context)

A Session is "I am logged in right now, on this device, as a Client of this business." The access token carries this context as scope.

- Owns: role (coach/client/guest), business_id, device info
- Lives for the token duration (short-lived, refresh-able)
- Many Sessions per User (one per device or browser)

### Why this matters for the UX

A User can accept invitations from multiple coaches over time. The same email can show up as "pending client for Rajat" and "active client for Ritu" simultaneously. When Vikas logs in, the system needs to know which Client (which business) he's acting as — that's what Session carries.

**Acceptance ≠ authentication.** Accepting an invitation is a one-time act that creates the Client → User link. Authentication is the ongoing act of proving you're the User on every login. These are separate flows with separate surfaces.

---

## The Invite Email Dance

A subtle but important rule:

**The coach's invite email is provisional. The client's accepted email is canonical.**

When a coach creates an invite, they may:
- Enter the client's real email → invite goes to that address, client accepts with same email
- Enter a wrong or approximate email → invite may still go there, but client accepts with a different (correct) email
- Enter no email at all → no invitation email is sent; coach shares the link manually via WhatsApp; client enters their real email at acceptance time

**The email the coach entered is NOT the email of record.** It's just a hint, plus (optionally) where the invite link gets sent. The client's User identity is determined by the email they enter at acceptance — that's the one that gets confirmed via OTP and becomes their login.

This has a surprising implication: **a client can accept an invite with an email the coach has never seen.** The coach learns the client's real email after the fact, when they see the activated Client record.

---

## Flow Overview

```
Coach fills invite form (email optional) for a new client
  ↓
System creates pending Client with invitation_token
  ↓
If coach entered an email, invite email is sent to that address
  ↓
Coach shares the invite link on WhatsApp (belt-and-suspenders)
  ↓
Client taps the link
  ↓
Welcome screen — identifies coach, asks client to confirm email
  ↓
Code sent to whichever email the client entered
  ↓
Client enters code
  ↓
System links Client → User (existing or new)
  ↓
Session is issued, scoped to this business, role=client
  ↓
Lands in app as active client
```

Three client-facing screens. The "confirm the email" step is critical — it accommodates the "coach entered wrong or no email" case cleanly.

---

## Screen 1: Invite Landing Page

The client arrives here when they tap the invite link.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│         FitCoach Pro                             │
│                                                  │
│         Coach Rajat has invited you              │
│                                                  │
│  What's your email?                              │
│  We'll send you a login code.                    │
│                                                  │
│  [vikas@email.com                          ]     │
│                                                  │
│  [Continue →]                                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### What the client sees

- Business name
- Coach name ("Coach Rajat")
- An email input

### If the coach entered an email, the field is pre-filled

```
What's your email?
We'll send you a login code.

[rajats-typo@email.com                       ]
 ↑ pre-filled from the coach's invite — editable

[Continue →]
```

The pre-fill is a suggestion, not a fact. The client can change it if the coach made a typo.

### If the coach didn't enter an email, the field is empty

```
What's your email?
We'll send you a login code.

[                                            ]
 ↑ empty — client types their email

[Continue →]
```

### What's deliberately absent

- No name input — already entered by the coach (if at all)
- No value prop, pricing, or testimonials — the coach already sold this
- No mention of "sign up" or "create account" — there's nothing to create from the client's perspective

### Why the email is asked for (even when pre-filled)

**The coach might be wrong.** Typos happen. The pre-fill gives the client a chance to correct.

**The client might not have received the invite email.** If the coach sent to a wrong or rarely-checked address, the client should be able to override and route the code to their real inbox.

**Transparency.** The client knows exactly where the code will be sent, because they just typed it.

---

## Screen 2: Code Verification

After tapping Continue:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Enter the code sent to                          │
│  vikas@email.com                                 │
│                                                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  │  4 │ │  7 │ │  2 │ │  _ │ │  _ │ │  _ │     │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │
│                                                  │
│  Didn't get it? [Resend code]                    │
│                                                  │
│  Wrong email? [Change it]                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

"Change it" goes back to Screen 1 with the email field focused. The client can correct and re-request.

### On successful verification

Three possible paths, invisible to the client but important for the backend:

**Path A: Brand new User.** The email isn't in the User table. A new User is created and email is confirmed. The pending Client is linked to this new User and activated.

**Path B: Existing User, email already confirmed** (user has been a client of another coach before). No new User. The existing User is linked to this new Client and it's activated.

**Path C: Existing User, email not yet confirmed** (user started signup once but never completed it). OTP flow confirms the email and activates the Client.

In all paths, the client sees one outcome: code verified, lands in the app. But behind the scenes, Path B is where most of the subtle rules live.

---

## The Existing User Problem

The tricky case. Rule: "client may already have a User in the system with another tenant — reuse the existing User, but still require verification."

Here's the scenario:

- Vikas was a client of Coach Ritu 6 months ago. He has a User record with email `vikas@email.com`, email confirmed.
- Rajat now invites `vikas@email.com`. A pending Client is created in Rajat's business.
- Vikas taps Rajat's invite link.

What should happen?

### Wrong approach: skip verification because User is already confirmed

"The email is verified, the User exists, just link them and activate." This is a security hole. If Rajat's WhatsApp is compromised and someone else taps the link, they'd gain access to Vikas's account without any proof of ownership. Unacceptable.

### Right approach: verify every time, even for existing users

The User exists — good, we reuse it. But accepting THIS invitation still requires proving ownership of the email. Send code. Client enters it. Client is linked.

**From the client's perspective, Screen 2 looks identical** whether their User is new or existing. They type an email, they get a code, they enter it. Done.

Behind the scenes:
- Brand new email → create User, send confirmation code
- Existing unconfirmed User → reuse User, send confirmation code
- Existing confirmed User → reuse User, send a fresh authentication code

The client ALWAYS verifies on the invite flow. No exceptions. The Client → User link is created only after verification succeeds.

### What happens to the User's existing sessions in another business?

Vikas might be logged into Ritu's app on another device. When he accepts Rajat's invite, his Ritu session is not affected — Sessions are scoped to a business, so Rajat's new Session and Ritu's existing Session can coexist on different devices.

On the *same* device, they can't both be active at once (there's one auth token per browser/app install). The new Session replaces the old. If Vikas wants to switch back to Ritu's app, he logs in again and selects that business — but that requires multi-business support.

---

## MVP Constraint: One Active Client per User

To avoid multi-business complexity for MVP, enforce this rule:

**A User can have at most one active Client at a time.**

If Vikas is currently active under Ritu and Rajat tries to invite him, two possible behaviors:

**Option A (recommended): Invite creation fails with a message.**

On the coach's side, when Rajat tries to create the invite:

> "This email is already an active client of another business. That client must be archived before you can invite them here."

Rajat messages Vikas. Vikas asks Ritu to archive him, OR Vikas self-archives if there's a "leave coach" action. Then Rajat's invite can proceed.

This requires coordination but keeps things explicit.

**Option B: Invite succeeds and acceptance "displaces".**

When Vikas accepts Rajat's invite, his Ritu Client is automatically archived. Silent transition.

This is destructive and surprising — Vikas might not realize he's "leaving" Ritu. Rejected.

**Recommendation: Option A.**

The error must be enforced at invite-creation time, not at acceptance time, so Rajat knows immediately. He can't find out 30 minutes later that his invite is stuck.

Post-MVP: allow concurrent memberships with a business picker on login.

---

## Status Transition Rules (Critical — New Invariants)

The status field on Client is tightly controlled. These rules are new in this revision.

### The rules

| From → To | Allowed | Who | When |
|-----------|---------|-----|------|
| pending → active | Yes | System | Only via accept-invite flow |
| pending → inactive | No | — | Invitation must be accepted or revoked; no skipping |
| pending → archived | No | — | Same reasoning |
| pending → (deleted) | Yes | Coach | "Revoke invitation" action |
| active → inactive | Yes | Coach | Manual change |
| active → archived | Yes | Coach | Manual change |
| active → pending | No | — | Irreversible. Once linked to a User, never goes back. |
| inactive → active | Yes | Coach | Reactivate |
| inactive → archived | Yes | Coach | Cleanup |
| inactive → pending | No | — | Same reason |
| archived → active | Yes | Coach | Unarchive |
| archived → inactive | Yes | Coach | Re-categorize |
| archived → pending | No | — | Same reason |

### Why these rules

**pending → active requires acceptance.** This is the only path that creates the Client → User link. Manually "marking a client as active" would produce a Client with no User link — broken.

**active/inactive/archived can never return to pending.** Once the Client is linked to a User, that link is permanent. "Pending" is specifically "no User link yet." A Client that had one stays that way, even if archived.

If a coach wants to re-engage an archived client, they reactivate (archived → active). No new invitation needed — the User is already linked. The client can log in directly.

If the coach wants to start over with a different User (client changed emails, etc.), they create a fresh Client record with a new invitation.

### UI implications

The only thing restricted for pending clients is **status change**. Everything else about managing the client — preparing plans, adjusting details, taking notes — works normally. The coach often wants to get plans ready BEFORE the client arrives, so when they open the app for the first time their plan is waiting.

**For pending clients — the detail page looks like this:**

```
┌──────────────────────────────────────────────────┐
│ Vikas                                            │
│ ┌ Pending ┐  Invited Mar 25, 2 days ago          │
│                                                  │
│ ─── Invitation ──────────────────────────────    │
│                                                  │
│  Share this link with Vikas to onboard them:    │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │ coachapp.in/invite/abc123…   [Copy]    │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  [📱 Share on WhatsApp]  [📧 Resend email]      │
│  [Revoke invitation]                             │
│                                                  │
│ ─── Contact ─────────────────────────────────    │
│  Email: vikas@email.com                          │
│  Phone: +91 98765 43210                          │
│  [Edit]                                          │
│                                                  │
│ ─── Plans ───────────────────────────────────    │
│  Training: [+ Assign training plan]              │
│  Nutrition: [+ Assign nutrition plan]            │
│                                                  │
│ ─── Notes ───────────────────────────────────    │
│  [Add a note…]                                   │
└──────────────────────────────────────────────────┘
```

**What works normally for pending clients:**

- Edit contact info (name, email, phone, notes)
- Assign training and nutrition plans (so they're waiting when the client logs in)
- Add coach notes
- All preparation work the coach wants to do ahead of time

**What's blocked for pending clients:**

- Status change — no dropdown shown; the status is locked at Pending until acceptance
- Anything that requires client-side activity (logs, progress entries) — these can't exist yet because the client hasn't logged in

**Why this matters:** Coaches often onboard several clients at once. They want to prepare everything in advance so when Vikas opens the app, his training and nutrition plans are ready on day one. Blocking plan assignment until acceptance would force the coach to do setup AFTER the client is waiting — exactly the wrong order.

---

### The "Share invitation" Widget (new)

A dedicated widget that appears at the top of any pending client's detail page. This is the coach's primary tool for getting the invitation to the client.

```
┌──────────────────────────────────────────────────┐
│ Invitation                                       │
│                                                  │
│  Share this link with Vikas to onboard them:    │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │ coachapp.in/invite/abc123…   [Copy]    │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  [📱 Share on WhatsApp]  [📧 Resend email]      │
│                                                  │
│  Invited Mar 25, 2 days ago.                    │
│  Invitation expires in 28 days.                 │
│                                                  │
│  [Revoke invitation]                             │
└──────────────────────────────────────────────────┘
```

**Widget elements:**

**The invite URL with a Copy button.** The URL is shown truncated but selectable. Tapping Copy copies the full URL and shows a brief "Copied!" confirmation.

**"Share on WhatsApp" (primary action).** Opens WhatsApp with a pre-filled message:

> "Hi Vikas, I've set up your coaching profile. Tap this link to get started:
> coachapp.in/invite/abc123…"

If the client's phone number is known, it deep-links to their chat: `wa.me/{phone}?text={message}`. Otherwise it opens WhatsApp's "send to" picker.

**"Resend email" (secondary action).** Re-sends the invitation email to whatever email is on the pending Client. Shows a confirmation toast: "Invitation email sent to vikas@email.com." Disabled if the Client has no email.

**Timestamp and expiry info.** "Invited Mar 25, 2 days ago. Invitation expires in 28 days." Builds the coach's awareness that invitations don't live forever.

**"Revoke invitation" (destructive action).** Tucked to the side/bottom, styled less prominently. Confirmation dialog: "Revoke this invitation? Vikas's link will no longer work. You can re-invite them later."

### When the widget disappears

The moment the client accepts the invitation, the Client's status changes from pending to active. The invitation widget is removed from the detail page — it's no longer relevant. The coach is shown a toast or inline confirmation (possibly on their next visit to the page): "Vikas accepted your invitation" so they know the work is done.

### Widget placement

The invitation widget is the FIRST section of a pending client's detail page, above contact info. Why? Because the coach's most urgent task on a pending client is getting them to accept. Everything else (plans, notes) is prep work that can wait.

---

**For active/inactive/archived clients:** Status dropdown with those three options. Never pending. The invitation widget does not appear.

```
Active client
Status: [Active ▾]
          ├── Active
          ├── Inactive
          └── Archived
```

### Deleting a pending client (revoke)

This is a hard delete — the pending Client row is removed. Why not soft-delete by marking archived? Because pending clients aren't real yet. They're waiting-to-exist. Cleaning them up is fine.

Coach UI confirmation: "Revoke this invitation? Vikas's link will no longer work. You can re-invite them later with a new email if you need to."

**What happens to plans already assigned to a pending client if the coach revokes?** The plans are deleted with the Client. This is fine — nothing was ever logged against them. If the coach wants to reuse those plans for a different client, they would have built them as templates first (per the personal-vs-template spec), and the templates remain.

---

## Invite Link States

From the client's perspective, the invite link resolves to one of four states:

### Pending (normal)

Coach created the invite, client hasn't accepted. Welcome screen shows normally.

### Used (invitation already accepted)

Once a Client is activated, its invitation_token is cleared. A stale link (from a found-later WhatsApp message, etc.) doesn't match any pending invitation.

The client sees:
> "This invitation has already been accepted. Log in to continue."

With a "Log in" button that takes them to the login flow.

### Expired

The token exists but too much time has passed (e.g., 30 days since invitation_sent_at).

The client sees:
> "This invitation has expired. Ask your coach to send a new one."

No self-service recovery — the coach must resend.

### Revoked / not found

The coach deleted the pending Client, or the token is wrong. From the client's POV, we don't distinguish these — both are "not found."

> "This invitation is no longer valid. Contact your coach."

---

## Edge Cases

### Client changes email on Screen 1 to something different from what the coach entered

Coach entered `vikas@gmail.com`. Client types `vikas@outlook.com` and proceeds.

- Code goes to `vikas@outlook.com`
- Client verifies with that email
- Client record is activated and linked to a User with `vikas@outlook.com`
- The coach's originally entered email (`vikas@gmail.com`) is overwritten by the client's actual email

The coach, viewing the activated Client, sees `vikas@outlook.com` — not the email they typed. This might be briefly surprising but it's correct. The coach's entered email was a guess; the client's verified email is reality.

**UX decision:** Show the activated client's email prominently on the detail page. The coach quickly learns "oh, this is the email the client actually uses."

The invite email that went to the coach's guessed address is now useless — the link in it points to an already-used invitation.

### Existing User has a different name than what the coach entered

Coach entered "Vikas" as first_name. But the User (linked later) has first_name "Vikas Kumar" from a previous coach relationship.

**Rule: the User's name wins, since it's global.**

The Client record can still have its own first_name/last_name (useful for coach-specific labels like "Vikas K. - Pune gym"). For MVP, keep it simple: after acceptance, set the Client's first_name/last_name to the User's values (or leave the Client's name field empty and always display the User's name).

Display priority on the client detail page:
1. User's name (authoritative)
2. Coach's Client-level override (if set, shown as a secondary label)

### Coach invited the wrong person and they accepted

Rajat meant to invite `vikas.kumar@email.com` but typed `vikas.kamal@email.com`. Vikas Kamal (a stranger) received the invite and accepted.

Now there's an active Client in Rajat's business that shouldn't exist. The Client → User link is real, the User is a real person — just not the intended person.

**Resolution:** Rajat archives the mistaken Client. The User (Vikas Kamal) is unaffected — they just have an archived relationship with Rajat's business. No data is lost. Rajat creates a fresh invitation with the correct email.

Do NOT try to "undo" the acceptance. Archive is sufficient. Attempting to reverse the User link introduces fragile reversal paths.

### Coach changes the invite email on a pending Client

Coach realizes they typed wrong. They edit the pending Client and change the email.

**Should this invalidate the old token?** The token is stored on the Client record, not tied to the email. Changing the email alone doesn't invalidate it — the link is still technically valid.

But the link was sent to the wrong email, so the intended client never got it. Practically, the coach needs to either:
- Resend invitation to the new email (keeps the same token, sends a new email)
- Or the coach shares the link manually on WhatsApp

**UX recommendation:** When the coach edits a pending Client's email, show a prompt:

> "Resend invitation to the new email?"
>
> [Resend] [Just save]

Default to "Resend" — it's the desired action 90% of the time.

### Coach tries to invite their own email (as a client of their own business)

Rajat tries to invite `rajat@email.com` (his own email) in his own business.

**Backend should reject** with:
> "You can't invite yourself as a client."

Shown inline on the invite form.

### Client taps invite link while logged in as a coach on the same device

Rajat tests his own app and taps a client invite link.

**Landing page detects the active coach session** and shows:

> "You're currently logged in as a coach. Log out first if you want to accept this invitation."
>
> [Log out] [Cancel]

Don't allow silent session switching — too confusing.

### Client is both a coach and a client (different emails)

Rajat (a coach) uses `rajat@coachapp.in`. Jaya (Rajat's personal trainer) invites him using his personal email `rajat.personal@email.com`. Rajat accepts.

Now there are two Users in the system for Rajat: `rajat@coachapp.in` (his coach User) and `rajat.personal@email.com` (his client User). They are separate User records because emails are unique.

This is fine for MVP. The only case that fails is if Rajat tries to use the same email for both — and the system rejects that (see above).

### Client logs in with email that maps to multiple Users

Impossible — email is globally unique on Users.

### Client logs in with an email that has no active Client

Three sub-cases:

1. **No User exists:** "No account found for this email."
2. **User exists, no Clients at all:** Same message. Don't hint that they're "not invited yet" (privacy).
3. **User exists, all Clients pending/inactive/archived:** Same message. "No active account. Contact your coach."

For all three, don't reveal the internal state. Just: "no active account."

---

## Returning Client Login

After acceptance, Vikas is an active Client. Future visits:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Log in                                          │
│                                                  │
│  Email                                           │
│  [vikas@email.com                          ]     │
│                                                  │
│  [Send code →]                                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

Enter email → receive code → verify → land in app. No invitation link needed.

### Under MVP constraint (one active Client per User)

Login lands the user in their one active business. No picker needed.

### Post-MVP: multi-business picker

After code verification, if the User has multiple active Clients:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Which account?                                  │
│                                                  │
│  ┌────────────────────────────────────────┐      │
│  │ FitCoach Pro                            │      │
│  │ Coach Rajat · joined Mar 2026           │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  ┌────────────────────────────────────────┐      │
│  │ Strong Life                             │      │
│  │ Coach Ritu · joined Sep 2025            │      │
│  └────────────────────────────────────────┘      │
│                                                  │
└──────────────────────────────────────────────────┘
```

Client taps the account they want. Session is scoped to that business.

---

## Copy Decisions

### "Invitation" not "invite" (as a noun)

"You've been invited" feels formal and real. "An invite" sounds casual. Use "invitation" in user-facing copy. The verb "invite" is fine on the coach side ("Invite a client").

### "Log in" not "sign in"

Both work but "log in" is slightly more common in Indian English and reads neutral.

### "Login code" not "OTP" or "verification code"

- "OTP" is a technical acronym; clients may not know it
- "Verification code" is accurate but cold
- "Login code" tells them what it does in plain language

### Welcome screen

"Coach Rajat has invited you" — uses the coach's actual first name. Personal.

"We'll send you a login code" — not "enter your email." The client knows WHY they're typing email.

### Code screen

"Enter the code sent to vikas@email.com" — clear, specific.

"Wrong email? Change it" — gives them a way back.

### Error messages

- Expired link: "This invitation has expired. Ask your coach to send a new one."
- Used link: "This invitation has already been accepted. Log in to continue."
- Revoked/not found: "This invitation is no longer valid. Contact your coach."
- Wrong code: "Incorrect code. Try again."
- Too many attempts: "Too many attempts. Try again in 10 minutes."
- Email already active elsewhere (coach-side): "This email is already an active client of another business."

All error messages give the user a next step. Never a dead end.

---

## UX Risks

### Risk 1: Client has no email

The coach can invite without an email, but the client must supply one at acceptance (that's where the code goes). For MVP, coaches working with email-less clients must help them create an email, or defer onboarding until the client has one.

Post-MVP: SMS / WhatsApp OTP as an alternative channel.

### Risk 2: Coach typo in invite email

Coach typed `vikas@gmial.com`. Invite email bounces. Client never receives anything through email.

**Mitigation:** Two channels.
- Coach gets the invite URL in their UI. They share it on WhatsApp directly (the primary channel).
- On Screen 1, client corrects the email before sending the code.

Email is never the critical path. WhatsApp + the link is.

### Risk 3: Client uses a different email at acceptance than coach expected

Harmless but occasionally confusing for the coach. The client detail page surfaces the accepted email prominently so the coach learns it immediately.

### Risk 4: Invite link leaked, attacker uses their own email to accept

This is the one new risk introduced by "client can use any email at acceptance." An attacker with the URL could accept with their own email, becoming an active Client.

**Mitigation:**
- Tokens are single-use — only one acceptance succeeds
- Coach sees the accepted email — if it looks unfamiliar, they archive immediately
- Post-MVP: bind the token to the coach's entered email, require match at acceptance (but this breaks the "wrong email" repair use case, so only do this when we're confident there's little risk of coach typos)

For MVP: accept the risk. Coach's vigilance + single-use tokens is sufficient.

### Risk 5: Existing User collision

Handled by the "one active Client per User" MVP constraint. Second invite fails at creation time with a clear error.

### Risk 6: Coach legitimately wants to add same email to different businesses

Some coaches run multiple businesses (e.g., a personal coaching brand and a gym). They may want the same client in both.

**MVP answer:** Not supported. One active Client per User. The coach picks one business.

**Post-MVP:** Multi-business membership per User.

---

## What's NOT in This Spec

- Specific API routes, endpoint shapes, or code
- Database migrations or schema DDL
- Visual design system (colors, typography, spacing)
- The coach-side invite form and resend flow — see `ux-improvements-client-invitation.md`
- App structure once the client is logged in — see `ux-spec-client-app-shell.md`
- The emotional/engagement layer (streaks, PR celebrations, etc.) — see `ux-spec-client-experience-improvements.md`

This spec is purely about getting an identified human into an authenticated session scoped to one business, with all the edge cases handled.
