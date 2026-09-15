export type ResidentService = {
  id: string;
  title: string;
  category: string;
  description: string;
  action: string;
  url: string;
  organization: string;
  checkedAt: string;
  keywords: string;
};

// Editorial review of the linked pages, not a live service-status timestamp.
export const residentServices: ResidentService[] = [
  {
    id: "waste",
    title: "Garbage, recycling & yard waste",
    category: "Home & property",
    description:
      "Find your address-specific collection schedule and look up where an item belongs. Check eligibility before arranging large-item pickup.",
    action: "Find my collection information",
    organization: "County of Brant",
    url: "https://www.brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant/",
    checkedAt: "2026-09-15",
    keywords:
      "trash rubbish bins collection pickup bulky leaves disposal transfer station",
  },
  {
    id: "transit",
    title: "Book a Brant Transit ride",
    category: "Getting around",
    description:
      "Brant Transit is a pre-booked, shared-ride service. Check booking rules, service area and accessibility information before planning your trip.",
    action: "See booking options",
    organization: "County of Brant",
    url: "https://www.brant.ca/roads-parking-and-public-transit/brant-transit/",
    checkedAt: "2026-09-15",
    keywords: "bus transportation travel ride wheelchair accessible",
  },
  {
    id: "library",
    title: "Get a library card",
    category: "Learning & recreation",
    description:
      "The County of Brant Public Library offers library cards and online-only memberships. Review identification requirements before visiting a branch.",
    action: "Check library membership options",
    organization: "County of Brant Public Library",
    url: "https://www.brantlibrary.ca/en/services/membership.aspx",
    checkedAt: "2026-09-15",
    keywords: "books ebooks reading digital membership children",
  },
  {
    id: "recreation",
    title: "Find recreation programs",
    category: "Learning & recreation",
    description:
      "Browse the County's seasonal guide for registered and drop-in activities, including fitness, sports, youth and 55+ programs. Confirm availability with the registration provider.",
    action: "Open the recreation guide",
    organization: "County of Brant",
    url: "https://www.brant.ca/recreation-and-parks/community-services-guides/",
    checkedAt: "2026-09-15",
    keywords:
      "swimming lessons sports kids family seniors camp fitness registration COB Connect",
  },
  {
    id: "tax",
    title: "Property tax payments",
    category: "Home & property",
    description:
      "Check official due dates, payment methods and pre-authorized payment options. Use your own tax bill to confirm the amount owed.",
    action: "Check tax payment options",
    organization: "County of Brant",
    url: "https://www.brant.ca/property-taxes/paying-your-tax-bill/",
    checkedAt: "2026-09-15",
    keywords: "house homeowner property taxes bill finance payment",
  },
  {
    id: "report",
    title: "Report a municipal problem",
    category: "Home & property",
    description:
      "Use the County form for issues such as potholes, streetlights, sidewalks and bylaw concerns. If the form is unavailable, contact the County at 519-442-7268. This is not an emergency-reporting tool.",
    action: "Open the County report form",
    organization: "County of Brant",
    url: "https://webforms.brant.ca/Report-a-Problem",
    checkedAt: "2026-09-15",
    keywords:
      "pothole streetlight sidewalk noise parking bylaw complaint broken road",
  },
  {
    id: "address",
    title: "Update your Ontario address",
    category: "Moving & settling in",
    description:
      "Moving? Review ServiceOntario's address-change steps for your driver's licence, vehicle permit, health card and other provincial documents. Requirements and deadlines vary by document.",
    action: "Review address-change steps",
    organization: "Government of Ontario",
    url: "https://ontario.ca/page/change-my-address-ontario-services?type=faq",
    checkedAt: "2026-09-15",
    keywords:
      "newcomer moving moved settle licence license health card OHIP address",
  },
  {
    id: "health",
    title: "Non-urgent health advice: Health811",
    category: "Health & support",
    description:
      "Ontario Health explains how to call 811 or use Health811 online for non-urgent health advice and help finding services. For a medical emergency, call 911 instead.",
    action: "Read how to access Health811",
    organization: "Ontario Health",
    url: "https://www.ontariohealth.ca/news/health811-resources-help-providers-support-patients-in-accessing",
    checkedAt: "2026-09-15",
    keywords: "doctor nurse healthcare health clinic medical advice 811",
  },
];

export function filterServices(query: string, category: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return residentServices.filter((service) => {
    const text =
      `${service.title} ${service.description} ${service.keywords} ${service.organization}`.toLocaleLowerCase();
    return (
      (category === "all" || service.category === category) &&
      terms.every((term) => text.includes(term))
    );
  });
}
