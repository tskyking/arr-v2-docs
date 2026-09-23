/* Tickets are private by default. Every read/write/image request is authorized on
 * the server. DOM removal on expiry complements, but never replaces, that check. */
let ticketState = null,
  ticketSelection = new Set(),
  ticketFocus = null;
function ticketDefaultDates() {
  const today = new Date(),
    start = new Date();
  start.setDate(today.getDate() - 14);
  const day = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: day(start), to: day(today) };
}
let ticketFilters = {
  ...ticketDefaultDates(),
  completed: true,
  rejected: true,
  archived: false,
};
let ticketClockOffset = 0;
const ticketStatuses = [
  "new",
  "approved",
  "implementation requested",
  "in progress",
  "completed",
  "deferred",
  "rejected",
];
function ticketField(parent, label, value = "", type = "text") {
  const l = node("label", "field", label),
    e = document.createElement(type === "textarea" ? "textarea" : "input");
  if (type !== "textarea") e.type = type;
  e.value = value;
  l.append(e);
  parent.append(l);
  return e;
}
function ticketCheck(parent, label, checked = false) {
  const l = node("label", "ticket-check"),
    c = document.createElement("input");
  c.type = "checkbox";
  c.checked = checked;
  l.append(c, document.createTextNode(label));
  parent.append(l);
  return c;
}
function ticketScopes(parent, values) {
  const f = node("fieldset");
  f.append(node("legend", "", "Applies to forms"));
  const boxes = ticketState.forms.map((v) => [
    v.id,
    ticketCheck(f, v.id.toUpperCase(), values.includes(v.id)),
  ]);
  parent.append(f);
  return () => boxes.filter(([, c]) => c.checked).map(([id]) => id);
}
async function refreshTickets() {
  const result = await api("ticket-list");
  if (location.hash !== "#staff" || !user || !$("#tickets")) return;
  ticketState = result;
  ticketClockOffset = Date.parse(result.serverNow) - Date.now();
  const visible = new Set(result.tickets.map((t) => t.id));
  ticketSelection = new Set(
    [...ticketSelection].filter((id) => visible.has(id)),
  );
  renderTickets();
}
function downloadBrief(b) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(
      [
        '<!doctype html><html lang="en"><meta charset="utf-8"><title>ARR implementation brief</title><style>body{max-width:900px;margin:32px auto;font:16px system-ui;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%}</style><h1>ARR implementation brief</h1><pre>' +
          esc(b.brief) +
          "</pre>" +
          (b.screenshots || [])
            .map(
              (i) =>
                "<h2>Screenshot " +
                esc(i.id) +
                "</h2><p>Ticket " +
                esc(i.ticket) +
                '</p><img alt="Ticket screenshot" src="' +
                esc(i.photo) +
                '">',
            )
            .join("") +
          "</html>",
      ],
      { type: "text/html;charset=utf-8" },
    ),
  );
  a.download = `ARR-implementation-${b.id}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function confirmTicketDelete(t) {
  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Delete ticket confirmation");
  dialog.append(
    node("h3", "", "Delete ticket?"),
    node("p", "", t.title),
    node(
      "p",
      "",
      "Are you sure you want to delete? This permanently removes this ticket, its comments, history and screenshots from the system. Downloaded copies and backups are not erased.",
    ),
  );
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  const no = button("No", close);
  const yes = button("Yes", async () => {
    await api("ticket-delete", {
      id: t.id,
      revision: t.revision,
      confirm: true,
    });
    close();
    ticketSelection.delete(t.id);
    if (ticketFocus === t.id) ticketFocus = null;
    await refreshTickets();
    msg("Ticket deleted.");
  });
  dialog.append(no, yes);
  dialog.addEventListener("cancel", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  no.focus();
}
function ticketQuickLocked(t) {
  return (
    t.locked ||
    ["implementation requested", "in progress", "completed"].includes(t.status)
  );
}
async function ticketQuickAction(chosen, status) {
  if (!chosen.length) throw Error("Select tickets first.");
  if (chosen.some(ticketQuickLocked))
    throw Error(
      "Deselect batched or implemented tickets; quick actions cannot change them.",
    );
  if (
    status === "rejected" &&
    !confirm(
      `Reject exactly ${chosen.length} selected ticket(s)? They will not be deleted.\n${chosen.map((t) => t.title).join("\n")}`,
    )
  )
    return;
  await api("ticket-quick-action", {
    tickets: chosen.map((t) => ({ id: t.id, revision: t.revision })),
    status,
  });
  chosen.forEach((t) => ticketSelection.delete(t.id));
  if (
    status === "rejected" &&
    ticketFilters.rejected &&
    chosen.some((t) => t.id === ticketFocus)
  )
    ticketFocus = null;
  await refreshTickets();
  msg(`${chosen.length} ticket(s) ${status}.`);
}
function updateQuickSelection() {
  const selected = ticketState.tickets.filter((t) => ticketSelection.has(t.id));
  document.querySelectorAll("#ticket-batch-actions button").forEach((b) => {
    if (["Approve selected", "Reject Selected"].includes(b.textContent)) {
      b.disabled = !selected.length || selected.some(ticketQuickLocked);
      b.title = b.disabled
        ? "Select only unlocked, unimplemented tickets."
        : "";
    }
  });
}
function renderTickets() {
  const section = $("#tickets");
  if (!section || !ticketState) return;
  const owner = user.role === "owner";
  section.innerHTML =
    '<h2>Enhancement & bug tickets</h2><p>Tickets and screenshots are retained separately from demo requests. Use fictional information; never paste passwords or personal records.</p><div id="ticket-tools" class="actions"></div><div id="ticket-filters" class="grid"></div><div id="ticket-sharing"></div><div id="ticket-table" class="ticket-scroll"></div><div id="ticket-batch-actions"></div><div id="ticket-detail"></div><div id="ticket-compose"></div><div id="ticket-batches"></div>';
  actions($("#ticket-tools"), [
    ["New ticket", () => ticketCompose()],
    ["Refresh tickets", refreshTickets],
    ...(!owner
      ? [
          [
            "Request to view related tickets",
            () => {
              const box = $("#ticket-compose");
              box.replaceChildren();
              const note = ticketField(
                box,
                "Describe what you want to compare",
                "",
                "textarea",
              );
              actions(box, [
                [
                  "Send sharing request to Owner",
                  async () => {
                    await api("ticket-share-request", { note: note.value });
                    await refreshTickets();
                    msg("Sharing request sent.");
                  },
                ],
              ]);
            },
          ],
        ]
      : []),
  ]);
  const filters = $("#ticket-filters");
  const from = ticketField(
      filters,
      "Last activity from",
      ticketFilters.from,
      "date",
    ),
    to = ticketField(filters, "Through", ticketFilters.to, "date");
  from.onchange = () => {
    ticketFilters.from = from.value;
    renderTickets();
  };
  to.onchange = () => {
    ticketFilters.to = to.value;
    renderTickets();
  };
  for (const [key, label] of [
    ["completed", "Hide Completed"],
    ["rejected", "Hide Rejected"],
    ["archived", "Show archived"],
  ]) {
    const c = ticketCheck(filters, label, ticketFilters[key]);
    c.onchange = () => {
      ticketFilters[key] = c.checked;
      renderTickets();
    };
  }
  filters.append(
    button(
      !ticketFilters.from && !ticketFilters.to
        ? "Restore Date Range"
        : "All dates",
      () => {
        if (!ticketFilters.from && !ticketFilters.to) {
          Object.assign(ticketFilters, ticketDefaultDates());
        } else {
          ticketFilters.from = "";
          ticketFilters.to = "";
        }
        renderTickets();
      },
    ),
  );
  const rows = ticketState.tickets.filter((t) => {
    const d = new Date(t.updatedAt);
    const day =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    return (
      (!ticketFilters.from || day >= ticketFilters.from) &&
      (!ticketFilters.to || day <= ticketFilters.to) &&
      (!ticketFilters.completed || t.status !== "completed") &&
      (!ticketFilters.rejected || t.status !== "rejected") &&
      (ticketFilters.archived || !t.archived)
    );
  });
  const table = document.createElement("table");
  table.className = "ticket-table";
  table.innerHTML =
    "<thead><tr><th>Initiator</th><th>Ticket / original & current wording</th><th>Owner requirements</th><th>Forms</th><th>Status / activity</th>" +
    (owner ? "<th>Priority</th><th>Select</th>" : "") +
    "</tr></thead><tbody></tbody>";
  for (const t of rows) {
    const tr = document.createElement("tr");
    tr.dataset.ticketId = t.id;
    const cell = (value) => {
      const td = node("td", "", value);
      tr.append(td);
      return td;
    };
    cell(t.username);
    const first = cell("");
    first.append(
      button(t.title, () => {
        ticketFocus = ticketFocus === t.id ? null : t.id;
        renderTickets();
      }),
      node("small", "", `${t.kind} · ${t.id}`),
      node("p", "", t.wording),
    );
    const original = document.createElement("details");
    original.append(
      node("summary", "", "Original wording"),
      node("p", "", t.original),
    );
    first.append(original);
    if (t.sharedUntil) {
      const countdown = node("p", "warning");
      countdown.dataset.ticketExpiry = t.sharedUntil;
      first.append(countdown);
    }
    cell(t.ownerText);
    cell(t.forms.map((f) => f.toUpperCase()).join(", "));
    const state = node("div", "ticket-status-content");
    state.append(
      node(
        "span",
        "",
        `${t.status}\n${new Date(t.updatedAt).toLocaleString()}${t.locked ? "\nLocked in batch" : ""}`,
      ),
    );
    cell("").append(state);
    if (owner && t.status === "implementation requested")
      state.append(
        button("Implemented ?", async () => {
          await api("ticket-complete", { id: t.id, revision: t.revision });
          ticketSelection.delete(t.id);
          if (ticketFilters.completed) {
            await collapseCompletedTicket(t.id);
            if (ticketFocus === t.id) ticketFocus = null;
          }
          await refreshTickets();
          msg("Ticket marked Completed.");
        }),
      );
    if (t.authorRevision !== t.reviewedRevision)
      state.append(node("p", "warning", "Owner review required"));
    if (
      owner &&
      !t.locked &&
      ["new", "approved", "deferred", "rejected"].includes(t.status)
    )
      state.append(button("Delete", () => confirmTicketDelete(t)));
    if (owner) {
      const moves = cell("");
      actions(moves, [
        ["↑", () => moveTicketAnimated(t, -1)],
        ["↓", () => moveTicketAnimated(t, 1)],
      ]);
      const selectionCell = cell("");
      const c = ticketCheck(
        selectionCell,
        "Select " + t.title,
        ticketSelection.has(t.id),
      );
      c.setAttribute("aria-label", "Select ticket " + t.title);
      c.onchange = () => {
        c.checked ? ticketSelection.add(t.id) : ticketSelection.delete(t.id);
        updateQuickSelection();
      };
      const quick = node("div", "ticket-quick-actions");
      for (const [label, status] of [
        ["Approve", "approved"],
        ["Reject", "rejected"],
      ]) {
        const b = button(label, () => ticketQuickAction([t], status));
        b.disabled = ticketQuickLocked(t);
        b.title = b.disabled
          ? "Already batched or implemented; quick actions are unavailable."
          : status === "approved"
            ? "Accept latest revision using existing Owner requirements."
            : "Reject without deleting.";
        quick.append(b);
      }
      selectionCell.append(quick);
    }
    table.tBodies[0].append(tr);
    if (ticketFocus === t.id) {
      const detailRow = document.createElement("tr");
      detailRow.dataset.ticketId = t.id;
      detailRow.className = "ticket-detail-row";
      const detailCell = document.createElement("td");
      detailCell.colSpan = owner ? 7 : 5;
      const detail = node("div");
      detail.id = "ticket-inline-detail";
      detailCell.append(detail);
      detailRow.append(detailCell);
      table.tBodies[0].append(detailRow);
    }
  }
  $("#ticket-table").append(table);
  if (!rows.length)
    $("#ticket-table").append(
      node(
        "p",
        "",
        "No tickets match these filters. Use All dates to see older priorities.",
      ),
    );
  if (owner) {
    $("#ticket-batch-actions").append(
      node(
        "p",
        "muted",
        "Approve accepts the latest submitter revision with your existing Owner requirements unchanged. Open the ticket first if wording needs editing.",
      ),
    );
    actions($("#ticket-batch-actions"), [
      [
        "Approve selected",
        () =>
          ticketQuickAction(
            ticketState.tickets.filter((t) => ticketSelection.has(t.id)),
            "approved",
          ),
      ],
      [
        "Reject Selected",
        () =>
          ticketQuickAction(
            ticketState.tickets.filter((t) => ticketSelection.has(t.id)),
            "rejected",
          ),
      ],
      [
        "Prepare implementation brief",
        () => {
          const box = $("#ticket-detail");
          box.replaceChildren(node("h3", "", "Prepare implementation batch"));
          box.append(
            node(
              "p",
              "",
              "Only approved, unlocked tickets with all submitter revisions reviewed can be batched. This locks the tickets but does not start coding or deployment.",
            ),
          );
          box.append(
            node(
              "p",
              "",
              "Selected tickets: " +
                ticketState.tickets
                  .filter((t) => ticketSelection.has(t.id))
                  .map((t) => t.title)
                  .join("; "),
            ),
          );
          const title = ticketField(box, "Batch title", "Implementation batch");
          const priv = ticketCheck(
            box,
            "Include private Owner notes in downloaded brief",
            false,
          );
          actions(box, [
            [
              "Generate saved brief for selected tickets",
              async () => {
                const b = await api("ticket-batch", {
                  ids: [...ticketSelection],
                  title: title.value,
                  includePrivate: priv.checked,
                });
                ticketSelection.clear();
                ticketFocus = null;
                await refreshTickets();
                showBrief(b);
              },
              "primary",
            ],
          ]);
        },
      ],
      ["Share selected tickets", () => shareTickets()],
      [
        "Clear selection",
        () => {
          ticketSelection.clear();
          renderTickets();
        },
      ],
    ]);
    for (const r of ticketState.shareRequests.filter(
      (r) => r.status === "pending",
    )) {
      const row = node(
        "div",
        "warning ticket-share-request",
        `${r.username} requests viewing access: ${r.note}`,
      );
      row.append(
        button("Share selected with " + r.username, () =>
          shareTickets(r.user, row),
        ),
      );
      $("#ticket-sharing").append(row);
    }
    for (const g of ticketState.grants) {
      const who = dash.users.find((u) => u.id === g.user)?.username || g.user;
      const row = node(
        "p",
        "",
        `${who} · ticket ${g.ticket} · until ${new Date(g.expires).toLocaleString()} `,
      );
      row.append(
        button("Revoke", async () => {
          await api("ticket-revoke", { id: g.id });
          await refreshTickets();
        }),
      );
      $("#ticket-sharing").append(row);
    }
    const archive = $("#ticket-batches");
    archive.append(
      node("h3", "", "Implementation brief archive"),
      node(
        "p",
        "muted",
        "Saved requirements remain unchanged. Word copies can be edited after download. Implementation dates are recorded by Owner, not inferred from downloads.",
      ),
    );
    if (!ticketState.batches.length)
      archive.append(node("p", "", "No saved briefs yet."));
    for (const b of ticketState.batches) {
      const row = node("article", "history");
      row.append(
        batchMetricNode(b),
        node("strong", "", b.title),
        node("p", "", b.summary || b.title),
      );
      const details = document.createElement("details");
      details.className = "batch-details";
      details.append(node("summary", "", "Batch details"));
      details.append(
        node(
          "small",
          "",
          `Created ${new Date(b.at).toLocaleString()} · ${b.ids.length} tickets`,
        ),
        node(
          "p",
          "",
          "Implementation dates: " +
            ((b.implementations || []).map((r) => r.date).join(", ") ||
              "Not recorded"),
        ),
      );
      actions(details, [
        ["Download Word (.docx)", () => downloadWordBrief(b.id)],
        [
          "View / record implementation",
          async () => {
            ticketFocus = null;
            showBrief(await api("ticket-batch-download", { id: b.id }));
            $("#ticket-detail").scrollIntoView({ block: "nearest" });
          },
        ],
      ]);
      row.append(details);
      archive.append(row);
    }
  } else
    for (const r of ticketState.shareRequests)
      $("#ticket-sharing").append(
        node("p", "muted", `Your sharing request: ${r.note} · ${r.status}`),
      );
  if (ticketFocus && rows.some((t) => t.id === ticketFocus))
    ticketDetail(ticketFocus);
  updateQuickSelection();
  ticketTick();
}
async function downloadWordBrief(id) {
  const r = await api("ticket-batch-word", { id });
  const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  );
  link.download = r.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
function batchMetricNode(b) {
  const e = node("p", "batch-metrics", batchMetrics(b));
  e.dataset.batchId = b.id;
  return e;
}
function batchMetrics(b) {
  const elapsed =
    b.approvalStartedAt && !(b.allCompleted && !b.completedAt)
      ? Math.max(
          0,
          Math.floor(
            ((b.completedAt
              ? Date.parse(b.completedAt)
              : Date.now() + ticketClockOffset) -
              Date.parse(b.approvalStartedAt)) /
              3600000,
          ),
        )
      : null;
  return `Approval → implementation: ${elapsed === null ? b.approvalTimingMissing || (b.allCompleted && !b.completedAt ? "Implementation time not recorded" : "Approval time not recorded") : elapsed + " h"}${b.completedAt ? " (final)" : ""} · Longest submission → approval: ${b.submissionApprovalHours == null ? b.submissionTimingMissing || "Approval time not recorded" : b.submissionApprovalHours + " h"}`;
}
function showBrief(b) {
  const box = $("#ticket-detail");
  box.replaceChildren(
    batchMetricNode(b),
    node("h3", "", b.title),
    node(
      "p",
      "warning",
      "Download and edit the Word copy if needed. Ask Sky to review it and ask clarification questions before coding. Uploading alone does not authorize implementation. Local edits do not change this archived snapshot.",
    ),
  );
  const preview = ticketField(box, "Saved brief", b.brief, "textarea");
  preview.readOnly = true;
  preview.rows = 16;
  actions(box, [
    ["Download Word (.docx)", () => downloadWordBrief(b.id)],
    ["Download HTML copy", () => downloadBrief(b)],
    [
      "Copy brief",
      async () => {
        await navigator.clipboard.writeText(b.brief);
        msg("Brief copied.");
      },
    ],
  ]);
  box.append(node("h4", "", "Archive summary and implementation record"));
  const summary = ticketField(box, "Headline summary", b.summary || b.title);
  summary.maxLength = 300;
  const date = ticketField(
    box,
    "Implementation date (leave blank to update summary only)",
    "",
    "date",
  );
  const note = ticketField(
    box,
    "Implementation note / release reference",
    "",
    "textarea",
  );
  for (const r of b.implementations || [])
    box.append(
      node(
        "p",
        "history",
        `${r.date} · ${r.note || "Implementation recorded"} · recorded by ${r.by}`,
      ),
    );
  actions(box, [
    [
      "Save archive record",
      async () => {
        const updated = await api("ticket-batch-record", {
          id: b.id,
          revision: b.metadataRevision || 0,
          summary: summary.value,
          date: date.value,
          note: note.value,
        });
        ticketFocus = null;
        await refreshTickets();
        showBrief(updated);
        msg(
          "Archive record saved. Ticket requirements and status were not changed.",
        );
      },
    ],
  ]);
}
async function shareTickets(recipient = "", requestRow = null) {
  $("#ticket-share-panel")?.remove();
  const holder = node("div", "ticket-share-panel");
  holder.id = "ticket-share-panel";
  const box = node("div", "card");
  holder.append(box);
  if (requestRow) requestRow.after(holder);
  else $("#ticket-sharing").append(holder);
  box.replaceChildren(node("h3", "", "Time-limited read-only sharing"));
  const l = node("label", "field", "Recipient"),
    sel = document.createElement("select");
  sel.setAttribute("aria-label", "Recipient");
  for (const u of dash.users.filter((u) => u.active && u.role !== "owner"))
    sel.append(new Option(u.username, u.id));
  if (recipient) sel.value = recipient;
  l.append(sel);
  box.append(l);
  const choose = (label, max, initial) => {
    const l = node("label", "field", label),
      s = document.createElement("select");
    s.setAttribute("aria-label", label);
    for (let i = 0; i <= max; i++) s.append(new Option(String(i), String(i)));
    s.value = String(initial);
    l.append(s);
    box.append(l);
    return s;
  };
  const hours = choose("Hours", 9, 0),
    minutes = choose("Minutes", 59, 20);
  box.append(
    node(
      "p",
      "",
      "Timer starts when Share is clicked, even if the recipient is offline. Sharing exposes selected ticket text and screenshots, never Owner private notes or access to other forms. Copies already made cannot be recalled.",
    ),
  );
  actions(box, [
    [
      "Share selected now",
      async () => {
        await api("ticket-share", {
          ids: [...ticketSelection],
          user: sel.value,
          hours: Number(hours.value),
          minutes: Number(minutes.value),
        });
        await refreshTickets();
        msg("Read-only sharing started.");
      },
      "primary",
    ],
    ["Cancel sharing", () => holder.remove()],
  ]);
  await animateDisclosure(holder, true);
}
function ticketCompose(source = null) {
  const box = $("#ticket-compose");
  box.replaceChildren(
    node("h3", "", source ? "New related ticket" : "New enhancement / bug"),
  );
  const kind = document.createElement("select");
  kind.setAttribute("aria-label", "Ticket type");
  kind.append(
    new Option("Enhancement", "enhancement"),
    new Option("Bug", "bug"),
  );
  box.append(kind);
  const title = ticketField(
      box,
      "Ticket title",
      source ? `Follow-up: ${source.title}` : "",
    ),
    wording = ticketField(
      box,
      "Describe the enhancement or bug",
      source?.wording || "",
      "textarea",
    );
  const scopes = ticketScopes(
    box,
    source
      ? source.forms.filter((f) => ticketState.forms.some((v) => v.id === f))
      : [formId],
  );
  const related = ticketField(
    box,
    "Related ticket ID (optional)",
    source?.id || "",
  );
  const uploads = [];
  ticketUploads(box, uploads);
  actions(box, [
    [
      "Submit ticket",
      async () => {
        let t = await api("ticket-create", {
          kind: kind.value,
          title: title.value,
          wording: wording.value,
          forms: scopes(),
          related: related.value,
        });
        ticketFocus = t.id;
        try {
          for (const photo of uploads)
            t = await api("ticket-attach", {
              id: t.id,
              revision: t.revision,
              photo,
            });
        } finally {
          await refreshTickets();
        }
        msg("Ticket saved.");
      },
      "primary",
    ],
  ]);
  box.scrollIntoView({ block: "nearest" });
}
function ticketUploads(parent, photos) {
  const area = node("div", "ticket-upload");
  area.tabIndex = 0;
  area.setAttribute("aria-label", "Paste screenshots");
  area.append(
    node(
      "p",
      "",
      "Paste screenshots here or into this ticket’s text fields (Ctrl/Cmd+V), or choose files. Up to five images; avoid sensitive information.",
    ),
  );
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/png,image/jpeg,image/webp";
  file.multiple = true;
  file.setAttribute("aria-label", "Upload ticket screenshots");
  area.append(file);
  const previews = node("div", "actions");
  area.append(previews);
  parent.append(area);
  const add = async (files) => {
    for (const f of files) {
      if (photos.length >= 5) throw Error("Maximum five screenshots.");
      if (f.size > 10 * 1024 * 1024) throw Error("Use an image under 10 MB.");
      const image = await createImageBitmap(f);
      const canvas = document.createElement("canvas"),
        scale = Math.min(1, 1000 / Math.max(image.width, image.height));
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const p = canvas.toDataURL("image/jpeg", 0.75);
      photos.push(p);
      const wrap = node("div"),
        img = new Image();
      img.src = p;
      img.className = "ticket-thumb";
      wrap.append(
        img,
        button("Remove image", () => {
          const i = photos.indexOf(p);
          if (i >= 0) photos.splice(i, 1);
          wrap.remove();
        }),
      );
      previews.append(wrap);
    }
  };
  area.append(
    button("Paste image from clipboard", async () => {
      if (!navigator.clipboard?.read) {
        area.focus();
        msg(
          "Click the dashed paste area and press Ctrl/Cmd+V, or choose a file on this device.",
        );
        return;
      }
      try {
        const items = await navigator.clipboard.read();
        const images = [];
        for (const item of items)
          for (const type of item.types.filter((t) => t.startsWith("image/"))) {
            images.push(await item.getType(type));
            break;
          }
        if (!images.length) throw Error("No image found in clipboard.");
        await add(images);
      } catch (e) {
        area.focus();
        msg(
          "Clipboard access unavailable or no image found. Click the dashed area and press Ctrl/Cmd+V, or choose a file.",
          true,
        );
      }
    }),
  );
  file.onchange = () => run(() => add([...file.files]));
  parent.onpaste = (e) => {
    const files = [...e.clipboardData.items]
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile());
    if (files.length) {
      e.preventDefault();
      run(() => add(files));
    }
  };
}
// Compare only inert text nodes: submitted markup never becomes executable HTML.
function compareTokens(before, after) {
  const a = before.match(/\s+|[^\s]+/g) || [],
    b = after.match(/\s+|[^\s]+/g) || [];
  const removed = new Set(),
    added = new Set();
  if (a.length * b.length > 1000000) {
    let head = 0,
      tail = 0;
    while (head < a.length && head < b.length && a[head] === b[head]) head++;
    while (
      tail < a.length - head &&
      tail < b.length - head &&
      a[a.length - 1 - tail] === b[b.length - 1 - tail]
    )
      tail++;
    for (let i = head; i < a.length - tail; i++) removed.add(i);
    for (let i = head; i < b.length - tail; i++) added.add(i);
  } else {
    const dp = Array.from(
      { length: a.length + 1 },
      () => new Uint16Array(b.length + 1),
    );
    for (let i = a.length - 1; i >= 0; i--)
      for (let j = b.length - 1; j >= 0; j--)
        dp[i][j] =
          a[i] === b[j]
            ? 1 + dp[i + 1][j + 1]
            : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0,
      j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        i++;
        j++;
      } else if (
        i < a.length &&
        (j === b.length || dp[i + 1][j] >= dp[i][j + 1])
      )
        removed.add(i++);
      else added.add(j++);
    }
  }
  return { a, b, removed, added };
}
function comparisonSection(label, tokens, added, removed, open) {
  const d = document.createElement("details");
  d.className = "ticket-compare";
  d.open = open;
  d.append(node("summary", "", label));
  const p = node("p");
  tokens.forEach((token, i) => {
    if (removed.has(i)) {
      const m = node("mark");
      m.append(node("del", "", token));
      p.append(m);
    } else if (added.has(i)) p.append(node("mark", "", token));
    else p.append(document.createTextNode(token));
  });
  d.append(p);
  return d;
}
// Animate real layout height after successful completion, including inline details.
async function collapseCompletedTicket(id) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rows = [
    ...document.querySelectorAll(".ticket-table tbody > tr"),
  ].filter((e) => e.dataset.ticketId === id);
  if (!rows.length) return;
  const height = rows.reduce(
    (sum, e) => sum + e.getBoundingClientRect().height,
    0,
  );
  const placeholder = document.createElement("tr"),
    cell = document.createElement("td"),
    gap = document.createElement("div");
  cell.colSpan = rows[0].children.length;
  cell.style.cssText = "padding:0;border:0;background:white";
  gap.style.cssText = `height:${height}px;overflow:hidden;background:white`;
  cell.append(gap);
  placeholder.append(cell);
  rows[0].before(placeholder);
  rows.forEach((e) => e.remove());
  try {
    await gap.animate([{ height: `${height}px` }, { height: "0px" }], {
      duration: 1000,
      easing: "ease-in-out",
      fill: "forwards",
    }).finished;
  } finally {
    placeholder.remove();
  }
}
async function moveTicketAnimated(t, direction) {
  const positions = new Map(
    [...document.querySelectorAll(".ticket-table tbody > tr")].map((e) => [
      e.dataset.ticketId + (e.className || ""),
      e.getBoundingClientRect().top,
    ]),
  );
  await api("ticket-move", { id: t.id, revision: t.revision, direction });
  await refreshTickets();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const animations = [];
  for (const e of document.querySelectorAll(".ticket-table tbody > tr")) {
    const previous = positions.get(e.dataset.ticketId + (e.className || ""));
    if (previous === undefined) continue;
    const delta = previous - e.getBoundingClientRect().top;
    if (!delta) continue;
    animations.push(
      e
        .animate(
          [
            { transform: `translateY(${delta}px)`, background: "#eaf4ff" },
            { transform: "translateY(0)", background: "#ffffff" },
          ],
          { duration: 1100, easing: "ease-in-out" },
        )
        .finished.catch(() => {}),
    );
  }
  await Promise.all(animations);
}
function ticketDetail(id) {
  const t = ticketState.tickets.find((t) => t.id === id);
  if (!t) return;
  const box = $("#ticket-inline-detail");
  if (!box) return;
  box.replaceChildren(node("h3", "", `${t.title} · ${t.id}`));
  box.append(
    button("Collapse", () => {
      ticketFocus = null;
      renderTickets();
    }),
  );
  box.dataset.ticketId = t.id;
  if (t.sharedUntil) {
    const c = node("p", "warning");
    c.dataset.ticketExpiry = t.sharedUntil;
    box.append(c);
  }
  const currentDiff = compareTokens(t.original, t.wording),
    ownerDiff = compareTokens(t.wording, t.ownerText);
  box.append(
    comparisonSection(
      "Original submission",
      currentDiff.a,
      new Set(),
      currentDiff.removed,
      t.original !== t.wording,
    ),
    comparisonSection(
      "Current submitter wording",
      currentDiff.b,
      currentDiff.added,
      ownerDiff.removed,
      t.original !== t.wording || t.wording !== t.ownerText,
    ),
    comparisonSection(
      "Owner requirements",
      ownerDiff.b,
      ownerDiff.added,
      new Set(),
      true,
    ),
    node(
      "small",
      "muted",
      "Yellow shows differences; strikethrough shows text removed in the next version. Original → Current → Owner. Comments are listed separately.",
    ),
  );
  if (t.related) box.append(answer("Related ticket", t.related));
  for (const image of t.images) {
    const row = node("div");
    row.append(
      button("View screenshot " + image.id, async () => {
        const r = await api("ticket-image", { id: t.id, image: image.id });
        const img = new Image();
        img.src = r.photo;
        img.className = "photo";
        img.alt = "Ticket screenshot";
        row.replaceChildren(img);
      }),
    );
    box.append(row);
  }
  const hist = document.createElement("details");
  hist.append(node("summary", "", "Ticket history"));
  for (const h of t.history)
    hist.append(
      node(
        "p",
        "history",
        `${new Date(h.at).toLocaleString()} · ${h.by} · ${h.action}\n${h.text}`,
      ),
    );
  box.append(hist);
  actions(box, [["Create related ticket", () => ticketCompose(t)]]);
  if (t.readOnly) {
    box.append(
      node(
        "p",
        "muted",
        "Shared read-only view. Create your own related ticket to propose changes.",
      ),
    );
    return;
  }
  if (user.role === "owner") {
    const wording = ticketField(
        box,
        "Owner-edited requirements",
        t.ownerText,
        "textarea",
      ),
      notes = ticketField(
        box,
        "Private Owner notes",
        t.privateNotes,
        "textarea",
      ),
      scopes = ticketScopes(box, t.forms);
    const l = node("label", "field", "Status"),
      status = document.createElement("select");
    ticketStatuses.forEach((s) => status.append(new Option(s, s)));
    status.setAttribute("aria-label", "Ticket status");
    status.value = t.status;
    l.append(status);
    box.append(l);
    const ack = ticketCheck(
        box,
        "I reviewed the latest submitter revision; use the Owner requirements above",
        false,
      ),
      archived = ticketCheck(box, "Archived", t.archived);
    actions(box, [
      [
        "Save Owner review",
        async () => {
          await api("ticket-owner-save", {
            id: t.id,
            revision: t.revision,
            ownerText: wording.value,
            privateNotes: notes.value,
            forms: scopes(),
            status: status.value,
            acknowledge: ack.checked,
            archived: archived.checked,
          });
          await refreshTickets();
        },
        "primary",
      ],
    ]);
  }
  if (t.author === user.id && !t.locked) {
    const title = ticketField(box, "Revise your title", t.title),
      wording = ticketField(box, "Revise your request", t.wording, "textarea");
    actions(box, [
      [
        "Save submitter revision",
        async () => {
          await api("ticket-edit", {
            id: t.id,
            revision: t.revision,
            title: title.value,
            wording: wording.value,
          });
          await refreshTickets();
        },
      ],
    ]);
  }
  if (t.locked)
    box.append(
      node(
        "p",
        "warning",
        "Locked in an implementation batch. Add a follow-up comment or create a related ticket; the saved brief will not change.",
      ),
    );
  const comment = ticketField(box, "Follow-up comment", "", "textarea");
  actions(box, [
    [
      "Add comment",
      async () => {
        await api("ticket-comment", {
          id: t.id,
          revision: t.revision,
          note: comment.value,
        });
        await refreshTickets();
      },
    ],
  ]);
  if (!t.locked) {
    const photos = [];
    ticketUploads(box, photos);
    actions(box, [
      [
        "Attach selected screenshots",
        async () => {
          let latest = t;
          try {
            for (const photo of photos)
              latest = await api("ticket-attach", {
                id: t.id,
                revision: latest.revision,
                photo,
              });
          } finally {
            await refreshTickets();
          }
        },
      ],
    ]);
  }
}
function ticketTick() {
  const clock = Date.now() + ticketClockOffset;
  document.querySelectorAll("[data-ticket-expiry]").forEach((e) => {
    const left = Math.max(
      0,
      Math.ceil((Date.parse(e.dataset.ticketExpiry) - clock) / 1000),
    );
    e.textContent = `Shared read-only access: ${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m ${left % 60}s remaining`;
  });
  if (!ticketState) return;
  document.querySelectorAll(".batch-metrics[data-batch-id]").forEach((e) => {
    const b = ticketState.batches.find((b) => b.id === e.dataset.batchId);
    if (b) e.textContent = batchMetrics(b);
  });
  const expired = ticketState.tickets.filter(
    (t) => t.sharedUntil && Date.parse(t.sharedUntil) <= clock,
  );
  for (const t of expired) {
    document.querySelectorAll("[data-ticket-id]").forEach((e) => {
      if (e.dataset.ticketId === t.id) {
        if (e.id === "ticket-detail") {
          e.replaceChildren();
          delete e.dataset.ticketId;
        } else e.remove();
      }
    });
    ticketState.tickets = ticketState.tickets.filter((v) => v.id !== t.id);
    ticketSelection.delete(t.id);
    if (ticketFocus === t.id) ticketFocus = null;
  }
}
setInterval(ticketTick, 1000);
// Refresh only when idle to avoid overwriting someone's unfinished ticket text.
setInterval(() => {
  if (
    location.hash === "#staff" &&
    user &&
    $("#tickets") &&
    !busy &&
    !$("#tickets").contains(document.activeElement) &&
    !$("#ticket-detail")?.textContent &&
    !$("#ticket-inline-detail")?.textContent &&
    !$("#ticket-compose")?.textContent
  )
    void refreshTickets().catch(() => {});
}, 30000);
