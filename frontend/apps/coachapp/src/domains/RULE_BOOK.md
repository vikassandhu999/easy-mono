# Domain Structure Rulebook

> **Last Updated:** 2024
>
> This document defines the structural rules and conventions for organizing code within domain folders in the CoachApp application.

## 📋 Table of Contents

- [Overview](#overview)
- [Domain Structure](#domain-structure)
- [Folder Rules](#folder-rules)
- [Naming Conventions](#naming-conventions)
- [Component Guidelines](#component-guidelines)
- [Examples](#examples)
- [Decision Tree](#decision-tree)
- [Anti-Patterns](#anti-patterns)

---

## Overview

### What is a Domain?

A **domain** represents a major feature area or business capability in the application. Each domain is self-contained with its own pages, components, hooks, and logic.

**Examples:** `auth`, `library`, `profile`, `dashboard`, `clients`

### Core Principle

> **"Keep things as close as possible to where they're used, unless they're genuinely reusable within the domain."**

---

## Domain Structure

### Required Folder Structure

```
src/domains/{domain-name}/
├── pages/               # ✅ REQUIRED - Page components
├── config/              # ⚠️  OPTIONAL - Configuration files
├── hooks/               # ⚠️  OPTIONAL - Domain-specific hooks
├── components/          # ⚠️  OPTIONAL - Reusable domain components
├── layouts/             # ⚠️  OPTIONAL - Layout components
├── drawers/             # ⚠️  OPTIONAL - Drawer components
└── utils/               # ⚠️  OPTIONAL - Domain-specific utilities
```

### Folder Descriptions

| Folder        | Required    | Purpose                         | When to Use                                             |
| ------------- | ----------- | ------------------------------- | ------------------------------------------------------- |
| `pages/`      | ✅ Yes      | Page-level components           | Every domain must have at least one page                |
| `config/`     | ⚠️ Optional | Static configuration, constants | When you have config data (UI configs, constants, etc.) |
| `hooks/`      | ⚠️ Optional | Domain-specific React hooks     | When hooks are used across multiple pages/components    |
| `components/` | ⚠️ Optional | Reusable domain components      | Only for components used in **2+ places** within domain |
| `layouts/`    | ⚠️ Optional | Layout wrappers                 | When domain needs specific layouts (e.g., AuthLayout)   |
| `drawers/`    | ⚠️ Optional | Drawer/modal components         | When domain uses URL-based drawer system                |
| `utils/`      | ⚠️ Optional | Domain-specific utilities       | For pure functions specific to this domain              |

---

## Folder Rules

### 1. `pages/` Folder

**Purpose:** Contains all page-level components for the domain.

#### ✅ DO:

- Name files with `Page` suffix: `MainProfilePage.tsx`, `LoginPage.tsx`
- Keep page-specific components **inside the page file** (no separate files)
- Export only the default page component
- Keep pages focused and single-responsibility

#### ❌ DON'T:

- Create separate files for page-specific components
- Put business logic directly in pages (use hooks instead)
- Create a `components/` folder inside `pages/`

#### Example:

```tsx
// ✅ GOOD: MainProfilePage.tsx
// Page-specific components defined in the same file
const ProfileHeader = ({ profile }) => {
  /* ... */
};
const ProfileActions = () => {
  /* ... */
};

const MainProfilePage = () => {
  return (
    <div>
      <ProfileHeader profile={profile} />
      <ProfileActions />
    </div>
  );
};

export default MainProfilePage;
```

```tsx
// ❌ BAD: Creating separate files for page-specific components
pages/
├── MainProfilePage.tsx
├── ProfileHeader.tsx      // ❌ Don't do this
└── ProfileActions.tsx     // ❌ Don't do this
```

---

### 2. `components/` Folder

**Purpose:** Reusable components used across **multiple pages** within the domain.

#### ✅ DO:

- Only add components used in **2 or more places**
- Name components descriptively: `LibraryListViewSelector.tsx`
- Keep components focused and single-purpose
- Document props with TypeScript interfaces

#### ❌ DON'T:

- Add components only used in one page (keep them in the page file)
- Add generic UI components (use `src/shared/` instead)
- Create deeply nested folder structures

#### Decision:

```
Is component used in 2+ places in this domain?
├── YES → Put in components/
└── NO  → Keep in page file
```

#### Example:

```tsx
// ✅ GOOD: Used by multiple pages
// components/LibraryListViewSelector.tsx
export const LibraryListViewSelector = () => {
  // Component used by LibraryListPage AND LibraryGridPage
};
```

---

### 3. `layouts/` Folder

**Purpose:** Layout wrappers specific to the domain.

#### ✅ DO:

- Name files with `Layout` suffix: `AuthLayout.tsx`, `DashboardLayout.tsx`
- Use for domain-specific page wrappers (navigation, sidebars, etc.)
- Keep layouts simple and focused on structure

#### ❌ DON'T:

- Put business logic in layouts
- Create layouts for a single page (use page component directly)

#### Example:

```tsx
// ✅ GOOD: AuthLayout.tsx
const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
      <AuthHeader />
      <main>{children}</main>
      <AuthFooter />
    </div>
  );
};

export default AuthLayout;
```

**Structure:**

```
auth/
├── layouts/
│   └── AuthLayout.tsx          # Wraps all auth pages
└── pages/
    ├── LoginPage.tsx
    └── RegisterPage.tsx
```

---

### 4. `drawers/` Folder

**Purpose:** Drawer/modal components managed via URL parameters.

#### ✅ DO:

- Create one router file: `{Domain}PageDrawers.tsx` (e.g., `LibraryListPageDrawers.tsx`)
- Name individual drawers with `Drawer` suffix: `RecipeViewDrawer.tsx`
- Use domain-specific drawer hook: `useLibraryDrawer()`
- Configure drawers in `config/drawerConfig.ts`

#### ❌ DON'T:

- Put drawer logic in pages
- Create multiple drawer router files
- Hardcode drawer keys (use constants)

#### Example Structure:

```
library/
├── config/
│   └── drawerConfig.ts              # Drawer configurations
├── hooks/
│   └── useLibraryDrawer.ts          # Domain drawer hook
└── drawers/
    ├── LibraryListPageDrawers.tsx   # Main drawer router
    ├── RecipeViewDrawer.tsx
    ├── RecipeCreateDrawer.tsx
    └── RecipeEditDrawer.tsx
```

#### Example Router:

```tsx
// ✅ GOOD: LibraryListPageDrawers.tsx
import { DRAWER_KEYS } from "../config/drawerConfig";
import useLibraryDrawer from "../hooks/useLibraryDrawer";
import RecipeViewDrawer from "./RecipeViewDrawer";
import RecipeCreateDrawer from "./RecipeCreateDrawer";

const LibraryListPageDrawers = () => {
  const { activeDrawerKey } = useLibraryDrawer();

  switch (activeDrawerKey) {
    case DRAWER_KEYS.RECIPE_VIEW:
      return <RecipeViewDrawer />;
    case DRAWER_KEYS.RECIPE_CREATE:
      return <RecipeCreateDrawer />;
    default:
      return null;
  }
};

export default LibraryListPageDrawers;
```

---

### 5. `hooks/` Folder

**Purpose:** Custom React hooks used across the domain.

#### ✅ DO:

- Name with `use` prefix: `useLibraryDrawer.ts`, `useProfileData.ts`
- Export from `index.ts` for clean imports
- Keep hooks focused and single-purpose
- Use for cross-page logic

#### ❌ DON'T:

- Create hooks only used in one page (inline them)
- Put business logic here (that belongs in services)
- Create hooks that don't follow React rules

#### Example:

```tsx
// ✅ GOOD: useLibraryDrawer.ts
import useParamsDrawer from "@/hooks/useParamDrawer";
import { LIBRARY_DRAWER_CONFIG } from "../config/drawerConfig";

const useLibraryDrawer = () => {
  return useParamsDrawer({ drawer_config: LIBRARY_DRAWER_CONFIG });
};

export default useLibraryDrawer;
```

---

### 6. `config/` Folder

**Purpose:** Static configuration, constants, and settings.

#### ✅ DO:

- Group related configs in files: `drawerConfig.ts`, `ui.tsx`, `constants.ts`
- Export typed constants
- Document config structure
- Use `as const` for immutability

#### ❌ DON'T:

- Put logic or functions here (pure data only)
- Create overly granular files
- Mix config with components

#### Example:

```tsx
// ✅ GOOD: drawerConfig.ts
import { DrawerConfig } from "@/hooks/useParamDrawer";

export const LIBRARY_DRAWER_CONFIG: DrawerConfig[] = [
  {
    id: "recipe-view",
    key: "recipe_view",
    type: "view",
    prev_key: null,
    values: ["recipe_id"],
  },
];

export const DRAWER_KEYS = {
  RECIPE_VIEW: "recipe_view",
  RECIPE_CREATE: "recipe_create",
} as const;

export type DrawerKey = (typeof DRAWER_KEYS)[keyof typeof DRAWER_KEYS];
```

---

## Naming Conventions

### File Naming

| Type          | Pattern                      | Examples                                         |
| ------------- | ---------------------------- | ------------------------------------------------ |
| Pages         | `{Name}Page.tsx`             | `MainProfilePage.tsx`, `LoginPage.tsx`           |
| Layouts       | `{Name}Layout.tsx`           | `AuthLayout.tsx`, `DashboardLayout.tsx`          |
| Drawers       | `{Entity}{Action}Drawer.tsx` | `RecipeViewDrawer.tsx`, `RecipeCreateDrawer.tsx` |
| Drawer Router | `{Domain}PageDrawers.tsx`    | `LibraryListPageDrawers.tsx`                     |
| Components    | `{PascalCase}.tsx`           | `LibraryListViewSelector.tsx`                    |
| Hooks         | `use{Name}.ts`               | `useLibraryDrawer.ts`, `useProfileData.ts`       |
| Config        | `{descriptive}.ts`           | `drawerConfig.ts`, `constants.ts`, `ui.tsx`      |

### Variable Naming

```typescript
// ✅ GOOD
const DRAWER_KEYS = { ... };          // Constants: SCREAMING_SNAKE_CASE
const useLibraryDrawer = () => {};    // Hooks: camelCase with 'use' prefix
const RecipeViewDrawer = () => {};    // Components: PascalCase
```

---

## Component Guidelines

### When to Extract a Component

Use this decision tree:

```
Is it used in 2+ places in the domain?
├── YES → Is it domain-specific?
│   ├── YES → domain/components/
│   └── NO  → src/shared/
└── NO → Keep in page file
```

### Component Size Guidelines

- **Page-specific component**: < 50 lines → Keep in page file
- **Page-specific component**: > 50 lines → Still keep in page file (unless reused)
- **Reusable component**: Any size → Extract to `components/`

### React 19 Optimization

✅ **DO NOT** use `useCallback` and `useMemo` unless:

- Expensive computations (profiled and confirmed)
- Explicit optimization needed
- Third-party library requirements

React 19's compiler handles memoization automatically.

---

## Examples

### Example 1: Simple Domain (Profile)

```
profile/
├── config/
│   └── ui.tsx                    # UI configurations
└── pages/
    └── MainProfilePage.tsx       # All components inline
```

**Why?**

- Only one page
- No reusable components
- All components are page-specific

---

### Example 2: Medium Domain (Library)

```
library/
├── config/
│   └── drawerConfig.ts           # Drawer configurations
├── hooks/
│   ├── useLibraryDrawer.ts       # Domain drawer hook
│   └── index.ts
├── components/
│   └── LibraryListViewSelector.tsx  # Used by multiple pages
├── drawers/
│   ├── LibraryListPageDrawers.tsx   # Drawer router
│   ├── RecipeViewDrawer.tsx
│   ├── RecipeCreateDrawer.tsx
│   └── RecipeEditDrawer.tsx
└── pages/
    ├── LibraryListPage.tsx
    └── LibraryGridPage.tsx
```

**Why?**

- Multiple pages sharing components
- Drawer system with configuration
- Reusable hooks across domain

---

### Example 3: Complex Domain (Auth)

```
auth/
├── config/
│   └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   └── index.ts
├── layouts/
│   └── AuthLayout.tsx            # Wraps all auth pages
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   └── ResetPasswordPage.tsx
└── utils/
    └── validation.ts
```

**Why?**

- Multiple pages with shared layout
- Domain-specific utilities
- Custom hooks for auth logic

---

## Decision Tree

### "Where should this code go?"

```
START: What are you creating?

├─ A Page Component
│  └─ → pages/{Name}Page.tsx

├─ A Component used in 1 page
│  └─ → Inside the page file

├─ A Component used in 2+ pages in this domain
│  └─ → components/{ComponentName}.tsx

├─ A Component used across multiple domains
│  └─ → src/shared/{ComponentName}.tsx

├─ A Hook used in 2+ places in domain
│  └─ → hooks/use{Name}.ts

├─ A Hook used in 1 place
│  └─ → Inside the page/component file

├─ Static configuration/constants
│  └─ → config/{descriptive}.ts

├─ A Layout for domain pages
│  └─ → layouts/{Name}Layout.tsx

├─ A Drawer component
│  └─ → drawers/{Entity}{Action}Drawer.tsx

└─ A Pure utility function for domain
   └─ → utils/{descriptive}.ts
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Premature Extraction

```
// ❌ BAD: Extracting too early
components/
├── ProfileHeader.tsx          # Only used in MainProfilePage
├── ProfileActions.tsx         # Only used in MainProfilePage
└── ProfileFooter.tsx          # Only used in MainProfilePage
```

**Fix:** Keep all components in `MainProfilePage.tsx` until they're needed elsewhere.

---

### ❌ Anti-Pattern 2: Generic Components in Domain

```
// ❌ BAD: Generic button in domain
profile/components/Button.tsx

// ✅ GOOD: Generic components belong in shared
src/shared/Button.tsx
```

---

### ❌ Anti-Pattern 3: Deep Nesting

```
// ❌ BAD: Over-organized
library/
└── components/
    ├── recipe/
    │   ├── view/
    │   │   └── RecipeHeader.tsx
    │   └── edit/
    │       └── RecipeForm.tsx
    └── workout/
        └── ...

// ✅ GOOD: Flat structure
library/
└── components/
    ├── RecipeHeader.tsx
    └── RecipeForm.tsx
```

---

### ❌ Anti-Pattern 4: Business Logic in Pages

```tsx
// ❌ BAD: Logic in page
const MainProfilePage = () => {
  const [data, setData] = useState();

  useEffect(() => {
    fetch("/api/profile").then((res) => setData(res));
  }, []);

  // ... complex logic
};

// ✅ GOOD: Logic in hook
const useProfileData = () => {
  const [data, setData] = useState();
  useEffect(() => {
    fetch("/api/profile").then((res) => setData(res));
  }, []);
  return data;
};

const MainProfilePage = () => {
  const data = useProfileData();
  // ... simple render logic
};
```

---

## Quick Reference Checklist

Before adding a new file, ask:

- [ ] Is this a page? → `pages/`
- [ ] Is this used in 2+ places in domain? → `components/`
- [ ] Is this a hook used in 2+ places? → `hooks/`
- [ ] Is this configuration/constants? → `config/`
- [ ] Is this a layout wrapper? → `layouts/`
- [ ] Is this a drawer? → `drawers/`
- [ ] Is this used across domains? → `src/shared/`

---

## Version History

| Version | Date | Changes                  |
| ------- | ---- | ------------------------ |
| 1.0     | 2024 | Initial rulebook created |

---

## Questions?

When in doubt, remember:

> **"Start simple, extract when needed, keep it close to usage."**

If a file feels out of place, it probably is. Move it to where it's used until it's needed elsewhere.
