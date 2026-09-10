# Mobile-first foundation

The coach app prioritizes phones and adapts the same interactions for desktop. Apply this first to Clients, Invite client, and Invitation detail; auth shares the control defaults.

## Decisions

- Keep a compact app header with the business name and one account-menu button. Account details and sign-out belong in that menu. Long names must not widen the viewport or make the header wrap.
- Use one page-header component for title, supporting text, back navigation, and page actions. Use 20px mobile gutters, 32px desktop gutters, and a bounded desktop content width.
- Use consistent title, section, body, and supporting-text sizes. Inputs remain at least 16px on phones. Controls and navigation targets are at least 44px, with 48px primary controls.
- Keep client rows easy to scan: name and contact grouped together, a distinct invitation status, and a full-row navigation target.
- Keep the invite form short. The intake summary opens a focus-managed preview, a bottom sheet on phones and centered dialog on desktop. Closing restores focus and preserves entered details.
- Keep the mobile send action reachable in a footer with safe-area space. Leave room in document flow and verify short viewports and focused fields. Desktop actions remain beside the form.
- Use consistent surface, divider, focus, disabled, and status treatments from shared primitives. Loading and errors occupy the content area and keep navigation usable.

## Verification

Use real API browser scenarios plus computed layout assertions: header stays on one row; touch targets meet the minimum; inputs have 16px computed text; no horizontal overflow; preview fits the viewport, traps focus, closes with Escape and restores focus; entered details survive preview; send action and last input can be reached on a short viewport. Exercise 375px, 390px, 768px, and 1280px layouts. Run both auth suites because the shell and shared controls change.

No API behavior changes in this pass. Existing invitation work stays in the current working tree. No commits requested.

## Implementation and results

Shared primitives live in `frontend/apps/coachapp/src/ui/`; `index.css` owns responsive layout and theme tokens. `dialog` and `dropdown-menu` were downloaded with the shadcn CLI using the app's `aria-nova` preset. Their generated APIs remain available; styling, the local `cn` import, and strict optional-property compatibility were adapted.

- Clients: compact account menu, empty state, full-row navigation, and status badges.
- Invite client: shared page header, labeled 48px fields, intake summary/preview, and mobile action footer.
- Invitation detail: matching surfaces, responsive copy/resend actions, and shared preview.
- Authentication: existing flows use the updated button/input defaults; both real-API suites pass with the new menu.
- Layout browser checks pass at 375, 390, 768, and 1280px, including short 480px viewports, menu/dialog focus, scrollable preview content, preserved fields, control size, and horizontal bounds.
- The spacing assertion first failed at 768px because a layered media rule could not override an unlayered root token. The responsive token now uses the same layer; the assertion passes.
- Full client invitation and intake-access scenarios pass at 375px and 1280px, including failure recovery and the account-switch regression.
- Review caught a non-focusable preview scroll area. It is now a named keyboard-focusable region with a focus indicator; the regression uses Tab, PageDown, and End to reach the final question.

Physical-device keyboard and safe-area verification remains a device-testing task. The app uses dynamic viewport units and safe-area insets, but desktop browser viewport tests do not validate device behavior.
