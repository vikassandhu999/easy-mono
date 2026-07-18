# COPY.md — exact strings per screen

Copy is part of the spec. Use these strings **verbatim** — no paraphrasing, no "improvements".
Rows of sample data (client names, foods, plans) are NOT copy — they show data shape only; real data comes from the API.
`*` marks a required-field label. `…` endings are input placeholders.

## Global chrome
- Sidebar: Dashboard, Clients, Messages · section label "BUILDER" · Exercises, Foods, Recipes, Nutrition, Training, Forms
- Mobile bottom nav: Dashboard, Clients, Builder, Messages
- Brand: CoachEasy

## DB — Dashboard
- Eyebrow: `TUESDAY · JUL 15` (live date) · H1: `Good morning, {firstName}`
- Stats: `Active clients`, `Pending invites`
- Setup strip: `Get your workspace ready` · `1 of 3 complete · about 4 min left` · steps `Set up profile` (Done), `Build first plan` (In progress), `Invite a client` (Up next) · button `Continue setup`
- Queue: `Needs you today` · `{n} items` · `Sorted by priority`
- Check-ins card: `5 check-ins to review` · `Oldest waiting 2 days · Sam, Priya, Devon +2` · button `Review`
- Row badges: `Expiring`, `Needs plan`, `New lead`, `Intake` · row subtitles: `Subscription ends in 3 days`, `No plan assigned yet`, `12-week transformation · applied 5h ago`, `Intake form incomplete` · row actions: `Renew`, `Assign`, `Review`, `Nudge`
- Footer link: `View all clients`
- Rail: `Recent conversations` / `Inbox` · `Quick actions`: `Invite a client`, `New training plan`, `New nutrition plan`, `Edit landing page`

## CL — Clients listing
- H1 `Clients` · subtitle `{n} active · {m} invited` · button `Invite client`
- Search placeholder `Search clients` · sort `Last active`
- Filter chips: `All {n}`, `Active {n}`, `Needs attention {n}`, `Invited {n}`, `Inactive {n}` (mobile: `All {n}`, `Active`, `Attention`, `Invited`, `Inactive`)
- Row status strings: `Active {time} ago`, `Awaiting acceptance` + chip `Invited` + `Invited {time}`, `Inactive`, `Expired {date}`
- Mobile row subtitles: plan names joined ` · `; state rows: `Subscription expiring soon`, `Needs a plan assigned`, `Invited · {time} ago`

## IN — Invite client
- H1 `Invite client` · subtitle `Send an invite so your client can join and start their program.`
- Seat meter: `{used} of {limit} seats used` · `{n} remaining`
- Section `Client details` · helper `Add an email or phone number so the client can receive the invite.`
- Fields: `Name *` (ph `Jordan Miles`), `Email` (ph `name@email.com`), `Phone` (ph `+1 (555) 000-0000`), `Assigned trainer` (value `Alex Morgan (you)`, helper `Leave as-is to keep yourself assigned.`), `Notes` (ph `Goals, injuries, preferences, or anything the client mentioned…`)
- Actions: `Cancel` · `Send invite`
- Success: `Invite sent to {email}` · `The email invite is on its way. The link below stays valid until they join.` · chip `Invited · Pending acceptance` · label `Invite link` · buttons `Copy`, `Share via WhatsApp`, `Copy link`, `View client`, `Invite another`

