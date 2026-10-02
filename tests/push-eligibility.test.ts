import { describe, expect, it } from "vitest";
import {
  isPersonalizedPushEligible,
  isPushQuietTime,
  type PushNotice,
  type PushPreferences,
} from "@/lib/push-eligibility";

const now = new Date("2026-10-02T16:00:00Z"); // Noon in Paris, Ontario.
const place = { community_id: "paris", latitude: 43.1945, longitude: -80.3844 };
const notice: PushNotice = {
  ...place,
  category: "roads",
  severity: "useful",
  affected_radius_km: 0,
  verification_status: "verified",
  is_sample: false,
  published_at: "2026-10-01T12:00:00Z",
  expires_at: "2026-10-03T12:00:00Z",
  end_at: null,
};
const preferences: PushPreferences = {
  push_enabled: true,
  categories_json: ["roads"],
  radius_km: 1,
  minimum_severity: "info",
  quiet_hours_start: null,
  quiet_hours_end: null,
};

describe("personalized browser push eligibility", () => {
  it("matches a saved place and selected category inside its radius", () => {
    expect(isPersonalizedPushEligible(notice, [place], preferences, now)).toBe(
      true,
    );
    expect(
      isPersonalizedPushEligible(
        { ...notice, latitude: 43.3 },
        [place],
        preferences,
        now,
      ),
    ).toBe(false);
    expect(
      isPersonalizedPushEligible(
        { ...notice, category: "event" },
        [place],
        preferences,
        now,
      ),
    ).toBe(false);
    expect(
      isPersonalizedPushEligible(
        notice,
        [place],
        { ...preferences, minimum_severity: "important" },
        now,
      ),
    ).toBe(false);
  });
  it("honors an affected area and any of multiple saved places without duplicate recipients", () => {
    const distant = { ...place, latitude: 43.3 };
    expect(
      isPersonalizedPushEligible(
        notice,
        [distant, place, place],
        preferences,
        now,
      ),
    ).toBe(true);
    expect(
      isPersonalizedPushEligible(
        { ...notice, latitude: 43.21, affected_radius_km: 1 },
        [place],
        preferences,
        now,
      ),
    ).toBe(true);
  });
  it("fails closed for missing opt-in, preferences, places, categories or invalid data", () => {
    for (const p of [
      null,
      { ...preferences, push_enabled: false },
      { ...preferences, categories_json: [] },
      { ...preferences, radius_km: -1 },
      { ...preferences, radius_km: NaN },
    ]) {
      expect(isPersonalizedPushEligible(notice, [place], p, now)).toBe(false);
    }
    expect(isPersonalizedPushEligible(notice, [], preferences, now)).toBe(
      false,
    );
    expect(
      isPersonalizedPushEligible(
        notice,
        [{ ...place, community_id: "elsewhere" }],
        preferences,
        now,
      ),
    ).toBe(false);
    expect(
      isPersonalizedPushEligible(
        notice,
        [{ ...place, latitude: NaN }],
        preferences,
        now,
      ),
    ).toBe(false);
    expect(
      isPersonalizedPushEligible(
        { ...notice, longitude: null },
        [place],
        preferences,
        now,
      ),
    ).toBe(false);
  });
  it("rejects inherited-object names as severity settings", () => {
    const malformed = {
      ...preferences,
      minimum_severity: "toString",
    } as unknown as PushPreferences;
    expect(isPersonalizedPushEligible(notice, [place], malformed, now)).toBe(
      false,
    );
  });
  it("never turns unknown notice location into an implicit community-wide alert", () => {
    const unmapped = { ...notice, latitude: null, longitude: null };
    expect(
      isPersonalizedPushEligible(unmapped, [place], preferences, now),
    ).toBe(false);
    expect(
      isPersonalizedPushEligible(
        unmapped,
        [place],
        { ...preferences, radius_km: 0 },
        now,
      ),
    ).toBe(true);
    expect(
      isPersonalizedPushEligible(
        unmapped,
        [],
        { ...preferences, radius_km: 0 },
        now,
      ),
    ).toBe(false);
  });
  it("rejects drafts, samples, future publications, expired and ended notices", () => {
    for (const change of [
      { verification_status: "draft" as const },
      { is_sample: true },
      { published_at: "2026-10-03T00:00:00Z" },
      { published_at: "invalid" },
      { expires_at: now.toISOString() },
      { end_at: now.toISOString() },
      { end_at: "invalid" },
    ]) {
      expect(
        isPersonalizedPushEligible(
          { ...notice, ...change },
          [place],
          preferences,
          now,
        ),
      ).toBe(false);
    }
  });
});

describe("Paris quiet hours", () => {
  const overnight = {
    ...preferences,
    quiet_hours_start: "22:00:00",
    quiet_hours_end: "07:00:00",
  };
  it("supports midnight crossing and exclusive end in the local time zone", () => {
    expect(isPushQuietTime(overnight, new Date("2026-10-03T02:00:00Z"))).toBe(
      true,
    );
    expect(isPushQuietTime(overnight, new Date("2026-10-03T10:59:00Z"))).toBe(
      true,
    );
    expect(isPushQuietTime(overnight, new Date("2026-10-03T11:00:00Z"))).toBe(
      false,
    );
    expect(
      isPersonalizedPushEligible(
        notice,
        [place],
        {
          ...preferences,
          quiet_hours_start: "11:00",
          quiet_hours_end: "13:00",
        },
        now,
      ),
    ).toBe(false);
  });
  it("uses Toronto daylight-saving transitions rather than a fixed offset", () => {
    expect(isPushQuietTime(overnight, new Date("2026-12-03T03:00:00Z"))).toBe(
      true,
    );
    expect(isPushQuietTime(overnight, new Date("2026-12-03T12:00:00Z"))).toBe(
      false,
    );
  });
  it("fails closed for incomplete/invalid ranges and treats equal endpoints as all-day quiet", () => {
    for (const patch of [
      { quiet_hours_start: "22:00" },
      { quiet_hours_start: "bad", quiet_hours_end: "07:00" },
      { quiet_hours_start: "07:00", quiet_hours_end: "07:00" },
    ]) {
      expect(isPushQuietTime({ ...preferences, ...patch }, now)).toBe(true);
    }
  });
});
