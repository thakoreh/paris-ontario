import { community } from "@/config/community";

const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const PARIS_BBOX = "-80.65,43.05,-80.15,43.35";
const MAX_RESULTS = 5;
const PROVIDER_TIMEOUT_MS = 5000;

type PhotonFeature = {
  properties?: Record<string, unknown>;
  geometry?: { type?: unknown; coordinates?: unknown };
};

function text(properties: Record<string, unknown>, key: string) {
  const value = properties[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function uniqueParts(parts: string[]) {
  return parts.filter((part, index) => {
    const normalized = part.toLowerCase();
    return parts.findIndex((candidate) => candidate.toLowerCase() === normalized) === index;
  });
}

function normalizeFeature(feature: PhotonFeature) {
  const properties = feature.properties ?? {};
  const coordinates = feature.geometry?.coordinates;
  if (
    feature.geometry?.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number" ||
    !Number.isFinite(coordinates[0]) ||
    !Number.isFinite(coordinates[1])
  )
    return null;

  if (text(properties, "countrycode").toUpperCase() !== "CA") return null;

  const street = uniqueParts([
    [text(properties, "housenumber"), text(properties, "street")]
      .filter(Boolean)
      .join(" "),
    text(properties, "name"),
  ].filter(Boolean));
  const city = text(properties, "city") || text(properties, "district");
  const state = text(properties, "state");
  const postalCode = text(properties, "postcode");
  const address = uniqueParts([street[0] ?? "", city, state].filter(Boolean)).join(
    ", ",
  );
  const label = uniqueParts([address, postalCode].filter(Boolean)).join(", ");
  const osmType = text(properties, "osm_type");
  const osmId = properties.osm_id;
  const id = osmType && (typeof osmId === "number" || typeof osmId === "string")
    ? `${osmType}:${osmId}`
    : `${coordinates[1]}:${coordinates[0]}`;

  if (!label) return null;
  return {
    id,
    label,
    address: address || label,
    postalCode,
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
}

export async function searchAddresses(query: string) {
  const providerUrl = new URL(PHOTON_ENDPOINT);
  providerUrl.searchParams.set(
    "q",
    `${query}, ${community.name}, ${community.province}, ${community.country}`,
  );
  providerUrl.searchParams.set("lat", String(community.latitude));
  providerUrl.searchParams.set("lon", String(community.longitude));
  providerUrl.searchParams.set("bbox", PARIS_BBOX);
  providerUrl.searchParams.set("limit", String(MAX_RESULTS));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(providerUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Photon returned ${response.status}`);
    const body = (await response.json()) as { features?: PhotonFeature[] };
    const suggestions = (Array.isArray(body.features) ? body.features : [])
      .map(normalizeFeature)
      .filter((suggestion): suggestion is NonNullable<typeof suggestion> => !!suggestion)
      .slice(0, MAX_RESULTS);
    return { suggestions };
  } finally {
    clearTimeout(timeout);
  }
}
