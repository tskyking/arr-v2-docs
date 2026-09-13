"use strict";
const main = document.querySelector("#main");
const dialog = document.querySelector("#detail");
const BASE = location.pathname.replace(/\/$/, "") + "/";
const labels = {
  submitted: "Ready for review",
  needs_approval: "Manager approval",
  approved: "Approved · not provisioned",
  needs_info: "Needs information",
  denied: "Denied",
  provisioned: "Provisioned · demo",
};
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const niceDate = (value) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
const statusTag = (status) =>
  `<span class="status ${esc(status)}">${esc(labels[status] || status)}</span>`;
const defaults = () => ({
  name: "",
  email: "",
  phone: "",
  department: "",
  affiliation: "Employee",
  sponsor: "",
  sponsorEmail: "",
  facility: "",
  areas: "",
  accessTypes: ["Building / badge"],
  reason: "",
  startDate: "",
  endDate: "",
  schedule: "Business hours",
  exception: "",
  badge: "",
  plate: "",
  vehicle: "",
  urgency: "Standard",
  consent: false,
});
let data = defaults(),
  photo = null,
  step = 0,
  kiosk = false,
  role = null,
  records = [],
  selected = null;
let submitting = false,
  photoBusy = false,
  lastActivity = Date.now(),
  receipt = null,
  filter = "all",
  search = "";
let pageVersion = 0,
  photoVersion = 0;
