- Stack: Vite + React 19 + TS strict, HeroUI v3 + Tailwind v4, Redux Toolkit + RTK Query, react-hook-form + zod, react-router v7 data mode.
- Dev: `pnpm -C apps/coachapp-v2 dev` (port 2021). Build: `pnpm -C apps/coachapp-v2 build`. Lint: `pnpm -C apps/coachapp-v2 lint`.
- `src/` layout: feature modules (`clients/`, `exercises/`, etc.) own their UI + screens. Shared folders: `api/` (RTK Query endpoints, one file per domain), `@components/`, `@hooks/`, `@hoc/`, `@config/`.
- Use RTK Query hooks for all server data. No `useEffect` for fetching.
- Routes live in `router.tsx` using `createBrowserRouter()` data mode. Wrap protected screens with `withAuth` from `@/@hoc/with-auth`. No route loaders — RTK Query handles data.
- New screen for existing feature → `src/{feature}/screen-name.tsx`. Component used by 1 feature → `src/{feature}/components/`. Component used by 2+ features → `src/@components/`. New API endpoint → matching file in `src/api/` (new domain = new file). New route → add to `router.tsx` + path constant in `@/@config/routes.ts`. HOC/guard → `src/@hoc/`.
- Naming: screens and components `kebab-case` (`list-clients.tsx`, `client-card.tsx`). API files `camelCase` (`nutritionPlans.ts`, `trainingPlans.ts`).
- Component files contain only: imports, Props type, the component (plus the form's `zod` schema if it's a form). Pure (non-React) helpers and non-trivial constants live in `src/{feature}/lib/{topic}.ts`; data-shape helpers live in the matching `src/api/*.ts`. No helpers, derived-state functions, or constants beyond this inside the component file.
- Don't re-declare existing shapes. Derive types from API/domain types with `Partial<T>`, `Pick<T, K>`, `Omit<T, K>` when the meaning is the same.
- No section-divider comments (`// ── X ──`). No JSDoc on props or internal helpers — the name is the doc. No JSX section labels (`{/* Header */}`, `{/* Actions */}`). Comments only when the WHY is non-obvious.
- Structure code to minimize cognitive load. Avoid clever tricks that sacrifice readability.
- Every form MUST use react-hook-form + zod. No native FormData. No `useState` for form fields. Schema + type defined in the same file as the form component.
  ```tsx
  const schema = z.object({email: z.string().min(1, 'Required').email()});
  type FormValues = z.infer<typeof schema>;
  const {register, handleSubmit, control, formState: {errors}, setError} = useForm<FormValues>({resolver: zodResolver(schema)});
  ```
- Server/API errors in forms: use `applyFormErrors(err, fallback, setError)` from `@/api/shared`. Handles per-field + root errors.
  ```tsx
  try { await mutate(body).unwrap(); } catch (err) { applyFormErrors(err, 'Failed.', setError); }
  ```
- Create form after successful save: `navigate(targetPath, {replace: true})` so Back skips the empty create route.
  ```tsx
  const result = await createFoo(body).unwrap();
  navigate(`/library/foos/${result.data.id}`, {replace: true});
  ```
- Edit form after successful save: `goBack()` from `useGoBack(backPath)` so Back pops history with `backPath` as deep-link fallback.
  ```tsx
  const goBack = useGoBack(`/library/foos/${id}`);
  await updateFoo({body, id}).unwrap();
  goBack();
  ```
- Cancel on any form calls `goBack()` from `useGoBack(fallback)` — same as the header Back button.
- Navigation exceptions: in-place confirmation screens, live-preview editors, multi-step wizards where the forward step must stay reachable via browser back.
- Back buttons: use `useGoBack(fallback)` from `@/@hooks/use-go-back` — `navigate(-1)` when history exists, falls back to the route on deep links. Never `navigate('/path')` for Back.
- Imports: direct file paths via `@/...` alias. No barrel `index.ts` files. No re-exports.
  ```tsx
  import {useListClientsQuery} from '@/api/clients';
  import {withAuth} from '@/@hoc/with-auth';
  import ClientCard from '@/clients/components/client-card';
  import {ROUTES} from '@/@config/routes';
  ```
- Mobile-first: app must work at 375px AND 1280px. Base Tailwind classes target mobile; `sm:`/`md:`/`lg:` enhance up. Style with Tailwind utility classes — no per-component `.css` files.
- Container decision before building any input/action. Text input involved? 1 field that fits → INLINE; 2+ fields → NEW PAGE. No keyboard? Yes/no confirm → DIALOG; read-only preview or tap-only select → DRAWER (bottom sheet); complex/multi-step → NEW PAGE; else INLINE. On desktop, DRAWER may become POPOVER; other containers stay as-is.
- Keyboard rule: if the virtual keyboard will open, container MUST be INLINE or NEW PAGE. Never dialog, modal, or drawer.
- Touch targets `min-h-11` (44px) on every interactive element. No hover-only interactions. Don't show raw HTML tables on mobile — use cards, lists, or horizontal scroll. Forms single-column by default, `md:grid-cols-2` when wider.
