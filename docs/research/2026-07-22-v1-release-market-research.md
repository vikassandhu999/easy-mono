# CoachEasy v1 release market research

**Research date:** 2026-07-22  
**Status:** Complete — competitive, coach-behaviour, repository, and live-production findings are integrated.  
**Audience:** Product and engineering  
**Target customer:** Independent online or hybrid fitness/nutrition coaches, with India as CoachEasy's current stated home market.

## Release decision

**No-go today; go for an invite-only web/PWA pilot after the P0 repairs below.**

CoachEasy is not blocked by a missing category. It already supports the core loop from lead or invitation through intake, training and nutrition delivery, workout and meal logging, weight and photo evidence, recurring check-ins, review, and contextual chat. The current release is blocked because the deployed frontends and backend are incompatible, required production configuration is absent, the public site promises unsupported products and prices, and a few security/data-integrity boundaries are not safe enough for external users.

The recommended v1 is a controlled cohort of roughly 5–10 coaches and 5–20 clients per coach on the web/PWA. Native stores, client-payment processing, team/studio breadth, AI, integrations, and advanced automation should not delay that pilot.

## Current-system audit — 2026-07-22

### What is working

- The backend suite passes: **957 tests, 0 failures**.
- CoachApp, ClientApp, and website production builds pass independently.
- `just check-rm` and `git diff --check` pass.
- A local authenticated Chrome pass proved the coach dashboard, clients, library, messages, prospects, settings, and the client's Today, training, nutrition, check-ins, messages, progress, and settings routes render without horizontal overflow or console errors in the sampled states.
- The coach dashboard already combines check-ins awaiting review, expiring clients, missing plans, new leads, incomplete intake, and recent conversations. Do not rebuild a second generic task system before learning where this one fails.

### P0 release blockers

1. **The deployed product is not one version.** Vercel deployed the coach and client apps from current `main` on July 21, while Fly still runs backend release v13 from July 4. Live OpenAPI exposes 105 paths versus 131 in the repo. The deployed client bundle calls `/v1/client/conversation`, `/v1/client/uploads`, `/v1/client/attachments/download-urls`, and the nutrition option-switch route, all of which return 404 from the live backend. The coach bundle likewise calls current billing, conversations, team, and attention routes that the live API does not expose.
2. **The current backend cannot simply be deployed.** Fly lacks the private-storage and Razorpay variables that production now requires at boot; the public-media branch adds a second public bucket and CDN origin. Provision them, or deliberately exclude/feature-gate those capabilities for the pilot. Keep Fly as the one v1 backend target instead of simultaneously migrating to DigitalOcean.
3. **The release path does not seed what its runbook promises.** `fly.toml` runs `bin/migrate`, which invokes migrations only; seeding is a separate release function. Add an explicit idempotent production seed step or run and verify it manually before accepting a coach.
4. **Authentication needs public-use hardening.** Login OTPs have no enforced expiry, request/resend/failed-attempt limits are absent, login initiation reveals whether an account exists, and losing the guest session after signup can strand business creation. Add expiry, normalization, throttling, attempt limits, and restart recovery before open signup.
5. **Marketing materially overstates the product.** The website advertises client UPI/card payments, group chat, AI website building, advanced analytics, white label, bulk operations, API access, a 14-day trial, and INR 99/79 per-client pricing. The product currently charges the coaching business INR 499 for each paid seat after two free seats and does not collect a coach's fees from clients. Delete or rewrite the claims; do not build eight products to rescue old copy. Remove or label unsupported testimonials/personas and aggregate-rating structured data.
6. **Public navigation and metadata are inconsistent.** `coacheasyapp.com` works, but canonical URLs, Open Graph metadata, sitemap, and robots point to non-resolving `coacheasy.app`. The Vercel website project's root is still `apps/website` instead of `frontend/apps/website`, so it has not deployed for 44 days. The production coach bundle also contains the landing-site fallback `http://localhost:3000`.
7. **Security and data lifecycle are unfinished.** Rotate the tracked development mail/payment credentials; make production HTTP and websocket origins fail closed; revoke live sockets when access is removed; publish privacy, terms, retention, and support/contact pages; define a manual pilot deletion request; and ensure deleting a client/business or abandoning an upload removes stored media.
8. **A handful of correctness gaps sit on the core path.** Require valid dates and an active reusable source for training assignment; restore exercise `tracking_type` parity; define and enforce completed-workout immutability; prevent serving-only recipes from becoming unloggable plans; and make full-capacity invitation acceptance either succeed into a recoverable waiting state or fail honestly.
9. **The checkout is not taggable yet.** `feat/public-library-media` is four commits ahead of `origin/main`, and a substantial client-detail redesign is uncommitted. The three deployable apps build, but the root workspace build fails because `@easy/typings` still references deleted `src/coach/index.ts` and `src/client/index.ts` entries. Finish or exclude the dirty work and make the documented release command green.

