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

async function expectNoPublicRecipient(page: Page) {
  await expect(page.locator('a[href^="mailto:"]:not([href^="mailto:?"])')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open email draft", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open correction email", exact: true })).toHaveCount(0);
  expect(await page.content()).not.toContain("editor@example.org");
  expect(await page.content()).not.toContain("editor%40example.org");
}

test("disabled intake keeps a preview without exposing a recipient or claiming receipt", async ({ page }) => {
  const posts = await mockIntake(page, false);
  await page.goto("/share-update");
  await expect(page.getByRole("status")).toContainText("Private submissions are not available");
  await fillDraft(page);
  await page.getByRole("button", { name: "Review my update", exact: true }).click();

  await expect(page.getByRole("status")).toContainText("Email contributions are currently unavailable");
  await expectNoPublicRecipient(page);
  await expect(page.getByRole("button", { name: "Send for editor review", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Thanks. Your update is pending editor review.", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: draft.title, exact: true })).toBeVisible();
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

test("notice corrections stay honestly unavailable with the legacy public email configured", async ({ page }, testInfo) => {
  await page.goto("/notice/street-lighting-installation-on-powerline-road");
  const correction = page.getByRole("region", { name: "Suggest a correction", exact: true });
  await expect(correction).toBeVisible();
  await expect(correction).toContainText("Correction requests are currently unavailable");
  await expect(correction.locator("input, textarea, button, a")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open original source", exact: true })).toBeVisible();
  await expectNoPublicRecipient(page);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("neighbourhood-correction-unavailable.png"), fullPage: true });
});

test("contact and privacy pages do not advertise an email correction or support path", async ({ page }) => {
  for (const route of ["/contact", "/privacy"]) {
    const response = await page.goto(route);
    expect(await response?.text()).not.toContain("editor@example.org");
    await expect(page.getByText(/Support requests are currently unavailable/)).toBeVisible();
    await expectNoPublicRecipient(page);
  }
});
