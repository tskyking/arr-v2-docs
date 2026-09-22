import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const p = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const api = (route, input = {}) =>
  p.evaluate(
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
  await p.goto("http://127.0.0.1:19331/api/access-demo/#staff");
  await p.locator("[name=username]").fill("owner");
  await p.locator("[name=password]").fill("ticket-browser-local-only");
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.locator("#tickets").waitFor();
  await p.getByRole("button", { name: "All dates", exact: true }).click();
  await expect(p.getByLabel("Last activity from", { exact: true })).toHaveValue(
    "",
  );
  await p
    .getByRole("button", { name: "Restore Date Range", exact: true })
    .click();
  if (!(await p.getByLabel("Last activity from", { exact: true }).inputValue()))
    throw Error("Range not restored");
  const make = (title) =>
    api("ticket-create", { title, wording: "Demo test", forms: ["arr"] });
  const a = await make("Animation A"),
    b = await make("Animation B");
  await api("ticket-quick-action", {
    tickets: [
      { id: a.id, revision: a.revision },
      { id: b.id, revision: b.revision },
    ],
    status: "approved",
  });
  await api("ticket-batch", { ids: [a.id, b.id] });
  await p.getByRole("button", { name: "Refresh tickets", exact: true }).click();
  const row = (id) =>
    p.locator(`tr[data-ticket-id="${id}"]:not(.ticket-detail-row)`);
  await expect(p.locator(".batch-details[open]")).toHaveCount(0);
  await expect(
    p
      .locator("#ticket-batches")
      .getByRole("button", { name: "Download Word (.docx)", exact: true }),
  ).not.toBeVisible();
  await p.locator(".batch-details summary").click();
  await expect(
    p
      .locator("#ticket-batches")
      .getByRole("button", { name: "Download Word (.docx)", exact: true }),
  ).toBeVisible();
  await p.getByRole("button", { name: a.title, exact: true }).click();
  const before = await row(b.id).evaluate(
    (e) => e.getBoundingClientRect().top + scrollY,
  );
  await row(a.id)
    .getByRole("button", { name: "Implemented ?", exact: true })
    .click();
  await p.waitForTimeout(300);
  const middle = await row(b.id).evaluate(
    (e) => e.getBoundingClientRect().top + scrollY,
  );
  if (
    !(await p.evaluate(() =>
      document
        .getAnimations()
        .some((a) => a.effect.getTiming().duration === 1000),
    ))
  )
    throw Error("Missing completion animation");
  await p.waitForTimeout(1000);
  const after = await row(b.id).evaluate(
    (e) => e.getBoundingClientRect().top + scrollY,
  );
  if (!(before > middle && middle > after))
    throw Error(JSON.stringify({ before, middle, after }));
  await expect(p.locator("#ticket-inline-detail")).toHaveCount(0);
  // Last row shrinks the page beneath it too.
  const archiveBefore = await p
    .locator("#ticket-batches")
    .evaluate((e) => e.getBoundingClientRect().top + scrollY);
  await row(b.id)
    .getByRole("button", { name: "Implemented ?", exact: true })
    .click();
  await p.waitForTimeout(1200);
  const archiveAfter = await p
    .locator("#ticket-batches")
    .evaluate((e) => e.getBoundingClientRect().top + scrollY);
  if (archiveAfter >= archiveBefore)
    throw Error("Last row did not shrink page");
  await p.getByLabel("Hide Completed", { exact: true }).uncheck();
  await expect(row(a.id)).toContainText("completed");
  const c = await make("No hide animation");
  await api("ticket-quick-action", {
    tickets: [{ id: c.id, revision: c.revision }],
    status: "approved",
  });
  await api("ticket-batch", { ids: [c.id] });
  await p.getByRole("button", { name: "Refresh tickets", exact: true }).click();
  await row(c.id)
    .getByRole("button", { name: "Implemented ?", exact: true })
    .click();
  await expect(row(c.id)).toContainText("completed");
  await p.setViewportSize({ width: 390, height: 844 });
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error("Overflow");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: date toggle, collapsed archive, expanded/last-row 1s collapse, no-hide completion, mobile.",
  );
} finally {
  await browser.close();
}