### Required production acceptance path

After one synchronized deployment, run this with real email and separate coach/client accounts:

`coach signup -> business -> seeded starter plan -> client invite -> acceptance -> dated training and nutrition assignment -> workout -> meal -> weight -> check-in/photo -> coach review -> message -> landing application -> prospect enrollment`

The existing smoke script passing is insufficient: it currently checks health, OpenAPI availability, and landing-route presence, and passed even while the deployed frontend bundles depended on 404 routes.

## Coach-behaviour research

The repeated professional loop is:

`assess safely -> agree goals -> prescribe -> client acts and logs -> coach sees exceptions -> gives specific feedback -> adapts -> repeat`

The [ACSM Certified Personal Trainer outline](https://www.acsm.org/wp-content/uploads/2024/12/ACSM-Certified-Personal-Trainer-Exam-Content-Outline.pdf) treats health history, informed consent, possible medical clearance, shared goals, technique monitoring, adherence support, documentation, feedback, and reassessment as core work. CoachEasy is strong from goal setting onward; its default intake asks about goals, experience, equipment, injuries, diet, allergies, activity, sleep, and stress, but does not record adequate readiness/clearance and consent.

A [2024 umbrella review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11545567/) covering 26 systematic reviews and 614 original studies found goals/planning, feedback/monitoring, social support, and shaping knowledge among the most consistently useful behaviour-change components. A [systematic review and meta-regression](https://pubmed.ncbi.nlm.nih.gov/28351367/) similarly associated goal setting and self-monitoring with activity outcomes and found longer-term differences related to autonomy-supportive counselling and outcome feedback. These are intervention-level findings, not proof that a software feature independently causes retention.

NASM's [2026 State of the Personal Trainer report](https://2494739.fs1.hubspotusercontent-na1.net/hubfs/2494739/2026-State-of-Personal-Trainer-Report-by-NASM.pdf), based on 1,133 active certified US trainers, reports an average 26-client roster and says independent trainers spend nearly 30% of their time on non-coaching work. Higher-performing trainers more often operationalize remote check-ins, habit tracking, and broader lifestyle coaching. The sample is US-based and provider-sponsored, so use it as workflow evidence rather than a causal market estimate.

CoachEasy's existing weekly check-in is unusually well aligned with that loop: weight/photos, energy, sleep, stress, training and nutrition adherence, hunger, wins, challenges, and questions, followed by a review queue and a direct handoff into chat. The product should automate remembering, gathering, surfacing, and delivering; it should leave interpretation and adaptation to the coach.

## Smallest feature list before release

### Before the invite-only pilot

1. **Reliable asynchronous alerts.** Use the existing email infrastructure for new direct messages, submitted check-ins to coaches, and coach feedback/new assignment to clients. Keep existing due/overdue check-in email. Do not build notification preferences, digests, SMS, or an automation engine yet.
2. **Correct exercise execution.** Let a coach choose `tracking_type` for a custom/copied exercise and verify that the small production exercise catalogue has playable, authorized demonstrations. Keep the current single-media model.
3. **A tiny starter experience.** Seed one editable sample training plan plus the existing onboarding/check-in templates and verify global foods/exercises. Do not build a marketplace or dozens of generic programmes.
4. **Safe intake and consent.** Extend the existing snapshot-based intake with readiness/clearance questions and a versioned required consent/waiver acceptance. Use the form completion timestamp; do not build a general e-signature platform.
5. **Honest capacity behavior.** Fix the waiting-for-seat acceptance transaction, or hide paid expansion and manually grant pilot seats until it is fixed.

### Before a broad paid launch

- Add a new-application alert and a honeypot or rate limit to the public form.
- Preserve unfinished check-in answers across ordinary navigation/upload failure and make retries duplicate-safe.
- Make prospect enrollment transactional/idempotent.
- Exercise real Razorpay test checkout, webhook, reconciliation, and cancellation paths.
- Add 3–5 repeatable browser tests for the critical path; do not introduce a large test framework first.
- If shipping through Apple or Google stores rather than PWA only, add in-app account deletion plus the required public deletion path before submission: [Apple guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app), [Google Play guidance](https://support.google.com/googleplay/android-developer/answer/13327111).

### Four-week release bar

One coach must be able to take 5–20 real clients through four consecutive weeks without a spreadsheet and without silently missing a lead, message, check-in, safety issue, or plan change. If that works, competitive and behavioural evidence does not support waiting for the long tail of features.

## Competitive verdict

CoachEasy already has enough product breadth for a credible, useful v1. It covers the full 1:1 coaching loop: acquisition, invitation, intake, training and nutrition authoring, client execution, progress, recurring check-ins, review, and direct messaging. Shipping is not blocked by a lack of AI, wearables, communities, video calls, white-label apps, or automation.

The market evidence points to a much narrower pre-release list:

1. Make the core training experience trustworthy: production starter content, playable exercise demonstrations, and the correct tracking type for coach-created exercises.
2. Give coaches and clients a reliable signal when something needs attention, especially a new message or due check-in.
3. Prove the client mobile install/login/workout/log/check-in/chat loop in the production channel.
4. Repair or hide incomplete invitation/capacity states.
5. Make the public promise match the product. The current website advertises client UPI/card payments, group chat, AI website building, white-labeling, bulk operations, advanced analytics, and prices that the product does not currently support.

The fastest defensible launch is therefore a focused **1:1 coaching system for Indian coaches**, not an attempt to match the total feature count of mature platforms.

## Method and caveats

- CoachEasy's baseline comes from [`docs/onboarding.md`](../onboarding.md), the current [`docs/product-capabilities/`](../product-capabilities/) contracts, and selected current implementation files where those contracts lag recent work.
- Competitor claims come from current first-party product, pricing, and help-centre pages. Public omission is not proof that a feature is absent; it is safe evidence of what that competitor actively sells and onboards customers around.
- Prices below are public monthly USD prices unless stated otherwise. Taxes, annual discounts, promotions, exchange rates, payment fees, and enterprise quotes are intentionally excluded.
- The direct comparison set is ABC Trainerize, TrueCoach, Everfit, PT Distinction, and Kahunas. Practice Better was excluded because it is a broader health-practice platform rather than one of the closest fitness-coaching delivery products.

## CoachEasy's current product baseline

The current capability contracts support:

- passwordless coach signup, business creation, trainer/client invitations, and two free client seats;
- reusable and client-specific training plans, weekly scheduling, workout execution, freestyle workouts, and performed-set history;
- reusable foods, recipes, meals, meal-plan options, client food logging, and planned-versus-logged history;
- configurable onboarding and check-in forms, recurring schedules, due/overdue email reminders, photo and weight answers, immutable submission snapshots, and a coach review queue;
- one durable coach-client conversation with text, image/video/audio attachments, voice notes, unread state, realtime delivery while connected, and check-in references;
- weight tracking, a public coach landing page, applications, a lightweight prospect pipeline, and conversion from prospect to pending client;
- owner/trainer team membership and INR/Razorpay billing for CoachEasy's own client seats.

Important limits for this comparison:

- Messaging has no push or email notification when the app is closed (`docs/product-capabilities/messaging.md`).
- Coach-created exercises still default to `weight_reps`; create/update requests do not expose tracking type (`docs/product-capabilities/exercise-library.md` and `backend/lib/easy_web/open_api/schemas/exercise.ex`).
- Current code now supports coach-uploaded public image/video media for exercises and foods, but the capability documents predate it. The seeded system exercise catalogue's playable-video coverage in production still needs verification (`backend/lib/easy/library_media.ex`, `frontend/apps/coachapp-v2/src/exercises/exercise-detail.tsx`).
- The full over-capacity invitation-acceptance flow is incomplete and rolls back instead of reliably placing the client in a waiting state (`docs/product-capabilities/authentication-and-invitation-acceptance.md`).
- CoachEasy bills the coaching business. It does **not** currently collect a coach's fees from clients, despite the marketing site claiming UPI/card payment processing.

## Direct competitor snapshot

| Competitor | Public entry and onboarding | What it clearly sells | Friction or implication for CoachEasy |
|---|---|---|---|
| **ABC Trainerize** | Free for one coaching client; Grow starts at $9/month for two; a 30-day trial is advertised without a credit card. Its product includes mobile apps, workout tracking, basic nutrition, messaging, groups, and progress tools. [Pricing](https://www.trainerize.com/pricing/) | Deep workout content, meal tracking/planning, habits, groups/challenges, appointments, payments, product delivery, referrals, teams, wearables, and branded apps. Business, advanced nutrition, payments, video coaching, and branded apps are sold as add-ons or higher-plan capabilities. [Features](https://www.trainerize.com/features/) | The breadth and add-on matrix create a strong opening for a narrower product with one clear feature set. CoachEasy cannot yet match Trainerize's prebuilt exercise/video content, notifications, habits, community, scheduling, or integrations. |
| **TrueCoach** | Starter is $26.34/month for five active clients; Standard is $57.99 for 20; Pro is $136.99 for 50. A 14-day no-card trial is offered, and client invitations are marketed as an under-two-minute email/text flow. [Pricing](https://truecoach.co/pricing/) | Program builder, 3,500+ exercise videos, realtime multimedia messaging, progress metrics, MyFitnessPal nutrition, habits, Stripe payments, public profiles, wearables, branding, and Zapier. [Pricing and features](https://truecoach.co/pricing/) | CoachEasy is materially stronger in structured forms/check-ins and native meal-plan execution. TrueCoach's own help centre still recommends modelling questionnaires and weekly check-ins inside its workout builder rather than a dedicated form workflow. [TrueCoach help](https://help.truecoach.co/en/articles/3363240-waivers-questionnaires-assessments-and-check-in-s) |
| **Everfit** | Free forever for five clients; Pro starts at $19/month for five; no credit card is required to start. [Pricing](https://everfit.io/pricing/) | Workout programming, 1,000+ exercises, body metrics/photos, tasks, direct multimedia chat, coach/client apps, forms, habits, nutrition, payments, packages, automation, groups, and a coach check-in dashboard. Its public checkout supports one-time and recurring offers and account activation. [Pricing](https://everfit.io/pricing/), [forms](https://help.everfit.io/en/articles/6633667-how-to-create-forms-questionnaires), [check-in dashboard](https://help.everfit.io/en/articles/14495409-coach-check-in-dashboard-beta), [purchase flow](https://help.everfit.io/en/articles/5719215-understanding-the-purchase-process) | This is the closest breadth competitor. CoachEasy has no defensible generic "all in one" advantage over Everfit. It has to win through India fit, workflow clarity, and lower cognitive load. Everfit's $29/month Autoflow add-on also shows that advanced automation need not be in v1. [Automation pricing](https://help.everfit.io/en/articles/5482654-automation-pricing) |
| **PT Distinction** | Basic is $19.90/month for three clients, Pro is $59.90 for 25, and Master is $89.90 for 50. Every plan is marketed with the full feature set. The one-month trial automatically becomes a subscription unless cancelled. [Pricing](https://www.ptdistinction.com/pricing) | iOS/Android/web client access, custom branding, prebuilt videos and programs, workout programming, nutrition, habits, assessments, scheduled email/SMS/app messages, automation, groups, payment/package sales, integrations, and technique review. [Features](https://www.ptdistinction.com/features) | "All features included" is not unique to CoachEasy. CoachEasy can offer a simpler no-trial-clock start for two clients, but PT Distinction is far ahead on starter templates, exercise video, scheduled communication, integrations, and business automation. |
| **Kahunas** | Essentials is $35/month for 25 clients with a 14-day trial and 1:1 live onboarding; Growth is $69 for 50; Ultimate is $99 for unlimited clients and branded iOS/Android apps. [Product and pricing](https://kahunas.io/) | Custom check-ins and habits, workouts, 1,000+ exercise videos, 1.6 million verified foods, nutrition logging/plans, voice messaging, content libraries, payments, lead forms, automation, calendar, wearables, and branded apps. [Product and pricing](https://kahunas.io/) | Kahunas compresses 25 clients into one roster tier, while CoachEasy's current price grows for every client after two; CoachEasy must validate its scale value before claiming a price advantage. Kahunas holds lead generation for Growth, while CoachEasy can potentially include application-to-prospect-to-invite at entry level. |

## What is table stakes for this v1

### 1. A client-first mobile delivery loop

All five competitors lead with an iOS/Android client experience or mobile app, not just a coach-side web builder: [Trainerize](https://www.trainerize.com/pricing/), [TrueCoach](https://truecoach.co/pricing/), [Everfit](https://everfit.io/pricing/), [PT Distinction](https://www.ptdistinction.com/features), and [Kahunas](https://kahunas.io/).

CoachEasy already has a mobile-first PWA/Capacitor client app. The release requirement is not another mobile feature; it is one verified production journey:

`accept invite -> install/open app -> log in -> see today's work -> complete workout -> log food/weight -> submit check-in -> exchange message`

If that path is not available through the intended distribution channel, v1 is not ready regardless of coach-side feature count.

### 2. Useful starter content and playable exercise instruction

Competitors make immediate content availability part of the purchase promise: TrueCoach advertises 3,500+ professional exercise videos; Everfit and Kahunas advertise 1,000+; PT Distinction includes pre-made exercise videos and program templates; Trainerize advertises professionally built exercises, workouts, and complete programs. [TrueCoach](https://truecoach.co/pricing/), [Everfit](https://everfit.io/pricing/), [Kahunas](https://kahunas.io/), [PT Distinction](https://www.ptdistinction.com/features), [Trainerize](https://www.trainerize.com/features/)

CoachEasy has a seeded global exercise catalogue and newly added coach-uploaded media, but a coach should not meet an empty production library or a thumbnail where a demo should play. A tiny verified starter pack is enough for v1; a marketplace or AI builder is not.

Minimum acceptable shape:

- production contains the intended global exercises, muscles, equipment, and foods;
- seeded exercises expose their existing playable demonstrations where licensed/authorized;
- a coach can set the correct tracking type on a custom or copied exercise;
- one small editable sample training plan demonstrates the builder without pretending to prescribe a universal programme.

### 3. One reliable out-of-app attention channel

Competitors actively sell push/email reminders and notifications: TrueCoach advertises push and email notifications; Trainerize sends push notifications for scheduled check-ins; Everfit includes reminders and push-capable client apps; PT Distinction includes scheduled email, SMS, and app messages; Kahunas includes email, chat, and push automations. [TrueCoach](https://truecoach.co/pricing/), [Trainerize check-ins](https://help.trainerize.com/hc/en-us/articles/31369316335124-Sharing-Check-In-Forms-with-Clients), [Everfit](https://everfit.io/pricing/), [PT Distinction](https://www.ptdistinction.com/features), [Kahunas](https://kahunas.io/)

CoachEasy realtime chat works only while connected, and only check-in due/overdue email exists. For v1, implement the smallest reliable alert for:

- a new coach-client message; and
- a due or overdue check-in.

Use the existing FCM design if its operational prerequisites are ready (push-notifications design, deleted in the 2026-07-25 docs cleanup — see git history). Otherwise, email is an acceptable v1 fallback. Do not build preferences, digest rules, presence suppression, or a general automation engine yet.

### 4. Training, progress, messaging, and nutrition

These are category basics, and CoachEasy already has them. Trainerize itself summarizes the five core buying criteria as programme delivery with exercise content, client communication, progress tracking, payments, and automated check-ins. That source is biased toward Trainerize, but the other four product pages corroborate the pattern. [Trainerize category guide](https://www.trainerize.com/blog/online-coaching-platforms/)

CoachEasy's missing client-payment capability does not have to block a deliberately scoped first release. It does, however, block any promise that CoachEasy replaces Razorpay/UPI collection.

## What CoachEasy can defensibly be better at

### 1. One coherent application-to-accountability workflow

The strongest product story is not any isolated feature. It is the connected sequence:

`coach landing page -> application -> prospect review -> client invitation -> structured onboarding -> assigned training/nutrition -> daily logging -> scheduled check-in -> review -> referenced feedback in chat`

Competitors cover most of these pieces, but often divide them across add-ons, higher plans, generic forms, a marketplace, or separate business modules. Trainerize reserves prospect/business automation for its Business add-on; Kahunas puts lead forms and automation in Growth; TrueCoach puts public profiles on Standard/Pro; Everfit is the closest integrated threat. [Trainerize pricing](https://www.trainerize.com/pricing/), [Kahunas](https://kahunas.io/), [TrueCoach](https://truecoach.co/pricing/), [Everfit payments](https://everfit.io/payment/)

The USP should therefore be **workflow simplicity**, not exclusivity: "From Instagram lead to accountable 1:1 coaching without rebuilding the client in five tools."

### 2. India-first operating fit

CoachEasy's actual product supports INR/Razorpay billing for coach seats and a WhatsApp handoff after public applications. The reviewed competitors quote in USD and primarily advertise Stripe or PayPal for payments: [Trainerize](https://www.trainerize.com/pricing/), [TrueCoach](https://truecoach.co/pricing/), [Everfit](https://everfit.io/payment/), [PT Distinction](https://www.ptdistinction.com/features), [Kahunas](https://kahunas.io/).

That makes "built around how Indian independent coaches already acquire and communicate with clients" more defensible than "more features." Do not turn this into a false claim that CoachEasy currently collects client UPI payments.

### 3. Structured check-ins tied directly to coaching feedback

CoachEasy supports reusable onboarding/check-in forms, nine answer types including photos and weight, schedules, reminders, immutable snapshots, an unreviewed queue, a reviewed state, and a check-in reference that can be carried into the client's durable conversation.

TrueCoach's official guidance still models check-ins in its workout builder, so CoachEasy is clearly stronger there. Trainerize and Everfit now have capable dedicated forms and side-by-side review, so CoachEasy should not claim category uniqueness. Its narrower differentiator is the explicit review-to-conversation handoff. [TrueCoach help](https://help.truecoach.co/en/articles/3363240-waivers-questionnaires-assessments-and-check-in-s), [Trainerize check-ins](https://help.trainerize.com/hc/en-us/articles/31369316335124-Sharing-Check-In-Forms-with-Clients), [Everfit forms](https://help.everfit.io/en/articles/6633667-how-to-create-forms-questionnaires)

### 4. Native prescribed-meal execution, not only macro integration

CoachEasy models coach-authored recipes, meals, meal options, day types, assigned plans, planned snapshots, replacements, extras, and planned-versus-logged nutrition history. That is a concrete advantage over TrueCoach's publicly documented MyFitnessPal-based calorie/macro workflow. [TrueCoach nutrition](https://truecoach.co/pricing/)

It is not an advantage over the whole market: Trainerize sells advanced meal planning, Everfit supports nutrition coaching and integrations, PT Distinction includes nutrition/meal planning, and Kahunas markets a very large food database. [Trainerize](https://www.trainerize.com/features/), [Everfit](https://everfit.io/pricing/), [PT Distinction](https://www.ptdistinction.com/pricing), [Kahunas](https://kahunas.io/)

### 5. A simple commercial model — if the pricing is corrected

The underlying product has two free seats and one pay-per-client feature set, without a visible add-on maze. That can be easier to understand than Trainerize's add-ons or Kahunas' feature tiers. Everfit also uses add-ons; TrueCoach reserves key capabilities for Standard/Pro. PT Distinction is the counterexample: it explicitly includes every feature in every plan. [Trainerize](https://www.trainerize.com/pricing/), [Kahunas](https://kahunas.io/), [Everfit](https://everfit.io/pricing/), [TrueCoach](https://truecoach.co/pricing/), [PT Distinction](https://www.ptdistinction.com/pricing)

This USP is unusable until CoachEasy chooses and publishes one real price.

## Where CoachEasy is not currently better

- **Exercise content:** competitors sell large, professionally filmed libraries and ready-made programmes. CoachEasy's production seed/demo state is not yet proven.
- **Notifications and retention loops:** competitors have push, email, SMS, habits, streaks, tasks, and automations. CoachEasy has realtime-in-app messaging and check-in email reminders only.
- **Client revenue collection:** all five competitors advertise package/payment flows. CoachEasy only bills its own coaching businesses.
- **Progress breadth:** competitors commonly expose body measurements, progress-photo comparison, habits, wearable data, adherence trends, and richer dashboards. CoachEasy has strong raw training/nutrition/weight history but fewer canonical summaries.
- **Scale modes:** groups, challenges, on-demand programmes, bulk assignment, communities, multi-location management, and richer permissions are mature-competitor strengths, not current CoachEasy strengths.
- **Branding and integrations:** white-label apps, calendars, Apple/Google health data, MyFitnessPal, Zapier, and API access are established upsells elsewhere.

None of these needs to become a v1 blocker unless CoachEasy markets it.

## Pricing and onboarding friction

### Public price comparison

| Product | Small start | Approximately 25 clients | Trial/free friction |
|---|---:|---:|---|
| **CoachEasy actual billing model** | 2 clients free | 23 paid seats x INR 499 = **INR 11,477/month** | No trial clock is needed for the two-client free state. |
| **Trainerize** | Free for 1; $9/month for 2 | Small Business starts at $79/month for up to 30 | 30-day trial, no card. [Source](https://www.trainerize.com/pricing/) |
| **TrueCoach** | $26.34/month for 5 | 25 exceeds the $57.99/20 plan and moves toward $136.99/50 | 14-day trial, no card. [Source](https://truecoach.co/pricing/) |
| **Everfit** | Free for 5; $19/month for 5 | $75/month for up to 35 | Free forever for 5; no card to start. [Source](https://everfit.io/pricing/) |
| **PT Distinction** | $19.90/month for 3 | $59.90/month for 25 | One-month trial auto-converts unless cancelled. [Source](https://www.ptdistinction.com/pricing) |
| **Kahunas** | $35/month for 25 | $35/month for 25 | 14-day trial plus 1:1 live onboarding. [Source](https://kahunas.io/) |

Raw currencies are not directly comparable, but this table is enough to reject an unsupported "cheapest" claim. CoachEasy's linear INR 499 price reaches INR 11,477 at 25 clients, while several competitors flatten the price across a roster tier.

### CoachEasy's current public contradiction is a release blocker

The marketing site currently says all of the following:

- `INR 99/client/month` for 3-50 clients and `INR 79/client/month` for 51-500;
- "all plans include 14-day free trial" even though Starter is also described as forever free;
- UPI/card client payments and payment status per client;
- group chat, AI website builder, advanced analytics, payment processing, priority support, white-label branding, API access, a dedicated account manager, and bulk client management.

The implemented billing default is INR 499 per paid seat, and the current capability library does not support most of those features (`frontend/apps/website/@components/CoachEasyLanding.tsx`, `frontend/apps/website/app/layout.tsx`, `backend/config/runtime.exs`, `docs/product-capabilities/billing-and-seats.md`).

Default v1 decision: **delete or rewrite the unsupported claims; do not build a payment platform, AI builder, white-label system, and enterprise tier to rescue old landing-page copy.**

### Time-to-value

Competitors reduce first-use friction with large content libraries, templates, no-card trials/free plans, setup guides, or live onboarding. Trainerize includes a guided setup and 30-day no-card trial; Everfit lets a coach train five clients free; TrueCoach advertises a sub-two-minute client invitation; Kahunas includes live onboarding; PT Distinction includes pre-made templates and same-day support. [Trainerize](https://www.trainerize.com/pricing/), [Everfit](https://everfit.io/pricing/), [TrueCoach](https://truecoach.co/pricing/), [Kahunas](https://kahunas.io/), [PT Distinction](https://www.ptdistinction.com/pricing)

CoachEasy's passwordless signup and two-client free state are good. Its weak point is what happens immediately after business creation: the user still has to author most of the coaching system. A small starter pack and a verified demo journey will reduce more friction than another settings page.

## Competitive pre-release feature recommendation

### Build or finish before v1

1. **Correct exercise tracking and instruction**
   - Let a coach choose tracking type for a custom or copied exercise.
   - Ensure the production system catalogue is seeded and its intended demo videos actually play.
   - Keep the existing single-media model; do not build a media library, transcoder, or AI exercise generator.

2. **Ship one minimal attention channel**
   - Notify the recipient about a new direct message.
   - Notify the client about a due/overdue check-in.
   - Use FCM if ready; otherwise use the existing email infrastructure for v1.

3. **Add a tiny starter experience**
   - One editable sample training plan plus the existing starter onboarding/check-in content is enough.
   - Make production seeds and empty-state actions deterministic.
   - Do not build a template marketplace or dozens of generic programmes.

4. **Repair or remove the waiting-for-seat acceptance state**
   - A client invitation must either activate successfully or return an honest, recoverable capacity result.
   - Do not expose an onboarding path that transactionally rolls back after the OTP succeeds.

5. **Only if the public promise keeps client payments: add the minimum real payment loop**
   - package/price, hosted checkout, payment/subscription status, and client activation;
   - otherwise explicitly state that coaches collect fees externally and defer the whole feature.

### Release gates, not new features

- production client app/PWA can be installed or opened through the intended channel;
- coach and invited client OTP email works on the real domain;
- the complete coach-to-client workflow survives refresh/reconnect and ordinary failure states;
- exercise/food seeds, storage, email, websocket, CORS, public landing pages, and Razorpay business billing are configured in production;
- public pricing, structured metadata, feature lists, testimonials, and landing-template promises are truthful.

## Features that should **not** block v1

- AI workout, meal-plan, or assistant features;
- Apple Health, Garmin, WHOOP, Fitbit, Oura, wearable, or MyFitnessPal integrations;
- custom branded/white-label apps, custom domains, or coach-specific app-store listings;
- groups, communities, challenges, leaderboards, group chat, or workout-of-the-day;
- appointment calendars, client self-booking, video calls, or session packs;
- habit streaks, badges, reactions, gamification, or generic task automation;
- Zapier, public API access, webhooks for coaches, or workflow builders;
- mass messaging, scheduled messaging, broadcasts, or marketing sequences;
- a marketplace, on-demand programme store, digital products, coupons, referrals, or affiliate tools;
- barcode scanning, restaurant search, grocery lists, micronutrient depth, or AI food recognition;
- standalone progress-photo galleries/comparison; v1 can use check-in photo answers;
- generalized body measurements and wearable dashboards beyond the existing weight history;
- advanced adherence scores, health scores, forecasts, or AI recommendations;
- multi-location management, configurable permissions, enterprise SSO, or bulk operations;
- offline mode, cross-device drafts, extensive autosave, or a general notification-preferences centre.

Build one of these only after launch users repeatedly identify it as the reason they cannot adopt or retain CoachEasy.

## Recommended USP language

**Primary:** "From Instagram enquiry to accountable 1:1 coaching — plans, nutrition, check-ins, progress and chat in one simple system built for Indian coaches."

**Supporting proof:**

- "Start with two clients free."
- "Turn an application into an onboarded client without copying data between forms and spreadsheets."
- "Build the plan once, personalise the assigned copy, and keep the client's history intact."
- "Review a weekly check-in and respond in the same coaching conversation."
- "Plan meals, not just macros, and see what the client actually logged."

**Do not use yet:** "accept UPI payments," "replace Razorpay," "AI website builder," "group coaching," "advanced analytics," "white-label app," "API access," "all-in-one for every coaching business," or "cheapest platform."

## Addendum (2026-07-22, adversarially verified claims)

A separate deep-research pass (3-vote verification per claim) confirmed these competitor weaknesses; each survived with at least 2/3 non-refuted votes:

- TrueCoach charges a **5% processing fee** on client payments through its platform ($250/month at $5,000/month billed) and supports payments only in US/UK/AU/CA. ([assistantcoach.fit](https://assistantcoach.fit/blog/real-cost-fitness-coaching-software/), [trainerize.com](https://www.trainerize.com/blog/trainerize-vs-truecoach-vs-everfit-online-coaches/))
- Trainerize's advertised tiers understate real cost: Advanced Nutrition +$45/mo, payments +$10/mo → ~$190/mo at 50 clients. Everfit similarly stacks meal plans $33–39 + Autoflow $24–29 + payments $8–9 → ~$128/mo at 25 clients. ([assistantcoach.fit](https://assistantcoach.fit/blog/real-cost-fitness-coaching-software/))
- Coaches report Trainerize is slow/clunky with multi-hour-to-full-day outages, quality and support decline after the ABC Fitness acquisition, and a MyFitnessPal sync broken for years. ([everfit blog](https://blog.everfit.io/everfit-vs-trainerize-vs-truecoach), [aitoolsbakery](https://aitoolsbakery.com/blog/best-trainerize-alternatives/)) — competitor-authored sources; directionally consistent across three of them.
- Coach-workflow evidence: template-based program building (~45 min/client in a spreadsheet → <5 min with templates) and automated/conditional check-in prompts are the two biggest cited time-savers; spreadsheet coaches manually copy Google Forms check-ins into tracking sheets. ([trainerize.com](https://www.trainerize.com/blog/personal-exercise-programme/), [assistantcoach.fit](https://assistantcoach.fit/blog/google-sheets-to-fitness-coaching-software/))

Refuted in verification (do not cite): PT Distinction's "$89.90 vs $210, saves $1,440/yr" framing, "TrueCoach has no nutrition/branding", "coaches break from Sheets at 15–20 clients", and the vendor add-on comparisons taken from single competitor-marketing pages.

## Primary external sources

- ABC Trainerize: [features](https://www.trainerize.com/features/), [pricing](https://www.trainerize.com/pricing/), [check-in forms](https://help.trainerize.com/hc/en-us/articles/31369316335124-Sharing-Check-In-Forms-with-Clients)
- TrueCoach: [pricing and features](https://truecoach.co/pricing/), [questionnaires/check-ins guidance](https://help.truecoach.co/en/articles/3363240-waivers-questionnaires-assessments-and-check-in-s)
- Everfit: [pricing](https://everfit.io/pricing/), [forms](https://help.everfit.io/en/articles/6633667-how-to-create-forms-questionnaires), [check-in dashboard](https://help.everfit.io/en/articles/14495409-coach-check-in-dashboard-beta), [purchase flow](https://help.everfit.io/en/articles/5719215-understanding-the-purchase-process), [payments](https://everfit.io/payment/)
- PT Distinction: [features](https://www.ptdistinction.com/features), [pricing](https://www.ptdistinction.com/pricing)
- Kahunas: [product, features, and pricing](https://kahunas.io/)
