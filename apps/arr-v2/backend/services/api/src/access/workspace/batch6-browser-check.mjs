import { chromium, expect } from "@playwright/test";
const b = await chromium.launch({ channel: "chrome", headless: true }),
  p = await b.newPage({ viewport: { width: 1280, height: 960 } }),
  base = "http://127.0.0.1:19331/api/access-demo/";
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const api = (p, route, input = {}) =>
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
const settled = async (page) => {
  await page.waitForFunction(() => !busy);
  await page.waitForFunction(
    () => !document.getAnimations().some((a) => a.playState === "running"),
  );
  await page.waitForTimeout(30);
};
const login = async (page, name, pw) => {
  await page.goto(base + "#staff");
  await page.locator("[name=username]").fill(name);
  await page.locator("[name=password]").fill(pw);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#tickets")).toBeVisible();
};
try {
  await login(p, "owner", "ticket-browser-local-only");
  const forms = (await api(p, "catalog")).forms,
    ids = {};
  for (const form of ["prr", "arr"]) {
    ids[form] = [];
    const f = forms.find((x) => x.id === form);
    for (let n = 0; n < 2; n++) {
      const data = {
        name: `Batch6 ${form} ${n}`,
        email: `batch6${n}@example.com`,
        department: "Facilities",
        phone: "",
        lot: "Lot A",
        category: "General",
        escort: false,
        security: false,
        largeVehicle: false,
        plate: "FAKE",
        startDate: "2030-10-01",
        endDate: "2030-10-02",
        reason: "Fictional test",
        consent: true,
        affiliation: "Employee",
        sponsor: "Demo Sponsor",
        sponsorEmail: "sponsor@example.com",
        facility: f.definition.fields.find((x) => x.key === "facility")
          ?.options[0],
        areas: "Demo room",
        accessTypes: ["Building / badge"],
        schedule: "Business hours",
        urgency: "Standard",
      };
      const token = await p.evaluate(() =>
        (
          crypto.randomUUID().replaceAll("-", "") +
          crypto.randomUUID().replaceAll("-", "")
        ).slice(0, 43),
      );
      await api(p, "draft", { token, form, version: f.version, data });
      await api(p, "submit", { token, data });
    }
  }
  const d = await api(p, "dashboard");
  for (const form of ["prr", "arr"])
    ids[form] = d.requests
      .filter((x) => x.form === form && x.data.name.startsWith("Batch6"))
      .map((x) => x.id);
  await p.getByRole("button", { name: "Refresh", exact: true }).click();
  await settled(p);
  await p.locator("#form-switch").selectOption("prr");
  await p.locator("#status-filter").selectOption("pending");
  await settled(p);
  await expect(p.locator("#status-filter")).toHaveValue("pending");
  const headers = p.locator(".queue-item");
  const first = p.locator(`[data-request-id="${ids.prr[0]}"]`),
    second = p.locator(`[data-request-id="${ids.prr[1]}"]`);
  const headerText = await first.innerText();
  expect(headerText.startsWith("Batch6")).toBe(true);
  expect(headerText.indexOf("0.")).toBeLessThan(headerText.indexOf("attempt"));
  const submission = await first.locator(".queue-submitted").innerText();
  await first.click();
  await p.waitForTimeout(200);
  expect(
    await p
      .locator(".queue-details")
      .evaluate((e) => e.getAnimations()[0]?.effect.getTiming().duration),
  ).toBe(1000);
  await settled(p);
  await expect(headers).toHaveCount(2);
  await expect(
    first.locator("xpath=..").locator("+ .queue-details"),
  ).toHaveCount(1);
  await p.locator("#request-actions textarea").fill("Unsaved note");
  p.once("dialog", (x) => x.dismiss());
  await second.click();
  await expect(
    first.locator("xpath=..").locator("+ .queue-details"),
  ).toHaveCount(1);
  await expect(p.locator("#request-actions textarea")).toHaveValue(
    "Unsaved note",
  );
  p.once("dialog", (x) => x.accept());
  await second.click();
  await p.waitForTimeout(300);
  await expect(
    first.locator("xpath=..").locator("+ .queue-details"),
  ).toHaveCount(1);
  await p.waitForTimeout(800);
  await expect(
    second.locator("xpath=..").locator("+ .queue-details"),
  ).toHaveCount(1);
  await settled(p);
  await p.getByRole("button", { name: "← Queue", exact: true }).click();
  await settled(p);
  await expect(p.locator(".queue-details")).toHaveCount(0);
  await expect(p.locator("#status-filter")).toHaveValue("pending");
  await first.click();
  await settled(p);
  await p
    .locator("#tabs")
    .getByRole("button", { name: "Queue", exact: true })
    .click();
  await settled(p);
  await expect(p.locator(".queue-details")).toHaveCount(0);
  // Actual staff identities exercise both form queues and admin unsaved answer protection.
  let shareUser;
  for (const role of ["admin", "reviewer", "manager"]) {
    const username = "batch6" + role + Date.now(),
      pw = "Batch6-browser-password";
    await api(p, "user-save", {
      username,
      email: username + "@example.com",
      role,
      forms: ["arr", "prr"],
      active: true,
    });
    const u = (await api(p, "dashboard")).users.find(
      (x) => x.username === username,
    );
    const link = await api(p, "setup-link", { id: u.id });
    const staff = await b.newPage();
    staff.on("pageerror", (e) => errors.push(e.message));
    await staff.goto(base);
    await api(staff, "activate", {
      token: link.link.split("#activate=")[1],
      password: pw,
    });
    await login(staff, username, pw);
    for (const form of ["arr", "prr"]) {
      await staff.locator("#form-switch").selectOption(form);
      await staff.locator(`[data-request-id="${ids[form][0]}"]`).click();
      await settled(staff);
      await expect(staff.locator(".queue-item")).toHaveCount(2);
      await expect(staff.locator(".queue-details")).toHaveCount(1);
      if (role === "admin") {
        const originalDate = await staff
          .locator(`[data-request-id="${ids[form][0]}"] .queue-submitted`)
          .innerText();
        await staff
          .locator("#request-actions > textarea")
          .fill("Saved comment");
        await staff
          .locator("#request-actions")
          .getByRole("button", { name: "Add comment", exact: true })
          .click();
        await expect(staff.locator("#history")).toContainText("Saved comment");
        await expect(
          staff.locator(`[data-request-id="${ids[form][0]}"] .queue-submitted`),
        ).toHaveText(originalDate);

        await staff
          .getByRole("button", {
            name: "Edit answers with audit history",
            exact: true,
          })
          .click();
        await staff
          .locator("#request-actions form [name=name]")
          .fill("Unsaved edit");
        staff.once("dialog", (x) => x.dismiss());
        await staff
          .locator("#tabs")
          .getByRole("button", { name: "Queue", exact: true })
          .click();
        await expect(
          staff.locator("#request-actions form [name=name]"),
        ).toHaveValue("Unsaved edit");
        staff.once("dialog", (x) => x.accept());
      }
      await staff
        .locator("#tabs")
        .getByRole("button", { name: "Queue", exact: true })
        .click();
      await settled(staff);
      await expect(staff.locator(".queue-details")).toHaveCount(0);
    }
    if (role === "reviewer") {
      await api(staff, "ticket-share-request", {
        note: "Batch6 sharing request",
      });
      shareUser = u;
    }
    await staff.close();
  }
  await p.getByRole("button", { name: "Refresh", exact: true }).click();
  await settled(p);
  await expect(p.locator(".ticket-share-request")).toContainText(
    "Batch6 sharing request",
  );
  const share = p.getByRole("button", {
    name: "Share selected with " + shareUser.username,
    exact: true,
  });
  await expect(share).toHaveCSS("margin-left", "12px");
  await share.click();
  await p.waitForTimeout(200);
  expect(
    await p
      .locator("#ticket-share-panel")
      .evaluate((e) => e.getAnimations()[0]?.effect.getTiming().duration),
  ).toBe(1000);
  await settled(p);
  expect(
    await p
      .locator("#ticket-share-panel")
      .evaluate(
        (e) =>
          e.previousElementSibling.classList.contains("ticket-share-request") &&
          !!(
            e.compareDocumentPosition(document.querySelector("#ticket-table")) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  ).toBe(true);
  await expect(p.getByLabel("Recipient", { exact: true })).toHaveValue(
    shareUser.id,
  );
  await p.getByRole("button", { name: "Cancel sharing", exact: true }).click();
  await p.emulateMedia({ reducedMotion: "reduce" });
  await first.click();
  await expect(p.locator(".queue-details")).toHaveCount(1);
  expect(
    await p.locator(".queue-details").evaluate((e) => e.getAnimations().length),
  ).toBe(0);
  await p.setViewportSize({ width: 390, height: 844 });
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "PASS: inline ARR/PRR all roles, sequential 1s animation, dirty comment/edit cancel/discard, saved comment, immutable submission display, filters, sharing position/animation/spacing, reduced motion and mobile.",
  );
} finally {
  await b.close();
}
