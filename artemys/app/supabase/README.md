# Supabase Workflow

`app/supabase/migrations` is the source of truth.

Rules:
- Put every schema, RLS, function, and storage change in a migration.
- Use the Supabase dashboard for inspection, not for manual schema edits.
- Do not edit or reintroduce hand-maintained schema snapshots.

Common commands from `app/`:

```sh
npm run db:push
npm run db:push:dry
npm run db:reset
```

Notes:
- `db:push` applies local migrations to the linked remote project.
- `db:push:dry` shows what would run before you touch the remote database.
- `db:reset` resets the local Supabase stack and reapplies migrations. It needs Docker.
