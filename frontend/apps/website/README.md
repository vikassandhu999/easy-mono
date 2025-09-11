# CoachEasy Website

The marketing website for CoachEasy built with Astro and Tailwind CSS.

## 🚀 Project Structure

This is part of the CoachEasy monorepo. Inside of this website project, you'll see the following folders and files:




```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── home/
│   │   └── shared/
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── firebase.ts
│   ├── pages/
│   │   ├── index.astro
│   │   ├── privacy-policy.astro
│   │   └── terms-of-service.astro
│   └── styles/
│       └── global.css
└── package.json
```

## 🧞 Commands

All commands are run from the root of the monorepo:

| Command                        | Action                                           |
| :----------------------------- | :----------------------------------------------- |
| `pnpm install`                 | Installs dependencies for all packages          |
| `pnpm dev:website`             | Starts website dev server at `localhost:3000`   |
| `pnpm build:website`           | Build website for production                    |
| `pnpm --filter @easy/website dev`    | Alternative way to start dev server      |
| `pnpm --filter @easy/website build`  | Alternative way to build                  |
| `pnpm --filter @easy/website preview`| Preview your build locally                |

Or run commands from this directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm dev`                | Starts local dev server at `localhost:3000`     |
| `pnpm build`              | Build your production site to `./dist/`          |
| `pnpm preview`            | Preview your build locally, before deploying     |

## 🔗 Monorepo Integration

This website can potentially use shared packages from the monorepo:

- `@easy/ui` - Shared UI components
- `@easy/utils` - Shared utilities
- `@easy/typings` - Shared TypeScript types
- `@easy/hooks` - Shared React hooks (if needed)

## 👀 Learn More

- [Astro Documentation](https://docs.astro.build)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
