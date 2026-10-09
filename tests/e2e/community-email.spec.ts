import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./resident-fixtures";

const endpoint = "**/api/community-submissions";
const publicDetails =
  "This contains public details only, with no private home information, personal accusations or unnecessary personal data.";
const draft = {
  title: "A local café open house",
  body: "A public open house is planned in downtown Paris. Please check the organizer announcement for confirmed dates and details.",
  category: "event",
  area: "downtown",
  source_url: "https://www.brant.ca/news/",
  public_details_only: true,
  website: "",
};

async function fillDraft(page: Page) {
  await page.getByRole("textbox", { name: "Update title", exact: true }).fill(draft.title);
  await page
    .getByRole("textbox", { name: "What should neighbours know?", exact: true })
    .fill(draft.body);
  await page.getByRole("combobox", { name: "Category", exact: true }).selectOption(draft.category);
  await page.getByRole("combobox", { name: "Area", exact: true }).selectOption(draft.area);
  await page.getByRole("textbox", { name: "Original source URL", exact: true }).fill(draft.source_url);
  await page.getByRole("checkbox", { name: publicDetails, exact: true }).check();
}

async function mockIntake(page: Page, accepting: boolean) {
  const posts: unknown[] = [];
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { accepting } });
      return;
    }
    posts.push(route.request().postDataJSON());
    await route.fulfill({ status: 202, json: { status: "pending" } });
  });
  return posts;
}

test("disabled intake offers an explicit email draft and complete selectable fallback without a receipt", async ({ page }) => {
  const posts = await mockIntake(page, false);
  await page.goto("/share-update");
  await expect(page.getByRole("status")).toContainText("Private submissions are not available");
  await fillDraft(page);
  await page.getByRole("button", { name: "Review my update", exact: true }).click();

  const emailLink = page.getByRole("link", { name: "Open email draft", exact: true });
  await expect(emailLink).toBeVisible();
  const href = await emailLink.getAttribute("href");
  expect(href).toMatch(/^mailto:editor%40example\.org\?/);
  expect(href?.length).toBeLessThanOrEqual(2000);
  expect(href).toContain("%C3%A9"); // encoded subject/body remains URI-safe when Unicode is present in input
  await expect(page.getByRole("button", { name: "Send for editor review", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Thanks. Your update is pending editor review.", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Full details to copy or select")).toHaveValue(/A local café open house/);
  await page.getByRole("button", { name: "Select full details", exact: true }).click();
  await expect(page.getByLabel("Full details to copy or select")).toBeFocused();
  expect(posts).toEqual([]);
  await expectNoHorizontalOverflow(page);
});

test("enabled private intake keeps its database review action and does not show email replacement", async ({ page }) => {
  const posts = await mockIntake(page, true);
  await page.goto("/share-update");
  await fillDraft(page);
  await page.getByRole("button", { name: "Review my update", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open email draft", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send for editor review", exact: true })).toBeEnabled();
  expect(posts).toEqual([]);
});

test("notice correction email uses only the canonical public notice and original source context", async ({ page }) => {
  await page.goto("/notice/street-lighting-installation-on-powerline-road");
  const correction = page.getByRole("region", { name: "Suggest a correction", exact: true });
  await expect(correction).toBeVisible();
  const href = await correction.getByRole("link", { name: "Open correction email", exact: true }).getAttribute("href");
  expect(href).toMatch(/^mailto:editor%40example\.org\?/);
  expect(href).toContain("parispulse.ca%2Fnotice%2Fstreet-lighting-installation-on-powerline-road");
  expect(href).not.toContain("Private%20test%20address");
  expect(href).not.toContain("radius");
  await expect(correction.getByLabel("Full details to copy or select")).toHaveValue(/Notice title:/);
  await expect(correction.getByLabel("Full details to copy or select")).toHaveValue(/Original source:/);
});
