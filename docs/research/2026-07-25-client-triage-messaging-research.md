# CoachEasy client triage and messaging research

**Research date:** 2026-07-25
**Status:** Complete — market, coach-behaviour, retention, voice-of-customer, information-model, and current-product findings are integrated.
**Audience:** Product and engineering
**Concept reviewed:** Replace the separate Messages destination with a triage-led Clients area containing seven permanent views: Needs you, Today, Waiting on you, Momentum, Money, Onboarding, and All clients.

## Executive verdict

**The problem and category are validated; the exact proposed information architecture is not.**

Independent coaches do need a faster way to see who needs attention. The strongest current evidence is not a survey answer but shipped competitive behaviour: Everfit's July 2026 Check-in Dashboard can become the coach's home screen, places clients needing attention first, and provides At Risk, Needs Attention, On Track, Program Ending, No Activity, Forms to Review, and custom saved views. It also shows four-week trends and follow-up alerts when a client has not replied or is waiting for the coach. [Everfit client-list dashboard](https://help.everfit.io/en/articles/16000579-check-in-dashboard-manage-your-client-list), [insight and follow-up workflow](https://help.everfit.io/en/articles/16000596-check-in-dashboard-review-client-insights), [risk configuration](https://help.everfit.io/en/articles/15999847-configure-your-check-in-dashboard)

That evidence is also the concept's largest contradiction. The core idea is direct prior art in the closest breadth competitor. CoachEasy cannot credibly claim that incumbents only offer alphabetical rosters, ignore silence, or fail to surface positive momentum.

The proposed removal of Messages has still less support. Everfit, Trainerize, TrueCoach, Hevy Coach, Coach Catalyst, My PT Hub, FitBudd, and TrainHeroic retain a central inbox or chat destination while also allowing contextual entry from a client, check-in, metric, workout, or alert. [Everfit Inbox](https://help.everfit.io/en/articles/2972174-inbox-client-messaging), [TrueCoach messaging](https://help.truecoach.co/en/articles/2403915-messaging-your-clients), [Hevy Coach chat](https://help.hevycoach.com/en/articles/8460787-chat), [Coach Catalyst messaging](https://help.coachcatalyst.com/en/articles/2309607-sending-messages-to-clients), [TrainHeroic Messaging Center](https://support.trainheroic.com/hc/en-us/articles/18156749640717)

The evidence therefore supports a **hybrid mental model**:

`client context + attention-oriented saved views + a central conversation work queue`

It does not support collapsing unread work into client records, making one opaque risk score the primary truth, or assuming seven substantially different page bodies will be easier to learn than a consistent roster/inbox shell.

No H1–H6 hypothesis is fully validated as written:

1. **H2 — trajectory beats snapshot:** the strongest directional hypothesis and already implemented by competitors, but no evidence proves a trajectory UI causes better retention.
2. **H1 — the first need is triage:** supported as an important recurring job, not as every coach's universal first destination.
3. **H3 — silence predicts churn:** a weaker activity-decay claim is supported, but “strongest” is unproven and the whitespace claim is false.
4. **H6 — admin blindness loses more revenue than bad coaching:** the burden is real, but the comparison and size of the loss are unknown.
5. **H5 — recognition improves retention and no incumbent surfaces it:** general feedback evidence is indirect; the no-incumbent claim is false.
6. **H4 — separate Messages is redundant:** contradicted by the dominant product pattern and by coaches' continued use of WhatsApp/text.

The seven views are not equally supported. **Waiting on you, Needs you, Onboarding, and All clients** have the strongest behavioural or market precedent. **Today** is a plausible adjacent-tool pattern but lacks a unified CoachEasy event model. **Money** is commercially relevant but not supported by CoachEasy's present coach-client data. **Momentum** has useful ingredients, yet its claimed retention effect and novelty remain unproven.

## Decision summary

| Decision question | Evidence-backed answer | Confidence |
|---|---|---|
| Do solo coaches need an exception-oriented client overview? | Yes. Everfit, Trainerize, TrueCoach, Coach Catalyst, PT Distinction, and Kahunas all surface attention, adherence, inactivity, check-in, or renewal signals. | High |
| Is alphabetical lookup an adequate default for every coaching session? | No. Multiple products expose activity, compliance, due date, risk, or saved-view alternatives. The actual default order is often not publicly documented. | High |
| Is the exact concept novel? | No. Everfit's current Check-in Dashboard overlaps most of the concept, including saved views, risk, trends, silence, positive/on-track clients, and follow-up. | High |
| Should all messaging live only inside client context? | Evidence says no. The market overwhelmingly combines contextual entry with a central inbox. | High |
| Is silence the strongest churn predictor? | Unknown. Early engagement and attendance are associated with persistence, but no reviewed study ranks silence against coaching quality, results, price, life events, or goal completion in independent online coaching. | High |
| Does recognition itself improve retention? | Unknown. Feedback improves adherence in broader treatment research, but no reviewed evidence isolates a “Climbing” view or coach praise as a retention cause. | High |
| Is an opaque composite risk score the best representation? | Not established. Strong precedents expose raw signals, editable thresholds, trends, and reasons. | Medium-high |
| Do seven permanent views with different body structures improve learning or speed? | Unknown. Saved views are well supported; seven different morphologies are not. | High |
| Can CoachEasy populate all seven views honestly today? | No. Onboarding and All clients are data-ready; attention and messaging are partial; Today, Momentum, and Money lack canonical underlying models. | High |

## Method and evidence standard

All linked sources were accessed on **2026-07-25** unless a source itself states a different update date.

Evidence labels used below:

- **Confirmed:** documented in current first-party product/help/pricing material or reported by original peer-reviewed research.
- **Not publicly documented:** the reviewed official public material did not document it. This is not proof the capability is absent.
- **Unknown:** the available evidence is insufficient to make the claim.

`NPD` in compact status cells means **not publicly documented**.

Source hierarchy:

1. current official product/help/pricing documentation;
2. original peer-reviewed research or a clearly described original industry survey;
3. vendor marketing and vendor-sponsored reports, labelled as such;
4. review platforms and communities, used only as anecdotal voice-of-customer evidence.

The comparison distinguishes a **client roster** from a **conversation work queue**. Launching chat from a client row is not the same job as finding all unread or waiting conversations across a roster.

## CoachEasy's current baseline

CoachEasy already distributes attention work across three places:

- Clients defaults to **All**, with Active, Needs attention, Invited, and Inactive filters. The current Needs attention endpoint covers incomplete intake, no active training plan, no active nutrition plan, and a relationship subscription ending within seven days. [`list-clients.tsx`](../../frontend/apps/coachapp-v2/src/clients/list-clients.tsx), [`coach-client-relationships.md`](../product-capabilities/coach-client-relationships.md)
- The coach dashboard already contains a **Needs you today** priority queue, check-in review work, and recent conversations. A new default Needs you view would overlap a current home-screen job. [`priority-queue.tsx`](../../frontend/apps/coachapp-v2/src/dashboard/components/priority-queue.tsx)
- Messaging already has a central `/messages` destination and client-context `/clients/:id/messages`. Conversations expose preview and unread count and are ordered by latest activity, but there is no supported unread filter, authoritative unread total, search, custom sort, broadcast, or last-sender field. [`routes.ts`](../../frontend/apps/coachapp-v2/src/@config/routes.ts), [`messaging.md`](../product-capabilities/messaging.md)

The proposed views do not currently share a complete data model:

- Training has no server-owned adherence score or canonical completion percentage. [`workout-execution-and-history.md`](../product-capabilities/workout-execution-and-history.md)
- Nutrition has no canonical adherence score or bounded weekly trend. [`nutrition-logging-and-history.md`](../product-capabilities/nutrition-logging-and-history.md)
- Weight has direction-neutral trend handling and 30-day coverage, but fewer than two entries yields no trend. [`weight-tracking.md`](../product-capabilities/weight-tracking.md)
- CoachEasy billing is the coaching business's seat subscription. It is not a package, invoice, renewal, or payment system between coach and client. [`billing-and-seats.md`](../product-capabilities/billing-and-seats.md)
- No unified Today event model currently joins workouts, meals, check-ins, messages, milestones, renewals, and coach tasks.

The [2026-07-22 release research](2026-07-22-v1-release-market-research.md) found that CoachEasy already covers the end-to-end 1:1 coaching loop and that its defensible story is workflow continuity, not broad feature novelty. This concept should be judged against that current workflow, especially the risk of duplicating the existing dashboard.

## Competitive matrix

### Direct fitness-coaching products

| Product | Roster and default | Attention, risk, and trajectory | Messaging model | Money and renewal | Status |
|---|---|---|---|---|---|
| **ABC Trainerize** | The Overview highlights clients needing attention; auto-tags filter the client list. Default list order is **not publicly documented**. | Adjustable signals include account not set up after three days, failed payment, no sign-in/message/response for over a week, low workout/nutrition compliance, and expired/expiring programs. [Auto-tags](https://help.trainerize.com/hc/en-us/articles/208689156-Auto-Client-Tags-Attending-To-Clients-Needing-Attention), [compliance](https://help.trainerize.com/hc/en-us/articles/360001219886-How-to-Measure-Workout-and-Nutrition-Compliance-with-Auto-Client-Tags) | Separate Messages plus private or group messaging from selected clients. [Mass messaging](https://help.trainerize.com/hc/en-us/articles/360000359286), [group messages](https://help.trainerize.com/hc/en-us/articles/23608440326164-How-To-Create-a-Group-Message-With-Clients-and-Trainers) | Failing payments reaches attention tags; Sales History handles broader payment lifecycle. [Sales History](https://help.trainerize.com/hc/en-us/articles/115005693083-Reviewing-Sales-History) | **Confirmed hybrid precedent** |
| **TrueCoach** | Client Dashboard sorts/filters by name, next-workout due date, 7/30/90-day compliance, type, and groups. Initial default is **not publicly documented**. [Managing clients](https://help.truecoach.co/en/articles/2403919-managing-your-clients) | A 20% fall in 7/30/90-day compliance is placed under Needs Attention; trajectory is explicit. [Compliance rates](https://help.truecoach.co/en/articles/2403738-compliance-rates) | Separate Messenger plus chat entry from client row and workout builder; groups and individual-delivery broadcasts. [Messaging](https://help.truecoach.co/en/articles/2403915-messaging-your-clients), [groups](https://help.truecoach.co/en/articles/3047874-client-grouping) | Subscriptions, invoices, renewal dates, and failed-charge counts are in Payments, separate from coaching roster. [Subscriptions](https://help.truecoach.co/en/articles/3491618-subscriptions-overview-and-faq), [delinquency](https://help.truecoach.co/en/articles/3491682-delinquent-clients) | **Confirmed hybrid precedent** |
| **PT Distinction** | Dashboard activity feed can be filtered by client/group. Program Health, missed schedules, adherence summaries, and System Groups expose who is doing well or needs help. Default list order is **not publicly documented**. [Review workflow](https://www.ptdistinction.com/learning-centre/ptd-flow/how-to-review-client-progress-and-give-feedback), [System Groups](https://www.ptdistinction.com/blog/new-system-groups) | No published combined churn score. A marketing page claims analytics identify at-risk clients but does not publish a formula. [Features](https://www.ptdistinction.com/features) | Feedback on workouts, habits, food, photos, metrics, or compliance routes into a client message thread; dashboards include a message center and System Groups support message-all. [Activity comments](https://www.ptdistinction.com/blog/demo-of-the-activity-feed-comments-feature) | One-off/recurring payments and packages are confirmed; roster-level renewal warnings are **not publicly documented**. | **Confirmed contextual messaging; risk formula NPD** |
| **Everfit** | Check-in Dashboard can be home, places attention first, and offers All, At Risk, Needs Attention, On Track, Program Ending, No Activity, Forms to Review, Review Completed, Paused, and custom saved views. Views can be reordered and have per-view columns. [Dashboard](https://help.everfit.io/en/articles/16000579-check-in-dashboard-manage-your-client-list) | Configurable training, nutrition, task, form, program-ending, and inactivity signals; default At Risk includes training below 60% or very low nutrition tracking. It shows four-week trend, week-over-week status changes, and 24-hour no-reply/coach-waiting alerts. [Configuration](https://help.everfit.io/en/articles/15999847-configure-your-check-in-dashboard), [insights](https://help.everfit.io/en/articles/16000596-check-in-dashboard-review-client-insights) | Separate Inbox with Unread and archive, while dashboard follow-ups and rows jump to chat. Smart segments combine status, owner, group, and data filters; Studio plans support broadcasts. [Inbox](https://help.everfit.io/en/articles/2972174-inbox-client-messaging), [segments](https://help.everfit.io/en/articles/5608080-client-list-how-to-use-segments), [broadcasts](https://help.everfit.io/en/articles/8258414-inbox-broadcast-messages) | Program ending is in triage; packages and payments have their own lifecycle. [Packages](https://help.everfit.io/en/articles/5718929-what-can-you-sell-with-packages) | **Closest direct prior art** |
| **My PT Hub** | Contacts are searchable/filterable/sortable; default order is **not publicly documented**. Official marketing sells compliance tracking to identify at-risk clients, but public help does not document a cross-signal risk formula. [Features](https://www.mypthub.net/features/), [search/filter/sort](https://support.mypthub.net/hc/en-us/articles/360030096554-Search-Filter-Sort) | Program compliance is confirmed; exact risk inputs and thresholds are **not publicly documented**. | Separate Chat with Inbox, Archive, and Broadcast; individual/group broadcasts can be scheduled. [Chat](https://support.mypthub.net/hc/en-us/sections/360002231918-Chat), [broadcasts](https://support.mypthub.net/hc/en-us/articles/360007528758-Create-a-Broadcast-message) | Packages, recurring payments, and financial analytics are confirmed; roster-level renewal warning is **not publicly documented**. [Getting started](https://www.mypthub.net/getting-started/) | **Confirmed hybrid; risk detail NPD** |
| **Kahunas** | Above All Clients, the dashboard highlights new/deactivated clients, new check-ins, messages, and clients renewing in seven days. Rows show package/offline payment and subscription progress. Default row order is **not publicly documented**. [Dashboard walkthrough](https://help.kahunas.io/en/articles/223-client-dashboard-walkthrough) | Client detail shows last activity and current-versus-prior wellbeing/psychometric indicators. “Health Score AI” is a wellbeing signal; thresholds and a churn formula are **not publicly documented**. | Inline threaded client chat, including check-in replies and topic threads. Group chat is plan-gated. [Group chat](https://help.kahunas.io/en/articles/231-do-you-have-groupchat) | Renewing-soon clients and subscription progress are unusually prominent; billing remains in client detail. | **Strong Today/Money/context precedent** |
| **Hevy Coach** | Dashboard summarizes active/inactive clients over the past week and latest activity. Clients supports search, status, and workouts completed in the last seven days. [Dashboard](https://help.hevycoach.com/en/articles/8460727-dashboard), [getting started](https://help.hevycoach.com/en/articles/8480529-getting-started-guide) | Notifications cover new messages, measurements, workouts, and programs finishing next week. A combined churn score is **not publicly documented**. [Notifications](https://help.hevycoach.com/en/articles/9088295-receive-notifications) | Separate Chat plus Send Message from client profile. [Chat](https://help.hevycoach.com/en/articles/8460787-chat) | Client payment/renewal surface is **not publicly documented** in reviewed help material. | **Confirmed hybrid precedent** |
| **FitBudd** | Public material documents client management and audiences, but default order and automatic churn score are **not publicly documented**. | Messages offers prebuilt All, Active, Leads, and Completing Soon groups. “Completing Soon” is lifecycle attention, not a published churn probability. [Broadcast groups](https://www.fitbudd.com/post/connect-with-clients-like-never-before-with-our-amazing-group-chat-broadcast-feature) | Separate Messages with group chat/broadcast. [Pricing/features](https://www.fitbudd.com/pricing) | Direct payments, payment plans, and automation are sold on higher tiers; a roster renewal-warning contract is **not publicly documented**. | **Confirmed lifecycle segment; risk NPD** |
| **Exercise.com** | Vendor marketing says its CRM tracks engagement, logins, session completion, and retention risk. Exact default order, thresholds, and a help-level risk contract are **not publicly documented**. [Vendor retention article](https://www.exercise.com/grow/why-generic-fitness-apps-are-costing-you-clients-and-how-to-fix-it/) | Triggers can include failed payment, workout logged, or appointment events. These are marketing claims, not a published calculation. [Gym-software overview](https://www.exercise.com/grow/best-software-for-large-gyms/) | One-to-one and group SMS/email/push are marketed. | Automated billing and failed-payment triggers are marketed. | **Vendor claim only for risk** |
| **Coach Catalyst** | Client Index includes status tabs, Programs Ending, Needs Workout, custom columns, filters, saved segments, and high-performing/at-risk views. Default at-risk inactivity is three consecutive days; compliance defaults are 60% low and 75% high. [Client Index](https://help.coachcatalyst.com/en/articles/14782854-all-about-the-client-index-page) | Explicit, interpretable adherence and inactivity inputs; latest chat, forms, daily actions, metrics, and streak are visible. | Messages Inbox plus entry from index, account, notifications, forms, and metrics; bulk and scheduled messaging. [Messaging](https://help.coachcatalyst.com/en/articles/2309607-sending-messages-to-clients) | Programs ending is surfaced; precise client-payment renewal workflow was not established in reviewed docs. | **Strong saved-segment and hybrid precedent** |
| **BridgeAthletic** | Personal-trainer plans track activity, bodyweight, sleep, nutrition, hydration, forms, check-ins, and reporting. Default roster order and automatic churn score are **not publicly documented**. [Personal trainer](https://www.bridgeathletic.com/personal-trainer), [seat plans](https://intercom.help/bridgeathletic/en/articles/6038567-how-to-add-athlete-seats-and-upgrade-your-private-trainer-subscription) | Performance and wellness signals are confirmed; a retention-risk formula is **not publicly documented**. | Direct/team messaging is documented in team-oriented packages, making it a less direct solo-coach analogue. [Head coach package](https://www.bridgeathletic.com/head-coach/adventureracing) | Stripe payments are supported; payments are a separate business workflow. [Payments](https://intercom.help/bridgeathletic/en/articles/4800275-setting-up-payments-in-bridge) | **Broader performance-team analogue** |
| **TrainHeroic** | Markets a command center tracking compliance, progress, and program status. Default client order and churn score are **not publicly documented**. [Coach product](https://www.trainheroic.com/coach) | Compliance/program status are confirmed; automatic retention-risk thresholds are **not publicly documented**. | Separate real-time Messaging Center for direct and team/program messages. [Messaging Center](https://support.trainheroic.com/hc/en-us/articles/18156749640717) | 1:1 clients are generally billed externally; Marketplace group-payment failure can remove/archive access. [1:1 versus Marketplace](https://support.trainheroic.com/hc/en-us/articles/18156629990797), [payment failure](https://support.trainheroic.com/hc/en-us/articles/18156706606093) | **Performance/group analogue; hybrid messaging** |

### Adjacent workflow tools

| Product | What the precedent supports | What it does not support |
|---|---|---|
| **Intercom** | Custom shared views and folders, reorderable views, attribute filters, Waiting Since/Last Activity/Priority/SLA sorting, and a contextual customer sidebar. Contacts default to most recently active. [Views and folders](https://www.intercom.com/help/en/articles/6588834-organize-your-inbox-with-custom-views-and-folders), [Inbox sorting](https://www.intercom.com/help/en/articles/6989006-inbox-sorting), [contact order](https://www.intercom.com/help/en/articles/214-get-valuable-user-insight-from-day-one) | Intercom urgency is conversation handling, not client churn. It does not validate seven unrelated client-page bodies or a fitness retention score. |
| **HubSpot** | Task views include All, Completed, Due today, Overdue, Upcoming, and Most engaged; users can create saved views and choose a default. Queues act as labels/filters and can be processed back-to-back in record context. [Task views](https://knowledge.hubspot.com/tasks/filter-tasks-and-manage-task-views), [task queues](https://knowledge.hubspot.com/tasks/use-task-queues), [complete tasks](https://knowledge.hubspot.com/tasks/complete-tasks) | The queue keeps a consistent task/list model. It does not validate a different morphology for every saved question. |

### What the market pattern actually is

Across the direct products, four patterns recur:

1. **Identity remains visible.** Client lists remain recognizably client lists even when ordered or filtered by due date, risk, compliance, activity, program end, or group.
2. **Reasons beat unexplained labels.** Trainerize exposes silence, setup, compliance, program, and payment reasons; Everfit exposes configurable raw inputs and thresholds; TrueCoach exposes the compliance drop.
3. **Positive and negative states coexist.** Everfit has On Track and catch-up moments; Trainerize has high-compliance tags; PT Distinction compares client activity; Coach Catalyst has high-performing segments and streaks. Positive recognition is not an untouched category.
4. **Inbox and context coexist.** A central cross-client conversation queue survives even when a coach can message from a client, workout, metric, form, check-in, or alert.

No reviewed official product establishes seven permanent views with substantially different body structures as a market norm. Everfit comes closest, but it preserves a consistent client table plus an insight panel and configurable columns.

## Pricing and positioning

Public prices are shown in their source currencies and billing frames. Taxes, promotions, annual discounts, add-ons, payment fees, and exchange rates prevent raw price equivalence.

| Product | Current public price evidence | Positioning signal relevant to this concept |
|---|---|---|
| **ABC Trainerize** | Free/1; Grow $10/2; Pro from $25/5 to $135/50 monthly; Studio from $275/500; payments add $10/month on Grow/Pro. [Pricing](https://www.trainerize.com/pricing/) | Broad platform; attention is already sold through interpretable auto-tags. |
| **TrueCoach** | Annual-equivalent $26.34/5, $57.99/20, $136.99/50. [Pricing](https://truecoach.co/pricing/) | Programming-led platform with compliance trajectory and separate messenger. |
| **PT Distinction** | $19.90/3, $59.90/25, $89.90/50 monthly. [Pricing](https://www.ptdistinction.com/pricing) | “All features” automation breadth; uses activity/compliance visibility for retention messaging. |
| **Everfit** | Free/5; Pro monthly $19/5, $29/10, $49/20, $75/35, $95/50; annual saves 16%. [Pricing](https://everfit.io/pricing/) | Closest all-in-one competitor now explicitly selling configurable risk-first check-ins. |
| **My PT Hub** | Official summary gives Starter $22.50–25, Premium $52–59 unlimited, Ultimate $195–215; live pricing mixes monthly/annual/promotion states. [Pricing](https://www.mypthub.net/pricing/), [official explanation](https://www.mypthub.net/blog/fitness-coaching-app-pricing-compared/) | Packages, communications, financials, and compliance under one business platform. |
| **Kahunas** | $35/25, $69/50, $99/unlimited monthly; annual prices also offered. [Pricing](https://help.kahunas.io/en/articles/214-what-are-the-prices-for-your-packages) | Already puts messages, check-ins, and seven-day renewals above the roster. |
| **Hevy Coach** | Starts at $25/month; exact selected tier depends on client capacity. [Pricing](https://hevycoach.com/pricing/) | Simple strength-programming workflow; recent activity and chat remain separate. |
| **FitBudd** | $15/2 plus $4/client; Pro $79/20 plus $2/client; Super Pro $149/20 plus $2/client. [Pricing](https://www.fitbudd.com/pricing) | Branded-app and business-growth positioning; retention is already a marketing promise. |
| **Exercise.com** | Quote-based; no stable public roster price. [Platform](https://www.exercise.com/) | Enterprise/business operating system; retention-risk language is not whitespace. |
| **Coach Catalyst** | Live page presents $108 monthly or “$50 billed yearly” for up to 100 clients; that wording is ambiguous and should not be normalized without checkout confirmation. [Pricing](https://coachcatalyst.com/pricing/) | Accountability/engagement positioning with explicit high-performing and at-risk segments. |
| **BridgeAthletic** | $49/15, $69/35, $167/100. [Plan help](https://intercom.help/bridgeathletic/en/articles/6038567-how-to-add-athlete-seats-and-upgrade-your-private-trainer-subscription) | Performance programming and data breadth rather than solo-coach triage. |
| **TrainHeroic** | $9.99/1, $17.99/5, $34.99/15, $44.99/25, $59.99/35, with larger tiers. [Coach product](https://www.trainheroic.com/coach) | Performance/program marketplace; “command center” and retention language are already used. |

CoachEasy's previously audited actual model is two free client seats and INR 499 for each paid seat; at 25 clients that is 23 paid seats, or INR 11,477/month. That model was recorded in the [2026-07-22 repository and production audit](2026-07-22-v1-release-market-research.md); it was not independently re-audited for this report.

Three positioning conclusions follow:

- **“Keep clients longer” is not whitespace.** My PT Hub explicitly sells compliance tracking to improve retention and identify at-risk clients; FitBudd and TrainHeroic use retention language; Exercise.com markets retention-risk detection; Everfit now ships a check-in risk dashboard. [My PT Hub features](https://www.mypthub.net/features/), [FitBudd pricing](https://www.fitbudd.com/pricing), [TrainHeroic coach product](https://www.trainheroic.com/coach)
- **“Know who needs attention” is a validated buying job, not a unique promise.** A narrower CoachEasy position would have to be evaluated on clarity, fit, and workflow continuity, not categorical invention.
- **Roster-tier economics matter at 10–40 clients.** Several competitors flatten price across 20–50 client bands, while CoachEasy's recorded price grows per paid client. This report does not claim which is better value because currencies, market fit, breadth, and operating costs differ.

## Coach behaviour and jobs to be done

NASM's provider-sponsored [2026 State of the Personal Trainer report](https://2494739.fs1.hubspotusercontent-na1.net/hubfs/2494739/2026-State-of-Personal-Trainer-Report-by-NASM.pdf) surveyed 1,133 verified active certified US trainers in April 2026. It reports an average of 26 active clients and says independent professionals spend nearly 30% of their time on non-coaching work. The sample is US-based and provider-sponsored, so it supports workflow burden rather than a causal or global market estimate.

No credible observational study was found describing the first 15 minutes of a solo online coach's working day, and no reliable distribution was found specifically for coaches with 10–40 active clients. Those are target-customer research gaps, not claims the competitive evidence can settle.

Vendor articles describe the fragmented starting stack as WhatsApp/Instagram/text for familiar, immediate client contact and Sheets/Docs for low-cost, flexible programming and records. These sources are marketing, not prevalence estimates, but they explain why individually “good enough” tools persist until cross-client remembering and reconciliation become painful. [My PT Hub on choosing software](https://www.mypthub.net/blog/how-to-choose-the-right-personal-training-software/), [Trainerize on Google Sheets](https://www.trainerize.com/blog/google-sheets-workout-templates-for-personal-trainers/), [Trainerize on client communication](https://www.trainerize.com/blog/personal-exercise-programme/)

The practical jobs for a 10–40-client solo coach are better expressed as questions than navigation labels:

| Coach question | Evidence |
|---|---|
| Who is waiting for me? | Central inboxes, unread queues, waiting-time sorting, and coach-response alerts recur across coaching products and Intercom. |
| Who has gone quiet or changed direction? | Trainerize silence tags, Everfit No Activity/no-reply/status change, TrueCoach compliance drops, Hevy activity, and research on early engagement support this as an important job. |
| What is due today? | Coach dashboards, check-in review queues, program-ending alerts, HubSpot Due today/Overdue, and message queues support a time-bounded work list. |
| Who is new and not set up? | Trainerize's three-day setup signal, Everfit forms review, CoachEasy intake state, and onboarding automation in PT Distinction support this lifecycle job. |
| Who deserves recognition? | Everfit On Track/catch-up moments, Trainerize high compliance, Coach Catalyst high-performing/streaks, and PT Distinction activity comparison show that coaches monitor positive progress too. |
| Whose commercial relationship needs action? | Kahunas renewal highlights, Trainerize failing payments, TrueCoach delinquency, and FitBudd/My PT Hub payments support the job when the platform owns the commercial data. |
| Where is one client's complete story? | Every direct product retains a client record or roster; contextual messaging and drill-down are widespread. |

These jobs overlap. A silent client may also have a missed check-in, expiring program, unread reply, and failed payment. Public competitor documentation does not establish a universally correct precedence rule among those reasons.

## Churn, retention, and engagement evidence

### What is supported

- The closest reviewed study used 2,684 patients in a Danish municipal digital lifestyle platform with coach messages and advice. Of 1,449 classified dropouts, 71.77% reduced platform activity by more than half during their last two weeks, and more than one-quarter left during days 14–31. Broad inactivity and the amount of coach advice were predictive, but the **provider** was the most important factor and dropout rates varied from 7.3% to 87% between providers. “Activity” combined registrations, forum posts, and coach messaging, so this supports activity decay and trajectory—not the claim that message silence is strongest. [JMIR dropout study](https://www.jmir.org/2019/9/e13617/)
- A later digital-behaviour model found recent total platform activity more informative than older activity, but first-week behaviour did not predict disengagement before week three well. This weakens any claim that CoachEasy can infer risk reliably from a universal first-14-days score. [JMIR 2023 disengagement study](https://www.jmir.org/2023/1/e43633)
- In a separate text-based weight-loss program, 65.1% of dropouts occurred in the first two weeks and autonomous motivation predicted lower dropout odds. That is evidence that early context matters, not proof that onboarding checklist completion is causal. [PubMed record](https://pubmed.ncbi.nlm.nih.gov/27688034/)
- In a retrospective employer-sponsored commercial weight-loss program, 68.3% of participants remained at six months and 45.9% at twelve months. More coach calls and website logins during the first three months were associated with higher retention, and early weight loss was associated with later retention. This is a structured weight-loss program, not independent online personal training. [Johns Hopkins publication record](https://pure.johnshopkins.edu/en/publications/long-term-retention-in-an-employer-based-commercial-weight-loss-p/)
- A fitness-venue cohort found only 22% still attending after one year; more frequent and stable early attendance was associated with continued attendance. Attendance is not the same as paid membership or coach-client retention. [Fitness attendance study](https://www.sciencedirect.com/science/article/pii/S146902922030279X)
- A study of 3,034 users of the Mammoth Hunters fitness app found higher training frequency associated with longer engagement. It is an app-survival study, not a coaching relationship study. [PubMed record](https://pubmed.ncbi.nlm.nih.gov/41211003/)
- A systematic review of 24 randomized trials found feedback increased treatment adherence; the six-study meta-analysis estimated a pooled 10.02 percentage-point improvement. This is general treatment adherence, not proof that praise, recognition, or a Momentum screen retains fitness clients. [Feedback meta-analysis](https://pubmed.ncbi.nlm.nih.gov/28456347/)
- A retrospective digital weight-management study recorded coach sessions, messages, app opens, lessons, and tracking. Greater engagement was associated with outcomes, but the design cannot establish that coach messages or recognition caused retention. [PLOS ONE study](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0232221)

### What remains unknown

- No reliable original benchmark was found for the typical paid lifespan of a solo coach's online 1:1 client.
- No reviewed study established that **silence is the strongest** churn predictor after controlling for results, price, coach quality, life events, injury, goal completion, and relationship fit.
- No reviewed study quantified how much earlier a “Slipping” label lets a coach prevent cancellation.
- No reviewed study isolated proactive recognition or a “Climbing” view as a cause of paid retention.
- No reviewed evidence established that administrative blindness loses more revenue than poor coaching.

If a cohort contains `N` clients paying `R` per month, one additional paid month retained across that cohort is `N × R` gross revenue before costs. That is arithmetic, not evidence that this concept causes the extra month.

## Voice of customer

These quotes are **anecdotal and self-selected**, not prevalence estimates. Reddit threads can contain promotional replies and unverifiable identities; review-platform entries can be old and reflect configuration errors or resolved product versions.

- “After 15 clients I started losing track of conversations, vacations, and events.” — [r/personaltraining](https://www.reddit.com/r/personaltraining/comments/1epodai). Anonymous 2024 in-person-coach account.
- “A clear system that helps me remember the right information.” — [r/personaltraining](https://www.reddit.com/r/personaltraining/comments/1q78654/seeking_advice_for_managing_clients_as_an/). Anonymous account from a coach reporting roughly 20 clients.
- “I don't notice messages from clients until I am inside the app.” — [Trainerize Capterra review](https://www.capterra.com/p/140262/Trainerize/reviews/). A 2017 review; Trainerize replied that notification settings might address it.
- “I personally use Trainerize to program ... questions on WhatsApp.” — [r/personaltraining](https://www.reddit.com/r/personaltraining/comments/18uomsv). Anonymous 2023 workflow account.
- “Clients always end up texting you anyway.” — [r/personaltraining](https://www.reddit.com/r/personaltraining/comments/1rkwcnb/how_are_you_managing_online_clients/). Anonymous 2026 anecdote in a promotion-contaminated thread.
- “No simple way to quickly view client compliance.” — [PT Distinction Capterra reviews](https://www.capterra.com/p/141155/PT-Distinction/reviews/). A 2021 review describing one-by-one activity inspection; current product behaviour may have changed.
- An Everfit reviewer reports that notifications and messages can be missed or feel cluttered. [Everfit Capterra reviews](https://www.capterra.com/p/202837/Everfit/reviews/). Review-platform evidence only; configuration and current-version effects are unknown.
- A coach says bespoke Sheets handle most work while WhatsApp handles communication; another mentions “spreadsheets, Venmo, WhatsApp.” [r/personaltraining](https://www.reddit.com/r/personaltraining/comments/1re5lux). Anonymous 2026 thread with self-selection and possible promotion.

The qualitative signal is not “coaches want no inbox.” It is that coaches want to avoid losing commitments, replies, exceptions, and personal context across fragmented tools. External messaging remains attractive because it is immediate and familiar; removing an internal central queue does not by itself solve that behaviour.

## H1–H6 ranked assessment

### 1. H2 — “Trajectory beats snapshot”

**Verdict: Directionally supported; causal product effect unknown.**

TrueCoach flags a 20% compliance drop across 7/30/90-day windows, Everfit shows four-week trends and status changes, Kahunas compares current with prior wellbeing indicators, and Coach Catalyst exposes compliance and streak. These products validate trajectory as useful information. They do not prove that trajectory should replace current state, or that a trend UI improves retention. [TrueCoach compliance](https://help.truecoach.co/en/articles/2403738-compliance-rates), [Everfit dashboard](https://help.everfit.io/en/articles/16000579-check-in-dashboard-manage-your-client-list), [Kahunas dashboard](https://help.kahunas.io/en/articles/223-client-dashboard-walkthrough)

### 2. H1 — “The coach's first need is triage, not lookup or messaging”

**Verdict: Important job supported; universal/default claim unvalidated.**

Everfit can set its risk-first dashboard as home; Trainerize, TrueCoach, Coach Catalyst, Kahunas, and Hevy all lead coaches toward exceptions or recent activity. But no reviewed original research establishes triage as every coach's first task. CoachEasy also already has a Needs you today dashboard, so making Clients the default triage destination risks duplicating an existing mental model rather than testing a clean alternative.

### 3. H3 — “Silence is the strongest churn predictor and is under-surfaced”

**Verdict: Partially supported; superlative unsupported; market-whitespace claim contradicted.**

Early engagement, attendance, app use, and coach contact are associated with persistence in adjacent research. Silence is also operationalized by competitors: Trainerize has no-sign-in/no-message/no-response tags, Everfit has No Activity and 24-hour no-reply follow-up, Coach Catalyst uses consecutive inactive days, and Hevy exposes recent activity. [Trainerize auto-tags](https://help.trainerize.com/hc/en-us/articles/208689156-Auto-Client-Tags-Attending-To-Clients-Needing-Attention), [Everfit insights](https://help.everfit.io/en/articles/16000596-check-in-dashboard-review-client-insights), [Coach Catalyst index](https://help.coachcatalyst.com/en/articles/14782854-all-about-the-client-index-page)

What is not established is that silence is the **strongest** predictor, or that incumbents under-surface it. The exact best silence window is also unknown and likely depends on program cadence.

### 4. H6 — “Admin blindness loses more revenue than bad coaching”

**Verdict: Administrative burden confirmed; comparative revenue claim unknown.**

NASM's survey supports substantial non-coaching work. Competitors prominently track failed payments, renewals, program ends, packages, and delinquency, showing this is a real business job. No evidence ranks it above coaching quality as a cause of lost revenue. CoachEasy also lacks coach-client payment and package data, so a Money view would currently mix relationship subscription dates with the appearance of financial authority it does not have.

### 5. H5 — “Proactive recognition improves retention and no incumbent surfaces it”

**Verdict: Retention effect unknown; no-incumbent claim contradicted.**

General feedback can improve adherence, but that does not isolate positive recognition. Everfit surfaces On Track and catch-up moments such as streaks; Trainerize can identify high compliance; PT Distinction compares activity and has leaderboards; Coach Catalyst exposes high-performing segments and streaks. [Everfit check-in completion](https://help.everfit.io/en/articles/16000615-check-in-dashboard-complete-client-check-ins), [PT Distinction System Groups](https://www.ptdistinction.com/blog/new-system-groups), [Coach Catalyst index](https://help.coachcatalyst.com/en/articles/14782854-all-about-the-client-index-page)

The exact two-column Climbing/Slipping presentation may be unusual, but positive progress itself is not ignored.

### 6. H4 — “A separate Messages destination is redundant”

**Verdict: Contradicted.**

The dominant product pattern is a central inbox plus contextual access. It separates two jobs:

- “What is this client's conversation and history?”
- “Which conversation across my roster is unread, oldest, urgent, or waiting on me?”

Everfit's risk dashboard still jumps into its separate Inbox. TrueCoach, Hevy, Coach Catalyst, My PT Hub, FitBudd, and TrainHeroic retain central conversation destinations. Intercom sorts the cross-customer work queue by Waiting Since, Last Activity, Priority, or SLA while showing customer context beside the conversation. That is strong evidence that contextual chat does not eliminate the queue.

## Seven-view assessment

This ranking combines external behavioural support, direct competitive precedent, and whether CoachEasy presently holds the underlying data. It does not prescribe implementation.

| Rank | View | Evidence support | CoachEasy feasibility | Main unresolved risk |
|---:|---|---|---|---|
| 1 | **Waiting on you** | **High.** Central unread/waiting work queues are near-universal; Everfit explicitly alerts when a client is waiting for the coach; Intercom exposes Waiting Since. | **Partial.** Unread counts exist, but no supported unread filter, last sender, authoritative total, search, or custom sort. | Folding it into Clients may hide the cross-client queue it is meant to strengthen. |
| 2 | **Needs you** | **High.** Everfit, Trainerize, TrueCoach, Coach Catalyst, PT Distinction, Kahunas, and Hevy surface exceptions. | **Partial.** CoachEasy has intake, plan, expiry, and check-in signals, but not canonical adherence, silence, or risk scoring. | It duplicates CoachEasy's existing Needs you today dashboard and is not novel. |
| 3 | **Onboarding** | **High.** Account setup, intake/forms, program assignment, and early engagement are common attention signals. | **High.** Relationship/invitation/intake/plan states already exist. | The evidence does not establish that onboarding needs a structurally different page body. |
| 4 | **All clients** | **High necessity.** Every product keeps a complete roster and client identity. | **High.** Already shipped. | Removing or de-emphasizing predictable lookup can slow known-client tasks. |
| 5 | **Today** | **Medium.** HubSpot Due today/Overdue, program-ending alerts, check-in queues, and dashboards support temporal triage. | **Low-medium.** No unified event or task model spans all proposed item types. | “Today” can become an inconsistent union of events with incompatible completion semantics. |
| 6 | **Money** | **Medium externally, low currently.** Kahunas, Trainerize, TrueCoach, My PT Hub, FitBudd, and Exercise.com surface payments or renewals. | **Low.** CoachEasy bills its own seats and has relationship dates, not coach-client invoices/packages/payment authority. | The view could imply financial truth CoachEasy does not own. |
| 7 | **Momentum** | **Medium as information, low as claimed outcome.** Trends, high performance, on-track state, and streaks are established. | **Low-medium.** Weight has limited trend; training/nutrition lack canonical adherence trends. | Novelty and retention effect are unproven; positive/negative grouping may flatten different causes. |

Saved custom views themselves have strong precedent in Everfit, Coach Catalyst, Intercom, and HubSpot. The weakly supported part is not saving a useful question; it is making seven permanent questions behave like seven different applications.

## Information-model and interaction risks

### 1. Direct prior art changes the burden of proof

Everfit's recently updated dashboard overlaps the proposed default, risk groups, positive state, no activity, program ending, forms, trends, saved views, configurable thresholds, follow-up messaging, and home-screen role. This validates demand but removes generic novelty. Any evaluation must compare the concept directly with that current workflow, not with an obsolete “A–Z list only” market picture.

### 2. Seven body morphologies lack precedent

Everfit varies filters and columns inside a stable client-table/insight pattern. Intercom varies queue views inside a stable inbox. HubSpot varies task views inside a stable task list. Different content may justify different representations, but no reviewed evidence shows that seven permanent, structurally different bodies improve speed, learning, or confidence.

General interface-change research found that switching interfaces can sharply reduce task performance while users adapt. It is not research on persistent user-selected SMB views, so it is a caution against automatic or unexplained rearrangement rather than proof that the seven-view concept fails. [Microsoft Research on adaptation to interface change](https://www.microsoft.com/en-us/research/publication/user-behaviour-adaptation-interface-change/)

### 3. “Reason first” is speculative

Competitors surface reasons, badges, due dates, and metrics, but still make the client identity a stable scanning anchor. No reviewed direct product makes an explanatory sentence consistently replace the client's name as the primary row object. The benefit for exception scanning and the cost for known-client lookup are both unknown.

General scanning guidance supports front-loading distinctive words in lists, which is compatible with leading a triage row with “Check-in three days overdue.” It does not support doing so in a lookup roster, where the client's name is the distinctive search target. [UK ONS online-reading guidance](https://service-manual.ons.gov.uk/content/writing-for-users/how-people-read-online), [Nielsen Norman scanning report](https://media.nngroup.com/media/reports/free/PR_on_Websites_3rd_Edition.pdf)

### 4. Composite risk can create false authority

The strongest precedents remain interpretable:

- Trainerize exposes separate setup, silence, compliance, program, and payment tags.
- TrueCoach explains its 20% compliance drop.
- Everfit exposes signals, thresholds, trend, and an option to flag an inaccurate status. [Everfit additional workflows](https://help.everfit.io/en/articles/16000629-check-in-dashboard-additional-workflows)
- Coach Catalyst publishes simple compliance and inactivity defaults.

A label such as “87% churn risk” would have much weaker evidence than “no reply for seven days; training compliance fell below 60%,” unless CoachEasy had validated calibration data. No such CoachEasy dataset was established.

Google's PAIR guidance treats explanation as a way to calibrate—not maximize—trust and recommends making the data used, missing information, limitations, and available recourse understandable. That is consistent with the competitor evidence for reasons, thresholds, and correction paths, although PAIR is general AI guidance rather than research on coaches. [PAIR explainability and trust](https://pair.withgoogle.com/chapter/explainability-trust), [PAIR interaction patterns](https://pair.withgoogle.com/guidebook-v2/patterns)

### 5. Causes should not collapse into one intervention

Silence, missed workouts, incomplete intake, program end, failed payment, injury, poor sleep, and a client waiting for a coach are different situations. A single Slipping or Needs you bucket may be useful for discovery, but the evidence does not support treating their cause, urgency, confidence, or next coaching response as equivalent.

### 6. External channels remain part of the real workflow

Community anecdotes repeatedly mention WhatsApp, text, email, Loom, spreadsheets, calendars, and payment tools. This is not proof that fragmentation is preferred; it is evidence that channel habit and notification reliability matter. A navigation change alone cannot make an internal channel the place clients reliably respond.

### 7. Default priority is context-dependent

One coach may open the app to answer messages; another to build today's training; another to review check-ins; another to find a known client. Everfit allowing its check-in dashboard to be set as home is evidence for configurability, not proof of a universal default.

## Conflicts, recency, and limitations

- **Everfit recency materially changes the category picture.** Its help pages were marked as updated in the week of this research. Earlier comparisons can now understate its triage capability.
- **Official omissions are not absence.** Many vendors do not publicly document initial roster order, exact risk thresholds, or every contextual message entry point. Those cells are marked not publicly documented rather than “no.”
- **Vendor marketing is not a product contract.** Exercise.com's retention-risk language and some PT Distinction/My PT Hub positioning are marketing claims where exact formulas were not published.
- **Coach Catalyst pricing is ambiguous.** The current page presents $108 monthly and “$50 billed yearly” language. This report preserves the conflict instead of guessing the intended monthly equivalent.
- **Current price pages are dynamic.** Annual toggles, temporary offers, add-ons, taxes, and currencies can change effective price.
- **Academic populations differ.** Employer weight management, gym attendance, digital fitness apps, and treatment adherence are directionally relevant but do not directly estimate independent online coaching churn.
- **Community evidence is weak by design.** Reddit and review-platform quotes reveal possible pains and language, not market frequency or causality.
- **CoachEasy feasibility is a current-code snapshot.** The product contracts and implementation can change; this report does not promise future schema or roadmap state.

## Research conclusion

The concept is aimed at a real operational pain: at a 10–40-client roster, a coach must repeatedly notice silence, compliance changes, due work, onboarding gaps, messages, positive progress, and commercial risk without reconstructing every client from memory.

The external evidence does **not** support the stronger story that this is an unclaimed category or that a separate Messages destination is obsolete. Everfit is already a close implementation of triage-first client management, and the broader market preserves a central inbox alongside contextual messaging. Positive progress, inactivity, program ending, payments, and saved views are also established incumbent territory.

The clean research verdict is therefore:

- validate the **problem** and the **hybrid client-attention model**;
- reject novelty claims about risk-first rosters, silence, momentum, or renewal awareness;
- treat H2, H1, and a weaker form of H3 as directional hypotheses requiring CoachEasy-specific evidence;
- treat H6 and H5's retention/revenue claims as unproven;
- treat H4 as contradicted by present market behaviour;
- regard saved question-based views as well precedented, but seven adaptive body structures as an unresolved interaction bet;
- regard the current CoachEasy data model as sufficient for All clients and Onboarding, partial for Needs you and Waiting on you, and insufficient for authoritative Today, Momentum, or Money views.

This research narrows the uncertainty. It does not establish that the concept will improve coach response time, reduce missed client work, change client retention, or outperform the existing CoachEasy dashboard and inbox. Those remain product-specific outcome questions.
