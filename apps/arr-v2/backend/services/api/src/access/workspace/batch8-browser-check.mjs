import { chromium, expect } from "@playwright/test";
const b = await chromium.launch({ channel: "chrome", headless: true });
const base = "http://127.0.0.1:19331/api/access-demo/";
const errors = [];
const page = async () => {
  const p = await b.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  p.on("pageerror", (e) => errors.push(e.message));
  return p;
};
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
  await p.goto(base + "#staff");
  await p.locator("[name=username]").fill(name);
  await p.locator("[name=password]").fill(pw);
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(p.locator("#tickets h2")).toBeVisible();
};
const settled = async (p) => {
  await p.waitForFunction(() => !busy && !ticketTransition);
};
const open = async (p, t) => {
  if (
    await p.locator(`#ticket-inline-detail[data-ticket-id="${t.id}"]`).count()
  )
    return;
  await p
    .locator("#ticket-table")
    .getByRole("button", { name: t.title, exact: true })
    .click();
  await settled(p);
};
try {
  const owner = await page();
  await login(owner, "owner", "ticket-browser-local-only");
  for (const role of ["admin", "reviewer", "manager"]) {
    const username = "b8" + role + Date.now(),
      pw = "Batch8-browser-password";
    await api(owner, "user-save", {
      username,
      email: username + "@example.com",
      role,
      forms: ["arr", "prr"],
      active: true,
    });
    const u = (await api(owner, "dashboard")).users.find(
      (x) => x.username === username,
    );
    const setup = await api(owner, "setup-link", { id: u.id });
    const p = await page();
    await p.goto(base);
    await api(p, "activate", {
      token: setup.link.split("#activate=")[1],
      password: pw,
    });
    await login(p, username, pw);
    const ts = [];
    for (const form of ["arr", "prr"])
      ts.push(
        await api(p, "ticket-create", {
          title: `${role} ${form} own`,
          wording: "Original implementation",
          forms: [form],
        }),
      );
    const shared = await api(owner, "ticket-create", {
      title: role + " other shared",
      wording: "Read only comparison",
      forms: ["arr"],
    });
    await api(owner, "ticket-share", {
      ids: [shared.id],
      user: u.id,
      hours: 0,
      minutes: 5,
    });
    await p
      .getByRole("button", { name: "Refresh tickets", exact: true })
      .click();
    await settled(p);
    await open(p, ts[0]);
    await expect(p.locator(".ticket-detail-row")).toHaveCount(1);
    await expect(
      p.getByRole("button", { name: "Save submitter revision", exact: true }),
    ).toBeVisible();
    await p
      .getByLabel("Follow-up comment", { exact: true })
      .fill("Keep my unsaved note");
    p.once("dialog", (d) => d.dismiss());
    await open(p, ts[1]);
    await expect(
      p.getByLabel("Follow-up comment", { exact: true }),
    ).toHaveValue("Keep my unsaved note");
    p.once("dialog", (d) => d.accept());
    const start = Date.now();
    await open(p, ts[1]);
    if (Date.now() - start < 1850)
      throw Error(
        "Switch timing " +
          (Date.now() - start) +
          " " +
          JSON.stringify(
            await p.evaluate(() => ({
              focus: ticketFocus,
              reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
              shell: !!document.querySelector("#ticket-inline-shell"),
              message: document.body.innerText.slice(-1500),
            })),
          ),
      );
    await expect(p.locator("#ticket-inline-detail")).toHaveAttribute(
      "data-ticket-id",
      ts[1].id,
    );
    await expect(
      p.locator("#ticket-table tbody > tr:not(.ticket-detail-row)"),
    ).toHaveCount(3);
    await p
      .locator("#ticket-inline-detail")
      .getByRole("button", { name: "← Queue", exact: true })
      .click();
    await settled(p);
    await expect(p.locator(".ticket-detail-row")).toHaveCount(0);
    await api(owner, "ticket-quick-action", {
      tickets: ts.map((t) => ({ id: t.id, revision: t.revision })),
      status: "approved",
    });
    await p
      .getByRole("button", { name: "Refresh tickets", exact: true })
      .click();
    await settled(p);
    await open(p, ts[0]);
    await expect(
      p.getByRole("button", { name: "Save submitter revision", exact: true }),
    ).toHaveCount(0);
    await expect(
      p.getByRole("button", {
        name: "Attach selected screenshots",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      p.getByRole("button", { name: "Save Owner review", exact: true }),
    ).toHaveCount(0);
    await p
      .getByLabel("Follow-up comment", { exact: true })
      .fill("Discussion after approval");
    await p.getByRole("button", { name: "Add comment", exact: true }).click();
    await settled(p);
    const batch = await api(owner, "ticket-batch", {
      ids: ts.map((t) => t.id),
    });
    for (const t of ts) {
      const fresh = (await api(owner, "ticket-list")).tickets.find(
        (x) => x.id === t.id,
      );
      await api(owner, "ticket-complete", {
        id: t.id,
        revision: fresh.revision,
      });
    }
    await p
      .getByRole("button", { name: "Refresh tickets", exact: true })
      .click();
    await settled(p);
    await p.getByLabel("Hide Completed", { exact: true }).uncheck();
    await open(p, ts[0]);
    await expect(
      p.getByLabel("Follow-up comment", { exact: true }),
    ).toBeVisible();
    await expect(
      p.locator("#ticket-inline-detail [data-ticket-expiry]"),
    ).toHaveCount(0);
    await open(p, shared);
    await expect(
      p.getByLabel("Follow-up comment", { exact: true }),
    ).toHaveCount(0);
    await api(owner, "ticket-revoke", { id: u.id + "-" + shared.id });
    await p
      .getByRole("button", { name: "Refresh tickets", exact: true })
      .click();
    await settled(p);
    await expect(
      p
        .locator("#ticket-table")
        .getByRole("button", { name: shared.title, exact: true }),
    ).toHaveCount(0);
    await open(p, ts[0]);
    await p
      .locator("#ticket-tools")
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    await settled(p);
    await expect(p.locator(".ticket-detail-row")).toHaveCount(0);
    await p.emulateMedia({ reducedMotion: "reduce" });
    await open(p, ts[1]);
    await p.setViewportSize({ width: 390, height: 844 });
    if (
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    )
      throw Error("Mobile page overflow");
    if (
      !(
        await api(owner, "ticket-batch-download", { id: batch.id })
      ).brief.includes("Original implementation")
    )
      throw Error("Brief changed");
    await p.close();
  }
  if (errors.length) throw Error(errors.join(";"));
  console.log(
    "PASS: all staff roles, own ARR/PRR tickets, sequential animations, unsaved note cancel/discard, approval locks, comments, completed access, shared read-only/revocation, Queue collapse, reduced motion, mobile.",
  );
} finally {
  await b.close();
}
