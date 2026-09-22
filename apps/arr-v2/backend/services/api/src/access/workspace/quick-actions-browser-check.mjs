import { chromium, expect } from "@playwright/test";
const b = await chromium.launch({ channel: "chrome", headless: true }),
  p = await b.newPage({ viewport: { width: 1300, height: 1000 } }),
  base = "http://127.0.0.1:19331/api/access-demo/";
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
  await p.goto(base + "#staff");
  await p.locator("[name=username]").fill("owner");
  await p.locator("[name=password]").fill("ticket-browser-local-only");
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(p.locator("#tickets")).toBeVisible();
  await expect(
    p.locator("#tabs").getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await expect(
    p
      .locator("#identity-band")
      .getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(p.locator("#panel [name=current]")).toBeFocused();
  await p.getByRole("button", { name: "Queue", exact: true }).click();
  const make = (title) =>
    api("ticket-create", { title, wording: "Demo scope", forms: ["arr"] });
  const a = await make("Quick A"),
    c = await make("Quick B");
  await api("ticket-edit", {
    id: a.id,
    revision: a.revision,
    title: "Quick A",
    wording: "Changed",
  });
  await p.getByRole("button", { name: "Refresh tickets", exact: true }).click();
  const row = (id) =>
    p.locator(`tr[data-ticket-id="${id}"]:not(.ticket-detail-row)`);
  await expect(row(a.id)).toContainText("Owner review required");
  await row(a.id).getByRole("button", { name: "Approve", exact: true }).click();
  await expect(row(a.id)).not.toContainText("Owner review required");
  await expect(row(a.id)).toContainText("approved");
  await p.getByRole("button", { name: "Quick A", exact: true }).click();
  await expect(p.locator("#ticket-inline-detail")).toHaveCSS(
    "background-color",
    "rgb(234, 244, 255)",
  );
  await expect(p.locator(".ticket-detail-row")).toHaveCount(1);
  await expect(row(a.id).locator("+ tr")).toHaveClass("ticket-detail-row");
  await p.getByRole("button", { name: "Quick B", exact: true }).click();
  await expect(row(c.id).locator("+ tr")).toHaveClass("ticket-detail-row");
  await p.getByRole("button", { name: "Collapse", exact: true }).click();
  await expect(p.locator(".ticket-detail-row")).toHaveCount(0);
  await row(a.id).getByRole("checkbox").check();
  await row(c.id).getByRole("checkbox").check();
  p.once("dialog", async (d) => {
    if (!d.message().includes("2 selected"))
      throw Error("Wrong selection count");
    await d.accept();
  });
  await p.getByRole("button", { name: "Reject Selected", exact: true }).click();
  await expect(row(a.id)).toHaveCount(0);
  await expect(row(c.id)).toHaveCount(0);
  await p.getByLabel("Hide Rejected", { exact: true }).uncheck();
  await expect(row(a.id)).toContainText("rejected");
  await row(a.id).getByRole("button", { name: "Approve", exact: true }).click();
  await api("ticket-batch", { ids: [a.id] });
  await p.getByRole("button", { name: "Refresh tickets", exact: true }).click();
  await expect(
    row(a.id).getByRole("button", { name: "Reject", exact: true }),
  ).toBeDisabled();
  await expect(
    row(a.id).getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
  await row(a.id).getByRole("checkbox").check();
  await expect(
    p.getByRole("button", { name: "Reject Selected", exact: true }),
  ).toBeDisabled();
  await row(a.id)
    .getByRole("button", { name: "Implemented", exact: true })
    .click();
  await expect(row(a.id)).toHaveCount(0);
  await p.getByLabel("Hide Completed", { exact: true }).uncheck();
  await expect(row(a.id)).toContainText("completed");
  await expect(
    row(a.id).getByRole("button", { name: "Implemented", exact: true }),
  ).toHaveCount(0);
  // Personal account navigation is identical for all staff roles.
  for (const role of ["admin", "reviewer", "manager"]) {
    const username = role + "quick" + Date.now();
    await api("user-save", {
      username,
      email: username + "@example.com",
      role,
      forms: ["arr", "prr"],
      active: true,
    });
    const d = await api("dashboard"),
      u = d.users.find((u) => u.username === username),
      link = await api("setup-link", { id: u.id });
    const ctx = await b.newContext(),
      s = await ctx.newPage();
    s.on("pageerror", (e) => errors.push(e.message));
    await s.goto(base);
    await s.evaluate(
      async ({ token, username }) => {
        const call = (r, i) =>
          fetch("v2/" + r, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-ARR-Request": "1",
            },
            body: JSON.stringify(i),
          });
        await call("activate", { token, password: "quick-test-password" });
        await call("login", { username, password: "quick-test-password" });
      },
      { token: link.link.split("#activate=")[1], username },
    );
    await s.goto(base + "#staff");
    await s.reload();
    await expect(s.locator(".account-name")).toHaveText(username);
    await s.locator("#form-switch").selectOption("prr");
    await expect(s.locator(".account-name")).toHaveText(username);
    await s
      .getByRole("button", { name: "Change password", exact: true })
      .click();
    await s.locator("[name=current]").fill("quick-test-password");
    await s.locator("[name=password]").fill("changed-test-password");
    await s.getByRole("button", { name: "Save password", exact: true }).click();
    await expect(s.locator("#login")).toBeVisible();
    await expect(s.locator("#identity-band")).toBeEmpty();
    await ctx.close();
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: "/tmp/arr-quick-mobile.png", fullPage: true });
  if (
    await p.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    )
  )
    throw Error("Mobile overflow");
  await p.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(p.locator("#identity-band")).toBeEmpty();
  await p.goto(base);
  await expect(
    p.getByRole("button", { name: "Change password", exact: true }),
  ).toHaveCount(0);
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: quick decisions, filter/rejection, locked controls, review tint, header links all roles, password flow, mobile and public boundaries.",
  );
} finally {
  await b.close();
}
