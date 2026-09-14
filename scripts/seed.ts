import { createClient } from "@supabase/supabase-js";
import { createSeed } from "../src/data/seed";
import { community } from "../src/config/community";
import { categories, categoryLabels } from "../src/types";
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
)
  throw Error(
    "Set Supabase URL and service role key. Run with node --env-file=.env.local --import tsx scripts/seed.ts",
  );
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { notices, deadlines, sources } = createSeed();
for (const [table, rows] of [
  ["communities", [community]],
  [
    "interests",
    categories.map((category) => ({
      slug: category,
      name: categoryLabels[category],
      category,
      description: categoryLabels[category],
      active: true,
    })),
  ],
  ["official_sources", sources],
  ["notices", notices],
  ["deadlines", deadlines],
] as const) {
  const { error } = await db
    .from(table)
    .upsert(JSON.parse(JSON.stringify(rows)), {
      onConflict: table === "interests" ? "slug" : "id",
    });
  if (error) throw error;
  console.log(`Seeded ${table}: ${rows.length}`);
}
