export type ParisResourceSource = {
  label: string;
  organization: string;
  url: string;
};

export type ParisResource = {
  id: "outdoors" | "getting-around" | "family-recreation" | "settling-in" | "garbage-recycling";
  title: string;
  summary: string;
  task: string;
  keywords: string;
  reviewedAt: string;
  sources: ParisResourceSource[];
};

// Manually reviewed on the fixed date below. These are task guides, not live-status feeds.
export const parisResources: ParisResource[] = [
  {
    id: "outdoors",
    title: "Parks, trails & outdoor time",
    task: "Choose a route or outdoor place with the official map in hand.",
    summary:
      "Start with the County's Outdoor Adventure Map for local trails, cycling routes and parks. For the Cambridge-to-Paris Rail Trail, check the conservation authority's route guidance and permitted uses before you go.",
    keywords: "trail trails hiking cycling bike park outdoor adventure map Cambridge Paris rail",
    reviewedAt: "2026-09-15",
    sources: [
      {
        label: "County of Brant trails and Outdoor Adventure Map",
        organization: "County of Brant",
        url: "https://www.brant.ca/recreation-and-parks/outdoor-courts-sports-and-trails/trails/",
      },
      {
        label: "Cambridge to Paris Trail guidance",
        organization: "Grand River Conservation Authority",
        url: "https://grandriver.ca/outdoor-recreation/trails/cambridge-to-paris-trail",
      },
    ],
  },
  {
    id: "getting-around",
    title: "Getting around & parking",
    task: "Plan a trip or confirm whether a downtown-resident parking permit fits your situation.",
    summary:
      "Use Brant Transit’s official booking information for local shared rides. Downtown residential permits have eligibility and location rules, so review the County’s current permit page instead of assuming a space is available.",
    keywords: "transit bus ride transportation parking downtown permit travel vehicle",
    reviewedAt: "2026-09-15",
    sources: [
      {
        label: "Brant Transit booking information",
        organization: "County of Brant",
        url: "https://www.brant.ca/roads-parking-and-public-transit/brant-transit/",
      },
      {
        label: "Downtown Paris residential parking permits",
        organization: "County of Brant",
        url: "https://brant.ca/bylaws-and-animal-services/parking/bia-residential-permit-parking",
      },
    ],
  },
  {
    id: "family-recreation",
    title: "Family & recreation",
    task: "Find a County program, pool or park resource and confirm the current schedule with its operator.",
    summary:
      "The County’s recreation guides are the starting point for programs and activities. Paris Lions Park is a useful official facility page when you are looking for its amenities or connections to local paths.",
    keywords: "family kids children recreation programs pool swim park playground sports activity",
    reviewedAt: "2026-09-15",
    sources: [
      {
        label: "County of Brant recreation guides",
        organization: "County of Brant",
        url: "https://www.brant.ca/recreation-and-parks/community-services-guides/",
      },
      {
        label: "Paris Lions Park facility details",
        organization: "County of Brant",
        url: "https://www.brant.ca/media-manager/media-pages/parks-and-facilities-pf/paris-lions-park/",
      },
    ],
  },
  {
    id: "settling-in",
    title: "Settling in & essential services",
    task: "Find the right public office or newcomer starting point without duplicating the full newcomer checklist.",
    summary:
      "Use the County’s customer-service directory for Paris office information and the County newcomer page for its official starting resources. The existing Paris Pulse newcomer checklist keeps common first-week tasks in one browser-only list.",
    keywords: "newcomer moving settle services customer service office address essentials",
    reviewedAt: "2026-09-15",
    sources: [
      {
        label: "County of Brant customer-service locations",
        organization: "County of Brant",
        url: "https://www.brant.ca/council-and-county-administration/customer-service-locations",
      },
      {
        label: "County of Brant newcomer resources",
        organization: "County of Brant",
        url: "https://www.brant.ca/community-and-support/brant-cares/newcomers",
      },
    ],
  },
  {
    id: "garbage-recycling",
    title: "Garbage, recycling & disposal",
    task: "Check a collection day, item-disposal option or eligible pickup with the responsible operator.",
    summary:
      "Use the County's collection map and item lookup before setting out waste. Its current pages also point to recycling contacts, large-item pickup eligibility and Paris transfer-station details.",
    keywords: "garbage waste recycling blue box collection day bulky large item large items household item household items pickup transfer station disposal landfill",
    reviewedAt: "2026-09-16",
    sources: [
      {
        label: "County of Brant garbage and recycling overview",
        organization: "County of Brant",
        url: "https://www.brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant",
      },
      {
        label: "County of Brant collection guidelines and map",
        organization: "County of Brant",
        url: "https://www.brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant/garbage-collection-guidelines-and-schedule",
      },
      {
        label: "County of Brant recycling contact information",
        organization: "County of Brant",
        url: "https://brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant/recycling",
      },
      {
        label: "Paris transfer station details",
        organization: "County of Brant",
        url: "https://www.brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant/landfill-and-transfer-station",
      },
      {
        label: "Large household item pickup eligibility",
        organization: "County of Brant",
        url: "https://www.brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant/large-household-items-pickup",
      },
    ],
  },
];

export function filterParisResources(query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return parisResources.filter((resource) => {
    const text = `${resource.title} ${resource.task} ${resource.summary} ${resource.keywords}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