## EX / EP / ED — Exercises
- List: H1 `Exercises` · subtitle `Your movement library for building training plans` · button `Create exercise` · search `Search exercises…` · filter `Muscle groups` · count `{n} exercises`
- Row meta: `{muscles} · system|custom` + tags `Compound|Isolation|Isometric`, `Push|Pull|Static`
- Create: H1 `Create exercise` · `Add a custom movement to your library.` · sections `Details` (`Name the movement and describe how it's performed.`), `Images` (`Add image URL`), `Attributes`
- Fields: `Name *` (ph `e.g. Bulgarian Split Squat`), `Description` (ph `Short summary of the movement…`), `Instructions` (ph `Add cues, setup notes, and execution steps`), `Mechanics`/`Force` (ph `Select…`), `Muscles` (ph `Search and select muscles`), `Equipment` (ph `Search and select equipment`)
- Actions: `Cancel` · `Create exercise` / edit: `Save changes`
- Edit header: `Edit exercise` · `Update this movement in your library.`
- Detail (EP): actions `Edit`, `Duplicate`, delete icon · sections `About this movement`, `Instructions` (numbered), `Cues` (check list), `Target muscles`, `Equipment` · footer `Created {date}` `Updated {date}`

## FO / FD / FE — Foods
- List: H1 `Foods` · `Your ingredient library for building nutrition plans` · `Create food` · `Search foods…` · filter `Categories` · count `{n} foods`
- Row meta: `{category} · system|custom` · macros `{kcal} cal  P {p}  C {c}  F {f}` (mobile: `{kcal} cal` only)
- Create: `Create food` · `Add a custom food to your library.` · sections `Details` (`Name the food and where it came from.`), `Nutrition` (`Enter values per 100 g.`), `Serving sizes` (`Optional presets clients can log against.`)
- Fields: `Name *` (ph `e.g. Greek Yogurt, 2%`), `Category` (ph `e.g. Dairy`), `Source` (ph `e.g. USDA`), `Notes` (ph `Prep notes, brand, or anything worth remembering…`), `Calories`, `Protein (g)`, `Carbs (g)`, `Fat (g)`, `Fiber (g)`, `Sugar (g)`
- Serving-size editor: `Unit *`, `Amount`, `Weight (g)` · `+ Add serving size` · error `Enter a serving unit`
- Image adder: `Add image URL` → url field, `Add`/`Cancel` · error `Paste an image URL`
- Detail (FD): `Nutrition · per 100 g` · `{kcal} kcal` · `Serving sizes` rows `1 scoop — 30 g` · `Notes` · dates
- Edit: `Edit food` · `Update this food in your library.` · `Save changes`

## RC / RD / RE — Recipes
- List: H1 `Recipes` · `Combine foods into reusable dishes for nutrition plans` · `Create recipe` · `Search recipes…` · count `{n} recipes` · row meta `{n} ingredients` · `{kcal} Cal`
- Create: `Create recipe` · `Combine foods into a reusable dish.` · sections `Details` (`Name the dish and describe how it's made.`), `Ingredients` (`Add foods and set the amount used.`), `Nutrition · recipe totals`, `Serving sizes`
- Fields: `Name *` (ph `e.g. Chicken & Rice Bowl`), `Instructions` (ph `Steps to prepare the recipe…`), `Cooked weight (g)` (helper `Optional — total cooked weight`)
- Ingredients: empty `No ingredients yet. Add foods below.` · `+ Add ingredient` · per-row `Amount`, `Unit`, `Weight (g)` · totals `{kcal} kcal total · Protein {p} g · Carbs {c} g · Fats {f} g · Fiber {fb} g`
- Detail (RD): meta `{n} ingredients · {g} g cooked` · sections `Nutrition · recipe totals`, `Ingredients`, `Instructions`, `Serving sizes` · dates
- Edit: `Edit recipe` · `Update this recipe in your library.` · `Save changes`

## NP / NE — Nutrition plans
- List: H1 `Nutrition plans` · `Reusable daily macro targets and meal structures for your clients` · `Create plan` · `Search nutrition plans…` · tabs `All {n}` `Active {n}` `Archived {n}` · row meta `{kcal} kcal · {p}g protein · {n} clients` · chips `Active` (green) / `Archived` (amber)
- Create: `Create nutrition plan` · `Set plan goals now, then add meals next.` · sections `Plan details` (`Name the plan and describe who it's for.`), `Daily macro goal` (`Optional daily targets. You can fine-tune these in the builder.`)
- Fields: `Name *` (ph `e.g. High-Protein Cut`), `Description` (ph `Who this plan is for, phase, or any coaching notes…`), `Calories`, `Protein (g)`, `Carbs (g)`, `Fat (g)`, `Fiber (g)`
- Actions: `Cancel` · `Create plan` (arrow icon — it leads into the builder) / edit: `Save changes`
- Edit: `Edit nutrition plan` · `Update the plan's goals. Meals & days live in the builder.`

