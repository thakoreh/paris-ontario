import { access, cp, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

async function copyRequired(source, destination) {
  await access(source, constants.R_OK);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}

await copyRequired(
  join(root, ".next", "static"),
  join(standalone, ".next", "static"),
);

try {
  await copyRequired(join(root, "public"), join(standalone, "public"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
