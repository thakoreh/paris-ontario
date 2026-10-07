import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: "editor" as string | null,
  user: true,
  configured: true,
  missing: false,
  writes: [] as {
    table: string;
    method: string;
    row: Record<string, unknown>;
    id?: string;
  }[],
}));
vi.mock("@/lib/supabase/server", () => ({
  serverClient: async () =>
    state.configured
      ? {
          auth: {
            getUser: async () => ({
              data: { user: state.user ? { id: "editor-id" } : null },
            }),
          },
          from: (table: string) => {
            const query = {
              select: () => query,
              eq: (_key: string, id: string) => {
                if (table !== "users") state.writes.at(-1)!.id = id;
                return query;
              },
              single: async () =>
                table === "users"
                  ? { data: { role: state.role }, error: null }
                  : state.missing
                    ? { data: null, error: new Error("No matching record") }
                    : {
                        data: {
                          slug: "original-public-url",
                          ...state.writes.at(-1)?.row,
                        },
                        error: null,
                      },
              update: (row: Record<string, unknown>) => {
                state.writes.push({ table, method: "update", row });
                return query;
              },
              insert: (row: Record<string, unknown>) => {
                state.writes.push({ table, method: "insert", row });
                return query;
              },
            };
            return query;
          },
        }
      : null,
}));
import { POST } from "@/app/api/admin/route";

const id = "00000000-0000-4000-8000-000000000123";
const notice = {
  title: "Changed notice title",
  summary: "A carefully verified local notice summary.",
  category: "roads",
  severity: "useful",
  source_id: id,
  official_url: "https://www.brant.ca/news",
  latitude: null,
  longitude: null,
  expires_at: "2026-11-01T06:30:12.123456+00:00",
  is_sample: false,
  verification_status: "draft",
};
const post = (body: unknown) =>
  POST(
    new Request("https://parispulse.ca/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
beforeEach(() => {
  state.role = "editor";
  state.user = true;
  state.configured = true;
  state.missing = false;
  state.writes.length = 0;
});

describe("admin edit integrity", () => {
  it("preserves existing URLs and publication metadata on a title edit", async () => {
    const response = await post({
      table: "notices",
      id,
      data: {
        ...notice,
        slug: "malicious-replacement",
        published_at: "2000-01-01T00:00:00Z",
      },
    });
    expect(response.status).toBe(200);
    expect(state.writes[0]).toMatchObject({
      table: "notices",
      method: "update",
      id,
    });
    for (const key of ["slug", "published_at", "retrieved_at"])
      expect(state.writes[0].row).not.toHaveProperty(key);
    expect(state.writes[0].row.expires_at).toBe(notice.expires_at);
    expect((await response.json()).data.slug).toBe("original-public-url");
  });

  it("generates a slug and publication timestamps only for a new notice", async () => {
    expect((await post({ table: "notices", data: notice })).status).toBe(200);
    expect(state.writes[0].method).toBe("insert");
    expect(state.writes[0].row.slug).toMatch(
      /^changed-notice-title-[a-f0-9]{8}$/,
    );
    expect(state.writes[0].row).toHaveProperty("published_at");
    expect(state.writes[0].row).toHaveProperty("retrieved_at");
  });

  it("fails stale edits without falling back to insert", async () => {
    state.missing = true;
    expect((await post({ table: "notices", id, data: notice })).status).toBe(
      400,
    );
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].method).toBe("update");
  });

  it.each(["resident", "guest", null])(
    "denies writes by role %s",
    async (role) => {
      state.role = role;
      expect((await post({ table: "notices", id, data: notice })).status).toBe(
        403,
      );
      expect(state.writes).toHaveLength(0);
    },
  );

  it("refreshes source review timestamps only after a successful verified save", async () => {
    const response = await post({
      table: "notices",
      id,
      data: { ...notice, verification_status: "verified" },
    });
    expect(response.status).toBe(200);
    expect(state.writes).toHaveLength(2);
    expect(state.writes[0].row).not.toHaveProperty("slug");
    expect(state.writes[1]).toMatchObject({
      table: "official_sources",
      method: "update",
      id,
    });
    expect(state.writes[1].row.last_checked_at).toBe(
      state.writes[0].row.verified_at,
    );
    expect(state.writes[1].row.last_success_at).toBe(
      state.writes[0].row.verified_at,
    );
  });

  it.each([
    { ...notice },
    { ...notice, verification_status: "verified", is_sample: true },
  ])("does not refresh source review for drafts or samples", async (data) => {
    expect((await post({ table: "notices", id, data })).status).toBe(200);
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].row.verified_at).toBeNull();
  });

  it("does not refresh source review after a failed verified save", async () => {
    state.missing = true;
    expect(
      (
        await post({
          table: "notices",
          id,
          data: { ...notice, verification_status: "verified" },
        })
      ).status,
    ).toBe(400);
    expect(state.writes).toHaveLength(1);
  });

  it("updates an existing source by ID", async () => {
    expect(
      (
        await post({
          table: "official_sources",
          id,
          data: {
            name: "County source",
            organization: "County of Brant",
            url: notice.official_url,
            authority_level: "official",
            description: "Official county news",
            active: true,
          },
        })
      ).status,
    ).toBe(200);
    expect(state.writes[0]).toMatchObject({
      table: "official_sources",
      method: "update",
      id,
    });
  });

  it("denies anonymous or unconfigured access", async () => {
    state.user = false;
    expect((await post({ table: "notices", id, data: notice })).status).toBe(
      403,
    );
    state.configured = false;
    expect((await post({ table: "notices", id, data: notice })).status).toBe(
      403,
    );
    expect(state.writes).toHaveLength(0);
  });

  it("rejects invalid IDs and data before writing", async () => {
    expect(
      (await post({ table: "notices", id: "bad-id", data: notice })).status,
    ).toBe(400);
    expect(
      (await post({ table: "notices", id, data: { ...notice, title: "x" } }))
        .status,
    ).toBe(400);
    expect(state.writes).toHaveLength(0);
  });

  it("updates deadlines without recreating records or losing timestamp precision", async () => {
    const response = await post({
      table: "deadlines",
      id,
      data: {
        title: "Updated deadline",
        description: "The deadline description.",
        category: "roads",
        deadline_at: notice.expires_at,
        official_url: notice.official_url,
        source_id: id,
        is_sample: false,
        verified_at: null,
        latitude: null,
        longitude: null,
      },
    });
    expect(response.status).toBe(200);
    expect(state.writes[0]).toMatchObject({
      table: "deadlines",
      method: "update",
      id,
      row: { deadline_at: notice.expires_at },
    });
  });
});
