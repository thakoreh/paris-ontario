import { describe, expect, it } from "vitest";

import { metadata as notificationsMetadata } from "@/app/notifications/page";
import { metadata as notFoundMetadata } from "@/app/not-found";
import robots from "@/app/robots";

describe("private and error route metadata", () => {
  it("clears inherited public metadata for browser notifications", () => {
    expect(notificationsMetadata).toMatchObject({
      robots: { index: false, follow: false },
      alternates: null,
      openGraph: null,
      twitter: null,
    });
  });

  it("does not robots-block notifications before crawlers can read its noindex", () => {
    const robotsResult = robots();
    const rules = Array.isArray(robotsResult.rules)
      ? robotsResult.rules
      : [robotsResult.rules];
    const disallowed = rules.flatMap((rule) => {
      if (!("disallow" in rule) || !rule.disallow) return [];
      return Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    });

    expect(disallowed).not.toContain("/notifications");
  });

  it("clears inherited public metadata for the not-found document", () => {
    expect(notFoundMetadata).toMatchObject({
      robots: { index: false, follow: false },
      alternates: null,
      openGraph: null,
      twitter: null,
    });
  });
});
