// Isolated browser verification: manipulates only this in-memory test database's time.
import { createServer } from "node:http";
import { scryptSync } from "node:crypto";
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { chromium, expect } from "@playwright/test";
import type { Pool } from "pg";
import { AccessStore } from "./store.js";
import { createAccessHandler } from "./handler.js";
const db = new PGlite();
const query = async (sql: string, values?: unknown[]) => {
  if (sql.includes("CREATE TABLE") && !values) {
    await db.exec(sql);
    return { rows: [] };
  }
  return db.query(sql, values);
};
const store = new AccessStore({
  query,
  connect: async () => ({ query, release() {} }),
} as unknown as Pool);
await store.init();
const auth = Object.fromEntries(
  ["reviewer", "manager"].map((role) => [
    role,
    {
      salt: "local-test",
      hash: scryptSync("local-only", "local-test", 64).toString("hex"),
    },
  ]),
) as Record<"reviewer" | "manager", { salt: string; hash: string }>;
const handle = createAccessHandler(store, true, auth);
const server = createServer(async (req, res) => {
  const rawPath = new URL(req.url || "/", "http://local").pathname.slice(4);
  const path = rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
  if (!(await handle(req, res, path))) {
    res.writeHead(404);
    res.end();
  }
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/access-demo/`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const out = process.env.TSCHUTES_EVIDENCE || "data/partial-browser-evidence";
mkdirSync(out, { recursive: true });
const errors: string[] = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto(base);
  async function fillFirst(name: string) {
    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Email address").fill("fictional@example.com");
    await page.getByLabel("Department").selectOption("Information Technology");
    await page.getByLabel("Manager or on-site sponsor").fill("Demo Sponsor");
    await page.getByLabel("Sponsor email").fill("sponsor@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Where do you need access?" }),
    ).toBeVisible();
  }
  // Failed save stays on page one and preserves inputs; a retry can proceed.
  await page.getByLabel("Full name").fill("Unfinished page one");
  expect((await store.list()).length).toBe(0);
  let rejectOnce = true;
  await page.route("**/drafts", async (route) => {
    if (rejectOnce) {
      rejectOnce = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test temporary outage" }),
      });
    } else await route.continue();
  });
  await page.getByLabel("Email address").fill("fictional@example.com");
  await page.getByLabel("Department").selectOption("Information Technology");
  await page.getByLabel("Manager or on-site sponsor").fill("Demo Sponsor");
  await page.getByLabel("Sponsor email").fill("sponsor@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Test temporary outage")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Unfinished page one");
  await fillFirst("Demo timed-out partial");
  expect((await store.list()).length).toBe(0);
  await page
    .getByLabel("Business reason")
    .fill("Must not be in the saved partial");
  await page.getByRole("button", { name: "Smartsheet-style view" }).click();
  await db.query(
    "UPDATE tschutes_arr_drafts SET expires_at=clock_timestamp()-interval '1 second'",
  );
  await page.clock.fastForward(20 * 60 * 1000 + 15000);
  await expect(
    page.getByRole("heading", { name: "First, a little about you." }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your form timed out" }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("");
  await expect(page.locator(".receipt")).toHaveCount(0);
  await page.screenshot({ path: out + "/timeout-mobile.png", fullPage: true });
  let partials = await store.list();
  expect(partials.length).toBe(1);
  expect(partials[0].status).toBe("partial");
  expect(partials[0].data.reason).toBeUndefined();

  // A fresh session is required; abandoning it still yields a partial with browser gone.
  await fillFirst("Demo closed-browser partial");
  await context.close();
  await db.query(
    "UPDATE tschutes_arr_drafts SET expires_at=clock_timestamp()-interval '1 second'",
  );
  partials = await store.list();
  expect(partials.length).toBe(2);
  const staff = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
  });
  staff.on("pageerror", (e) => errors.push(e.message));
  await staff.goto(base + "#staff");
  await staff.getByLabel("Staff role").selectOption("reviewer");
  await staff.getByLabel("Password", { exact: true }).fill("local-only");
  await staff.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(staff.locator(".queue-row")).toHaveCount(2);
  await staff.getByLabel("Filter by status").selectOption("partial");
  await staff
    .locator(".queue-row")
    .filter({ hasText: "Demo timed-out partial" })
    .click();
  await expect(
    staff.getByText("Incomplete · no access decision"),
  ).toBeVisible();
  await expect(staff.locator("[data-action]")).toHaveCount(0);
  await expect(staff.getByText("Must not be in the saved partial")).toHaveCount(
    0,
  );
  await staff.screenshot({ path: out + "/partial-staff.png", fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    "PASS failed-save retry, 20-minute timeout/reset, no receipt, closed-browser capture, first-page-only storage, partial queue/filter/read-only detail, zero browser errors.",
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.close();
}