## NB — Nutrition plan builder
- Title `{plan} — {client}` · buttons `Add to client`, ⋯
- Day menu: `Rename day`, `Delete day` · `+ Day` · delete confirm `Delete "{day}"? Its meals stay in the plan.` `Cancel`/`Delete`
- Energy line: `{kcal} / {target} kcal` · macro meters `Protein {v} / {t}g` etc. · toggle `Show macros`/`Hide macros`
- Meal menu: `Rename meal`, `Move up`, `Move down`, `Remove from this day`
- Shared tag: `Used in {n} places` · note `This meal is on {n} days — edits apply everywhere.`
- Items: empty `No foods yet — add the first one below.` · `+ Add food or recipe`
- Swaps: `Client can swap with` · `+ Add a swap` · empty `No other meals yet`
- Day empty: `No meals on this day yet — add the first one below.` · `Add meal`
- Add-meal panel: `Create a new meal` / `Start empty, add foods or recipes` · `Reuse an existing meal` · exhausted `Every meal is already on this day.`
- Picker sheet: `Add to {meal}` · tabs `Foods` / `Recipes` · search `Search…` · item sub `per 100 g · {kcal} kcal` / `per serving · {kcal} kcal` · create row `Create food "{query}"` · confirm `Add {n} item(s)` / disabled `Add items`
- Amount sheet: chips from serving presets `1 scoop (30g)` · `Servings`/`Count` · `Or enter grams` · preview `resolves to {g} g → {kcal} kcal · {p}P · {c}C · {f}F` · `Add to meal` · edit mode: `Changes save automatically`, `Remove from meal`

## TR / TE — Training plans
- List: H1 `Training plans` · `Reusable workout splits and progressions for your clients` · `Create plan` · `Search training plans…` · tabs as NP · row meta `{n} workouts · {m} exercises`
- Create: `Create training plan` · `Name the plan now, then build workouts next.` · `Plan details` · `Name *` (ph `e.g. Push Pull Legs`), `Description` (ph `Goals, training split, or coaching notes…`)
- Edit: `Edit training plan` · `Update the plan's details. Workouts & schedule live in the builder.` · `Save changes`

## TB — Training plan builder
- Title `{plan} — {client}` · `Add to client` · workout tabs + `+ Workout` (new = `New workout`)
- Workout menu: `Rename workout`, `Delete workout` · weekday chips per workout · schedule label `Scheduled: Mon, Thu` / `Not scheduled yet`
- Empty: `No exercises yet — add the first one below.` · `+ Add set` · `Add exercise`
- Set row format: `Set {n}` + summary `Warm-up|Working|Drop · {reps} × {load}{unit} · {dur}s · {dist}m · RPE {rpe}` (fields depend on tracking type)
- Tracking labels: `Weight & reps`, `Bodyweight reps`, `Reps only`, `Duration`, `Weight & time`, `Distance & time`, `Weight & distance`, `Weighted bodyweight`, `Assisted bodyweight`
- Set editor: seg `Working`/`Warm-up`/`Drop` · fields `Reps`, `Weight` (units kg/lbs/bw), `RPE`, `Secs`, `Dist` (m/km/mi), `Rest (seconds)` · `Done`
- Exercise picker: `Add exercises` · confirm `Add {n} exercise(s)` · create row `Create exercise "{query}"`
- Day-first variant: day tabs Mon–Sun with sub `{workout}` / `Rest` · assign menu `Rest — No workout`, workouts with `On Mon, Thu`, `New workout for this day — Start empty` · shared `Used on Mon, Thu` / `Scheduled on {n} days — edits apply to all of them.` · volume `{n} sets · {m} exercises · ~{min} min` · `Show breakdown`/`Hide breakdown` (`Working`/`Warm-up`/`Drop sets`)

