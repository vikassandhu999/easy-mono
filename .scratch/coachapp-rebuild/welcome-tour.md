# Coach welcome tour

When I have created my coaching account, I need to understand what Easy can help me do, so I have a useful starting point and reasons to explore.

This is a first-run introduction at 375px and desktop widths. The costly mistake is overwhelming a coach with setup demands before they see the product's value.

The sequence follows a coaching relationship: understand a client, prepare training, prepare nutrition, review check-ins, stay in contact, and use the daily workbench to choose the next action. Each slide has one benefit, brief explanatory text, and a real screenshot of the corresponding screen with illustrative account data.

Two approaches were considered: a modal over the empty client roster, or a dedicated welcome route. The dedicated route gives screenshots enough room, keeps one primary action, and avoids introducing the full application navigation before the coach has context.

Business setup opens `/welcome`, including recovery when the business was created but session promotion was interrupted. Next advances manually; there is no automatic rotation. Back and Skip tour remain available. Completion opens Workbench or preserves the protected destination supplied before authentication. Regular returning login keeps its existing destination. Invited team members keep their invitation flow and can access the tour through the account menu.

The account menu includes Explore Easy for replay. Progress is held in session storage under the verified coach ID; reload resumes that slide. Finishing or skipping clears that tab's progress. This is local tour progress, not an account-wide onboarding status. No backend contract or customer data is changed by viewing it.

Loading and profile failures use the auth recovery surface. A failed preview provides Retry preview while Next and Skip remain usable. Slide headings receive focus on navigation. The layout uses existing semantic tokens and controls and has no automatic animation. Preview content is labelled Illustrative account.

`pnpm capture:welcome` regenerates 12 JPEGs from actual coachapp screens using a disposable `.test` coaching business and clients through the real API. The script creates demonstration records only and does not touch existing coaching accounts. Previews live in `public/welcome/`; no runtime demo API calls are needed. Recapture after material screen changes.

`pnpm test:welcome` checks real signup, all six images and their responsive variants, Next/Back, keyboard focus, reload, completion, replay, skip, returning login, return destinations, image retry, profile recovery, typography, spacing, and horizontal overflow at 375px and 1280px. Screenshots are written to `/tmp/coachapp-welcome`.

Verification on 2026-09-20: the six-slide journey and recovery checks passed at 375px and 1280px. The auth, invitation, deep-link, and accessibility suites passed, including interrupted business setup and retained destinations through the tour. Build, Biome, and `just check-rm` passed. Backend `mix precommit` passed with 1,846 tests and zero failures. The build retains its existing bundle-size warning.

The screenshots were recaptured after correcting CSS import ordering. Tour styles are imported from `index.css` after Tailwind so component layers do not precede the reset. Browser assertions verify actual heading sizes and page gutters. Mobile captures focus on feature content instead of screen controls.

No independent coach usability session is implied by browser checks.