async function api(path, method = "GET", payload) {
  const response = await fetch(BASE + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-ARR-Request": "1" },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const result = await response.json();
  if (!response.ok) {
    const e = new Error(
      result.error || "The service is unavailable. Please try again.",
    );
    e.status = response.status;
    throw e;
  }
  return result;
}
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.textContent = "";
  }, 5000);
}
function showError(message, target = "#form-error") {
  const el = document.querySelector(target);
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  } else toast(message);
}
function clearStaff() {
  role = null;
  records = [];
  selected = null;
  dialog.close();
  dialog.innerHTML = "";
}
function clearIntake() {
  data = defaults();
  photo = null;
  step = 0;
  receipt = null;
  photoVersion++;
}
function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}
function focusHeading() {
  const el = main.querySelector("h2,h1");
  if (el) {
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
}
function field(
  name,
  label,
  placeholder = "",
  required = true,
  type = "text",
  full = false,
  hint = "",
) {
  return `<div class="field ${full ? "full" : ""}"><label for="${name}">${label}${required ? '<span class="required">*</span>' : '<span class="optional">optional</span>'}</label><input id="${name}" name="${name}" type="${type}" value="${esc(data[name])}" placeholder="${esc(placeholder)}" ${required ? "required" : ""} maxlength="160" ${type === "email" ? 'inputmode="email"' : ""} ${name === "phone" ? 'inputmode="tel"' : ""} autocomplete="off">${hint ? `<small class="hint">${hint}</small>` : ""}</div>`;
}
function select(name, label, options, full = false) {
  return `<div class="field ${full ? "full" : ""}"><label for="${name}">${label}<span class="required">*</span></label><select id="${name}" name="${name}" required><option value="">Select an option</option>${options.map((o) => `<option ${data[name] === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
}
function textarea(name, label, placeholder, required = true) {
  return `<div class="field full"><label for="${name}">${label}${required ? '<span class="required">*</span>' : '<span class="optional">optional</span>'}</label><textarea id="${name}" name="${name}" maxlength="1500" ${required ? "required" : ""} placeholder="${esc(placeholder)}">${esc(data[name])}</textarea></div>`;
}
function summaryRows(items) {
  return `<dl class="review-grid">${items.map(([label, value, wide]) => `<div ${wide ? 'class="wide"' : ""}><dt>${esc(label)}</dt><dd>${esc(value || "Not provided")}</dd></div>`).join("")}</dl>`;
}
function reviewBlock(title, number, items) {
  return `<section class="review-section"><div class="review-heading"><h3>${title}</h3><button class="btn link" type="button" data-step="${number}">Edit</button></div>${summaryRows(items)}</section>`;
}
const landscape = `<svg class="landscape" viewBox="0 0 302 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 49 40 25 64 34 99 4 142 43 170 23 206 49 240 16 302 51V60H0" fill="#355b57"/><path d="m0 60 57-23 34 18 63-13 33 11 60-20 55 27" fill="#51776a"/><path d="M0 56c70-15 115 13 190-3s82-8 112-1" stroke="#c4a170" fill="none" opacity=".6"/></svg>`;
function side() {
  return `<aside class="sidebar"><section class="side-card dark"><div class="eyebrow">A clear path to access</div><h3>The right access.<br>The right approvals.</h3><ol class="journey"><li><span class="n">1</span><div><b>Tell us what you need</b><p>One request for badge, key, or parking access.</p></div></li><li><span class="n">2</span><div><b>We check and route it</b><p>Facilities reviews the details. Exceptions go to a manager.</p></div></li><li><span class="n">3</span><div><b>Verify. Provision. Close.</b><p>Approval comes first. Provisioning is recorded separately.</p></div></li></ol>${landscape}</section><section class="side-card"><h4>At the Facilities desk?</h4><p>Hand over an iPad in kiosk mode. Staff is signed out, and the form clears after submission or 3 minutes of inactivity.</p><button class="btn secondary" id="kiosk-button" type="button">${kiosk ? "Kiosk mode is active" : "Open shared-iPad mode"} <span aria-hidden="true">↗</span></button></section><p class="side-foot">DEMO DATA POLICY<br>Use sample names, badge photos, and vehicle details. Don’t upload government ID. Submissions and photos expire after 7 days.</p></aside>`;
}
function formStep() {
  if (step === 0)
    return `<div class="section-kicker">01 / REQUESTER INFORMATION</div><h2>First, a little about you.</h2><p class="section-help">Help Facilities connect this request to the right person and sponsor.</p><div class="fields">${field("name", "Full name", "e.g. Alex Morgan")}${field("email", "Email address", "alex@example.com", true, "email")}${select("department", "Department", ["Facilities", "Public Works", "Health Services", "Community Development", "Administration", "Other"])}${select("affiliation", "I am an", ["Employee", "Contractor", "Visitor"])}${field("phone", "Phone number", "e.g. 541-555-0100", false, "tel")}${field("badge", "Existing badge / employee reference", "Sample reference only", false)}<div class="field-divider"></div>${field("sponsor", "Manager or on-site sponsor", "e.g. Jordan Lee")}${field("sponsorEmail", "Sponsor email", "jordan@example.com", true, "email")}</div><div class="info-banner"><span aria-hidden="true">ⓘ</span><span>Your sponsor confirms the business need. This demo records the details; it does not email them.</span></div>`;
  if (step === 1)
    return `<div class="section-kicker">02 / ACCESS DETAILS</div><h2>Where do you need access?</h2><p class="section-help">Choose the smallest access scope and time window that meets your needs.</p><div class="fields"><div class="field full"><span class="field-label">Access requested<span class="required">*</span></span><div class="choice-row">${["Building / badge", "Physical key", "Parking"].map((v) => `<label class="choice"><input type="checkbox" name="accessTypes" value="${v}" ${data.accessTypes.includes(v) ? "checked" : ""}>${v}</label>`).join("")}</div></div>${select("facility", "Facility · fictional demo locations", ["Cascades Administration Building", "Juniper Public Services Center", "High Desert Operations Yard"], true)}${field("areas", "Specific doors, rooms, or parking area", "e.g. Main entrance and first-floor meeting rooms", true, "text", true)}${field("startDate", "Access start date", "", true, "date")}${field("endDate", "Access end date", "", true, "date")}${select("schedule", "Access hours", ["Business hours", "After hours", "24/7"])}${select("urgency", "Request priority", ["Standard", "Time-sensitive"])}${textarea("reason", "Business reason", "Briefly describe the work, visit, or assignment that requires access.")}${textarea("exception", "Exceptions or nonstandard needs", "For after-hours access, explain the days, times, and reason.", data.schedule !== "Business hours")}</div><div class="info-banner warn"><span aria-hidden="true">↗</span><span>After-hours, contractor/visitor, physical-key, and other nonstandard requests automatically enter the manager’s queue.</span></div>`;
  if (step === 2)
    return `<div class="section-kicker">03 / SUPPORTING INFORMATION</div><h2>A few helpful details.</h2><p class="section-help">Add a sample badge photo or vehicle information if it helps explain your request.</p><div class="fields"><div class="field full"><span class="field-label">Sample badge or profile photo <span class="optional">optional</span></span><div class="photo-drop">${photo ? `<img class="photo-preview" src="${photo}" alt="Your selected demo attachment"><button type="button" class="btn link" id="remove-photo">Remove photo</button>` : `<div class="photo-icon" aria-hidden="true">▧</div><p>Take a photo on your phone or iPad,<br>or choose an image from your device.</p>`}<div class="photo-actions"><input class="file-input" type="file" id="camera" accept="image/jpeg,image/png,image/webp" capture="environment"><label class="btn secondary" for="camera">Take photo</label><input class="file-input" type="file" id="upload" accept="image/jpeg,image/png,image/webp"><label class="btn secondary" for="upload">Choose image</label></div><small class="hint">JPG, PNG, or WebP · up to 10 MB before resizing<br>Sample images only. No driver’s license or government ID.</small></div></div>${field("plate", "License plate", "e.g. DEMO-123", data.accessTypes.includes("Parking"))}${field("vehicle", "Vehicle description", "e.g. Blue hatchback", false)}${textarea("exception", "Other details / exception explanation", "Optional information for the reviewer.", data.schedule !== "Business hours")}</div><div class="info-banner"><span aria-hidden="true">◇</span><span>Photos are resized and location metadata is removed. Only signed-in staff can view them. No face recognition is used.</span></div>`;
  return `<div class="section-kicker">04 / CHECK & SUBMIT</div><h2>Everything look right?</h2><p class="section-help">Your request enters a review queue. Submission is not approval or permission to enter.</p>${reviewBlock(
    "Requester & sponsor",
    0,
    [
      ["Name", data.name],
      ["Email", data.email],
      ["Department", data.department],
      ["Affiliation", data.affiliation],
      ["Phone", data.phone],
      ["Badge reference", data.badge],
      ["Sponsor", data.sponsor],
      ["Sponsor email", data.sponsorEmail],
    ],
  )}${reviewBlock("Access requested", 1, [
    ["Facility", data.facility, true],
    ["Access types", data.accessTypes.join(" · ")],
    ["Areas", data.areas],
    ["Start", niceDate(data.startDate)],
    ["End", niceDate(data.endDate)],
    ["Schedule", data.schedule],
    ["Priority", data.urgency],
    ["Business reason", data.reason, true],
  ])}${reviewBlock("Supporting details", 2, [
    ["Photo", photo ? "Attached · private to staff" : "No photo attached"],
    ["License plate", data.plate],
    ["Vehicle", data.vehicle],
    ["Exceptions", data.exception],
  ])}<label class="consent"><input type="checkbox" name="consent" required ${data.consent ? "checked" : ""}><span><strong>This is fictional demo information.</strong> I understand this is not an official County form, no real access will be granted, and the submission will be deleted after 7 days.</span></label>`;
}
function renderIntake() {
  main.innerHTML = `${kiosk ? '<div class="kiosk-banner"><span><strong>Shared-iPad mode</strong> · This form clears after 3 idle minutes.</span><button class="btn link" id="exit-kiosk">Exit kiosk</button></div>' : ""}<section class="hero"><div class="hero-copy"><div class="eyebrow">ARR / Access Request Review</div><h1>Access starts with<br><em>a simple request.</em></h1><p>Buildings. Badges. Keys. Parking. Tell us what you need, and we’ll put your request in the right hands.</p></div><div class="service-note"><small>Designed around people</small><strong>One form. A clear next step.</strong><p>Start on your phone, or use a shared iPad at the Facilities desk.</p><div class="tiny-label">↳ About 3 minutes to complete</div></div></section><div class="layout"><section class="form-card"><div class="card-top"><strong>NEW ACCESS REQUEST</strong><span class="tag">${kiosk ? "IPAD MODE" : "DEMO INTAKE"}</span></div><div class="steps" aria-label="Form progress">${["About you", "Access", "Details", "Review"].map((label, i) => `<div class="step ${i === step ? "current" : i < step ? "done" : ""}" ${i === step ? 'aria-current="step"' : ""}><span class="step-circle">${i < step ? "✓" : i + 1}</span><span>${label}</span></div>`).join("")}</div><form id="intake" autocomplete="off"><div class="form-content"><div class="error hidden" id="form-error" role="alert"></div>${formStep()}<div class="honey" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div></div><div class="form-bottom">${step > 0 ? '<button type="button" class="btn secondary" id="back">← Back</button>' : '<span class="save-note">Fields marked * are required.<br>Your form is not saved until submitted.</span>'}<button class="btn" id="next" type="submit">${step === 3 ? "Submit request" : "Continue"} <span aria-hidden="true">→</span></button></div></form></section>${side()}</div>`;
  const form = main.querySelector("#intake");
  form.addEventListener("input", (e) => {
    const el = e.target;
    if (el.name === "accessTypes") {
      data.accessTypes = [
        ...form.querySelectorAll("[name=accessTypes]:checked"),
      ].map((x) => x.value);
    } else if (el.name in data)
      data[el.name] = el.type === "checkbox" ? el.checked : el.value;
  });
  main.querySelector("[name=schedule]")?.addEventListener("change", () => {
    main.querySelector("[name=exception]").required =
      data.schedule !== "Business hours";
  });
  form.addEventListener("submit", submitStep);
  main.querySelector("#back")?.addEventListener("click", () => {
    step--;
    renderIntake();
    focusHeading();
  });
  main.querySelectorAll("[data-step]").forEach((btn) =>
    btn.addEventListener("click", () => {
      step = Number(btn.dataset.step);
      renderIntake();
      focusHeading();
    }),
  );
  main.querySelector("#kiosk-button")?.addEventListener("click", startKiosk);
  main.querySelector("#exit-kiosk")?.addEventListener("click", () => {
    clearIntake();
    kiosk = false;
    navigate("#request");
  });
  main
    .querySelectorAll("input[type=file]")
    .forEach((input) =>
      input.addEventListener("change", () => loadPhoto(input.files?.[0])),
    );
  main.querySelector("#remove-photo")?.addEventListener("click", () => {
    photo = null;
    photoVersion++;
    renderIntake();
  });
}
async function loadPhoto(file) {
  if (!file) return;
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  ) {
    showError("Choose a JPG, PNG, or WebP image under 10 MB.");
    return;
  }
  const generation = ++photoVersion;
  photoBusy = true;
  const next = document.querySelector("#next");
  if (next) next.disabled = true;
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (img.naturalWidth * img.naturalHeight > 20_000_000)
        throw new Error("Please choose a photo smaller than 20 megapixels.");
      const ratio = Math.min(
          1,
          1000 / img.naturalWidth,
          1000 / img.naturalHeight,
        ),
        canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      if (generation !== photoVersion) return;
      photo = canvas.toDataURL("image/jpeg", 0.75);
      if (photo.length > 800000) {
        photo = null;
        throw new Error("Photo is still too large. Try a smaller image.");
      }
      renderIntake();
      toast("Photo added. Location metadata removed.");
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    showError(e.message || "Unable to read that image.");
  } finally {
    photoBusy = false;
    const button = document.querySelector("#next");
    if (button) button.disabled = false;
  }
}
async function submitStep(e) {
  e.preventDefault();
  if (submitting || photoBusy) return;
  if (step === 1) {
    if (!data.accessTypes.length) {
      showError("Choose at least one access type.");
      return;
    }
    if (data.endDate < data.startDate) {
      showError("End date must follow the start date.");
      return;
    }
    if (
      (Date.parse(data.endDate) - Date.parse(data.startDate)) / 86400000 >
      366
    ) {
      showError("Choose an access window of one year or less.");
      return;
    }
  }
  if (step < 3) {
    step++;
    renderIntake();
    focusHeading();
    return;
  }
  submitting = true;
  const button = document.querySelector("#next");
  button.disabled = true;
  button.textContent = "Submitting…";
  try {
    const result = await api("requests", "POST", {
      data,
      photo,
      website: document.querySelector("[name=website]").value,
    });
    clearIntake();
    receipt = result;
    if (kiosk) {
      renderReceipt(result);
      setTimeout(() => {
        if (kiosk && receipt === result) {
          clearIntake();
          renderIntake();
        }
      }, 45000);
    } else navigate("#receipt/" + result.receipt);
  } catch (err) {
    showError(err.message);
    button.disabled = false;
    button.textContent = "Submit request →";
  } finally {
    submitting = false;
  }
}
async function startKiosk() {
  try {
    await api("logout", "POST", {});
  } catch (e) {
    if (e.status !== 401) {
      showError(
        "Could not sign staff out. Please retry before handing over the iPad.",
      );
      return;
    }
  }
  clearStaff();
  clearIntake();
  kiosk = true;
  lastActivity = Date.now();
  navigate("#kiosk");
}
function renderReceipt(result) {
  const link =
    location.origin +
    BASE +
    "#receipt/" +
    (result.receipt || location.hash.split("/")[1]);
  main.innerHTML = `<section class="success"><div class="success-icon" aria-hidden="true">✓</div><div class="eyebrow">REQUEST RECEIVED</div><h1>You’re in the queue.</h1><p>Your request has been saved. Keep your receipt link to check its progress. Approval and provisioning are separate steps.</p><div class="receipt">${esc(result.reference)}</div>${statusTag(result.status)}<p class="demo-policy">No email has been sent. This is a working demonstration, not a real access authorization. The receipt expires with the request after 7 days.${kiosk ? " This screen clears in 45 seconds." : ""}</p><div class="success-actions"><button class="btn" id="copy-receipt">Copy receipt link</button><button class="btn secondary" id="refresh-status">Refresh status</button><button class="btn secondary" id="print-receipt">Print receipt</button><button class="btn secondary" id="new-request">${kiosk ? "Done · clear screen" : "Start another request"}</button></div><p class="print-only">Receipt: ${esc(link)}</p></section>`;
  main.querySelector("#copy-receipt").onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Receipt link copied.");
    } catch {
      toast("Copy the receipt link from your browser address bar.");
    }
  };
  main.querySelector("#refresh-status").onclick = async () => {
    try {
      const key = result.receipt || location.hash.split("/")[1];
      const latest = await api("status", "POST", { receipt: key });
      renderReceipt({ ...latest, receipt: key });
    } catch (e) {
      toast(e.message);
    }
  };
  main.querySelector("#print-receipt").onclick = () => window.print();
  main.querySelector("#new-request").onclick = () => {
    clearIntake();
    navigate(kiosk ? "#kiosk" : "#request");
  };
}
function renderLogin(error = "") {
  main.innerHTML = `<section class="login-card"><div class="eyebrow">STAFF WORKSPACE</div><h1>A clear view<br>of every request.</h1><p>Sign in to review requests, record decisions, and track provisioning.</p><form id="login"><div class="error ${error ? "" : "hidden"}" id="login-error" role="alert">${esc(error)}</div><div class="fields"><div class="field"><label for="role">Staff role</label><select id="role" name="role"><option value="reviewer">Facilities reviewer</option><option value="manager">Approving manager</option></select></div><div class="field"><label for="password">Password</label><input type="password" id="password" name="password" required autocomplete="current-password" maxlength="200"></div></div><button class="btn" type="submit">Sign in <span aria-hidden="true">→</span></button></form><p class="demo-policy">Two protected demo roles. Access is provided by the demo owner; passwords are not displayed on the public site.</p></section>`;
  main.querySelector("#login").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const result = await api("login", "POST", {
        role: e.target.elements.namedItem("role").value,
        password: e.target.elements.namedItem("password").value,
      });
      e.target.elements.namedItem("password").value = "";
      role = result.role;
      filter = role === "manager" ? "needs_approval" : "all";
      await loadWorkspace();
    } catch (err) {
      showError(err.message, "#login-error");
      btn.disabled = false;
    }
  };
}
async function loadWorkspace() {
  const generation = pageVersion;
  try {
    const found = await api("requests");
    if (generation !== pageVersion) return;
    records = found;
    renderWorkspace();
  } catch (e) {
    if (generation !== pageVersion) return;
    if (e.status === 401) {
      clearStaff();
      renderLogin("Your session ended. Please sign in again.");
    } else {
      renderWorkspace();
      showError(e.message, "#workspace-error");
    }
  }
}
function renderWorkspace() {
  const count = (s) => records.filter((r) => r.status === s).length;
  main.innerHTML = `<div class="workspace-head"><div><div class="eyebrow">${role === "manager" ? "MANAGEMENT APPROVALS" : "FACILITIES WORKSPACE"}</div><h1>Good access starts<br>with a clear decision.</h1><p>${role === "manager" ? "Review nonstandard access before Facilities provisions it." : "Every request, its next step, and the record behind it."}</p></div><div class="workspace-actions"><button class="btn secondary" id="refresh">Refresh queue ↻</button><button class="btn secondary" id="logout">Sign out</button></div></div><div class="metrics"><div class="metric"><strong>${count("submitted")}</strong><span>Ready for review</span></div><div class="metric"><strong>${count("needs_approval")}</strong><span>Awaiting manager</span></div><div class="metric"><strong>${count("approved")}</strong><span>Ready to provision</span></div><div class="metric"><strong>${count("provisioned")}</strong><span>Provisioned</span></div></div><div class="error hidden" id="workspace-error" role="alert"></div><div class="toolbar"><label class="file-input" for="search">Search requests</label><input class="search" id="search" placeholder="Search name, reference, facility…" value="${esc(search)}"><label class="file-input" for="filter">Filter by status</label><select id="filter"><option value="all">All requests</option>${Object.entries(
    labels,
  )
    .map(
      ([v, l]) =>
        `<option value="${v}" ${filter === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select><span class="tag">${role === "manager" ? "MANAGER" : "REVIEWER"}</span></div><section class="queue" id="queue" aria-label="Access request queue"></section><p class="demo-policy">Showing up to 250 newest requests · Retained for 7 days · Refresh to see new submissions.<br>Decisions stay in this workspace. Contact requesters/sponsors through your normal channels; this demo sends no email.</p>`;
  renderQueue();
  main.querySelector("#search").oninput = (e) => {
    search = e.target.value;
    renderQueue();
  };
  main.querySelector("#filter").onchange = (e) => {
    filter = e.target.value;
    renderQueue();
  };
  main.querySelector("#refresh").onclick = loadWorkspace;
  main.querySelector("#logout").onclick = async () => {
    try {
      await api("logout", "POST", {});
      clearStaff();
      renderLogin();
    } catch (e) {
      showError(e.message, "#workspace-error");
    }
  };
}
function renderQueue() {
  const shown = records.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      [r.reference, r.data.name, r.data.facility, r.data.department].some((v) =>
        v.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  document.querySelector("#queue").innerHTML = shown.length
    ? shown
        .map(
          (r) =>
            `<button class="queue-row" data-id="${r.id}"><span><strong>${esc(r.data.name)}</strong><small>${esc(r.reference)} · ${niceDate(r.createdAt)}</small></span><span><strong>${esc(r.data.facility)}</strong><small>${esc(r.data.accessTypes.join(" · "))}</small></span><span>${statusTag(r.status)}<small>${r.owner ? esc(r.owner) : "Unassigned"}${r.hasPhoto ? " · Photo attached" : ""}</small></span><span class="arrow" aria-hidden="true">↗</span></button>`,
        )
        .join("")
    : '<div class="empty"><h3>No requests here yet.</h3><p>New submissions will appear in this queue. Try another filter or refresh.</p></div>';
  document
    .querySelectorAll(".queue-row")
    .forEach((btn) => (btn.onclick = () => openDetail(btn.dataset.id)));
}
function openDetail(id) {
  selected = records.find((r) => r.id === id);
  if (!selected) return;
  const r = selected,
    d = r.data;
  const terminal = ["denied", "provisioned"].includes(r.status);
  const canApprove =
    ["submitted", "needs_approval"].includes(r.status) &&
    (!r.managementRequired || role === "manager");
  dialog.innerHTML = `<div class="detail-top"><div><small>${esc(r.reference)} · ${esc(d.department)}</small><h2 id="detail-title">${esc(d.name)}</h2>${statusTag(r.status)}</div><button class="close" aria-label="Close request">×</button></div><div class="detail-body"><div>${r.managementRequired ? `<div class="info-banner warn">Manager approval required: ${esc(r.approvalReasons.join(", ") || "Escalated by staff")}</div>` : ""}<h3>Requester & sponsor</h3>${summaryRows(
    [
      ["Requester email", d.email],
      ["Phone", d.phone],
      ["Affiliation", d.affiliation],
      ["Badge reference", d.badge],
      ["Sponsor", d.sponsor],
      ["Sponsor email", d.sponsorEmail],
    ],
  )}<h3>Requested access</h3>${summaryRows([
    ["Facility", d.facility, true],
    ["Types", d.accessTypes.join(" · ")],
    ["Areas", d.areas],
    ["Start", niceDate(d.startDate)],
    ["End", niceDate(d.endDate)],
    ["Hours", d.schedule],
    ["Priority", d.urgency],
    ["Business reason", d.reason, true],
    ["Exceptions", d.exception, true],
    ["License plate", d.plate],
    ["Vehicle", d.vehicle],
  ])}${r.hasPhoto ? `<h3>Private demo attachment</h3><img class="detail-photo" src="${BASE}requests/${r.id}/photo" alt="Submitted demo badge or profile attachment">` : ""}<h3>Decision history</h3><ol class="timeline">${r.history.map((h) => `<li><b>${esc(h.actor)} · ${esc(h.action.replaceAll("_", " "))}</b><small>${new Date(h.at).toLocaleString()}</small><p>${esc(h.note)}</p></li>`).join("")}</ol></div><section class="decision-panel"><h3>${terminal ? "Request closed" : "Record the next step"}</h3><p class="hint">${terminal ? "The audit trail is retained until this demo request expires." : "You are signed in as " + (role === "manager" ? "approving manager." : "Facilities reviewer.")}</p><div class="error hidden" id="decision-error" role="alert"></div>${terminal ? "" : `<div class="field"><label for="decision-note">Decision / verification notes</label><textarea id="decision-note" maxlength="2000" placeholder="Record the reason, verification, or clarification…"></textarea></div><label class="consent"><input type="checkbox" id="verified"><span>${r.status === "approved" ? "I verified provisioning in this demo and recorded the badge/key reference." : "I verified the sponsor, business need, and requested scope in this demo."}</span></label>${canApprove ? '<button class="btn teal" data-action="approve">Approve request</button>' : ""}${role === "reviewer" && r.status === "approved" ? '<button class="btn teal" data-action="provision">Record provisioning</button>' : ""}${role === "reviewer" ? '<button class="btn secondary" data-action="assign">Assign to me</button>' : ""}${["submitted", "approved"].includes(r.status) ? '<button class="btn secondary" data-action="escalate">Route to manager</button>' : ""}${role === "reviewer" && r.status === "needs_info" ? '<button class="btn secondary" data-action="resume">Clarified · resume review</button>' : ""}${r.status !== "needs_info" ? '<button class="btn secondary" data-action="needs_info">Needs more information</button>' : ""}<button class="btn danger" data-action="deny">Deny request</button><p class="hint">Routing adds this to the manager’s queue; it does not send an email. No physical access system is connected.</p>`}</section></div>`;
  dialog.querySelector(".close").onclick = () => dialog.close();
  dialog.querySelectorAll("[data-action]").forEach(
    (btn) =>
      (btn.onclick = async () => {
        const action = btn.dataset.action;
        dialog.querySelectorAll("button").forEach((b) => (b.disabled = true));
        try {
          const next = await api("requests/" + r.id, "PATCH", {
            action,
            note: dialog.querySelector("#decision-note").value,
            verified: dialog.querySelector("#verified").checked,
            version: r.version,
          });
          records = records.map((x) => (x.id === r.id ? next : x));
          renderWorkspace();
          openDetail(r.id);
          toast("Decision saved to the audit trail.");
        } catch (e) {
          showError(e.message, "#decision-error");
          dialog
            .querySelectorAll("button")
            .forEach((b) => (b.disabled = false));
          if (e.status === 409) {
            dialog.close();
            await loadWorkspace();
            toast(
              "Queue refreshed. Reopen the request to review the latest decision.",
            );
          }
          if (e.status === 401) {
            dialog.close();
            role = null;
            renderLogin("Your session ended. Please sign in again.");
          }
        }
      }),
  );
  if (!dialog.open) dialog.showModal();
}
async function route() {
  const generation = ++pageVersion;
  dialog.close();
  const hash = location.hash || "#request";
  document
    .querySelector("#nav-request")
    .classList.toggle("active", !hash.startsWith("#staff"));
  document
    .querySelector("#nav-staff")
    .classList.toggle("active", hash.startsWith("#staff"));
  if (hash === "#staff") {
    if (kiosk) {
      kiosk = false;
      clearIntake();
    }
    main.innerHTML = "<p>Opening the staff workspace…</p>";
    try {
      const session = await api("session");
      if (generation !== pageVersion) return;
      role = session.role;
      if (role) {
        filter = role === "manager" ? "needs_approval" : "all";
        await loadWorkspace();
      } else renderLogin();
    } catch (e) {
      if (generation === pageVersion) renderLogin(e.message);
    }
    return;
  }
  if (hash.startsWith("#receipt/")) {
    const key = hash.slice(9);
    main.innerHTML = "<p>Checking your request…</p>";
    try {
      const result = await api("status", "POST", { receipt: key });
      if (generation === pageVersion)
        renderReceipt({ ...result, receipt: key });
    } catch (e) {
      if (generation === pageVersion)
        main.innerHTML = `<section class="success"><h2>Receipt unavailable</h2><p>${esc(e.message)}</p><a class="btn" href="#request">Return to the form</a></section>`;
    }
    return;
  }
  if (hash === "#kiosk" && !kiosk) {
    await startKiosk();
    return;
  }
  if (hash !== "#kiosk") kiosk = false;
  renderIntake();
}
["pointerdown", "keydown", "input"].forEach((event) =>
  document.addEventListener(event, () => {
    lastActivity = Date.now();
  }),
);
setInterval(() => {
  if (kiosk && !submitting && Date.now() - lastActivity > 180000) {
    clearIntake();
    lastActivity = Date.now();
    renderIntake();
    toast("The shared form was cleared after inactivity.");
  }
}, 10000);
window.addEventListener("hashchange", route);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    clearIntake();
    route();
  }
});
route();
