import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { community } from "@/config/community";
import { createSeed, demoLocations } from "@/data/seed";
let db: PGlite;
const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function asUser(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function insert(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  await db.query(
    `insert into ${table}(${keys.join(",")}) values(${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
    Object.values(row).map((v) => (Array.isArray(v) ? JSON.stringify(v) : v)),
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;alter default privileges in schema public grant select on tables to anon;`,
  );
  for (const f of ["202609070001_initial.sql", "202609070002_matching.sql"])
    await db.exec(
      readFileSync(`supabase/migrations/${f}`, "utf8").replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  await db.exec(
    `insert into auth.users(id,email) values('${a}','a@example.test'),('${b}','b@example.test');`,
  );
  await insert("communities", community as unknown as Record<string, unknown>);
  const seed = createSeed();
  await insert(
    "official_sources",
    seed.sources[0] as unknown as Record<string, unknown>,
  );
  await insert("locations", { ...demoLocations(a)[0] });
  await insert("notices", {
    ...seed.notices[0],
    source_id: seed.sources[0].id,
  });
}, 20000);
afterAll(async () => {
  await db.close();
});
describe("actual PostgreSQL row-level security", () => {
  it("creates an ordinary role for signup", async () => {
    await asUser(a);
    const r = await db.query<{ role: string }>(
      "select role from users where id=$1",
      [a],
    );
    expect(r.rows[0].role).toBe("user");
  });
  it("only exposes the owner’s private locations", async () => {
    await asUser(a);
    expect((await db.query("select * from locations")).rows).toHaveLength(1);
    await asUser(b);
    expect((await db.query("select * from locations")).rows).toHaveLength(0);
  });
  it("rejects cross-user private writes", async () => {
    await asUser(b);
    await expect(
      db.query("update locations set label=$1 where user_id=$2 returning *", [
        "Stolen",
        a,
      ]),
    ).resolves.toMatchObject({ rows: [] });
    await expect(
      insert("locations", { ...demoLocations(a)[1] }),
    ).rejects.toThrow();
  });
  it("prevents self-promotion and public editing", async () => {
    await asUser(a);
    await expect(
      db.query("update users set role='admin' where id=$1", [a]),
    ).rejects.toThrow();
    await expect(
      db.query("update notices set title='Unauthorized' returning *"),
    ).resolves.toMatchObject({ rows: [] });
  });
  it("generates matches when a notice is created", async () => {
    await asUser(a);
    const r = await db.query("select * from user_notice_matches");
    expect(r.rows).toHaveLength(1);
    await asUser(b);
    expect(
      (await db.query("select * from user_notice_matches")).rows,
    ).toHaveLength(0);
  });
  it("does not allow public match rebuilds", async () => {
    await asUser(a);
    await expect(
      db.query("select rebuild_user_matches($1)", [b]),
    ).rejects.toThrow();
  });
  it("allows editor publishing without revealing addresses", async () => {
    await db.exec(`reset role;update users set role='editor' where id='${b}';`);
    await asUser(b);
    expect(
      (
        await db.query(
          "update notices set title='Reviewed notice' returning id",
        )
      ).rows,
    ).toHaveLength(1);
    expect((await db.query("select * from locations")).rows).toHaveLength(0);
  });
  it("matches a city-wide notice without coordinates", async () => {
    await db.exec("reset role");
    const n = createSeed().notices[5];
    await insert("notices", { ...n, source_id: createSeed().sources[0].id });
    await asUser(a);
    expect(
      (
        await db.query("select * from user_notice_matches where notice_id=$1", [
          n.id,
        ])
      ).rows,
    ).toHaveLength(1);
  });
  it("exposes published notice coordinates but no private locations anonymously", async () => {
    await db.exec(
      "reset role;set role anon;select set_config('request.jwt.claim.sub','',false);",
    );
    expect((await db.query("select latitude from notices")).rows).toHaveLength(
      2,
    );
    expect((await db.query("select * from locations")).rows).toHaveLength(0);
  });
  it("lets an editor create notices and deadlines, then merge duplicates atomically", async () => {
    await asUser(b);
    const seed = createSeed();
    const n = { ...seed.notices[2], source_id: seed.sources[0].id };
    await insert("notices", n);
    const d = {
      ...seed.deadlines[1],
      source_id: seed.sources[0].id,
      notice_id: n.id,
    };
    await insert("deadlines", d);
    expect(
      (await db.query("select * from deadlines where id=$1", [d.id])).rows,
    ).toHaveLength(1);
    await db.query("select merge_notices($1,$2)", [seed.notices[0].id, n.id]);
    expect(
      (
        await db.query<{ verification_status: string }>(
          "select verification_status from notices where id=$1",
          [n.id],
        )
      ).rows[0].verification_status,
    ).toBe("rejected");
    expect(
      (
        await db.query<{ notice_id: string }>(
          "select notice_id from deadlines where id=$1",
          [d.id],
        )
      ).rows[0].notice_id,
    ).toBe(seed.notices[0].id);
  });
  it("blocks a normal user from merging and viewing match counts", async () => {
    await asUser(a);
    await expect(
      db.query("select merge_notices($1,$2)", [
        createSeed().notices[0].id,
        createSeed().notices[5].id,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query("select notice_match_count($1)", [createSeed().notices[0].id]),
    ).rejects.toThrow();
  });
});
