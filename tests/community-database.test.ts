import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const authorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const communityId = "00000000-0000-4000-8000-000000000001";
const profileId = "11111111-1111-4111-8111-111111111111";
const approvedThreadId = "22222222-2222-4222-8222-222222222222";
const pendingThreadId = "33333333-3333-4333-8333-333333333333";
let db: PGlite;

async function asRole(role: "anon" | "authenticated", userId = "") {
  await db.exec(
    `reset role; set role ${role}; select set_config('request.jwt.claim.sub', '${userId}', false);`,
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role;
     create schema auth;
     create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
     grant usage on schema public, auth to anon, authenticated;
     grant execute on function auth.uid() to anon, authenticated;
     alter default privileges in schema public grant all on tables to authenticated;
     alter default privileges in schema public grant select on tables to anon;`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202609070001_initial.sql", "utf8").replace(
      "create extension if not exists pgcrypto;",
      "",
    ),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609160004_community_foundations.sql", "utf8"),
  );
  await db.exec(
    `insert into auth.users(id,email) values ('${authorId}','author@example.test'),('${otherId}','other@example.test');
     insert into communities(id,slug,name,province,country,latitude,longitude) values ('${communityId}','paris-ontario','Paris','Ontario','Canada',43.19,-80.38);
     insert into community_profiles(id,user_id,display_name) values ('${profileId}','${authorId}','River Walker');
     insert into community_threads(id,community_id,author_id,title,body,status,moderated_at,moderated_by) values
       ('${approvedThreadId}','${communityId}','${authorId}','Where can I find a trail map?','Looking for an official trail map link.','approved',now(),'${otherId}'),
       ('${pendingThreadId}','${communityId}','${authorId}','Question awaiting review','This must not be public before moderation.','pending',null,null);`,
  );
}, 20_000);

afterAll(async () => {
  await db.close();
});

describe("community public projection boundary", () => {
  it("shows anonymous readers only approved threads with the safe profile projection", async () => {
    await asRole("anon");
    const result = await db.query<Record<string, unknown>>(
      "select * from community_threads_public order by created_at",
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: approvedThreadId,
      profile_id: profileId,
      display_name: "River Walker",
      title: "Where can I find a trail map?",
    });
    expect(result.rows[0]).not.toHaveProperty("author_id");
    expect(result.rows[0]).not.toHaveProperty("status");
    expect(result.rows[0]).not.toHaveProperty("moderated_by");
  });

  it("keeps an approved thread public when its moderator account is deleted", async () => {
    await db.exec(`reset role; delete from auth.users where id='${otherId}'`);
    const internal = await db.query<{
      status: string;
      moderated_at: string | null;
      moderated_by: string | null;
    }>(
      "select status, moderated_at, moderated_by from community_threads where id=$1",
      [approvedThreadId],
    );

    expect(internal.rows[0]).toMatchObject({
      status: "approved",
      moderated_by: null,
    });
    expect(internal.rows[0].moderated_at).not.toBeNull();
    await asRole("anon");
    expect(
      (await db.query("select * from community_threads_public")).rows,
    ).toHaveLength(1);
  });

  it("does not grant browsers direct access to community identity or thread tables", async () => {
    await asRole("authenticated", otherId);
    const permissions = await db.query<{
      profiles_read: boolean;
      threads_read: boolean;
      threads_insert: boolean;
      threads_update: boolean;
    }>(
      `select
        has_table_privilege('authenticated','public.community_profiles','SELECT') profiles_read,
        has_table_privilege('authenticated','public.community_threads','SELECT') threads_read,
        has_table_privilege('authenticated','public.community_threads','INSERT') threads_insert,
        has_table_privilege('authenticated','public.community_threads','UPDATE') threads_update`,
    );

    expect(permissions.rows[0]).toEqual({
      profiles_read: false,
      threads_read: false,
      threads_insert: false,
      threads_update: false,
    });
  });
});
