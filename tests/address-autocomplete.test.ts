import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { GET } from "@/app/api/address/route";
import { AddressAutocomplete } from "@/components/address-autocomplete";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("address autocomplete API", () => {
  it("rejects short queries without contacting the public provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("https://parispulse.ca/api/address?q=Pa"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Enter at least 3 characters to search an address.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the fixed Photon endpoint, biases Paris, filters to Canada, and returns real points", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                osm_type: "N",
                osm_id: 123,
                housenumber: "10",
                street: "Grand River Street North",
                city: "Paris",
                state: "Ontario",
                postcode: "N3L 2M4",
                country: "Canada",
                countrycode: "CA",
              },
              geometry: { type: "Point", coordinates: [-80.3847, 43.1944] },
            },
            {
              properties: { street: "Main Street", countrycode: "US" },
              geometry: { type: "Point", coordinates: [-80, 43] },
            },
            {
              properties: { street: "No point", countrycode: "CA" },
              geometry: { type: "LineString", coordinates: [] },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request(
        "https://parispulse.ca/api/address?q=10%20Grand%20River%20Street",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      suggestions: [
        {
          id: "N:123",
          label: "10 Grand River Street North, Paris, Ontario, N3L 2M4",
          address: "10 Grand River Street North, Paris, Ontario",
          postalCode: "N3L 2M4",
          latitude: 43.1944,
          longitude: -80.3847,
        },
      ],
    });

    const requested = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requested.origin + requested.pathname).toBe(
      "https://photon.komoot.io/api/",
    );
    expect(requested.searchParams.get("q")).toBe(
      "10 Grand River Street, Paris, Ontario, Canada",
    );
    expect(requested.searchParams.get("lat")).toBe("43.1945");
    expect(requested.searchParams.get("lon")).toBe("-80.3844");
    expect(requested.searchParams.get("bbox")).toBe(
      "-80.65,43.05,-80.15,43.35",
    );
    expect(requested.searchParams.get("limit")).toBe("5");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET" });
  });

  it("returns a provider error without exposing provider response details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream failed", { status: 503 })),
    );

    const response = await GET(
      new Request("https://parispulse.ca/api/address?q=Grand%20River"),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Address search is temporarily unavailable.",
    });
  });
});

describe("address autocomplete UI", () => {
  it("renders an explicit address search and privacy note", () => {
    const html = renderToString(
      React.createElement(AddressAutocomplete, {
        value: "",
        onChange: () => undefined,
        onSelect: () => undefined,
      }),
    );

    expect(html).toContain('aria-label="Search home address"');
    expect(html).toContain("Typed searches are sent to Photon");
  });
});
