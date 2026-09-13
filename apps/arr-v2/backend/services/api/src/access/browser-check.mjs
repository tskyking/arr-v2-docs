// Full browser workflow against local or deployed app; only fictional test data.
// TSCHUTES_CREDENTIAL_FILE points to a private {reviewer, manager} JSON file.
import { chromium, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
const base =
  process.env.TSCHUTES_BASE || "http://127.0.0.1:19328/api/access-demo/";
if (!process.env.TSCHUTES_CREDENTIAL_FILE)
  throw new Error("Provide TSCHUTES_CREDENTIAL_FILE outside the repository.");
const credentials = JSON.parse(
  readFileSync(process.env.TSCHUTES_CREDENTIAL_FILE, "utf8"),
);
const out = process.env.TSCHUTES_EVIDENCE || "data/access-evidence";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const errors = [];
const requester = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await requester.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const stamp = Date.now();
const name = "Demo inspection " + stamp;
const start = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
try {
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "First, a little about you." }),
  ).toBeVisible();
  await page.screenshot({
    path: join(out, "mobile-intake.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Full name").fill(name);
  await page
    .getByLabel("Email address", { exact: false })
    .fill("demo.requester@example.com");
  await page.getByLabel("Department").selectOption("Facilities");
  await page.getByLabel("Manager or on-site sponsor").fill("Demo Supervisor");
  await page.getByLabel("Sponsor email").fill("demo.supervisor@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Facility ·")
    .selectOption("High Desert Operations Yard");
  await page.getByLabel("Specific doors").fill("Workshop entrance");
  await page.getByLabel("Access start date").fill(start);
  await page.getByLabel("Access end date").fill(end);
  await page.getByLabel("Access hours").selectOption("After hours");
  await page
    .getByLabel("Business reason")
    .fill("Fictional evening inspection to demonstrate manager routing.");
  await page.getByLabel("Exceptions or").fill("Demo inspection after 6 pm.");
  await page.getByRole("button", { name: "Continue" }).click();
  const fixture = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#247367" },
  })
    .png()
    .toBuffer();
  await page
    .locator("#upload")
    .setInputFiles({
      name: "sample-badge.png",
      mimeType: "image/png",
      buffer: fixture,
    });
  await expect(
    page.getByAltText("Your selected demo attachment"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Everything look right?" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re in the queue." }),
  ).toBeVisible();
  const receiptURL = page.url();
  const reference = await page.locator(".receipt").textContent();
  await page.screenshot({
    path: join(out, "mobile-receipt.png"),
    fullPage: true,
  });
  const publicList = await page.request.get(base + "requests");
  expect(publicList.status()).toBe(401);
  console.log(
    "PASS mobile intake, image upload, receipt, anonymous queue protection:",
    reference,
  );

  const staffContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const staff = await staffContext.newPage();
  await staff.clock.install();
  staff.on("pageerror", (e) => errors.push(e.message));
  async function signIn(role) {
    await staff.goto(base + "#staff");
    await staff.getByLabel("Staff role").selectOption(role);
    await staff.getByLabel("Password", { exact: true }).fill(credentials[role]);
    await staff.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      staff.getByRole("button", { name: "Refresh queue" }),
    ).toBeVisible();
  }
  await signIn("reviewer");
  await staff.getByRole("button").filter({ hasText: name }).click();
  await expect(
    staff.getByRole("button", { name: "Approve request" }),
  ).toHaveCount(0);
  await expect(staff.getByAltText("Submitted demo badge")).toBeVisible();
  await staff.getByRole("button", { name: "Close request" }).click();
  await staff.getByRole("button", { name: "Sign out", exact: true }).click();
  await signIn("manager");
  await staff.getByRole("button").filter({ hasText: name }).click();
  await staff
    .getByLabel("Decision / verification notes")
    .fill("Demo sponsor and limited after-hours scope verified.");
  await staff.locator("#verified").check();
  await staff.getByRole("button", { name: "Approve request" }).click();
  await expect(staff.locator("#detail .status")).toHaveText(
    "Approved · not provisioned",
  );
  await staff.screenshot({
    path: join(out, "manager-decision.png"),
    fullPage: true,
  });
  await staff.getByRole("button", { name: "Close request" }).click();
  await staff.getByRole("button", { name: "Sign out", exact: true }).click();
  await signIn("reviewer");
  await staff.getByRole("button").filter({ hasText: name }).click();
  await staff
    .getByLabel("Decision / verification notes")
    .fill("DEMO-BADGE-001 provisioned and verified in the demonstration only.");
  await staff.locator("#verified").check();
  await staff.getByRole("button", { name: "Record provisioning" }).click();
  await expect(staff.locator("#detail .status")).toHaveText(
    "Provisioned · demo",
  );
  await staff.getByRole("button", { name: "Close request" }).click();
  await staff.screenshot({
    path: join(out, "staff-queue.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.locator(".status")).toHaveText("Provisioned · demo");
  console.log(
    "PASS cross-device manager approval, reviewer provisioning, private attachment, and updated receipt.",
  );

  await staff.goto(base + "#request");
  await staff.getByRole("button", { name: "Open shared-iPad mode" }).click();
  await expect(
    staff.getByText("Shared-iPad mode", { exact: true }),
  ).toBeVisible();
  expect(
    (await (await staff.request.get(base + "session")).json()).role,
  ).toBeNull();
  await staff.getByLabel("Full name").fill("Should clear on timeout");
  await staff.clock.fastForward(190000);
  await expect(staff.getByLabel("Full name")).toHaveValue("");
  await staff.getByRole("button", { name: "Exit kiosk" }).click();
  await staff.goto(base + "#staff");
  await expect(staff.getByLabel("Password", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  console.log("PASS kiosk sign-out, inactivity reset, zero browser errors.");
} finally {
  await browser.close();
}
