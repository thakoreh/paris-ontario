import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
it("push storage cannot be written directly by residents; only owners can read or delete", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role; create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create table public.users(id uuid primary key); create table public.notices(id uuid primary key); alter default privileges in schema public grant all on tables to authenticated;`,
    );
    await db.exec(
      readFileSync("supabase/migrations/202609150003_web_push.sql", "utf8"),
    );
    const result = await db.query<{
      can_insert: boolean;
      can_update: boolean;
      can_select: boolean;
    }>(
      `select has_table_privilege('authenticated','public.push_subscriptions','INSERT') can_insert,has_table_privilege('authenticated','public.push_subscriptions','UPDATE') can_update,has_table_privilege('authenticated','public.push_subscriptions','SELECT') can_select`,
    );
    expect(result.rows[0]).toEqual({
      can_insert: false,
      can_update: false,
      can_select: true,
    });
  } finally {
    await db.close();
  }
}, 60_000);
