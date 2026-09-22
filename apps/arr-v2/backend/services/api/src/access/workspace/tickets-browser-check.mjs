import sharp from "sharp";
import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const base = "http://127.0.0.1:19331/api/access-demo/";
const title = "Browser ticket " + Date.now();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const api = (p, route, input = {}) =>
  p.evaluate(
    async ({ route, input }) => {
      const r = await fetch("v2/" + route, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ARR-Request": "1" },
        body: JSON.stringify(input),
      });
      const out = await r.json();
      if (!r.ok) throw Error(out.error);
      return out;
    },
    { route, input },
  );
try {
  await page.goto(base);
  await page.locator("#form-switch").selectOption("prr");
  await page.locator("[name=name]").fill("Ticket Browser Person");
  await page.locator("[name=email]").fill("ticket@example.com");
  await page.locator("[name=department]").selectOption("Facilities");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await expect(page.locator("#identity-band")).toHaveText(
    "Ticket Browser Person",
  );
  await page.goto(base + "#staff");
  await page.locator("[name=username]").fill("owner");
  await page.locator("[name=password]").fill("ticket-browser-local-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#tickets h2")).toHaveText(
    "Enhancement & bug tickets",
  );
  await expect(page.locator("#identity-band .account-name")).toHaveText("owner");
  const username = "ticketuser" + Date.now();
  await api(page, "user-save", {
    username,
    email: username + "@example.com",
    role: "reviewer",
    forms: ["arr"],
    active: true,
  });
  const d = await api(page, "dashboard"),
    u = d.users.find((v) => v.username === username);
  const link = await api(page, "setup-link", { id: u.id });
  await api(page, "activate", {
    token: link.link.split("#activate=")[1],
    password: "ticket-user-local-only",
  });
  await api(page, "login", {
    username: "owner",
    password: "ticket-browser-local-only",
  });
  const staff = await browser.newPage();
  staff.on("pageerror", (e) => errors.push(e.message));
  await staff.goto(base + "#staff");
  await staff.locator("[name=username]").fill(username);
  await staff.locator("[name=password]").fill("ticket-user-local-only");
  await staff.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(staff.locator("#tickets h2")).toBeVisible();
  await staff.getByRole("button", { name: "New ticket", exact: true }).click();
  await staff.getByLabel("Ticket title", { exact: true }).fill(title);
  await staff
    .getByLabel("Describe the enhancement or bug", { exact: true })
    .fill("Show useful details");
  await staff.getByLabel("Upload ticket screenshots").setInputFiles({
    name: "demo.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 100, height: 60, channels: 3, background: "#009999" },
    })
      .png()
      .toBuffer(),
  });
  await expect(staff.locator(".ticket-thumb")).toBeVisible();
  await staff.locator("#ticket-compose textarea").evaluate(async (el) => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 30;
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    const clipboard = new DataTransfer();
    clipboard.items.add(new File([blob], "pasted.png", { type: "image/png" }));
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: clipboard,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(staff.locator(".ticket-thumb")).toHaveCount(2);
  await staff
    .getByRole("button", { name: "Submit ticket", exact: true })
    .click();
  await expect(staff.locator("#ticket-table")).toContainText(title);
  await page
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await expect(page.locator("#ticket-table")).toContainText(title);
  await page.getByRole("button", { name: title, exact: true }).click();
  await page
    .getByLabel("Owner-edited requirements", { exact: true })
    .fill("Owner approved scope");
  await page
    .getByLabel("Private Owner notes", { exact: true })
    .fill("Owner only note");
  await page
    .locator("#ticket-inline-detail")
    .getByLabel("Ticket status", { exact: true })
    .selectOption("approved");
  await page
    .getByLabel(
      "I reviewed the latest submitter revision; use the Owner requirements above",
    )
    .check();
  await page
    .getByRole("button", { name: "Save Owner review", exact: true })
    .click();
  await expect(page.locator("#ticket-table")).toContainText(
    "Owner approved scope",
  );
  await page.getByLabel("Select ticket " + title, { exact: true }).check();
  await page
    .getByRole("button", { name: "Prepare implementation brief", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Generate saved brief for selected tickets",
      exact: true,
    })
    .click();
  const brief = await page.getByLabel("Saved brief").inputValue();
  if (
    !brief.includes("Owner approved scope") ||
    brief.includes("Owner only note")
  )
    throw Error("Brief snapshot privacy failure");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download HTML copy", exact: true })
    .click();
  const file = await download;
  await file.saveAs("/tmp/arr-ticket-brief.html");
  const { readFileSync } = await import("node:fs");
  const saved = readFileSync("/tmp/arr-ticket-brief.html", "utf8");
  if (
    !saved.includes("data:image/jpeg;base64,") ||
    saved.includes("Owner only note")
  )
    throw Error("Screenshot export/privacy failure");
  await page
    .getByLabel("Headline summary", { exact: true })
    .fill("Queue layout improvements");
  await page
    .getByLabel("Implementation date (leave blank to update summary only)")
    .fill("2026-09-21");
  await page
    .getByLabel("Implementation note / release reference")
    .fill("Fictional test release");
  await page
    .getByRole("button", { name: "Save archive record", exact: true })
    .click();
  await expect(page.locator("#ticket-batches")).toContainText("2026-09-21");
  await page.reload();
  await expect(page.locator("#ticket-batches")).toContainText(
    "Queue layout improvements",
  );
  await page.locator("#ticket-batches .batch-details summary").first().click();
  const wd = page.waitForEvent("download");
  await page
    .locator("#ticket-batches")
    .getByRole("button", { name: "Download Word (.docx)", exact: true })
    .first()
    .click();
  await (await wd).saveAs("/tmp/arr-word-brief.docx");
  const { default: AdmZip } = await import("adm-zip");
  const wordZip = new AdmZip("/tmp/arr-word-brief.docx");
  const wordXml = wordZip.readAsText("word/document.xml");
  if (
    !wordXml.includes("Owner approved scope") ||
    !wordXml.includes("Fictional test release") ||
    wordZip.getEntries().filter((e) => e.entryName.startsWith("word/media/"))
      .length !== 2
  )
    throw Error("Word archive export failed");
  await staff
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await expect(staff.locator("#ticket-inline-detail")).toContainText(
    "Locked in an implementation batch",
  );
  await expect(
    staff.getByRole("button", { name: "Save submitter revision", exact: true }),
  ).toHaveCount(0);
  // Share an owner-created ticket; UI-only accelerated clock confirms live removal.
  const t = await api(page, "ticket-create", {
    title: "Shared comparison",
    wording: "Reference idea",
    forms: ["prr"],
  });
  await api(page, "ticket-share", {
    ids: [t.id],
    user: u.id,
    hours: 0,
    minutes: 1,
  });
  await staff
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await expect(staff.locator("[data-ticket-expiry]").first()).toContainText(
    "remaining",
  );
  await staff
    .getByRole("button", { name: "Shared comparison", exact: true })
    .click();
  await expect(staff.locator("#ticket-inline-detail")).toContainText(
    "Shared read-only view",
  );
  await staff.evaluate(() => {
    ticketClockOffset += 61000;
    ticketTick();
  });
  await expect(staff.locator("#ticket-table")).not.toContainText(
    "Shared comparison",
  );
  await expect(staff.locator("#ticket-inline-detail")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/arr-tickets-owner.png", fullPage: true });
  await staff.setViewportSize({ width: 390, height: 844 });
  await staff.reload();
  await expect(staff.locator("#tickets h2")).toBeVisible();
  if (
    await staff.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    )
  )
    throw Error("Mobile page overflow");
  await staff.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(staff.locator("#tickets")).toHaveCount(0);
  await expect(staff.locator("#identity-band")).toBeEmpty();
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: requester/staff identity, screenshot upload, owner review, immutable downloadable brief, private notes, lock, sharing countdown/removal, mobile and logout.",
  );
} finally {
  await browser.close();
}
