import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, seedResident } from "./resident-fixtures";

const endpoint = "**/api/community-submissions";
const publicDetails =
  "This contains public details only, with no private home information, personal accusations or unnecessary personal data.";
const draft = {
  title: "A local community open house",
  body: "A public open house is planned in downtown Paris. Please check the organizer announcement for confirmed dates and details.",
  category: "event",
  area: "downtown",
  source_url: "https://www.brant.ca/news/",
  public_details_only: true,
  website: "",
};
const receipt = "Thanks. Your update is pending editor review.";

async function fillDraft(page: Page) {
  await page
    .getByRole("textbox", { name: "Update title", exact: true })
    .fill(draft.title);
  await page
    .getByRole("textbox", { name: "What should neighbours know?", exact: true })
    .fill(draft.body);
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption(draft.category);
  await page
    .getByRole("combobox", { name: "Area", exact: true })
    .selectOption(draft.area);
  await page
    .getByRole("textbox", { name: "Original source URL", exact: true })
    .fill(draft.source_url);
  await page
    .getByRole("checkbox", { name: publicDetails, exact: true })
    .check();
}

async function mockIntake(
  page: Page,
  accepting: boolean,
  responses: Array<{ status: number; body: object }> = [],
) {
  const posts: unknown[] = [];
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { accepting } });
      return;
    }
    posts.push(route.request().postDataJSON());
    const response = responses.shift() ?? {
      status: 202,
      body: { status: "pending" },
    };
    await route.fulfill({ status: response.status, json: response.body });
  });
  return posts;
}

test("unavailable intake still offers a truthful preview but cannot send", async ({
  page,
}, testInfo) => {
  const posts = await mockIntake(page, false);
  await page.goto("/share-update");
  await expect(page.getByRole("status")).toContainText(
    "Private submissions are not available in this environment yet",
  );
  await fillDraft(page);
  await page
    .getByRole("button", { name: "Review my update", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: draft.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("YOUR PREVIEW · NOT PUBLISHED", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send for editor review", exact: true }),
  ).toBeDisabled();
  expect(posts).toEqual([]);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("neighbourhood-share-unavailable.png"),
    fullPage: true,
  });
});

test("Share review can be edited and sends only public draft fields once for pending review", async ({
  page,
}, testInfo) => {
  await seedResident(page, { place: true });
  const posts: unknown[] = [];
  let release!: () => void;
  const finishRequest = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { accepting: true } });
      return;
    }
    posts.push(route.request().postDataJSON());
    await finishRequest;
    await route.fulfill({
      status: 202,
      json: {
        status: "pending",
        message:
          "Received for editorial review. Nothing has been published or sent as an alert.",
      },
    });
  });
  await page.goto("/share-update");
  await fillDraft(page);
  await page
    .getByRole("button", { name: "Review my update", exact: true })
    .click();
  expect(posts).toEqual([]);
  await expect(
    page.getByRole("link", { name: "Check original source", exact: true }),
  ).toHaveAttribute("href", draft.source_url);
  await page.getByRole("button", { name: "Back to edit", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Update title", exact: true }),
  ).toHaveValue(draft.title);
  await expect(
    page.getByRole("textbox", {
      name: "What should neighbours know?",
      exact: true,
    }),
  ).toHaveValue(draft.body);
  await expect(
    page.getByRole("checkbox", { name: publicDetails, exact: true }),
  ).toBeChecked();
  const editedTitle = `${draft.title} for neighbours`;
  await page
    .getByRole("textbox", { name: "Update title", exact: true })
    .fill(editedTitle);
  await page
    .getByRole("button", { name: "Review my update", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("neighbourhood-share-review.png"),
    fullPage: true,
  });

  // Keep the response in flight while an accidental double click is delivered.
  await page
    .getByRole("button", { name: "Send for editor review", exact: true })
    .dblclick();
  await expect(
    page.getByRole("button", { name: "Sending…", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts).toEqual([{ ...draft, title: editedTitle }]);
  expect(JSON.stringify(posts)).not.toContain("Private test address");
  release();
  await expect(
    page.getByRole("heading", { name: receipt, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "It has not been published or sent as an alert",
  );
  await expect(
    page.getByRole("button", { name: "Send for editor review", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("neighbourhood-share-pending.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Back to Today", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(
    page.getByRole("link", { name: editedTitle, exact: true }),
  ).toHaveCount(0);
  expect(posts).toHaveLength(1);
});

test("a failed submission preserves the draft and a deliberate retry can succeed", async ({
  page,
}) => {
  const posts = await mockIntake(page, true, [
    {
      status: 503,
      body: { error: "We could not save your update. Please try again later." },
    },
    { status: 202, body: { status: "pending" } },
  ]);
  await page.goto("/share-update");
  await fillDraft(page);
  await page
    .getByRole("button", { name: "Review my update", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send for editor review", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "We could not save your update",
  );
  await expect(
    page.getByRole("heading", { name: receipt, exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Back to edit", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Update title", exact: true }),
  ).toHaveValue(draft.title);
  await expect(
    page.getByRole("textbox", { name: "Original source URL", exact: true }),
  ).toHaveValue(draft.source_url);
  await page
    .getByRole("button", { name: "Review my update", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send for editor review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: receipt, exact: true }),
  ).toBeVisible();
  expect(posts).toEqual([draft, draft]);
});

test("a successful HTTP response without pending status never claims receipt", async ({
  page,
}) => {
  const posts = await mockIntake(page, true, [
    { status: 200, body: { status: "published" } },
  ]);
  await page.goto("/share-update");
  await fillDraft(page);
  await page
    .getByRole("button", { name: "Review my update", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send for editor review", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "We could not confirm receipt",
  );
  await expect(
    page.getByRole("heading", { name: receipt, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: draft.title, exact: true }),
  ).toBeVisible();
  expect(posts).toEqual([draft]);
});

test("private access links and emergency submissions cannot enter the preview", async ({
  page,
}) => {
  const posts = await mockIntake(page, true);
  await page.goto("/share-update");
  await fillDraft(page);
  await expect(
    page
      .getByRole("combobox", { name: "Category", exact: true })
      .locator('option[value="emergency"]'),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Original source URL", exact: true })
    .fill("https://www.brant.ca/news/?token=private-test-only");
  await page
    .getByRole("button", { name: "Review my update", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Use a public source page",
  );
  await expect(
    page.getByRole("button", { name: "Send for editor review", exact: true }),
  ).toHaveCount(0);
  expect(posts).toEqual([]);
});

test("the private editorial queue is inaccessible to an anonymous resident", async ({
  page,
  request,
}) => {
  await page.goto("/admin/submissions");
  await expect(
    page.getByRole("heading", { name: "Editor access required", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".submission-review-item")).toHaveCount(0);
  const response = await request.get("/api/admin/submissions?status=pending");
  expect(response.status()).toBe(401);
  expect(await response.json()).not.toHaveProperty("submissions");
});
