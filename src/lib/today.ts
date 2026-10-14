import type { Deadline, Notice } from "@/types";
import { filterEvents } from "./events";
import { isPublicDeadline, isPublicNotice } from "./public-content";
import { residentServices } from "@/data/resident-services";
export const pickupUrl =
  "https://www.brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant/garbage-collection-guidelines-and-schedule";
export const essentials = [
  {
    title: "Weather",
    source: "Environment Canada",
    url: "https://weather.gc.ca/",
  },
  { title: "Grand River", source: "GRCA", url: "https://www.grandriver.ca/" },
  {
    title: "Roads",
    source: "Municipal511",
    url: "https://www.municipal511.ca/",
  },
  { title: "My pickup day", source: "County of Brant", url: pickupUrl },
];
export const quickTasks = [
  { title: "My pickup day", href: pickupUrl },
  {
    title: "Brant Transit",
    href: residentServices.find((s) => s.id === "transit")!.url,
  },
  { title: "Trails & river", href: "/explore/trails" },
  { title: "Council", href: "/services/council" },
];
export function todayContent(
  notices: Notice[],
  deadlines: Deadline[],
  now = new Date(),
) {
  return {
    weekend: filterEvents(notices, { when: "weekend", tags: [] }, now).slice(
      0,
      3,
    ),
    deadlines: deadlines
      .filter((d) => isPublicDeadline(d, now))
      .sort((a, b) => Date.parse(a.deadline_at) - Date.parse(b.deadline_at)),
    notices: notices.filter(
      (n) => isPublicNotice(n, now) && n.category !== "event",
    ),
  };
}
export function parisGreeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  return `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, Paris`;
}
