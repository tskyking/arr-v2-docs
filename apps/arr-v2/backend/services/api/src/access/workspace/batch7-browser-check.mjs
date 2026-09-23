import { chromium, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const ids = JSON.parse(readFileSync("/tmp/batch7-fixtures.json", "utf8")),
  b = await chromium.launch({ channel: "chrome", headless: true }),
  p = await b.newPage({ viewport: { width: 1280, height: 960 } }),
  base = "http://127.0.0.1:19331/api/access-demo/";
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const settled = async (page) => {
  await page.waitForFunction(() => !busy);
  await page.waitForFunction(
    () => !document.getAnimations().some((a) => a.playState === "running"),
  );
};
const login = async (page, role) => {
  await page.goto(base + "#staff");
  await page.locator("[name=username]").fill(role);
  await page.locator("[name=password]").fill("ticket-browser-local-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#queue-list")).toBeVisible();
  await settled(page);
};
const row = (name, page = p) => page.locator(`[data-queue-row="${ids[name]}"]`);
async function confirmClick(button, accept = true, page = p) {
  page.once("dialog", (d) => (accept ? d.accept() : d.dismiss()));
  await button.click();
  await settled(page);
}
try {
  await login(p, "owner");
  await p.locator("#form-switch").selectOption("prr");
  await expect(p.locator(".queue-row")).toHaveCount(3);
  await expect(p.locator("#queue-hide-deleted")).toBeChecked();
  expect(await p.locator("#queue-from").inputValue()).not.toBe("");
  const geometry = await p
    .locator(".queue-row")
    .evaluateAll((rows) =>
      rows.map((r) => ({
        height: r.getBoundingClientRect().height,
        x: [...r.querySelectorAll(".queue-item>span")].map(
          (c) => c.getBoundingClientRect().x,
        ),
      })),
    );
  for (const g of geometry) {
    expect(g.height).toBe(42);
    expect(g.x).toEqual(geometry[0].x);
  }
  await expect(row("partialA").locator(".queue-name")).toHaveCSS(
    "text-overflow",
    "ellipsis",
  );
  await expect(
    row("recentRequest").getByRole("button", { name: "Delete", exact: true }),
  ).toHaveCount(0);
  await row("recentRequest").locator(".queue-item").click();
  await settled(p);
  await p.locator("#request-actions > textarea").fill("Preserve this draft");
  await p
    .locator("#queue-bulk")
    .getByRole("button", { name: "Select eligible visible", exact: true })
    .click();
  await expect(p.locator("#request-actions > textarea")).toHaveValue(
    "Preserve this draft",
  );
  p.once("dialog", (d) => d.dismiss());
  await p.locator("#queue-all-dates").click();
  await expect(p.locator("#request-actions > textarea")).toHaveValue(
    "Preserve this draft",
  );
  await confirmClick(
    p.locator("#tabs").getByRole("button", { name: "Queue", exact: true }),
  );
  await confirmClick(
    p
      .locator("#queue-bulk")
      .getByRole("button", { name: "Delete selected", exact: true }),
    false,
  );
  await expect(row("partialA")).toHaveCount(1);
  await confirmClick(
    p
      .locator("#queue-bulk")
      .getByRole("button", { name: "Delete selected", exact: true }),
  );
  await expect(row("partialA")).toHaveCount(0);
  await expect(row("partialB")).toHaveCount(0);
  await p.locator("#queue-hide-deleted").uncheck();
  await settled(p);
  await expect(row("partialA").locator(".queue-status")).toHaveText("Deleted");
  await confirmClick(
    row("partialA").getByRole("button", { name: "Restore", exact: true }),
  );
  await expect(row("partialA").locator(".queue-status")).toHaveText("partial");
  await confirmClick(
    row("partialB").getByRole("button", { name: "Purge", exact: true }),
    false,
  );
  await expect(row("partialB")).toHaveCount(1);
  await confirmClick(
    row("partialB").getByRole("button", { name: "Purge", exact: true }),
  );
  await expect(row("partialB")).toHaveCount(0);
  await p.locator("#queue-all-dates").click();
  await settled(p);
  await expect(row("awaitingRequest")).toHaveCount(1);
  await expect(row("approvedWaiting")).toHaveCount(1);
  await expect(row("archivedRequest")).toHaveCount(0);
  await expect(p.locator("#queue-all-dates")).toHaveText("Restore Date Range");
  await p.locator("#queue-view").selectOption("archive");
  await settled(p);
  await expect(row("archivedRequest")).toHaveCount(1);
  await expect(row("oldPartial")).toHaveCount(1);
  await expect(row("awaitingRequest")).toHaveCount(0);
  await row("archivedRequest").locator(".queue-item").click();
  await settled(p);
  await expect(p.locator(".queue-details")).toContainText(
    "Archived (read-only)",
  );
  await expect(p.locator("#request-actions textarea")).toHaveCount(0);
  await p
    .locator("#tabs")
    .getByRole("button", { name: "Queue", exact: true })
    .click();
  await settled(p);
  await p
    .locator("#queue-bulk")
    .getByRole("button", { name: "Select eligible visible", exact: true })
    .click();
  await expect(
    p
      .locator("#queue-bulk")
      .getByRole("button", { name: "Delete selected", exact: true }),
  ).toBeDisabled();
  await confirmClick(
    p
      .locator("#queue-bulk")
      .getByRole("button", {
        name: "Permanently delete selected",
        exact: true,
      }),
    false,
  );
  await expect(p.locator(".queue-row")).toHaveCount(2);
  await confirmClick(
    p
      .locator("#queue-bulk")
      .getByRole("button", {
        name: "Permanently delete selected",
        exact: true,
      }),
  );
  await expect(p.locator(".queue-row")).toHaveCount(0);
  await p.locator("#queue-view").selectOption("main");
  await settled(p);
  await expect(row("awaitingRequest")).toHaveCount(0);
  await p.locator("#queue-from").fill("2020-01-01");
  await settled(p);
  await expect(row("awaitingRequest")).toHaveCount(1);
  const admin = await b.newPage();
  admin.on("pageerror", (e) => errors.push(e.message));
  await login(admin, "admin");
  await expect(
    row("partialA", admin).getByRole("button", { name: "Delete", exact: true }),
  ).toHaveCount(1);
  await expect(
    admin.getByRole("button", { name: "Purge", exact: true }),
  ).toHaveCount(0);
  await expect(
    admin.locator('[data-queue-row="' + ids.foreignPartial + '"]'),
  ).toHaveCount(0);
  await admin.close();
  for (const role of ["reviewer", "manager"]) {
    const s = await b.newPage();
    s.on("pageerror", (e) => errors.push(e.message));
    await login(s, role);
    await expect(s.locator(".queue-row-actions button")).toHaveCount(0);
    await expect(s.locator(".queue-pick input")).toHaveCount(0);
    await row("partialA", s).locator(".queue-item").click();
    await settled(s);
    await expect(s.locator(".queue-details")).toBeVisible();
    await s.close();
  }
  await p.setViewportSize({ width: 390, height: 844 });
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "PASS: aligned 42px rows, ellipsis, 14-day/custom/all filters, archive separation/read-only, delete/restore/purge cancel+confirm, atomic bulk UI, role/form visibility, unsaved notes, mobile.",
  );
} finally {
  await b.close();
}
