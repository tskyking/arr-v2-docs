import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  page = await browser.newPage({ viewport: { width: 1300, height: 900 } }),
  base = "http://127.0.0.1:19331/api/access-demo/";
const errors = [],
  activity = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().endsWith("/v2/activity")) activity.push(r);
});
try {
  await page.goto(base + "#staff");
  await page.locator("[name=username]").fill("owner");
  await page.locator("[name=password]").fill("ticket-browser-local-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#tickets")).toBeVisible();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await expect(page.locator(".account-actions-heading")).toHaveCSS(
    "text-align",
    "right",
  );
  await expect(
    page.locator('tr[data-account-id="owner"] .activity-green'),
  ).toHaveText("active");
  await expect.poll(() => activity.length).toBe(1);
  await page.mouse.move(200, 200);
  await page.mouse.move(220, 210);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(2500);
  expect(activity.length).toBe(1);
  // Use the browser clock to prove dirty activity flushes at the bounded interval.
  await page.clock.install();
  await page.clock.fastForward(61000);
  await expect.poll(() => activity.length).toBe(2);
  // No fresh input: background session/account polling must not produce activity.
  await page.clock.fastForward(61000);
  expect(activity.length).toBe(2);
  const cases = [
    ["active", "green", 0],
    ["idle", "green", 2],
    ["active", "mustard", 35],
    ["inactive", "mustard", 49],
    ["not active", "red", 245],
    ["not active", "red", null],
    ["suspended", "red", null],
  ];
  await page.route("**/v2/dashboard", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.users = cases.map(([label, tone, hours], i) => ({
      id: "fixture" + i,
      username: "fixture" + i,
      role: "reviewer",
      forms: ["arr"],
      active: true,
      generation: 1,
      activityStatus: { label, tone, hours },
    }));
    await route.fulfill({ response, json: body });
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  for (let i = 0; i < cases.length; i++) {
    const [label, tone, hours] = cases[i],
      cell = page.locator(`tr[data-account-id="fixture${i}"] .account-usage`);
    await expect(cell).toHaveText(
      label + (hours === null ? "" : ` (${hours})`),
    );
    await expect(cell.locator("span").first()).toHaveCSS(
      "color",
      tone === "green"
        ? "rgb(24, 115, 61)"
        : tone === "mustard"
          ? "rgb(128, 96, 0)"
          : "rgb(180, 35, 24)",
    );
    if (hours !== null)
      await expect(cell.locator("span").nth(1)).toHaveCSS(
        "color",
        tone === "red" ? "rgb(180, 35, 24)" : "rgb(0, 0, 0)",
      );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "PASS: account usage labels/colors/hours, Actions alignment, throttled trusted input, no polling activity, mobile.",
  );
} finally {
  await browser.close();
}
