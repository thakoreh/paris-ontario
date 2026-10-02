import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/push/route";

const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/push", () => ({ getAuthenticatedUser: mocks.session }));
vi.mock("@/lib/push-validation", () => ({
  isSameOrigin: () => true,
  readBoundedJson: (request: Request) => request.json(),
  parseUnsubscribeRequest: (body: unknown) => body,
}));
let rows: { id: string; user_id: string; endpoint: string }[];
beforeEach(() => {
  rows = [{ id: "a-device", user_id: "account-a", endpoint: "endpoint" }];
  const db = {
    from: () => {
      const filters: { key: string; value: string }[] = [];
      const query = {
        delete: () => query,
        eq: (key: string, value: string) => {
          filters.push({ key, value });
          return query;
        },
        select: async () => {
          const removed = rows.filter((row) =>
            filters.every(
              ({ key, value }) => row[key as keyof typeof row] === value,
            ),
          );
          rows = rows.filter((row) => !removed.includes(row));
          return { data: removed.map(({ id }) => ({ id })), error: null };
        },
      };
      return query;
    },
  };
  mocks.session.mockResolvedValue({ user: { id: "account-b" }, db });
});
const request = () =>
  new Request("https://parispulse.ca/api/push", {
    method: "DELETE",
    body: JSON.stringify({ endpoint: "endpoint" }),
  });
describe("owner-scoped browser opt-out", () => {
  it("reports zero removals when a shared browser endpoint belongs to another account", async () => {
    const response = await DELETE(request());
    expect(await response.json()).toEqual({ ok: true, removed: 0 });
    expect(rows).toHaveLength(1);
  });
  it("confirms removal only for the owning account", async () => {
    const session = await mocks.session();
    session.user.id = "account-a";
    expect(await (await DELETE(request())).json()).toEqual({
      ok: true,
      removed: 1,
    });
    expect(rows).toHaveLength(0);
  });
});
