/* All authorization, version pinning and state transitions are server-enforced.
 * No requester answers or receipt capabilities are persisted in browser storage.
 * textContent/escaped templates prevent admin-authored labels becoming scripts. */
const $ = (s) => document.querySelector(s),
  app = $("#app");
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let emailConfigured = false;
let receiptName = "";
let catalog = [],
  user = null,
  formId = "arr",
  data = {},
  photo = null,
  page = 1,
  draft = null,
  expires = 0,
  pinned = null,
  resubmit = null,
  dash = null,
  tab = "queue",
  filter = "all",
  selected = null,
  sheet = false,
  receipt = null,
  editForm = null,
  editor = null,
  busy = false;
const kiosk = location.hash === "#kiosk";
let activity = Date.now();
["click", "keydown", "touchstart"].forEach((e) =>
  document.addEventListener(e, () => (activity = Date.now())),
);
function msg(s) {
  $("#message").textContent = s;
  $("#message").style.display = "block";
  setTimeout(() => ($("#message").style.display = "none"), 9000);
}
async function api(route, input = {}) {
  const r = await fetch("v2/" + route, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-ARR-Request": "1" },
    body: JSON.stringify(input),
  });
  const out = await r.json();
  if (!r.ok) {
    if (r.status === 410 && draft) reset();
    throw new Error(out.error || "Request failed.");
  }
  return out;
}
function button(label, fn, cls = "") {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = cls;
  b.onclick = () => run(fn);
  return b;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } catch (e) {
    msg(e.message);
  } finally {
    busy = false;
  }
}
function node(tag, cls = "", text = "") {
  const n = document.createElement(tag);
  n.className = cls;
  n.textContent = text;
  return n;
}
function actions(parent, items) {
  const a = node("div", "actions");
  items.forEach(([label, fn, cls]) => a.append(button(label, fn, cls)));
  parent.append(a);
}
function identityLabel(name) {
  const band = $("#identity-band");
  band.replaceChildren();
  $("#account-below-band").replaceChildren();
  if (name && user && location.hash === "#staff") {
    const account = node("div", "account-links");
    const username = node("span", "account-name", name);
    account.append(
      button("Sign out", signOut, "account-link account-signout"),
      username,
    );
    $("#account-below-band").append(
      button(
        "Change password",
        changePassword,
        "account-link account-password",
      ),
    );
    band.append(account);
  } else band.textContent = name || "";
}
async function signOut() {
  await api("logout");
  user = null;
  dash = null;
  login();
}
function passwordControls(form, confirmNew = false) {
  if (confirmNew) {
    const label = node("label", "field", "Confirm new password");
    const input = document.createElement("input");
    input.name = "passwordConfirm";
    input.type = "password";
    input.required = true;
    input.autocomplete = "new-password";
    label.append(input);
    form.querySelector("button.primary").before(label);
    const status = node("small", "password-match");
    status.setAttribute("role", "status");
    label.append(status);
    const first = form.elements.password,
      submit = form.querySelector("button.primary");
    const update = () => {
      const same = input.value === first.value,
        valid = first.value.trim().length >= 14 && first.value.length <= 200;
      input.classList.toggle("password-mismatch", !!input.value && !same);
      input.classList.toggle("password-matched", !!input.value && same);
      status.textContent = !input.value
        ? ""
        : same
          ? "Passwords match"
          : "Passwords do not match";
      input.setCustomValidity(
        input.value && !same ? "Passwords do not match" : "",
      );
      submit.disabled = !input.value || !same || !valid;
    };
    first.addEventListener("input", update);
    input.addEventListener("input", update);
    first.addEventListener("change", update);
    input.addEventListener("change", update);
    update();
  }
  for (const input of form.querySelectorAll('input[type="password"]')) {
    input.setAttribute(
      "aria-label",
      input.closest("label").firstChild.textContent.trim(),
    );
    input.maxLength = 200;
    const wrap = node("span", "password-control");
    input.before(wrap);
    wrap.append(input);
    const title =
      input.name === "current"
        ? "current password"
        : input.name === "passwordConfirm"
          ? "password confirmation"
          : "password";
    const eye = button(
      "👁",
      () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        eye.setAttribute("aria-label", `${show ? "Hide" : "Show"} ${title}`);
        eye.setAttribute("aria-pressed", String(show));
      },
      "password-eye",
    );
    eye.type = "button";
    eye.setAttribute("aria-label", `Show ${title}`);
    eye.setAttribute("aria-pressed", "false");
    wrap.append(eye);
  }
}
let sessionChecking = false;
async function checkStaffSession() {
  if (!user || location.hash !== "#staff" || sessionChecking) return;
  sessionChecking = true;
  try {
    const state = await api("session-state");
    if (!state.active) {
      user = null;
      dash = null;
      login();
      msg(state.notice || "Your session has ended. Please sign in again.");
    }
  } catch {
  } finally {
    sessionChecking = false;
  }
}
setInterval(checkStaffSession, 2000);
window.addEventListener("focus", checkStaffSession);
function confirmAccountDelete(u) {
  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Delete account confirmation");
  dialog.append(
    node("h3", "", "Delete account?"),
    node(
      "p",
      "",
      `Are you sure you want to delete ${u.username}? Access and setup links will be removed. Historical signoffs, comments and tickets will remain.`,
    ),
  );
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  const no = button("No", close),
    yes = button("Yes", async () => {
      await api("user-delete", {
        id: u.id,
        generation: u.generation,
        confirm: true,
      });
      close();
      await refreshStaff();
      accounts();
      msg("Account deleted; history retained.");
    });
  dialog.append(no, yes);
  dialog.addEventListener("cancel", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  no.focus();
}
function changePassword() {
  const box = node("form", "card");
  box.innerHTML =
    '<h2>Change password</h2><label class="field">Current password<input name="current" type="password" required autocomplete="current-password"></label><label class="field">New password<input name="password" type="password" minlength="14" required autocomplete="new-password"></label><button class="primary">Save password</button>';
  passwordControls(box, true);
  box.onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      await api("password", Object.fromEntries(new FormData(box)));
      user = null;
      dash = null;
      login();
    });
  };
  $("#panel").replaceChildren(box);
  box.scrollIntoView({ block: "nearest" });
  box.querySelector("input").focus();
}
function theme() {
  identityLabel(
    location.hash === "#staff"
      ? user?.username
      : draft
        ? data.name
        : location.hash.startsWith("#receipt=")
          ? receiptName
          : "",
  );
  document.body.classList.toggle("prr", formId === "prr");
  document.body.classList.toggle("sheet", sheet);
  $("#form-switch").value = formId;
  $("#brand").innerHTML =
    "<strong>" + esc(formId.toUpperCase()) + "</strong> / Request workspace";
}
function current() {
  return pinned || catalog.find((f) => f.id === formId);
}
function reset() {
  receiptName = "";
  identityLabel(location.hash === "#staff" ? user?.username : "");
  data = {};
  photo = null;
  page = 1;
  draft = null;
  expires = 0;
  pinned = null;
  resubmit = null;
}
function setForm(value) {
  if (draft || Object.keys(data).length) {
    if (
      !confirm(
        "Switch forms and clear this screen? Saved page-one answers remain and may time out as a partial.",
      )
    ) {
      $("#form-switch").value = formId;
      return;
    }
  }
  reset();
  formId = value;
  selected = null;
  theme();
  if (location.hash === "#staff") renderStaff();
  else {
    void api("visit", { form: formId }).catch(() => {});
    intake();
  }
}
async function load() {
  const c = await api("catalog");
  catalog = c.forms;
  user = c.user;
  emailConfigured = c.emailConfigured;
  $("#form-switch").innerHTML = catalog
    .map(
      (f) =>
        `<option value="${esc(f.id)}">${esc(f.id.toUpperCase() + " — " + f.definition.title)}</option>`,
    )
    .join("");
  if (!catalog.some((f) => f.id === formId)) formId = catalog[0]?.id || "arr";
  theme();
  return c;
}
$("#form-switch").onchange = (e) => setForm(e.target.value);
$("#view-switch").onclick = () => {
  sheet = !sheet;
  theme();
  $("#view-switch").textContent = sheet
    ? "▣ Web-style form"
    : "▦ Sheet-style view";
};
$("#staff-link").onclick = () => {
  location.hash = "staff";
};
$("#brand").onclick = () => {
  location.hash = "";
};
function control(field, value, onchange) {
  const label = node("label", "field");
  label.append(
    document.createTextNode(field.label + (field.required ? " *" : "")),
  );
  if (field.help) label.append(node("small", "", field.help));
  let el;
  if (["select", "multi"].includes(field.type)) {
    el = document.createElement("select");
    if (field.type === "multi") el.multiple = true;
    else el.append(new Option("Choose…", ""));
    field.options.forEach((v) => el.append(new Option(v, v)));
    if (el.multiple) {
      for (const o of el.options) o.selected = (value || []).includes(o.value);
    } else el.value = value || "";
  } else if (field.type === "textarea") {
    el = document.createElement("textarea");
    el.value = value || "";
  } else {
    el = document.createElement("input");
    el.type =
      field.type === "checkbox"
        ? "checkbox"
        : ["email", "date"].includes(field.type)
          ? field.type
          : "text";
    if (el.type === "checkbox") el.checked = !!value;
    else el.value = value || "";
  }
  el.name = field.key;
  el.required = field.required;
  el.oninput = () =>
    onchange(
      field.type === "checkbox"
        ? el.checked
        : field.type === "multi"
          ? [...el.selectedOptions].map((o) => o.value)
          : el.value,
    );
  label.append(el);
  return label;
}
function readPage(form) {
  if (!form.reportValidity()) throw new Error("Complete the required fields.");
}
function intake() {
  theme();
  const f = current();
  if (!f) {
    app.textContent = "No published forms.";
    return;
  }
  const def = f.definition,
    max = Math.max(...def.fields.map((f) => f.page));
  app.innerHTML = `<section class="intake"><span class="badge">${esc(formId.toUpperCase())} · version 0.${f.version}</span><h1>${esc(def.title)}</h1><p>${esc(def.description)}</p><div class="card"><div class="muted">Page ${page} of ${max + 1} · <span id="timer">${draft ? "20-minute completion window" : "First Continue saves page one"}</span></div><progress value="${page}" max="${max + 1}"></progress><form id="intake-form"></form></div></section>`;
  const form = $("#intake-form");
  form.onsubmit = (e) => e.preventDefault();
  if (page <= max) {
    for (const field of def.fields.filter((f) => f.page === page))
      form.append(
        control(field, data[field.key], (v) => (data[field.key] = v)),
      );
    if (page === max && formId === "arr") {
      const label = node("label", "field", "Optional fictional photo");
      const file = document.createElement("input");
      file.type = "file";
      file.accept = "image/png,image/jpeg,image/webp";
      file.onchange = () =>
        run(async () => {
          const f = file.files[0];
          if (!f) return;
          const image = await createImageBitmap(f);
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 900 / Math.max(image.width, image.height));
          canvas.width = image.width * scale;
          canvas.height = image.height * scale;
          canvas
            .getContext("2d")
            .drawImage(image, 0, 0, canvas.width, canvas.height);
          photo = canvas.toDataURL("image/jpeg", 0.7);
          image.close();
          msg("Photo selected.");
        });
      label.append(file);
      form.append(label);
    }
  } else {
    form.append(node("h2", "", "Review your answers"));
    for (const field of def.fields)
      form.append(answer(field.label, data[field.key]));
    if (photo) {
      const img = new Image();
      img.src = photo;
      img.className = "photo";
      form.append(img);
    }
    form.append(
      node(
        "p",
        "warning",
        "Submitting creates a demo request. Email notifications depend on configured delivery. Keep your private receipt link.",
      ),
    );
  }
  const items = [];
  if (page > 1)
    items.push([
      "← Back",
      () => {
        page--;
        intake();
      },
    ]);
  items.push([
    page <= max ? "Continue →" : "Submit request",
    async () => {
      readPage(form);
      if (page === 1) {
        if (!draft) {
          draft = btoa(
            String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
          )
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
          pinned = structuredClone(f);
        }
        const r = await api("draft", {
          token: draft,
          form: formId,
          version: pinned.version,
          data,
        });
        expires = Date.now() + Date.parse(r.expires) - Date.parse(r.serverNow);
      }
      if (page <= max) {
        page++;
        intake();
      } else {
        const r = await api("submit", { token: draft, data, photo, resubmit });
        reset();
        receipt = r.receipt;
        location.hash = "receipt=" + r.receipt;
        await showReceipt();
      }
    },
    "primary",
  ]);
  actions(form, items);
}
function answer(label, value) {
  const n = node("div", "answer");
  n.append(
    node("b", "", label),
    document.createTextNode(
      Array.isArray(value)
        ? value.join(", ")
        : typeof value === "boolean"
          ? value
            ? "Yes"
            : "No"
          : String(value ?? "—"),
    ),
  );
  return n;
}
async function showReceipt() {
  let r;
  try {
    r = await api("receipt", { receipt });
  } catch (e) {
    const legacy = await fetch("status", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-ARR-Request": "1" },
      body: JSON.stringify({ receipt }),
    });
    if (legacy.ok) {
      location.replace("index.html#receipt/" + receipt);
      return;
    }
    throw e;
  }
  formId = r.form;
  theme();
  receiptName = r.requesterName || "";
  identityLabel(receiptName);
  app.innerHTML = `<section class="intake card"><span class="badge">${esc(r.form.toUpperCase())} · 0.${r.formVersion}</span><h1>${esc(r.reference)}</h1><h2>${esc(r.status)}</h2>${!emailConfigured ? '<p class="warning">Email delivery is not configured yet. Your request is saved; keep this link to check it.</p>' : ""}<p>Your private link lets you check progress and comment before final approval. Do not share it publicly.</p>${r.latest !== r.formVersion ? '<p class="warning">A newer form is available. Your submitted version remains valid for review; an approver can ask for a new submission if needed.</p>' : ""}<div id="receipt-history"></div><div id="receipt-actions"></div></section>`;
  for (const h of r.history)
    $("#receipt-history").append(
      node(
        "div",
        "history",
        `${new Date(h.at).toLocaleString()} · ${h.action}\n${h.note}`,
      ),
    );
  const a = $("#receipt-actions");
  if (r.canComment) {
    const t = document.createElement("textarea");
    t.placeholder = "Comment / clarification response";
    a.append(t);
    actions(a, [
      [
        "Send comment",
        async () => {
          await api("requester-comment", { receipt, note: t.value });
          await showReceipt();
        },
        "primary",
      ],
    ]);
  }
  actions(a, [
    ["Refresh status", showReceipt],
    [
      "Copy private receipt link",
      async () => {
        await navigator.clipboard.writeText(location.href);
        msg("Private link copied.");
      },
    ],
    ...(r.status === "rejected"
      ? [
          [
            "Start linked resubmission",
            async () => {
              reset();
              resubmit = receipt;
              receipt = null;
              location.hash = "";
              await load();
              intake();
            },
          ],
        ]
      : []),
    [
      "Start another request",
      () => {
        reset();
        location.hash = "";
        intake();
      },
    ],
  ]);
  if (kiosk)
    setTimeout(() => {
      receipt = null;
      reset();
      location.hash = "kiosk";
      intake();
    }, 45000);
}
function login(username = "") {
  identityLabel("");
  ticketState = null;
  ticketFocus = null;
  ticketSelection.clear();
  app.innerHTML =
    '<section class="intake card"><h1>Staff workspace</h1><p>Use your approved personal account. A+ manages Admins; Admins manage their assigned reviewers.</p><form id="login"><label class="field">Username or email<input name="username" required autocomplete="username"></label><label class="field">Password<input name="password" type="password" required autocomplete="current-password"></label><button class="primary">Sign in</button></form><div id="recovery"></div><p class="muted">Roles: Reviewer · Manager · Admin · A+</p><a href="index.html#staff">Previous demo queue (legacy records)</a></section>';
  passwordControls($("#login"));
  $("#login [name=username]").value = username;
  $("#login").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const values = Object.fromEntries(new FormData(e.target));
      const result = await api("login", values);
      await refreshStaff();
      if (result.notice) msg(result.notice);
    });
  };
  actions($("#recovery"), [
    [
      "Forgot password / request setup",
      async () => {
        const username = prompt("Your approved username or email");
        if (username) msg((await api("reset-request", { username })).message);
      },
    ],
  ]);
}
async function refreshStaff() {
  dash = await api("dashboard");
  user = dash.user;
  renderStaff();
}
function renderStaff() {
  if (dash) {
    if (!dash.forms.some((f) => f.id === formId))
      formId = dash.forms[0]?.id || formId;
    $("#form-switch").innerHTML = dash.forms
      .map(
        (f) =>
          `<option value="${esc(f.id)}">${esc(f.id.toUpperCase())}${f.published ? "" : " (unpublished)"}</option>`,
      )
      .join("");
  }
  if (!user) {
    login();
    return;
  }
  if (!dash) {
    run(refreshStaff);
    return;
  }
  theme();
  app.innerHTML = `<span class="badge">${esc(formId.toUpperCase())} workspace</span><h1>${user.role === "owner" ? "A+ owner" : esc(user.role)} workspace</h1><p>${esc(user.username)} · permissions are restricted to assigned forms</p><nav class="tabs" id="tabs"></nav><section id="panel"></section>`;
  const tabs = $("#tabs");
  for (const t of [
    "queue",
    ...(["owner", "admin"].includes(user.role) ? ["forms", "accounts"] : []),
    ...(user.role === "owner" ? ["metrics", "operations"] : []),
  ])
    tabs.append(
      button(
        t[0].toUpperCase() + t.slice(1),
        () => {
          tab = t;
          selected = null;
          renderStaff();
        },
        tab === t ? "selected" : "",
      ),
    );
  tabs.append(button("Refresh", refreshStaff));
  if (tab === "queue") queue();
  if (tab === "forms") forms();
  if (tab === "accounts") accounts();
  if (tab === "metrics") void metrics().catch((e) => msg(e.message));
  if (tab === "operations") operations();
  const ticketsBox = node("section", "card ticket-section");
  ticketsBox.id = "tickets";
  app.append(ticketsBox);
  void refreshTickets().catch((e) => {
    ticketsBox.textContent = e.message;
  });
}
function queue() {
  const panel = $("#panel");
  if (selected) {
    detail(panel);
    return;
  }
  panel.innerHTML =
    '<div class="card"><label>Status <select id="status-filter"><option value="all">All</option>' +
    [
      "pending",
      "clarification",
      "approved",
      "rejected",
      "provisioned",
      "partial",
    ]
      .map((s) => `<option>${s}</option>`)
      .join("") +
    '</select></label><p class="muted">Showing the selected form only. Switch forms at the top. Bold version = latest published version.</p><div id="queue-list"></div></div>';
  $("#status-filter").value = filter;
  $("#status-filter").onchange = (e) => {
    filter = e.target.value;
    queue();
  };
  const rows = dash.requests.filter(
    (r) => r.form === formId && (filter === "all" || r.status === filter),
  );
  if (!rows.length) $("#queue-list").textContent = "No matching requests.";
  for (const r of rows) {
    const b = button(
      "",
      () => {
        selected = r.id;
        renderStaff();
      },
      "queue-item",
    );
    const latest = dash.forms.find((f) => f.id === r.form)?.published;
    b.innerHTML = `<strong>${esc(r.reference)}</strong> — ${esc(r.data.name)} · ${esc(r.status)} · ${r.formVersion === latest ? "<b>" : ""}0.${r.formVersion}${r.formVersion === latest ? "</b>" : ""} ${r.attempt ? "· attempt " + r.attempt : ""}`;
    $("#queue-list").append(b);
  }
}
function detail(panel) {
  const r = dash.requests.find((r) => r.id === selected);
  if (!r) {
    selected = null;
    queue();
    return;
  }
  panel.innerHTML = `<article class="card"><span class="badge">${esc(r.form.toUpperCase())} · 0.${r.formVersion}</span><h2>${esc(r.reference)} — ${esc(r.status)}</h2><p>${r.locked ? "Answers locked after first approval." : ""} ${r.steps && r.step < r.steps.length ? "Current step: " + esc(r.steps[r.step].label) + " (" + esc(r.steps[r.step].role) + ")" : ""}</p><div id="answers"></div><h3>History</h3><div id="history"></div><div id="request-actions"></div></article>`;
  for (const [key, v] of Object.entries(r.data))
    $("#answers").append(
      answer(r.definition?.fields.find((f) => f.key === key)?.label || key, v),
    );
  for (const h of r.history || []) {
    const div = node(
      "div",
      "history",
      `${new Date(h.at).toLocaleString()} · ${h.actor} · ${h.action}\n${h.note}`,
    );
    if (h.before) {
      const d = document.createElement("details");
      d.append(
        node("summary", "", "View original and revised answers"),
        node(
          "pre",
          "",
          JSON.stringify({ before: h.before, after: h.after }, null, 2),
        ),
      );
      div.append(d);
    }
    $("#history").append(div);
  }
  const a = $("#request-actions");
  if (r.hasPhoto)
    actions(a, [
      [
        "View submitted photo",
        async () => {
          const p = await api("photo", { id: r.id });
          if (p.photo) {
            const img = new Image();
            img.src = p.photo;
            img.className = "photo";
            a.append(img);
          }
        },
      ],
    ]);
  actions(a, [
    [
      "← Queue",
      () => {
        selected = null;
        renderStaff();
      },
    ],
  ]);
  if (r.status === "partial") return;
  const note = document.createElement("textarea");
  note.placeholder = "Comment / decision reason";
  a.append(note);
  const act = async (action) => {
    await api("request-action", {
      id: r.id,
      revision: r.revision,
      action,
      note: note.value,
    });
    await refreshStaff();
  };
  const items = [];
  if (user.role === "admin" || ["pending", "clarification"].includes(r.status))
    items.push(["Add comment", () => act("comment")]);
  if (r.steps[r.step]?.role === user.role) {
    if (r.status === "pending")
      items.push(
        ["Approve step", () => act("approve"), "primary"],
        ["Request clarification", () => act("clarify")],
      );
    if (["pending", "clarification"].includes(r.status))
      items.push(["Reject attempt", () => act("reject"), "danger"]);
  }
  if (user.role === "reviewer" && r.status === "approved")
    items.push(["Record completion (demo)", () => act("provision"), "primary"]);
  if (
    user.role === "admin" &&
    !r.locked &&
    ["pending", "clarification"].includes(r.status)
  )
    items.push([
      "Edit answers with audit history",
      () => {
        const edit = node("form", "card");
        const values = structuredClone(r.data);
        r.definition.fields.forEach((f) =>
          edit.append(control(f, values[f.key], (v) => (values[f.key] = v))),
        );
        actions(edit, [
          [
            "Save attributed changes",
            async () => {
              readPage(edit);
              await api("request-action", {
                id: r.id,
                revision: r.revision,
                action: "edit",
                note: note.value,
                data: values,
              });
              await refreshStaff();
            },
            "primary",
          ],
        ]);
        a.append(edit);
      },
    ]);
  actions(a, items);
}
function forms() {
  const panel = $("#panel");
  const f = dash.forms.find((f) => f.id === formId);
  if (!f) {
    panel.textContent = "You are not assigned to this form.";
    return;
  }
  panel.innerHTML = `<div class="card"><h2>${esc(f.id.toUpperCase())} form configuration</h2><p>Published: ${f.published ? "0." + f.published : "not yet published"} · ${f.draft ? "Draft: " + esc(f.draft.state) : "No draft"}</p><div id="form-actions"></div><div id="form-editor"></div><h3>Immutable version archive</h3><div id="versions"></div></div>`;
  const a = $("#form-actions");
  actions(a, [
    [
      "Edit working draft",
      () => {
        editForm = f;
        editor = structuredClone(
          f.draft?.definition ||
            f.versions.find((v) => v.number === f.published).definition,
        );
        drawEditor();
      },
    ],
    ...(f.draft?.state === "draft"
      ? [
          [
            "Submit for A+ publication",
            async () => {
              await api("form-review", { id: f.id, revision: f.revision });
              await refreshStaff();
            },
          ],
        ]
      : []),
    ...(user.role === "owner" && f.draft?.state === "pending"
      ? [
          [
            "Publish reviewed draft",
            async () => {
              await api("form-publish", { id: f.id, revision: f.revision });
              await load();
              await refreshStaff();
            },
            "primary",
          ],
          [
            "Return to Admin",
            async () => {
              await api("form-return", { id: f.id, revision: f.revision });
              await refreshStaff();
            },
          ],
        ]
      : []),
  ]);
  if (f.id === "arr")
    actions(a, [
      [
        "Download exact archived ARR 0.1",
        async () => {
          const snapshot = await api("legacy-archive");
          const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
            type: "application/json",
          });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "ARR-0.1-archived-form.json";
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        },
      ],
    ]);
  for (const version of f.versions) {
    const d = document.createElement("details");
    d.append(
      node(
        "summary",
        "",
        `0.${version.number} · ${version.summary} · ${version.by} · ${new Date(version.at).toLocaleString()}`,
      ),
      node("pre", "", JSON.stringify(version.definition, null, 2)),
    );
    $("#versions").append(d);
  }
  if (f.draft) {
    const d = document.createElement("details");
    d.append(
      node("summary", "", "Preview pending/draft definition"),
      node("pre", "", JSON.stringify(f.draft.definition, null, 2)),
    );
    $("#versions").prepend(d);
  }
}
function drawEditor() {
  const area = $("#form-editor");
  area.innerHTML = "";
  area.append(
    node(
      "p",
      "warning",
      "Changes stay private until A+ publishes. Name, email and demo acknowledgment are protected fields. Conditions within a step use OR; no conditions means the step always runs.",
    ),
  );
  const bind = (parent, label, value, fn, type = "text") => {
    const l = node("label", "field", label);
    const e = document.createElement(
      type === "textarea" ? "textarea" : "input",
    );
    if (type !== "textarea") e.type = type;
    e.value = value;
    e.oninput = () => fn(e.value);
    l.append(e);
    parent.append(l);
  };
  bind(area, "Form title", editor.title, (v) => (editor.title = v));
  bind(
    area,
    "Description",
    editor.description,
    (v) => (editor.description = v),
  );
  const rows = node("div");
  area.append(rows);
  editor.fields.forEach((field, index) => {
    const row = node("div", "editor-row");
    rows.append(row);
    const grid = node("div", "grid");
    row.append(grid);
    bind(grid, "Stable question key", field.key, (v) => (field.key = v));
    bind(grid, "Question title", field.label, (v) => (field.label = v));
    bind(grid, "Help / small print", field.help, (v) => (field.help = v));
    bind(
      grid,
      "Page (1–6)",
      field.page,
      (v) => (field.page = Number(v)),
      "number",
    );
    const l = node("label", "field", "Type"),
      sel = document.createElement("select");
    [
      "text",
      "textarea",
      "email",
      "date",
      "select",
      "multi",
      "checkbox",
    ].forEach((v) => sel.append(new Option(v, v)));
    sel.value = field.type;
    sel.onchange = () => (field.type = sel.value);
    l.append(sel);
    grid.append(l);
    const req = node("label", "field", "Required "),
      c = document.createElement("input");
    c.type = "checkbox";
    c.checked = field.required;
    c.onchange = () => (field.required = c.checked);
    req.append(c);
    grid.append(req);
    bind(
      row,
      "Options (one per line; order is preserved)",
      field.options.join("\n"),
      (v) =>
        (field.options = v
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)),
      "textarea",
    );
    actions(row, [
      [
        "↑",
        () => {
          if (index) {
            [editor.fields[index - 1], editor.fields[index]] = [
              editor.fields[index],
              editor.fields[index - 1],
            ];
            drawEditor();
          }
        },
      ],
      [
        "↓",
        () => {
          if (index < editor.fields.length - 1) {
            [editor.fields[index + 1], editor.fields[index]] = [
              editor.fields[index],
              editor.fields[index + 1],
            ];
            drawEditor();
          }
        },
      ],
      [
        "Remove question",
        () => {
          editor.fields.splice(index, 1);
          drawEditor();
        },
        "danger",
      ],
    ]);
  });
  actions(area, [
    [
      "Add question",
      () => {
        editor.fields.push({
          key: "question" + (editor.fields.length + 1),
          label: "New question",
          help: "",
          type: "text",
          page: 2,
          required: false,
          options: [],
        });
        drawEditor();
      },
    ],
  ]);
  area.append(node("h3", "", "Ordered approval steps"));
  editor.steps.forEach((step, index) => {
    const row = node("div", "editor-row");
    area.append(row);
    bind(row, "Step ID", step.id, (v) => (step.id = v));
    bind(row, "Step label", step.label, (v) => (step.label = v));
    const sel = document.createElement("select");
    ["reviewer", "manager"].forEach((v) => sel.append(new Option(v, v)));
    sel.value = step.role;
    sel.onchange = () => (step.role = sel.value);
    row.append(sel);
    for (const [ci, cond] of step.when.entries()) {
      const line = node("div", "grid");
      const field = document.createElement("select");
      editor.fields.forEach((f) => field.append(new Option(f.label, f.key)));
      field.value = cond.field;
      field.onchange = () => (cond.field = field.value);
      line.append(field);
      const op = document.createElement("select");
      ["equals", "not_equals", "contains", "not_empty"].forEach((v) =>
        op.append(new Option(v, v)),
      );
      op.value = cond.op;
      op.onchange = () => (cond.op = op.value);
      line.append(op);
      bind(
        line,
        "Condition value (true/false for checkbox)",
        cond.value,
        (v) => (cond.value = v),
      );
      line.append(
        button("Remove condition", () => {
          step.when.splice(ci, 1);
          drawEditor();
        }),
      );
      row.append(line);
    }
    actions(row, [
      [
        "Add OR condition",
        () => {
          step.when.push({
            field: editor.fields[0].key,
            op: "equals",
            value: "",
          });
          drawEditor();
        },
      ],
      [
        "↑ Step",
        () => {
          if (index) {
            [editor.steps[index - 1], editor.steps[index]] = [
              editor.steps[index],
              editor.steps[index - 1],
            ];
            drawEditor();
          }
        },
      ],
      [
        "Remove step",
        () => {
          editor.steps.splice(index, 1);
          drawEditor();
        },
        "danger",
      ],
    ]);
  });
  actions(area, [
    [
      "Add approval step",
      () => {
        editor.steps.push({
          id: "step" + (editor.steps.length + 1),
          label: "New approval",
          role: "manager",
          when: [],
        });
        drawEditor();
      },
    ],
  ]);
  bind(
    area,
    "Change summary",
    editForm.draft?.summary || "",
    (v) => (area.dataset.summary = v),
    "textarea",
  );
  actions(area, [
    [
      "Preview questions",
      () => {
        const preview = node("div", "card");
        preview.append(node("h2", "", editor.title));
        editor.fields.forEach((f) =>
          preview.append(control(f, null, () => {})),
        );
        area.append(preview);
      },
    ],
    [
      "Save private draft",
      async () => {
        await api("form-save", {
          id: editForm.id,
          revision: editForm.revision,
          definition: editor,
          summary:
            area.dataset.summary || editForm.draft?.summary || "Form changes",
        });
        await refreshStaff();
      },
      "primary",
    ],
  ]);
}
function accounts() {
  const panel = $("#panel");
  panel.innerHTML =
    '<div class="card"><h2>Accounts and form assignments</h2><p>Inactive accounts lose access immediately. New accounts need an approved one-time setup link. Passwords are never displayed.</p><div id="account-list"></div><div id="account-editor"></div><div id="account-more"></div></div>';
  const table = document.createElement("table");
  table.className = "account-table";
  table.innerHTML =
    "<thead><tr><th>Account / role / forms</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody>";
  for (const u of dash.users) {
    const row = document.createElement("tr");
    row.dataset.accountId = u.id;
    const identity = node("td"),
      status = node(
        "td",
        u.suspendedAt ? "account-suspended" : "",
        u.suspendedAt ? "suspended" : u.active ? "active" : "inactive",
      ),
      controls = node("td", "account-actions");
    identity.append(
      button(`${u.username} · ${u.role} · ${u.forms.join(", ")}`, () =>
        editAccount(u),
      ),
    );
    if (user.role === "owner" && u.role !== "owner") {
      controls.append(
        button(
          u.suspendedAt ? "Unsuspend/Resume" : "Suspend",
          async () => {
            await api(u.suspendedAt ? "user-resume" : "user-suspend", {
              id: u.id,
              generation: u.generation,
            });
            await refreshStaff();
            accounts();
          },
          u.suspendedAt ? "resume-account" : "",
        ),
        button("Delete", () => confirmAccountDelete(u)),
      );
    }
    row.append(identity, status, controls);
    table.tBodies[0].append(row);
  }
  $("#account-list").append(table);
  actions($("#account-more"), [
    ["Add account", () => editAccount(null)],
    ...(user.role === "admin"
      ? [
          [
            "Request more form access",
            async () => {
              const section = node("div", "card");
              const selected = new Set();
              for (const f of catalog) {
                const l = node("label", "field", f.id.toUpperCase()),
                  c = document.createElement("input");
                c.type = "checkbox";
                c.onchange = () =>
                  c.checked ? selected.add(f.id) : selected.delete(f.id);
                l.append(c);
                section.append(l);
              }
              actions(section, [
                [
                  "Send to A+",
                  async () => {
                    await api("access-request", { forms: [...selected] });
                    msg("Access request sent to A+.");
                  },
                ],
              ]);
              $("#account-more").append(section);
            },
          ],
        ]
      : []),
  ]);
  if (user.role === "owner") {
    for (const r of dash.resets) {
      const u = dash.users.find((u) => u.id === r.user);
      $("#account-more").append(
        button(
          "Approve password reset: " + (u?.username || r.user),
          async () => {
            await api("reset-approve", { id: r.user });
            await refreshStaff();
          },
        ),
      );
    }
    for (const a of dash.accessRequests) {
      $("#account-more").append(
        node(
          "p",
          "warning",
          a.username +
            " requests access to: " +
            a.forms.join(", ") +
            " — edit their account to grant selected assignments.",
        ),
      );
    }
    actions($("#account-more"), [
      [
        "Create another form",
        async () => {
          const id = prompt("Short form code (example: xyz)");
          if (!id) return;
          const title = prompt("Form title");
          if (!title) return;
          await api("form-create", { id, title });
          await refreshStaff();
          msg(
            "Unpublished form created. Assign Admins and publish a reviewed draft.",
          );
        },
      ],
    ]);
  }
}
function editAccount(u) {
  if (u?.role === "owner") {
    msg("Use Change password for your A+ account.");
    return;
  }
  const area = $("#account-editor");
  area.innerHTML =
    '<form class="card" id="account-form"><label class="field">Username<input name="username" required></label><label class="field">Email<input name="email" type="email" required></label><label class="field">Role<select name="role">' +
    (user.role === "owner" ? '<option value="admin">Admin</option>' : "") +
    '<option value="reviewer">Reviewer</option><option value="manager">Manager</option></select></label><label class="field"><input type="checkbox" name="active"> Active</label><fieldset id="assignments"><legend>Assigned forms</legend></fieldset><button class="primary">Save approved account</button></form>';
  const form = $("#account-form");
  form.username.value = u?.username || "";
  form.email.value = u?.email || "";
  form.role.value = u?.role || (user.role === "owner" ? "admin" : "reviewer");
  form.active.checked = u?.active ?? true;
  if (u?.suspendedAt) {
    form.active.disabled = true;
    form.active.title = "Use Owner Unsuspend/Resume to restore access.";
  }
  for (const f of dash.forms) {
    const l = node("label", "field", f.id.toUpperCase()),
      c = document.createElement("input");
    c.type = "checkbox";
    c.name = "forms";
    c.value = f.id;
    c.checked = u?.forms.includes(f.id) || false;
    l.append(c);
    $("#assignments").append(l);
  }
  if (u && user.role === "owner")
    actions(area, [
      [
        "Issue manual setup link (private delivery)",
        async () => {
          if (
            !confirm(
              `Issue a setup link for ${u.username}? Verify the recipient separately and deliver privately. Existing sessions and setup links will be invalidated. Continue?`,
            )
          )
            return;
          const r = await api("setup-link", { id: u.id });
          const box = node(
            "div",
            "warning",
            `Private one-hour setup link for ${r.username} — share only with this verified account owner:`,
          );
          box.id = "manual-setup-link";
          area.querySelector("#manual-setup-link")?.remove();
          const t = document.createElement("textarea");
          t.setAttribute("aria-label", `Setup link for ${r.username}`);
          t.readOnly = true;
          t.value = r.link;
          box.append(t);
          area.append(box);
        },
      ],
    ]);
  form.onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const v = new FormData(form);
      const savedAccount = await api("user-save", {
        id: u?.id,
        username: v.get("username"),
        email: v.get("email"),
        role: v.get("role"),
        active: form.active.checked,
        forms: v.getAll("forms"),
      });
      await refreshStaff();
      msg(
        `Account saved as ${savedAccount.username}. Setup email queued if needed.`,
      );
    });
  };
}
async function metrics() {
  const m = await api("metrics"),
    p = $("#panel");
  p.innerHTML = `<div class="card"><h2>A+ metrics</h2><p class="muted">Pacific business hours: Mon–Fri, 8–5; holidays excluded. Counts cover retained records (seven days), not lifetime totals. Views are page views, not unique people.</p><div class="grid"><div>Unique request families<div class="metric">${m.uniqueRequests}</div></div><div>Total submitted attempts<div class="metric">${m.totalAttempts}</div></div><div>Unapproved / unrejected<div class="metric">${m.pending}</div></div><div>Form views<div class="metric">${m.views.reduce((a, v) => a + v.views, 0)}</div></div></div><div id="charts"></div><h3>Per-attempt and per-approver timing</h3><div id="timings"></div><label class="field">Excluded holidays (one YYYY-MM-DD per line)<textarea id="holidays"></textarea></label><div id="calendar-actions"></div></div>`;
  for (const f of m.byForm) {
    const box = node(
      "div",
      "answer",
      `${f.form.toUpperCase()}: ${f.pending} pending / ${f.attempts} attempts`,
    );
    const bar = document.createElement("progress");
    bar.max = Math.max(1, f.attempts);
    bar.value = f.pending;
    box.append(bar);
    $("#charts").append(box);
  }
  for (const r of m.timings) {
    const d = document.createElement("details");
    d.append(
      node(
        "summary",
        "",
        `${r.reference} · family ${r.family.slice(0, 8)} · attempt ${r.attempt} · ${r.status} · ${r.businessMinutes} business minutes`,
      ),
    );
    for (const a of r.decisions)
      d.append(
        node(
          "p",
          "",
          `${a.step} · ${a.actor} · ${a.result} · ${a.businessMinutes} business minutes`,
        ),
      );
    $("#timings").append(d);
  }
  $("#holidays").value = m.calendar.holidays.join("\n");
  actions($("#calendar-actions"), [
    [
      "Save holiday calendar",
      async () => {
        await api("settings", {
          holidays: $("#holidays")
            .value.split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        });
        await metrics();
      },
    ],
  ]);
}
function operations() {
  const p = $("#panel");
  p.innerHTML =
    '<div class="card"><h2>Publication approvals, email and audit</h2><div id="pending-pubs"></div><h3>Email outbox</h3><p>Sent means accepted by the email provider, not verified inbox delivery. Missing mail configuration leaves messages pending. Check delivery before relying on notifications.</p><div id="mail-status"></div><h3>Administrative history</h3><div id="admin-history"></div></div>';
  for (const f of dash.forms.filter((f) => f.draft?.state === "pending"))
    $("#pending-pubs").append(
      button("Review pending publication: " + f.id.toUpperCase(), () => {
        formId = f.id;
        tab = "forms";
        renderStaff();
      }),
    );
  for (const m of dash.mail)
    $("#mail-status").append(
      node("p", "", `${m.subject} · ${m.status} · attempts ${m.attempts}`),
    );
  for (const e of dash.events)
    $("#admin-history").append(
      node("div", "history", `${e.at} · ${e.actor} · ${e.action} · ${e.note}`),
    );
}
async function route() {
  const hash = location.hash;
  if (hash.startsWith("#receipt/")) {
    location.replace("index.html" + hash);
    return;
  }
  if (hash.startsWith("#activate=")) {
    const token = hash.slice(10);
    history.replaceState(null, "", location.pathname + "#activate");
    app.innerHTML =
      '<section class="intake card"><h1>Checking setup link…</h1></section>';
    let identity;
    try {
      identity = await api("activation-info", { token });
    } catch (e) {
      app.innerHTML =
        '<section class="intake card"><h1>Setup link unavailable</h1><p>Ask A+ for a fresh link for your account.</p></section>';
      throw e;
    }
    app.innerHTML =
      '<section class="intake card"><h1>Set your personal password</h1><p>Account: <strong>' +
      esc(identity.username) +
      '</strong></p><p>If this is not your username, stop and ask A+ for the correct link.</p><form id="activate"><label class="field">New password (14+ characters)<input name="password" type="password" minlength="14" required autocomplete="new-password"></label><button class="primary">Set password</button></form></section>';
    passwordControls($("#activate"), true);
    $("#activate").onsubmit = (e) => {
      e.preventDefault();
      run(async () => {
        const result = await api("activate", {
          token,
          password: e.target.password.value,
          passwordConfirm: e.target.passwordConfirm.value,
        });
        user = null;
        dash = null;
        msg(`Password set for ${result.username}. Sign in with this username.`);
        history.replaceState(null, "", location.pathname + "#staff");
        login(result.username);
      });
    };
    return;
  }
  if (hash.startsWith("#receipt=")) {
    receipt = hash.slice(9);
    await showReceipt();
    return;
  }
  if (hash === "#staff") {
    if (user) await refreshStaff();
    else login();
    return;
  }
  intake();
}
window.addEventListener("hashchange", () => run(route));
setInterval(() => {
  if (draft && expires && Date.now() >= expires) {
    reset();
    msg(
      "The 20-minute window expired. Only page one was captured as a partial. Please start again.",
    );
    if (location.hash !== "#staff") intake();
  } else if ($("#timer") && expires)
    $("#timer").textContent =
      Math.max(0, Math.ceil((expires - Date.now()) / 60000)) +
      " minutes remaining";
  if (kiosk && Date.now() - activity > 180000) {
    activity = Date.now();
    reset();
    receipt = null;
    void api("logout");
    user = null;
    dash = null;
    location.hash = "kiosk";
    intake();
  }
}, 1000);
run(async () => {
  await load();
  if (kiosk) {
    await api("logout");
    user = null;
  }
  await api("visit", { form: formId });
  await route();
});
