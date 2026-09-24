# Next feature recommendation: client review and plan adjustment

Research date: 2026-09-23. Desk research and a product recommendation; no interviews with Easy's target coaches or new product usability tests were conducted. This is not an approved implementation specification.

Working assumption: Easy serves independent online coaches providing individual training and nutrition support to existing clients. The user has not yet confirmed the segment, geography, roster size, or service cadence. The retained product includes client-owned plans, workout and meal records, history, and chat that can reference those records. Forms, attention queues, automated follow-ups, and weight tracking were removed. Product facts come from the session and `CONTEXT.md`, not the external studies.

## Recommendation and confidence

Refine the existing client experience around one task: understand what happened, discuss what it means, and decide whether to maintain or adjust the client's plan. Start with training-session review. This uses the core the user chose to keep: clients, prescriptions, recorded sessions, history, and conversation.

The proposed improvement is how these existing capabilities work together. Source-linked chat already exists. A new dashboard, queue, review object, or form is not a prerequisite. A useful result may be a better connection between the existing client history, chat, and plan editor.

Confidence is moderate that this is a valuable recurring job for the assumed audience; confidence is lower that Easy needs additional UI to perform it. None of the reviewed studies tests Easy or establishes that a review screen, weekly form, or particular communication schedule produces better outcomes. Observe the current workflow before deciding what to build.

The smallest concept to test is: open one client's completed workout; inspect the captured prescription, actual performance, relevant earlier sessions and client explanation; clarify uncertainty through existing chat; keep or edit the existing client-owned plan; make the decision and reason understandable to the client. Start with this complete training task before extending it to nutrition.

Preserve the existing model: editing a client plan does not modify its source template or another client's plan; completed sessions retain their captured prescriptions. The workout schedule is guidance, not a set of persistent scheduled occurrences. Missing records mean unknown, not failure. These are existing product constraints, not conclusions from competitors.

Example for concept testing: a client records a shortened session and explains that work travel has reduced their available time. The coach reviews the relevant sessions, asks what time is realistically available, adjusts that client's plan if appropriate, and explains the change. The product should help both people reach a clear next step. A deliberate decision to leave the plan unchanged is also a valid outcome.

## Research approach

The evidence combines original research, providers' descriptions of their own coaching services, and official platform documentation. Research describes particular sampled populations; providers describe their service promises; documentation establishes capabilities. None establishes demand, time savings, or retention gains for Easy. Affiliate comparisons, anonymous forum claims, and unsupported vendor efficiency promises were not used as decision evidence.

The sources cover different populations. Remote endurance coaches are the closest substantial practice sample. Professional athletes, municipal health professionals, and participants in digital weight-management trials provide adjacent evidence. Their needs should not be treated as representative of all independent strength and nutrition coaches.

## Coaching practice and the strongest counterargument

FeastGood's own 2023 online survey of 186 nutrition coaches reported regular check-ins among 98% of respondents and weekly check-ins among 73%. Video calls and text/chat were both common. Recruitment came from nutrition certification, app-user, professional-community and social-media audiences; this was not a representative probability sample. It supports investigating a recurring conversation, not requiring a particular form or weekly schedule. [Survey and recruitment methods](https://feastgood.com/nutrition-coaching-study/).