## FM — Forms listing
- H1 `Forms` · `Intake, check-in, and questionnaire forms for your clients` · `Create form` · `Search forms…` · tabs `All` `Active` `Draft` `Archived`
- Row meta: `{Type} · {n} questions · {m} responses` · chips `Active`/`Draft`/`Archived`
- Create: `Create form` · `Name the form now, then add questions next.` · `Form details` (`Name the form and pick what it's for.`) · `Name *` (ph `e.g. Weekly Check-in`), `Type` (Check-in / Intake / Questionnaire), `Description` (ph `What this form collects, or instructions for the client…`)

## FB — Form builder
- Header: `Editing form` + summary `{n} questions · {m} required · {k} sections` · buttons `Preview`, `Save form`
- Fields: `Form name`, `Type` seg (Check-in / Intake / Questionnaire)
- Section menu: `Move section up`, `Move section down`, `Delete section` · `Add section` (new = `New section`)
- Question row: placeholder `Untitled question` · `REQ` badge · menu `Move up`, `Move down`, `Duplicate`, `Remove`
- Expanded: `Question`, `Answer type`, `Required` toggle, `Options` + `+ Add option`
- Answer types: `Text`, `Number`, `Rating (1–5)`, `Yes / No`, `Select`, `Multi-select`, `Photo`, `Date`, `Weight`
- Empty: `No questions yet — add one below.` · `Add question`
- Add palette: `New question` (all 9 types) · `Common questions` grouped `Body / Training / Nutrition / Recovery / Mindset` — preset labels: Weight; Waist measurement; Progress photos (front/side/back); Workouts completed this week; Training adherence; Muscle soreness; Any pain or injuries?; Nutrition adherence; Hunger levels; Meals off plan this week; Daily water intake (liters); Sleep quality; Average hours of sleep; Energy levels; Stress levels; Motivation; Rate your week overall; Biggest win this week; What will you improve next week?; Questions for your coach

## ST — Settings
- H1 `Settings` · tabs `Profile` `Team` `Billing` `Account`
- Profile: `Your name and how clients reach you` · rows Name / Business / Phone / WhatsApp with `Edit` → `Save`/`Cancel`
- Team: `{n} active · {m} total` + `· owner manages access` · `Invite trainer` · chips `Owner`, `Active`, `Invited`, `Deactivated` · row actions `Resend`, `Revoke`, `Deactivate`
- Invite dialog: `Invite a trainer` · `They'll get an email invite and take a seat once they join.` · `First name`, `Last name`, `Email *` · `Cancel`/`Send invite`
- Billing: `Seats are used by active clients + pending invites` · `{used} / {limit} seats` · `{free} free + {paid} paid · {price} / seat / month` · `Renews {date}` · warning `{n} client(s) waiting for a seat` · `Add seats` · `Cancel subscription` · `Activity` feed (`Payment succeeded — {amt}`, `Added {n} seats`, `Cancellation scheduled`)
- Add seats dialog: `Add seats` · `Seats to add` stepper · cost `{amt} / month` · confirm `Add seats`
- Cancel confirm: `Cancel subscription?` · `Paid seats stay until {date}. Existing clients keep access.` · `Keep subscription`/`Cancel subscription`
- Deactivate confirm: `Deactivate trainer?` · `Deactivate {name}? Their clients will be reassigned to you.` · `Cancel`/`Deactivate`
- Status labels: `Free plan`, `Active`, `Payment overdue`, `Cancels at period end`, `Cancelled`
- Account: `Sign-in details` · `Email {email}` · `Auth — Email OTP` · `Log out` · footer `CoachApp v2.4.0`
