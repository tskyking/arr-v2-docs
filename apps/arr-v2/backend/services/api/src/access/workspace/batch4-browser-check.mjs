import { chromium, expect } from "@playwright/test";
const b = await chromium.launch({ channel: "chrome", headless: true }),
  owner = await b.newPage(),
  staff = await b.newPage(),
  base = "http://127.0.0.1:19331/api/access-demo/";
const errors = [];
for (const p of [owner, staff])
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
const login = async (p, name, pw) => {
  await p.locator("#login [name=username]").fill(name);
  await p.locator("#login [name=password]").fill(pw);
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
};
try {
  await owner.goto(base + "#staff");
  await login(owner, "owner", "ticket-browser-local-only");
  await owner.getByRole("button", { name: "Accounts", exact: true }).click();
  await expect(
    owner
      .locator('tr[data-account-id="owner"]')
      .getByRole("button", { name: "Delete", exact: true }),
  ).toHaveCount(0);
  const name = "accountbrowser" + Date.now(),
    pw = "Account-browser-password-2026";
  await api(owner, "user-save", {
    username: name,
    email: name + "@example.com",
    role: "reviewer",
    forms: ["arr"],
    active: true,
  });
  const u = (await api(owner, "dashboard")).users.find(
      (u) => u.username === name,
    ),
    link = await api(owner, "setup-link", { id: u.id });
  await staff.goto(base + "#activate=" + link.link.split("#activate=")[1]);
  await staff.locator("[name=password]").fill(pw);
  await staff.locator("[name=passwordConfirm]").fill("mismatch");
  await expect(
    staff.getByRole("button", { name: "Set password", exact: true }),
  ).toBeDisabled();
  await expect(staff.locator("[name=passwordConfirm]")).toHaveCSS(
    "color",
    "rgb(180, 35, 24)",
  );
  await staff
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(staff.locator("[name=password]")).toHaveAttribute(
    "type",
    "text",
  );
  await expect(staff.locator("[name=passwordConfirm]")).toHaveAttribute(
    "type",
    "password",
  );
  await staff.locator("[name=passwordConfirm]").fill(pw);
  await expect(staff.locator("[name=passwordConfirm]")).toHaveCSS(
    "color",
    "rgb(24, 115, 61)",
  );
  await staff
    .getByRole("button", { name: "Set password", exact: true })
    .click();
  await login(staff, name, pw);
  await staff.locator("#tickets").waitFor();
  await owner.getByRole("button", { name: "Refresh", exact: true }).click();
  const row = owner.locator(`tr[data-account-id="${u.id}"]`);
  await row.getByRole("button", { name: "Suspend", exact: true }).click();
  await expect(row).toContainText("suspended");
  await expect(
    row.getByRole("button", { name: "Unsuspend/Resume", exact: true }),
  ).toHaveCSS("border-top-color", "rgb(180, 35, 24)");
  await expect(staff.locator("#login")).toBeVisible({ timeout: 6000 });
  await expect(staff.locator("#message")).toContainText("Suspended Role");
  await login(staff, name, pw);
  await expect(staff.locator("#message")).toContainText("Suspended Role");
  await row
    .getByRole("button", { name: "Unsuspend/Resume", exact: true })
    .click();
  await login(staff, name, pw);
  await expect(staff.locator("#tickets")).toBeVisible();
  await expect(staff.locator("#message")).toContainText(
    "Okay, suspension has been retracted on",
  );
  await staff
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(staff.locator(".password-eye")).toHaveCount(3);
  await staff.locator("[name=current]").fill(pw);
  await staff.locator("[name=password]").fill(pw + "X");
  await staff.locator("[name=passwordConfirm]").fill(pw + "X");
  await staff
    .getByRole("button", { name: "Save password", exact: true })
    .click();
  await expect(staff.locator("#login")).toBeVisible();
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await owner.getByRole("button", { name: "No", exact: true }).click();
  await expect(row).toHaveCount(1);
  // Password change advanced the generation: refresh the Owner list before deletion.
  await owner.getByRole("button", { name: "Refresh", exact: true }).click();
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await owner.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(row).toHaveCount(0);
  const recreated = await api(owner, "user-save", {
    username: name,
    email: name + "@example.com",
    role: "reviewer",
    forms: ["arr"],
    active: true,
  });
  if (recreated.username !== name + "-2")
    throw Error("Recreation suffix failed");
  await owner.setViewportSize({ width: 390, height: 844 });
  if (
    await owner.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Mobile overflow");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: protected Owner, eye controls, confirmation colors/gating, activation/change, cross-session suspension/resume, delete Yes/No, recreated suffix, mobile.",
  );
} finally {
  await b.close();
}
