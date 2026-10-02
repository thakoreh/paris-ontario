import { z } from "zod";
import { categories } from "@/types";
import { sourceUrl } from "@/lib/validation";

export const submissionAreas = {
  "all-paris": "Across Paris",
  downtown: "Downtown Paris",
  "north-paris": "North Paris",
  "south-paris": "South Paris",
  "east-paris": "East Paris",
  "west-paris": "West Paris",
} as const;
export const submissionCategories = categories.filter(
  (value) => value !== "emergency",
);
const publicSource = sourceUrl.max(2048).refine((value) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.hostname.includes(".") &&
    !url.hostname.endsWith(".") &&
    !/^[\d.]+$/.test(url.hostname) &&
    !/\.(local|internal|localhost|test|example|invalid)$/i.test(url.hostname) &&
    !url.port &&
    !url.hash &&
    !/[\s\\]/.test(value) &&
    ![...url.searchParams.keys()].some(
      (key) =>
        /token|api.?key|secret|password|auth|session|credential|signature|signed|jwt|access|reset|invite/i.test(
          key,
        ) || /^(key|code|sig|ticket)$/i.test(key),
    )
  );
}, "Use a public source page, without private access links or credentials.");
const plainText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),
      "Remove control characters.",
    );

export const communitySubmissionSchema = z
  .object({
    title: plainText(8, 140).refine(
      (value) => !/[\r\n\t]/.test(value),
      "Use a single-line title.",
    ),
    body: plainText(20, 2000),
    category: z.enum(submissionCategories),
    area: z.enum(
      Object.keys(submissionAreas) as [
        keyof typeof submissionAreas,
        ...Array<keyof typeof submissionAreas>,
      ],
    ),
    source_url: publicSource,
    public_details_only: z.literal(true),
    website: z.literal("").optional(),
  })
  .strict();

export const reviewChecks = {
  source_verified: "I opened the original source and checked who published it",
  geography_verified:
    "The update is relevant to Paris and its affected area is supported",
  facts_verified:
    "The key facts, dates and current status are supported by the source",
  privacy_checked:
    "There are no private home details, personal accusations or unnecessary personal data",
} as const;
export type ReviewChecks = Record<keyof typeof reviewChecks, boolean>;
const checksSchema = z
  .object({
    source_verified: z.boolean(),
    geography_verified: z.boolean(),
    facts_verified: z.boolean(),
    privacy_checked: z.boolean(),
  })
  .strict();
export const submissionReviewSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["ready", "rejected"]),
    review_notes: plainText(10, 2000),
    review_checks: checksSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.status !== "ready" ||
      Object.values(value.review_checks).every(Boolean),
    {
      message:
        "Every editorial check is required before marking an update ready.",
    },
  );

export type CommunitySubmission = {
  id: string;
  title: string;
  body: string;
  category: (typeof submissionCategories)[number];
  area: keyof typeof submissionAreas;
  source_url: string;
  status: "pending" | "ready" | "rejected";
  created_at: string;
  review_notes: string | null;
  review_checks: Partial<ReviewChecks>;
};
