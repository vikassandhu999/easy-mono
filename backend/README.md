# Easy backend

Phoenix / Elixir + Ecto API for the Easy / CoachEasy platform (passwordless OTP auth, multi-tenant, JWT sessions).

See **[`AGENTS.md`](./AGENTS.md)** for the development guide and **[`docs/FLY_DEPLOY.md`](./docs/FLY_DEPLOY.md)** for deployment.

From the monorepo root: `just backend` runs the server, `just test` runs the suite.

## Database baseline

The prototype migration history was replaced on 2026-09-22. Eight initial migrations
create the schema directly: identity and tenancy, forms and client progress, media,
training, nutrition, conversations, billing, and acquisition. Tables are created in
dependency order, with their final constraints and indexes. Library data belongs in
`priv/repo/seeds.exs`.

For an empty database, run `rtk proxy mix ecto.setup` from `backend/`. A database
using the pre-baseline history needs a reset; running `ecto.migrate` against it will
fail because its tables already exist. Stop the API and reset only a disposable
database:

```sh
rtk proxy mix ecto.reset
rtk proxy env MIX_ENV=test mix ecto.reset
```

These commands delete the selected database and recreate its schema and system
library. Export anything you want to keep first. Applying the baseline to a hosted
prototype also requires an empty database; the deployment's migration job cannot
upgrade the pre-baseline history.

The eight initial migrations can be rolled back in reverse order, which removes
their tables and data. Restore a matching database backup and application revision
when recovering a populated environment. Add subsequent schema changes as ordinary
timestamped migrations after the baseline.

To check backend changes without touching the default test database:

```sh
rtk proxy env MIX_TEST_PARTITION=_schema_check mix precommit
```
