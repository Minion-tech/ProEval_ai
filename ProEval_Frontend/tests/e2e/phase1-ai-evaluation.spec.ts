/**
 * E2E Test: Phase 1 AI Evaluation
 *
 * Flow:
 *   1. Student logs in
 *   2. Navigate to the Phase 1 submission form  (/student/submit/phase1)
 *   3. Fill in all required proposal fields
 *   4. Submit the form  → backend triggers AI evaluation
 *   5. Assert redirect to /student/feedback
 *   6. Assert Phase 1 feedback section is visible
 *
 * Prerequisites:
 *   • Backend running on http://localhost:8000
 *   • A student account exists with the credentials below
 *   • The student's project has NOT yet submitted Phase 1
 *     (or the backend allows re-submission in dev mode)
 *
 * To run:
 *   npx playwright test phase1-ai-evaluation --headed
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Credentials ─────────────────────────────────────────────────────────────
// Change these to a real student account in your database
const STUDENT_EMAIL ="nabeelakhan74409@gmail.com";
const STUDENT_PASSWORD ="Nabskhan";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAsStudent(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(STUDENT_EMAIL);
  await page.getByLabel("Password").fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: /login/i }).click();

  // Wait for successful student redirect and surface auth/network errors clearly.
  try {
    await page.waitForURL(/\/student\/dashboard/, { timeout: 30_000 });
  } catch {
    const currentUrl = page.url();
    const possibleError = await page
      .locator("div")
      .filter({ hasText: /incorrect|login failed|unable to connect|failed to fetch/i })
      .first()
      .textContent();

    throw new Error(
      `Student login did not redirect to /student/dashboard. Current URL: ${currentUrl}. ` +
        `Possible UI error: ${possibleError?.trim() || "none detected"}. ` +
        "Check backend API is running on http://localhost:8000 and credentials are valid."
    );
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Phase 1 AI Evaluation", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test("student dashboard loads with Phase status card", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page.getByText("Phase Status")).toBeVisible();
    await expect(page.getByText("Phase 1")).toBeVisible();
  });

  test("navigate to Phase 1 submission form", async ({ page }) => {
    // Go via the hub
    await page.goto("/student/submit/hub");

    // Click the first available start button (Phase 1 is the only unlocked card)
    await page.getByRole("button", { name: /start submission/i }).first().click();

    await page.waitForURL("**/submit/phase1");
    await expect(
      page.getByRole("heading", { name: /phase 1.*project proposal/i })
    ).toBeVisible();
  });

  test("fills and submits Phase 1 proposal → redirects to feedback", async ({
    page,
  }) => {
    await page.goto("/student/submit/phase1");

    // ── Project Essentials ──────────────────────────────────────────────────
    await page.getByLabel("Project Title").fill(
      "AI-Powered Smart Campus Navigation System"
    );
    await page.getByLabel("Domain").fill("Artificial Intelligence");

    // ── Objective / Abstract ────────────────────────────────────────────────
    const objectiveField = page
      .getByLabel(/objective|abstract/i)
      .first();
    await objectiveField.fill(
      "This project aims to develop an AI-powered navigation assistant for large " +
        "university campuses. It will use computer vision and NLP to help students " +
        "and visitors locate classrooms, labs, and facilities in real time."
    );

    // ── Methodology ─────────────────────────────────────────────────────────
    await page.getByLabel(/methodology/i).fill(
      "We will follow an Agile development approach. The system will consist of a " +
        "mobile app front-end, a FastAPI backend, and a fine-tuned YOLOv8 model for " +
        "indoor positioning. Integration testing will be done after each sprint."
    );

    // ── Tech Stack ──────────────────────────────────────────────────────────
    await page.getByLabel(/tech stack/i).fill(
      "Python\nFastAPI\nReact Native\nPostgreSQL\nYOLOv8\nOpenCV"
    );

    // Required in current form schema
    await page.setInputFiles("#useCaseDiagram", {
      name: "use-case-diagram.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=", "base64"),
    });

    // ── Submit ───────────────────────────────────────────────────────────────
    const submitBtn = page.getByRole("button", { name: /submit proposal/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    await page.waitForURL("**/student/feedback", { timeout: 120_000 });
    await expect(page.getByRole("heading", { name: /mentorship feedback/i })).toBeVisible();
  });

  test("feedback page shows Phase 1 AI result or pending state and send action", async ({
    page,
  }) => {
    // Evaluation visibility depends on guide approval timing, so accept both states.
    await page.goto("/student/feedback");

    // The feedback page shows tabs; click Phase 1 tab
    const phase1Tab = page.getByRole("tab", { name: /phase 1/i });
    await phase1Tab.waitFor({ state: "visible", timeout: 15_000 });
    await phase1Tab.click();

    const scoreOutOfTen = page.getByText(/\d+(\.\d+)?\s*\/\s*10/).first();
    const pendingState = page.getByText(/No evaluation data available yet|AI evaluation will trigger/i).first();

    await expect(scoreOutOfTen.or(pendingState)).toBeVisible({ timeout: 30_000 });
  });

  test("form validation: empty required fields prevent submission", async ({
    page,
  }) => {
    await page.goto("/student/submit/phase1");

    // Click submit without filling anything
    await page.getByRole("button", { name: /submit proposal/i }).click();

    // HTML5 required validation fires — page must stay on phase1
    await expect(page).toHaveURL(/\/submit\/phase1/);

    // No redirect to feedback
    await expect(page).not.toHaveURL(/\/student\/feedback/);
  });
});