Stronger By Science describes coaching that learns the client's goals, preferences and history, then supplies ongoing adjustments and communication. It states that communication primarily uses email and shared documents, with check-in frequency agreed by coach and client. This is a provider's advertised workflow, not independent outcome evidence. It is a strong counterexample to the assumption that good coaching requires a dedicated review feature. [Provider's own service description and FAQ](https://www.strongerbyscience.com/coaching/).

Precision Nutrition's own teaching method emphasizes learning a client's circumstances, proposing manageable actions with the client, and following up. That supports keeping explanations and constraints close to decisions. It is practitioner guidance, not a controlled software comparison. [Coaching method](https://www.precisionnutrition.com/how-to-talk-to-health-and-fitness-clients).

A 2021 ethnographic study interviewed 25 gym users and five personal trainers in Denmark and included participant observation. It describes combining digital records, paper notes, and trainers' interpretations; the numbers did not provide all the context needed for decisions. The purposive sample comprised frequent exercisers from middle-class Danish backgrounds, so transfer to Easy is limited. [Kristensen, Kuruoglu and Banke, original article](https://onlinelibrary.wiley.com/doi/full/10.1111/1467-9566.13352).

**Counterargument:** Easy may already support the necessary review through its existing history and chat. The actual bottleneck could be missing client context, difficult plan editing, or burdensome workout recording. In that case, improve that narrower task and do not add another review screen.

## What six platforms actually support

Public documentation was checked on 2026-09-23. These are documented workflows, not hands-on product audits or rankings. Older pages may lag current navigation. Platform presence is evidence of an established design pattern, not proof that coaches use it or that it improves outcomes.

| Platform | Documented workflow | Implication for Easy; interpretation rather than proven benefit |
| --- | --- | --- |
| Everfit | A completed workout opens results and its exercise-tagged text, image and video comments together. Entry is through a workout notification or client calendar. The help page shows only a relative update date. [Workout comments](https://help.everfit.io/en/articles/4346734-comments-for-completed-workouts). | Keep the client's explanation attached to the evidence being reviewed. Easy already has record-linked chat; test the navigation and clarity rather than rebuilding comments. |
| CoachRx | Its calendar shows results inline and provides conversation history without leaving programming; documentation dated June 13, 2026. [Program Design Calendar](https://intercom.help/coachrx/en/articles/5829040-program-design-calendar). Separate guidance distinguishes messages needing a response from session notes read when programming; its example response times are not a universal benchmark. [Communication expectations](https://www.coachrx.app/articles/pro-tip-communication-expectations). | Put review and plan adjustment close together. Agree communication expectations instead of treating every entry as an immediate task. |
| TrueCoach | Client-calendar edits do not change the reusable program or other clients; program Sync is a separate mechanism that propagates template edits. Documentation dated March 22, 2023. [Programs](https://help.truecoach.co/en/articles/3047401-programs). | Make the scope of an adjustment obvious. Preserve Easy's independent client plans instead of copying a competitor's synchronization model. |
| Trainerize | Its client view surfaces sign-ins, workouts and compliance. Workout compliance counts trainer-scheduled sessions; nutrition compliance requires all configured daily targets to be met. No exact update date was visible. [Engagement and compliance definitions](https://help.trainerize.com/hc/en-us/articles/360022256632-Measuring-Client-Engagement-and-Compliance). | A percentage reflects product definitions and recorded data. It cannot establish effort, motivation, or activity outside the app. Avoid copying a score before defining the decision it supports. |
| TrainHeroic | A coach can open logged sessions from Coach Home, then choose a private direct message or a session comment visible to the group. Documentation dated August 11, 2023. [Coach Home](https://support.trainheroic.com/hc/en-us/articles/18156740868493-Using-the-Coach-Home-Activity-Feed). | Reviewing evidence and responding is common, but the audience matters. Team features have weaker fit under Easy's assumed one-to-one focus. |
| Practice Better | Journal analysis supports filtering and date comparisons; missing days are excluded by default. Entries can be marked reviewed. Documentation dated June 25, 2026 and warns some navigation screenshots may lag a refresh. [Journal analysis](https://help.practicebetter.io/hc/en-us/articles/360048122572-Analyzing-Client-Journal-Entries). | Distinguish missing information from zero intake. Add review bookkeeping only if coaches actually need it. |

Across these examples, the useful commonality is access to a record, its context, communication and a subsequent decision. The products vary in the container they use: calendar, journal, client view or activity feed. That variation argues for designing Easy around the task before choosing a screen type.

## Why this candidate comes before the alternatives

This ordering is product judgment for the assumed segment, not a score produced by the studies.

| Candidate | Priority and condition |
| --- | --- |
| Review and adjust an existing client's plan | First candidate to observe and prototype: recurring work that draws directly on the retained core. Build only if a specific friction remains in the current experience. |
| Understand a new client and agree an initial plan | Strongest alternative. Prioritize it if coaches cannot access goals, preferences, constraints and history when prescribing. NSCA's consultation guidance supports this information need, not a generic form builder. [Initial consultation](https://www.nsca.com/education/articles/ptq/back-to-basics-3-steps-of-the-initial-consultation/). |
| Faster plan authoring and personalization | Wins if observation shows coaches know the decision but spend most of their effort implementing it in the editor. This may be the first implementation arising from review research. |
| Weekly forms or roster-wide attention dashboard | Defer until recurring information gaps or difficulty choosing whom to review are observed. Neither follows automatically from coaches doing periodic reviews. |
| Progress metrics, prospect management or website tools | Separate jobs. The evidence assembled here does not justify making them the next investment after the core reset. |

For mostly in-person or hybrid coaching, the first-session consultation and preparation may be more pressing. For gym teams, coordination and ownership may dominate. The unconfirmed segment is therefore a material assumption.

## Supporting original studies and their limits

### 1. What remote coaches spend time on and ask athletes to report

Kirkland and Cowley, *An exploration of context and learning in endurance sports coaching*, published 17 April 2023. International self-completion surveys included 839 coaches, 612 individually coached athletes, and 8,352 non-coached athletes. Recruitment was purposive and snowball-based through social media and industry networks; collection preceded COVID-19. [Original study](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1147475/full).

Coaches reported planning/prescribing as 33.5% of their coaching time and remote coaching as 19.4%; variation was substantial. Requested feedback included device-derived training load (538 responses), subjective feedback such as mood/work-life balance (312), and perceived exertion (235). Only 33% of coached athletes judged their own feedback high quality. These are reported practices and perceptions, not observed time savings or measured performance gains. [Results, tables 4–5 and feedback discussion](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1147475/full).

The sample may overrepresent digital users and is endurance-specific. It supports investigating both contextual feedback and prescription work; it does not establish that more metrics improve coaching. Product inference: keep a client's explanation close to the relevant training record and ensuing decision.

### 2. What asynchronous coaches say makes communication useful

Brandt and colleagues, *Determinants of Successful eHealth Coaching for Consumer Lifestyle Changes*, published 5 July 2018. Semistructured interviews with 10 female health professionals in five Danish municipalities, conducted May–June 2017, examined one hybrid coaching service. Participants were dietitians, nurses, physiotherapists, or occupational therapists, rather than independent personal trainers. [Original study](https://www.jmir.org/2018/7/e237/); [publisher PDF](https://www.jmir.org/2018/7/e237/PDF).

They described learning personal barriers, maintaining rapport, and using conversation history to personalize advice. Asynchronous communication allowed reflection before responding but also introduced delays. Nine of ten reported spending 5–10 minutes per digital coaching session. This was self-reported time, not a controlled efficiency comparison. [Findings](https://www.jmir.org/2018/7/e237/).

No patient interviews or quantified outcomes validated these perceived ingredients. The initial personal meeting was part of the context, and the paper discloses a platform-ownership conflict. Product inference: preserve conversational continuity and permit considered replies; avoid assuming immediate responses or generic reminders are what clients need.

### 3. What clients say is missing from nutrition support

Dunne and colleagues, *Athlete experiences of communication strategies in applied sports nutrition and future considerations for mobile app supportive solutions*, published 12 September 2022. Nine focus groups included 41 full-time professional athletes, 24 men and 17 women, from five sports in the UK and Ireland. Sampling was purposive. [Original study](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.911412/full).

Athletes described limited individual contact and advice insufficiently adapted to their training. They also valued quick remote exchanges, including pictures and recipe questions. Their desired personalization was a stated need; the study did not test an app or measure resulting dietary change. [Results](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.911412/full).

No practitioner data was collected. Elite team support differs from a purchased one-to-one service, and several authors held shares in relevant app businesses. Product inference: make a specific meal question and its training context easy to discuss; do not equate a polished generic nutrition plan with personalized support.

### 4. Why missing tracking data has several possible meanings

Epstein, Ping, Fogarty, and Munson, *A lived informatics model of personal informatics*, UbiComp 2015. The study used surveys from 168 unique people across physical activity, finances, and location tracking, followed by 22 interviews. The activity survey included 105 respondents; these domain counts overlap. Recruitment used US Mechanical Turk participants and, for some interviews, university/social networks. [Author-hosted paper](https://www.smunson.com/portfolio/projects/lifelogs/livedinformaticsmodel_ubicomp15.pdf).

Reported lapses included forgetting, the work of maintaining tools, deliberately skipping entries, and suspending tracking. Some people resumed by reviewing historical data before collecting more. Tracking served curiosity and awareness as well as behavior-change goals. [Findings](https://www.smunson.com/portfolio/projects/lifelogs/livedinformaticsmodel_ubicomp15.pdf).

This is qualitative evidence about tool use, not a coach-client trial or an estimate of dietary adherence. Product inference: show an absent record as unknown, make returning easy, and let clients explain interruptions. A logging streak cannot establish whether the underlying workout or eating behavior occurred.

### 5. Lower recording demands sometimes improve recorded engagement

Patel and colleagues, *Detailed Versus Simplified Dietary Self-monitoring in a Digital Weight Loss Intervention Among Racial and Ethnic Minority Adults*, published 13 December 2022. This three-month randomized pilot enrolled 38 US adults with overweight/obesity: 18 tracked all intake and 20 tracked selected high-calorie foods. Both groups also received behavioral material and personalized feedback. [Original study](https://formative.jmir.org/2022/12/e42191/); [author's university-hosted PDF](https://cap.stanford.edu/profiles/cwmd?cwmId=11216&fid=187857).

Median dietary logging covered 49% of days in the detailed group and 97% in the simplified group. Retention was 92%. Mean weight changes were approximately −3.4 and −3.3 kg respectively. These are trial measurements, not a demonstration that the methods were equivalent. [Results](https://formative.jmir.org/2022/12/e42191/).

The feasibility pilot was small, short, and used different logging interfaces. It did not test independent coaching or isolate a coach-review feature. Product inference: test recording burden before adding required fields. The outcome measured here does not justify restoring weight tracking to Easy.

### 6. Counterevidence: simpler tracking did not reliably improve engagement

Nezami and colleagues, *A pilot randomized trial of simplified versus standard calorie dietary self-monitoring in a mobile weight loss intervention*, published online 11 February 2022, March issue. Seventy-two adults with overweight/obesity and a child aged 2–12 at home were randomized to detailed calorie tracking or selected-food tracking for six months. [Original author manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC9469733/); [DOI](https://doi.org/10.1002/oby.23377).

There was no detected difference in dietary tracking days: means were 89.2 for standard tracking and 86.2 for simplified tracking among completers. Perceived tracking difficulty also did not differ. Standard-group participants reported greater intention to continue their method. Weight changes of 5.7% versus 4.0% were not statistically different. [Results and discussion](https://pmc.ncbi.nlm.nih.gov/articles/PMC9469733/).

The sample was predominantly highly educated White women; the program was mainly automated after an initial group meeting. It was not an equivalence trial. Product inference: retain flexibility for clients who value detail. Removing detail is not a universally supported improvement.

## Validation before implementation

The following is a product-research proposal, not a causal conclusion from the papers.

Recruit six coaches in the target segment, including different roster sizes and clients who record inconsistently. Ask each to walk through their last new-client setup and two recent decisions, including a case where they kept the plan unchanged. Use consented or redacted examples. Follow the work from the client record through the conversation to the next decision. Separate time spent finding information, asking for context, deciding, editing and explaining.

Try comparable tasks with retained Easy first. Record whether the problem is missing information, poor navigation, editor effort, or no material problem at all. Only prototype the interaction that addresses the observed difficulty. A useful discovery prompt is: “Show me the last time you changed a client's plan, and everything you looked at before deciding.” Asking whether coaches would like a dashboard gives weaker evidence.

Pilot with three coaches and two consenting clients each for two weeks, using existing chat and records wherever possible. These sample sizes and duration are a pragmatic discovery proposal, not a statistical efficacy design. Ask only questions needed for actual decisions. Measure time to understand and communicate a decision, repeated clarification, mistaken source references, client effort, coach interruptions, and whether the client can explain what to do next. Compare comparable cases against the existing workflow; do not use message volume or logged days as stand-alone success measures.

Proceed when several coaches independently demonstrate the same recurring difficulty, the prototype addresses it without extra client reporting, and coaches reuse it for real decisions. Stop or redirect if existing Easy handles the task easily, missing initial context dominates, recording is the obstacle, or the coach knows the decision but the plan editor is slow. Two weeks cannot establish improved adherence, retention, or business results.

Before implementation, settle four UX questions through these observations: where the review naturally starts; what information is essential to the decision; how a client recognizes the guidance that changed; and how the coach returns to the decision later. Let coach-client agreements determine cadence. Do not count simply viewing a record as useful coaching or add a mandatory “reviewed” state without a demonstrated need.

## Evidence gaps and limits

This search found no controlled comparison establishing the best post-assignment workflow for independent online training-plus-nutrition coaches. It does not establish an optimal review frequency, response-time promise, number of required fields, or financial return. The reported practices do not identify which clients benefit from detailed logs, brief notes, pictures, or synchronous conversations.

No source establishes that a dashboard, mandatory weekly form, or automated non-adherence flag is necessary. The empirical case for tracking flexibility is mixed, and the strongest direct practice sample is endurance-focused. Confirm the target coach's service model and the main client bottleneck before selecting the refinement. Publication dates above come from the articles themselves, rather than search-engine freshness labels.
