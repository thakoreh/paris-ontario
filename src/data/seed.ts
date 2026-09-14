import { community } from "@/config/community";
import { sources } from "@/config/sources";
import type { Category, Notice, Deadline, Location } from "@/types";
const rows: [string, Category, number, string][] = [
  [
    "Grand River Street North: access changes this week",
    "construction",
    2,
    "A sample construction update showing how access changes and alternate routes appear in your feed. Businesses remain accessible in this demonstration.",
  ],
  [
    "Fall swimming registration opens tomorrow",
    "recreation",
    6,
    "Example registration notice for swimming lessons. This is not a real registration date; check the County recreation schedule.",
  ],
  [
    "New planning application near Rest Acres Road",
    "planning",
    5,
    "Example development application with a public consultation opportunity. No actual application or approval is represented.",
  ],
  [
    "Downtown parking: temporary lot changes",
    "downtown",
    2,
    "Example parking changes around downtown Paris. Check official signage before you travel.",
  ],
  [
    "Storm cleanup: temporary trail closure",
    "storm",
    0,
    "Demonstration of an urgent storm-related notice. This does not describe current weather or a real closure.",
  ],
  [
    "Flood information: check the official watershed bulletin",
    "emergency",
    10,
    "Sample urgent flood notice. No current flood condition is asserted. Open GRCA for authoritative information.",
  ],
  [
    "Power interruptions: where to find updates",
    "outage",
    12,
    "A demonstration of how outage information is linked. Paris Pulse has no live outage status or restoration estimate.",
  ],
  [
    "Paris Road: lane work notice",
    "roads",
    2,
    "Sample lane maintenance notice. Verify actual conditions with the original source.",
  ],
  [
    "William Street bridge: sidewalk maintenance",
    "construction",
    2,
    "Example scheduled sidewalk work with a pedestrian access change.",
  ],
  [
    "Silver Street: resurfacing schedule",
    "roads",
    2,
    "Example road resurfacing information for residents and commuters.",
  ],
  [
    "Rest Acres Road: intersection improvements",
    "construction",
    2,
    "Example intersection construction update.",
  ],
  [
    "Dundas Street East: utility work",
    "construction",
    2,
    "Example utility construction affecting road access.",
  ],
  [
    "Oak Avenue: local road maintenance",
    "roads",
    2,
    "Example neighbourhood maintenance notice.",
  ],
  [
    "Public meeting: proposed housing development",
    "planning",
    5,
    "Sample public meeting notice with an opportunity to review drawings and send comments.",
  ],
  [
    "Comment period: neighbourhood design guidelines",
    "planning",
    4,
    "Sample consultation about neighbourhood design.",
  ],
  [
    "Planning notice: King Edward Street",
    "planning",
    5,
    "Example planning application notification.",
  ],
  [
    "Public hearing: minor variance request",
    "planning",
    1,
    "Example hearing notice. Review official documentation before making a submission.",
  ],
  [
    "Community market at the fairgrounds",
    "event",
    9,
    "Sample community market with local growers and makers. Dates are for demonstration only.",
  ],
  [
    "A family afternoon by the river",
    "event",
    8,
    "Sample free outdoor family activity in downtown Paris.",
  ],
  [
    "Weekend makers market",
    "event",
    9,
    "Sample weekend market and community event.",
  ],
  [
    "Downtown arts walk",
    "event",
    8,
    "Example free self-guided arts activity in downtown Paris.",
  ],
  [
    "Paris Fair community showcase",
    "event",
    9,
    "Sample fairgrounds event. Check the official calendar for actual fair dates.",
  ],
  [
    "Library community open house",
    "event",
    13,
    "Example free library open house for all ages.",
  ],
  [
    "Fall skating programs: registration information",
    "recreation",
    6,
    "Sample skating program notice for families.",
  ],
  [
    "After-school activities at the library",
    "recreation",
    13,
    "Example library programs for school-age children.",
  ],
  [
    "Senior recreation membership registration",
    "recreation",
    6,
    "Example membership registration information.",
  ],
  [
    "Parent and tot drop-in sessions",
    "recreation",
    6,
    "Example drop-in recreation program.",
  ],
  [
    "Brant Transit: holiday booking reminder",
    "transit",
    7,
    "Sample transit notice. Use the official service for real schedules and bookings.",
  ],
  [
    "Transit pickup point temporarily relocated",
    "transit",
    7,
    "Example pickup location change.",
  ],
  [
    "Downtown loading zone update",
    "downtown",
    8,
    "Example loading zone information for downtown visitors and businesses.",
  ],
  [
    "Community centre: pool maintenance",
    "facility",
    6,
    "Sample same-day facility closure notice. Check the County before visiting.",
  ],
  [
    "Waste collection: service reminder",
    "waste",
    0,
    "Example waste collection schedule notice.",
  ],
  [
    "County consultation: have your say",
    "public_notice",
    4,
    "Sample public consultation invitation.",
  ],
  [
    "Volunteer opportunities in the community",
    "other",
    13,
    "Sample community volunteering notice.",
  ],
  [
    "Storm debris collection information",
    "storm",
    0,
    "Example storm debris collection information; not a current service announcement.",
  ],
  [
    "Past example: road closure completed",
    "roads",
    2,
    "Expired sample showing a completed road closure.",
  ],
  [
    "Past example: summer registration",
    "recreation",
    6,
    "Expired sample registration notice.",
  ],
  [
    "Past example: community concert",
    "event",
    8,
    "Expired sample event notice.",
  ],
  [
    "Past example: planning comment period",
    "planning",
    5,
    "Expired sample consultation.",
  ],
];
export function createSeed(now = new Date()) {
  const iso = (hours: number) => new Date(+now + hours * 3600000).toISOString();
  const notices: Notice[] = rows.map(
    ([title, category, source, summary], i) => ({
      id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      community_id: community.id,
      source_id: sources[source].id,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, ""),
      summary,
      body:
        summary +
        " This item is fictional sample data for exploring Paris Pulse. The source link is a reference to the organization, not evidence of this sample notice.",
      category,
      severity:
        i === 4 || i === 5
          ? "urgent"
          : [0, 2, 3, 7, 30].includes(i)
            ? "important"
            : "useful",
      official_url: sources[source].url,
      published_at: iso(-i * 0.8),
      retrieved_at: iso(-i * 0.8),
      verified_at: null,
      start_at: iso((i % 7) * 24),
      end_at: iso(i >= 35 ? -24 : 24 * (3 + (i % 12))),
      expires_at: iso(i >= 35 ? -24 : 24 * (7 + (i % 10))),
      latitude: [5, 6, 27, 31, 32, 34].includes(i)
        ? null
        : community.latitude + ((i % 7) - 3) * 0.003,
      longitude: [5, 6, 27, 31, 32, 34].includes(i)
        ? null
        : community.longitude + ((i % 5) - 2) * 0.004,
      address_text: [
        "Grand River Street North",
        "Rest Acres Road",
        "Dundas Street East",
        "William Street",
      ][i % 4],
      affected_area_text: [5, 6, 27, 31, 32, 34].includes(i)
        ? "All Paris"
        : "Paris neighbourhood",
      city: community.name,
      tags_json:
        category === "event"
          ? ["family", ...(i % 2 ? ["free", "downtown"] : [])]
          : [category],
      verification_status: i >= 35 ? "expired" : "verified",
      confidence_score: 1,
      is_sample: true,
    }),
  );
  const deadlines: Deadline[] = [
    "Fall swimming registration opens",
    "Share your feedback on a planning application",
    "Senior recreation membership registration",
    "Library workshop registration",
    "Public hearing written submissions",
    "Community market vendor applications",
    "Fall skating registration",
    "Neighbourhood consultation closes",
  ].map((title, i) => ({
    id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    community_id: community.id,
    notice_id: notices[[1, 2, 25, 24, 13, 17, 23, 14][i]].id,
    title,
    description:
      "Sample deadline. Check the original source for real dates, eligibility and the required action.",
    category:
      i === 1 || i === 4 || i === 7
        ? "planning"
        : i === 5
          ? "event"
          : "recreation",
    starts_at: null,
    deadline_at: iso([18, 45, 70, 120, 150, 210, 350, 500][i]),
    official_url: sources[i % 2 ? 5 : 6].url,
    latitude: community.latitude,
    longitude: community.longitude,
    source_id: sources[i % 2 ? 5 : 6].id,
    verified_at: null,
    is_sample: true,
  }));
  return { notices, deadlines, sources };
}
export function demoLocations(userId = "demo"): Location[] {
  return ["Home", "Work", "School", "Other"].map((label, i) => ({
    id: `40000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    user_id: userId,
    community_id: community.id,
    label,
    address_line: [
      "Grand River Street North (sample)",
      "Rest Acres Road (sample)",
      "Dundas Street (sample)",
      "William Street (sample)",
    ][i],
    city: community.name,
    province: community.province,
    postal_code: "",
    latitude: community.latitude + i * 0.004,
    longitude: community.longitude - i * 0.004,
    location_type: ["home", "work", "school", "other"][
      i
    ] as Location["location_type"],
    is_primary: i === 0,
  }));
}
