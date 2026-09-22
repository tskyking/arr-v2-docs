import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const call = (route, input = {}) =>
  page.evaluate(
    async ({ route, input }) => {
      const r = await fetch("v2/" + route, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ARR-Request": "1" },
        body: JSON.stringify(input),
      });
      const v = await r.json();
      if (!r.ok) throw Error(v.error);
      return v;
    },
    { route, input },
  );
try {
  await page.goto("http://127.0.0.1:19331/api/access-demo/#staff");
  await page.locator("[name=username]").fill("owner");
  await page.locator("[name=password]").fill("ticket-browser-local-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator("#tickets").waitFor();
  const password = await page
      .getByRole("button", { name: "Change password", exact: true })
      .boundingBox(),
    band = await page.locator("#identity-band").boundingBox();
  if (password.y < band.y + band.height) throw Error("Password not below band");
  await expect(page.locator("#account-below-band button")).toHaveCSS(
    "color",
    "rgb(21, 89, 166)",
  );
  const a = await call("ticket-create", {
    title: "Compare " + Date.now(),
    wording: "Keep old word",
    forms: ["arr"],
  });
  const b = await call("ticket-create", {
    title: "Duplicate " + Date.now(),
    wording: "Identical text",
    forms: ["arr"],
  });
  await call("ticket-edit", {
    id: a.id,
    revision: a.revision,
    title: a.title,
    wording: "Keep new word",
  });
  await page
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await page.getByRole("button", { name: b.title, exact: true }).click();
  await expect(page.locator(".ticket-compare[open]")).toHaveCount(1);
  await page.getByRole("button", { name: a.title, exact: true }).click();
  await expect(page.locator(".ticket-compare del").first()).toHaveText("old");
  await expect(page.locator(".ticket-compare mark")).not.toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save Owner review", exact: true }),
  ).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(
    page.getByRole("button", { name: "Collapse", exact: true }),
  ).toHaveCSS("color", "rgb(21, 89, 166)");
  // Clipboard API button without external clipboard permissions; actual paste event also exercised.
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "read", {
      configurable: true,
      value: async () => {
        const c = document.createElement("canvas");
        c.width = c.height = 4;
        const blob = await new Promise((r) => c.toBlob(r));
        return [{ types: ["image/png"], getType: async () => blob }];
      },
    });
  });
  await page
    .getByRole("button", { name: "Paste image from clipboard", exact: true })
    .click();
  await expect(page.locator(".ticket-thumb")).toHaveCount(1);
  await page.locator(".ticket-upload").evaluate(async (area) => {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    const blob = await new Promise((r) => c.toBlob(r));
    const d = new DataTransfer();
    d.items.add(new File([blob], "paste.png", { type: "image/png" }));
    area.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: d,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(page.locator(".ticket-thumb")).toHaveCount(2);
  await page.getByRole("button", { name: "Collapse", exact: true }).click();
  const row = (id) =>
    page.locator(`tr[data-ticket-id="${id}"]:not(.ticket-detail-row)`);
  await row(b.id).getByRole("button", { name: "↑", exact: true }).click();
  await page.waitForTimeout(200);
  if (!(await page.evaluate(() => document.getAnimations().length)))
    throw Error("No reorder animation");
  await page.waitForTimeout(1200);
  await row(a.id).getByRole("button", { name: "Approve", exact: true }).click();
  await row(b.id).getByRole("button", { name: "Approve", exact: true }).click();
  const batch = await call("ticket-batch", { ids: [a.id, b.id] });
  if (batch.number !== 3) throw Error("Expected first batch 3");
  await page
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await expect(page.locator("#ticket-batches")).toContainText(
    "Approval → implementation: 0 h",
  );
  await row(a.id)
    .getByRole("button", { name: "Implemented ?", exact: true })
    .click();
  await expect(row(a.id)).toHaveCount(0);
  await row(b.id)
    .getByRole("button", { name: "Implemented ?", exact: true })
    .click();
  await expect(page.locator("#ticket-batches")).toContainText("(final)");
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: header geometry/colors, collapsed duplicates, marked removals, clipboard button/event, animated priority, batch 3/metrics/completion and mobile.",
  );
} finally {
  await browser.close();
}
