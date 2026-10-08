import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

const communityId = "00000000-0000-4000-8000-000000000001";
const editorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const residentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const hash = "a".repeat(64);
const checks = {
  source_verified: true,
  geography_verified: true,
  facts_verified: true,
  privacy_checked: true,
};
let db: PGlite;
async function submit(
  overrides: {
    hash?: string | null;
    category?: string;
    area?: string;
    title?: string;
    source?: string;
    community?: string;
  } = {},
) {
  return db.query<{ submission_id: string | null; rate_limited: boolean }>(
    "select * from public.submit_community_update($1,$2,$3,$4,$5,$6,$7)",
    [
      overrides.community ?? communityId,
      overrides.hash === undefined ? hash : overrides.hash,
      overrides.title ?? "Downtown road work",
      "Public works will close the bridge on Monday morning.",
      overrides.category ?? "roads",
      overrides.area ?? "downtown",
      overrides.source ?? "https://www.brant.ca/road-closure",
    ],
  );
}
async function review(
  id: string,
  status = "ready",
  reviewChecks: unknown = checks,
  moderator = editorId,
) {
  return db.query(
    "update community_submissions set status=$2,review_notes='Checked against the original municipal source.',review_checks=$3,moderated_at=clock_timestamp(),moderated_by=$4 where id=$1 returning id,status",
    [id, status, JSON.stringify(reviewChecks), moderator],
  );
}
async function counts() {
  return (
    await db.query<{ total: number }>(
      "select count(*)::int as total from community_submissions",
    )
  ).rows[0].total;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to authenticated,service_role;
    alter default privileges in schema public grant select on tables to anon;`);
  for (const name of [
    "202609070001_initial.sql",
    "202609160004_community_foundations.sql",
    "202610020005_private_community_submissions.sql",
  ]) {
    await db.exec(
      readFileSync(`supabase/migrations/${name}`, "utf8").replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  }
  await db.exec(`insert into auth.users(id,email) values ('${editorId}','editor@example.test'),('${residentId}','resident@example.test');
    update public.users set role='editor' where id='${editorId}';
    insert into public.communities(id,slug,name,province,country,latitude,longitude) values ('${communityId}','paris-ontario','Paris','Ontario','Canada',43.19,-80.38);`);
}, 30_000);
beforeEach(async () => {
  await db.exec("reset role; begin; set role service_role;");
});
afterEach(async () => {
  await db.exec("rollback; reset role;");
});
afterAll(async () => {
  await db.close();
});

describe("private submission migration and real PostgreSQL access boundary", () => {
  it("applies after existing migrations and checks readiness without writing", async () => {
    expect(
      (
        await db.query<{ ready: boolean }>(
          "select community_submission_intake_ready($1) as ready",
          [communityId],
        )
      ).rows[0].ready,
    ).toBe(true);
    expect(await counts()).toBe(0);
    expect(
      (await db.query("select * from community_submission_rate_limits")).rows,
    ).toHaveLength(0);
  });
  it("creates only pending evidence and never a public notice or community thread", async () => {
    const result = await submit();
    expect(result.rows[0]).toMatchObject({
      rate_limited: false,
      submission_id: expect.any(String),
    });
    expect(
      (
        await db.query(
          "select status,review_checks,review_notes,moderated_by,moderated_at from community_submissions",
        )
      ).rows,
    ).toEqual([
      {
        status: "pending",
        review_checks: {},
        review_notes: null,
        moderated_by: null,
        moderated_at: null,
      },
    ]);
    expect((await db.query("select * from notices")).rows).toHaveLength(0);
    expect(
      (await db.query("select * from community_threads_public")).rows,
    ).toHaveLength(0);
  });
  it.each(["anon", "authenticated"])(
    "revokes %s table and RPC privileges, including Supabase default grants",
    async (role) => {
      await db.exec(`set role ${role}`);
      const result = await db.query<Record<string, boolean>>(`select
      has_table_privilege(current_user,'community_submissions','SELECT') as read,
      has_table_privilege(current_user,'community_submissions','INSERT') as insert,
      has_table_privilege(current_user,'community_submissions','UPDATE') as update,
      has_table_privilege(current_user,'community_submissions','DELETE') as delete,
      has_table_privilege(current_user,'community_submission_rate_limits','SELECT') as rate_read,
      has_function_privilege(current_user,'submit_community_update(uuid,text,text,text,text,text,text)','EXECUTE') as intake,
      has_function_privilege(current_user,'community_submission_intake_ready(uuid)','EXECUTE') as readiness`);
      expect(
        Object.values(result.rows[0]).every((value) => value === false),
      ).toBe(true);
    },
  );
  it("denies direct browser reads even if SELECT is accidentally granted later", async () => {
    await submit();
    await db.exec(
      "reset role; grant select on community_submissions,community_submission_rate_limits to anon; set role anon;",
    );
    expect(
      (await db.query("select * from community_submissions")).rows,
    ).toEqual([]);
    expect(
      (await db.query("select * from community_submission_rate_limits")).rows,
    ).toEqual([]);
  });
  it("protects evidence from browser writes even if INSERT is accidentally granted", async () => {
    await db.exec(
      "reset role; grant insert on community_submissions to authenticated; set role authenticated;",
    );
    await expect(
      db.query(
        "insert into community_submissions(community_id,title,body,category,area,source_url) values($1,'Forged contribution','This text should never be persisted.','roads','downtown','https://www.brant.ca/notice')",
        [communityId],
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("has no contact, account linkage, raw address or IP columns in the intake", async () => {
    const result = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema='public' and table_name='community_submissions'",
    );
    expect(result.rows.map((row) => row.column_name)).not.toEqual(
      expect.arrayContaining([
        "email",
        "contact",
        "user_id",
        "client_hash",
        "ip_address",
        "address",
      ]),
    );
    expect(
      result.rows
        .map((row) => row.column_name)
        .filter((name) =>
          /email|contact|ip_address|client_hash|author_id|user_id/.test(name),
        ),
    ).toEqual([]);
  });
  it("does not grant the application permanent-delete access to submissions", async () => {
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_table_privilege(current_user,'community_submissions','DELETE') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
  });
});

describe("atomic persistent rate controls", () => {
  it.each(["SELECT", "INSERT", "UPDATE", "DELETE"])(
    "readiness fails when required counter privilege %s is missing",
    async (privilege) => {
      await db.exec(
        `reset role; revoke ${privilege} on public.community_submission_rate_limits from service_role; set role service_role;`,
      );
      expect(
        (
          await db.query<{ ready: boolean }>(
            "select community_submission_intake_ready($1) ready",
            [communityId],
          )
        ).rows[0].ready,
      ).toBe(false);
    },
  );
  it("bounds stale counter cleanup to 256 records per request", async () => {
    await db.exec(
      "insert into community_submission_rate_limits select 'client_day',md5(n::text)||md5(n::text),(date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC') - interval '3 days',1 from generate_series(1,300) n",
    );
    await submit();
    expect(
      (
        await db.query<{ total: number }>(
          "select count(*)::int total from community_submission_rate_limits where window_start < clock_timestamp() - interval '48 hours'",
        )
      ).rows[0].total,
    ).toBe(44);
  });
  it("admits three per client/hour, then rejects without increasing counters", async () => {
    for (let i = 0; i < 3; i++)
      expect((await submit()).rows[0].rate_limited).toBe(false);
    const before = (
      await db.query(
        "select * from community_submission_rate_limits order by scope",
      )
    ).rows;
    expect((await submit()).rows[0]).toEqual({
      submission_id: null,
      rate_limited: true,
    });
    expect(await counts()).toBe(3);
    expect(
      (
        await db.query(
          "select * from community_submission_rate_limits order by scope",
        )
      ).rows,
    ).toEqual(before);
  });
  it("enforces ten per UTC day even when the hourly budget is available", async () => {
    await db.query(
      "insert into community_submission_rate_limits values('client_day',$1,date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC',10)",
      [hash],
    );
    expect((await submit()).rows[0].rate_limited).toBe(true);
    expect(await counts()).toBe(0);
  });
  it("enforces the shared global budget across unrelated clients", async () => {
    await db.exec(
      "insert into community_submission_rate_limits values('global_hour','',date_trunc('hour',clock_timestamp() at time zone 'UTC') at time zone 'UTC',99)",
    );
    expect((await submit()).rows[0].rate_limited).toBe(false);
    expect((await submit({ hash: "b".repeat(64) })).rows[0].rate_limited).toBe(
      true,
    );
    expect(await counts()).toBe(1);
  });
  it("rolls back counters together with the submission on a caller rollback", async () => {
    await db.exec("savepoint attempt");
    await submit();
    await db.exec("rollback to savepoint attempt");
    expect(await counts()).toBe(0);
    expect(
      (await db.query("select * from community_submission_rate_limits")).rows,
    ).toEqual([]);
  });
  it("rolls back failed validation without spending the rate budget", async () => {
    await db.exec("savepoint invalid");
    await expect(submit({ category: "emergency" })).rejects.toThrow();
    await db.exec("rollback to savepoint invalid");
    expect(
      (await db.query("select * from community_submission_rate_limits")).rows,
    ).toEqual([]);
    expect(await counts()).toBe(0);
  });
  it.each([null, "", "192.0.2.10", "x".repeat(64)])(
    "rejects invalid keyed client identifiers: %s",
    async (badHash) => {
      await expect(submit({ hash: badHash })).rejects.toThrow(
        /keyed client hash/,
      );
    },
  );
  it("cleans only expired rate windows and preserves active windows and submissions", async () => {
    await db.query(
      "insert into community_submission_rate_limits values('client_day',$1,(date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC') - interval '3 days',1)",
      ["c".repeat(64)],
    );
    await db.query(
      "insert into community_submission_rate_limits values('client_day',$1,(date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC') - interval '1 day',1)",
      ["d".repeat(64)],
    );
    await submit();
    expect(
      (
        await db.query<{ client_hash: string }>(
          "select client_hash from community_submission_rate_limits",
        )
      ).rows.map((row) => row.client_hash),
    ).not.toContain("c".repeat(64));
    expect(
      (
        await db.query<{ client_hash: string }>(
          "select client_hash from community_submission_rate_limits",
        )
      ).rows.map((row) => row.client_hash),
    ).toContain("d".repeat(64));
    expect(await counts()).toBe(1);
  });
  it("makes readiness false and rejects intake when the Paris community is inactive", async () => {
    await db.exec(
      `update communities set active=false where id='${communityId}'`,
    );
    expect(
      (
        await db.query<{ ready: boolean }>(
          "select community_submission_intake_ready($1) ready",
          [communityId],
        )
      ).rows[0].ready,
    ).toBe(false);
    await expect(submit()).rejects.toThrow(/community is not available/);
  });
  it("rejects a different community even if it exists and is active", async () => {
    const otherId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await db.query(
      "insert into communities(id,slug,name,province,country,latitude,longitude) values($1,'elsewhere','Elsewhere','Ontario','Canada',43,-80)",
      [otherId],
    );
    await expect(submit({ community: otherId })).rejects.toThrow(
      /community is not available/,
    );
  });
});

describe("non-publishing editorial lifecycle", () => {
  it("requires all four checks, reviewer and notes for ready", async () => {
    const id = (await submit()).rows[0].submission_id!;
    await expect(
      review(id, "ready", { ...checks, facts_verified: false }),
    ).rejects.toThrow();
  });
  it("allows a checked editor to mark ready without creating public content", async () => {
    const id = (await submit()).rows[0].submission_id!;
    expect((await review(id)).rows).toEqual([{ id, status: "ready" }]);
    expect((await db.query("select * from notices")).rows).toEqual([]);
    expect(
      (await db.query("select * from community_threads_public")).rows,
    ).toEqual([]);
  });
  it("allows a documented rejection without falsely confirming all checks", async () => {
    const id = (await submit()).rows[0].submission_id!;
    expect(
      (await review(id, "rejected", { ...checks, facts_verified: false })).rows,
    ).toEqual([{ id, status: "rejected" }]);
  });
  it("rejects an ordinary user as reviewer at the database boundary", async () => {
    const id = (await submit()).rows[0].submission_id!;
    await expect(review(id, "ready", checks, residentId)).rejects.toThrow(
      /current editor/,
    );
  });
  it("does not allow terminal reviews to be overwritten or reopened", async () => {
    const id = (await submit()).rows[0].submission_id!;
    await review(id);
    await expect(review(id, "rejected")).rejects.toThrow(/Only pending/);
  });
  it("keeps source evidence immutable during review", async () => {
    const id = (await submit()).rows[0].submission_id!;
    await expect(
      db.query(
        "update community_submissions set status='rejected',title='Changed evidence',review_notes='Rejecting this public detail.',moderated_at=clock_timestamp(),moderated_by=$2 where id=$1",
        [id, editorId],
      ),
    ).rejects.toThrow(/immutable/);
  });
  it("rejects inserts that try to bypass pending state", async () => {
    await expect(
      db.query(
        "insert into community_submissions(community_id,title,body,category,area,source_url,status,review_notes,review_checks,moderated_at,moderated_by) values($1,'Premature approval','A contribution that should not publish.','roads','downtown','https://www.brant.ca/notice','ready','Reviewed this original source.',$2,clock_timestamp(),$3)",
        [communityId, JSON.stringify(checks), editorId],
      ),
    ).rejects.toThrow(/must await/);
  });
});
