import { describe, expect, it } from "vitest";
import config from "../next.config";

describe("legacy navigation redirects", () => {
  it.each([
    ["/today", "/"],
    ["/app", "/"],
    ["/map", "/explore"],
    ["/app/feed", "/explore"],
  ])("permanently moves %s to %s with a 301", async (source, destination) => {
    const redirects = await config.redirects!();
    expect(redirects.find((redirect) => redirect.source === source)).toEqual({
      source,
      destination,
      statusCode: 301,
    });
  });
});
