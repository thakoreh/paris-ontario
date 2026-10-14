import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("repairs only the audited night-market URLs and is idempotent", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table notices (id uuid, slug text, official_url text);
      create table deadlines (id uuid, notice_id uuid, official_url text);
      insert into notices values
        ('ca888888-8888-4888-8888-888888888888', 'paris-night-market-fall-fest', 'https://www.parisfairgrounds.com/events/paris-night-market---day-2'),
        ('ca999999-9999-4999-8999-999999999999', 'other', 'https://www.parisfairgrounds.com/events/paris-night-market---day-2');
      insert into deadlines values
        ('da333333-3333-4333-8333-333333333333', 'ca888888-8888-4888-8888-888888888888', 'https://www.parisfairgrounds.com/events/paris-night-market---day-2');
    `);
    const sql = readFileSync("supabase/migrations/20261014000000_fix_night_market_url.sql", "utf8");
    await db.exec(sql);
    const once = await db.query("select * from notices order by slug");
    expect(once.rows).toEqual([
      expect.objectContaining({ slug: "other", official_url: "https://www.parisfairgrounds.com/events/paris-night-market---day-2" }),
      expect.objectContaining({ slug: "paris-night-market-fall-fest", official_url: "https://www.parisfairgrounds.com/events" }),
    ]);
    expect((await db.query("select official_url from deadlines")).rows).toEqual([{ official_url: "https://www.parisfairgrounds.com/events" }]);
    await db.exec(sql);
    expect((await db.query("select * from notices order by slug")).rows).toEqual(once.rows);
    await db.exec("update notices set official_url = 'https://example.org/editor-correction' where slug = 'paris-night-market-fall-fest'");
    await db.exec(sql);
    expect((await db.query("select official_url from notices where slug = 'paris-night-market-fall-fest'")).rows).toEqual([{ official_url: "https://example.org/editor-correction" }]);
  } finally {
    await db.close();
  }
}, 15000);
