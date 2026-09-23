/* Local-only fictional-data acceptance check; creates disposable accounts and requests. */
import { chromium } from "@playwright/test";
import fs from "node:fs";
if (!process.env.TSCHUTES_WORKSPACE_CREDENTIAL_FILE)
  throw Error(
    "Set TSCHUTES_WORKSPACE_CREDENTIAL_FILE to a private local owner JSON file.",
  );
const credentials = JSON.parse(
  fs.readFileSync(process.env.TSCHUTES_WORKSPACE_CREDENTIAL_FILE, "utf8"),
);
const evidence = process.env.TSCHUTES_EVIDENCE || "data/workspace-evidence";
fs.mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const account = "browseradmin" + Date.now();
const base =
  process.env.TSCHUTES_BASE || "http://127.0.0.1:19328/api/access-demo/";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw Error("This mutation check is restricted to loopback.");
try {
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Access Request Review", exact: true })
    .waitFor();
  await page.locator("#form-switch").selectOption("prr");
  await page
    .getByRole("heading", { name: "Parking Permit Review", exact: true })
    .waitFor();
  await page.locator("[name=name]").fill("Browser Demo");
  await page.locator("[name=email]").fill("browser@example.com");
  await page.locator("[name=department]").selectOption("Facilities");
  await page.getByRole("button", { name: "Sheet-style view" }).click();
  if ((await page.locator("[name=name]").inputValue()) !== "Browser Demo")
    throw Error("Toggle lost input");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.locator("[name=lot]").selectOption("Lot B");
  await page.locator("[name=category]").selectOption("VIP");
  await page.locator("[name=plate]").fill("FICTIONAL");
  await page.locator("[name=startDate]").fill("2030-10-01");
  await page.locator("[name=endDate]").fill("2030-10-02");
  await page.locator("[name=reason]").fill("Demo parking");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.locator("[name=consent]").check();
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Copy private receipt link" })
    .waitFor();
  const reference = await page.locator("main h1").innerText();
  const receiptURL = page.url();
  console.log("PRR intake + style toggle + submit: PASS");
  await page.goto(base + "#staff");
  await page.locator("[name=username]").fill(credentials.username);
  await page.locator("[name=password]").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "A+ owner workspace" }).waitFor();
  await page.getByRole("button", { name: "Forms", exact: true }).click();
  await page.getByRole("button", { name: "Edit working draft" }).click();
  await page.getByRole("button", { name: "Preview questions" }).click();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByRole("button", { name: "Add account" }).click();
  await page.locator("#account-form [name=username]").fill(account);
  await page
    .locator("#account-form [name=email]")
    .fill(account + "@example.com");
  await page.locator("#account-form [name=forms][value=prr]").check();
  await page.getByRole("button", { name: "Save approved account" }).click();
  await page
    .getByRole("button", { name: new RegExp(account + " · admin") })
    .waitFor();
  await page.getByRole("button", { name: "Metrics", exact: true }).click();
  await page
    .getByRole("heading", { name: "A+ metrics", exact: true })
    .waitFor();
  await page.screenshot({
    path: evidence + "/workspace-metrics.png",
    fullPage: true,
  });
  console.log("A+ login, form editor, account creation, metrics: PASS");
  const api = async (p, route, input) => {
    const r = await p.request.post(base + "v2/" + route, {
      headers: { "X-ARR-Request": "1" },
      data: input,
    });
    if (!r.ok()) throw Error(route + " " + r.status() + " " + (await r.text()));
    return r.json();
  };
  for (const role of ["reviewer", "manager"]) {
    const name = role + Date.now();
    await api(page, "user-save", {
      username: name,
      email: name + "@example.com",
      role,
      forms: ["prr"],
      active: true,
    });
    const dash = await api(page, "dashboard", {});
    const acct = dash.users.find((u) => u.username === name);
    const link = await api(page, "setup-link", { id: acct.id });
    const worker = await browser.newPage();
    await worker.goto(base + "#activate=" + link.link.split("#activate=")[1]);
    await worker
      .locator("#activate [name=password]")
      .fill("Browser-test-password-2026");
    await worker.locator("#activate [name=passwordConfirm]").fill("Browser-test-password-2026");
    await worker
      .getByRole("button", { name: "Set password", exact: true })
      .click();
    await worker.locator("#login [name=username]").fill(name);
    await worker
      .locator("#login [name=password]")
      .fill("Browser-test-password-2026");
    await worker.getByRole("button", { name: "Sign in", exact: true }).click();
    await worker
      .getByRole("heading", { name: role + " workspace", exact: true })
      .waitFor();
    await worker.getByRole("button", { name: new RegExp(reference) }).click();
    await worker.waitForFunction(() => !busy);
    await worker
      .getByRole("button", { name: "Approve step", exact: true })
      .click();
    await worker
      .getByText(
        role === "reviewer"
          ? "Current step: Parking approval"
          : "Answers locked after first approval.",
        { exact: false },
      )
      .first()
      .waitFor();
    await worker.close();
  }
  await page.goto(receiptURL);
  await page.getByRole("heading", { name: "approved", exact: true }).waitFor();
  console.log(
    "One-time activation + personal reviewer/manager UI approvals + requester final status: PASS",
  );

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await mobile.goto(base);
  await mobile
    .getByRole("heading", { name: "Access Request Review", exact: true })
    .waitFor();
  await mobile.locator("#form-switch").selectOption("prr");
  await mobile.screenshot({
    path: evidence + "/workspace-prr-mobile.png",
    fullPage: true,
  });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error("Mobile horizontal overflow");
  console.log("Mobile viewport: PASS");
  if (errors.length) throw Error(errors.join("; "));
  console.log("No browser JS errors: PASS");
} finally {
  await browser.close();
}
