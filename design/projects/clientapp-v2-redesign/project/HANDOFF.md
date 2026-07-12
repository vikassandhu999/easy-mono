# CoachEasy Client App Redesign — Handoff

## Product
**CoachEasy** — mobile fitness + nutrition **coaching** client app (React + HeroUI v3 + Tailwind v4 + Lucide, Capacitor, mobile-only). Codebase mounted at `clientapp-v2/`. Screens: Training, Nutrition, Progress, Check-ins, Coach chat, Settings, Active Workout, Workout History, Session Detail, auth.

## Brand (source of truth — design-system project is EMPTY)
- **Azure `#0485f7`** (from app icon/logo — a finger-snap "make it easy" mark). Friendly, effortless, premium — NOT moody/gaming.
- Font: **Plus Jakarta Sans** (400–800).
- The differentiator is the **coach relationship** + daily **train + eat + report-back** loop.

## Locked design language ("CoachEasy", light premium)
- Page bg `#f4f4f2` (warm neutral). Cards `#fff`, hairline border `#ececef`, NO heavy shadows (depth reserved for the ONE focal element).
- Ink `#12141a`; muted `#767b85`; faint `#9498a1`; hairline `#e6e7e4`/`#f0f0ee`; tint `#eef4fb`.
- Accent azure `#0485f7` used **precisely** (buttons, active tab, links, progress) — never as a gradient/wash. Gradients read "phony" — avoided.
- Numbers: weight 800, letter-spacing -.02em.
- Hierarchy rule: **one focal action per screen** gets a big button; everything else is quiet (compact pills, hairline dividers, air).
- Keyframes available in file: `floatUp`, `todayPulse`, `livePulse`, `barFill`, `heroGlow*`.

## IA decisions
- Home is a **"Today" hub** (not "Training"): coach + both pillars on one screen.
- Trimmed tab bar **5 tabs: Today · Train · Eat · Progress · Coach** (Settings behind header avatar).
- **Priority ranking on Today:** check-in due = #1 (bold ink card, the only big button) → Workout + Food = equal peer cards with compact **Start**/**Log** pills → Coach (slim row) + This week (quiet inline stats).
- Workout rows offer both **View** and **Start** (users sometimes just want to look).

## Work done (file: `Training Home.dc.html`, canvas doc, newest turn on top)
- **6a Today hub** (LOCKED) — check-in ink hero #1, workout+food peer cards, coach slim row, This week inline, 5-tab bar.
- **7a Train** — Current plan card (Hypertrophy Block · Week 3/8 · Coach Maya), **full weekly list** (glance whole week; today azure date-pill + accent bar + View/Start; other workout days have View; rest days muted), Recent history (date·duration·sets·volume·soreness emoji).
- **8a View Workout** — read-only: overview + muscle tags, coach note from Maya, exercise list w/ planned sets ("4 sets · 8 reps · 60 kg"), sticky Start bar.
- Older turns kept below for reference: 5a (focused/calm), 4a (premium), 3a (today hub light), 2a/2b (azure light/dark), 1a/1b (current vs first redesign).

## NEXT — priority
**Combine everything into ONE interactive prototype** based on 6a:
- Add a logic class (`class Component extends DCLogic`) with a `screen` state (+ maybe `tab`). `renderVals()` exposes current screen + nav handlers.
- Buttons navigate: tab bar switches Today/Train/Eat/Progress/Coach; Start→Active Workout; View→View Workout; Log→Eat/log; check-in Start→check-in; back returns.
- Reuse 6a/7a/8a markup as screen templates (use `<sc-if>`/conditional rendering per screen). Single phone frame; swap inner content on nav.

## Still to design
Eat, Progress, Coach chat, Active Workout screens (grounded in `clientapp-v2/src/{nutrition,progress,messages,workout}`).

## Later
Settle light vs dark (user chose light; dark 2b exists as in-gym option), wire real fonts/tokens, hand back to code.
