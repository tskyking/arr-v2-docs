/* Tickets are private by default. Every read/write/image request is authorized on
 * the server. DOM removal on expiry complements, but never replaces, that check. */
let ticketState = null,
  ticketSelection = new Set(),
  ticketFocus = null;
let ticketFilters = {
  from: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
  to: new Date().toISOString().slice(0, 10),
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
    button("All dates", () => {
      ticketFilters.from = "";
      ticketFilters.to = "";
      renderTickets();
    }),
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
        ticketFocus = t.id;
        ticketDetail(t.id);
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
    const state = cell(
      `${t.status}\n${new Date(t.updatedAt).toLocaleString()}${t.locked ? "\nLocked in batch" : ""}`,
    );
    if (t.authorRevision !== t.reviewedRevision)
      state.append(node("p", "warning", "Owner review required"));
    if (owner) {
      const moves = cell("");
      actions(moves, [
        [
          "↑",
          async () => {
            await api("ticket-move", {
              id: t.id,
              revision: t.revision,
              direction: -1,
            });
            await refreshTickets();
          },
        ],
        [
          "↓",
          async () => {
            await api("ticket-move", {
              id: t.id,
              revision: t.revision,
              direction: 1,
            });
            await refreshTickets();
          },
        ],
      ]);
      const c = ticketCheck(
        cell(""),
        "Select " + t.title,
        ticketSelection.has(t.id),
      );
      c.setAttribute("aria-label", "Select ticket " + t.title);
      c.onchange = () => {
        c.checked ? ticketSelection.add(t.id) : ticketSelection.delete(t.id);
      };
    }
    table.tBodies[0].append(tr);
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
    actions($("#ticket-batch-actions"), [
      [
        "Approve selected",
        async () => {
          const chosen = ticketState.tickets.filter((t) =>
            ticketSelection.has(t.id),
          );
          if (!chosen.length) throw Error("Select tickets first.");
          for (const t of chosen)
            await api("ticket-owner-save", {
              id: t.id,
              revision: t.revision,
              ownerText: t.ownerText,
              privateNotes: t.privateNotes,
              forms: t.forms,
              status: "approved",
              archived: t.archived,
            });
          await refreshTickets();
        },
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
        "warning",
        `${r.username} requests viewing access: ${r.note}`,
      );
      row.append(
        button("Share selected with " + r.username, () => shareTickets(r.user)),
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
        node("strong", "", b.title),
        node("p", "", b.summary || b.title),
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
      actions(row, [
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
      archive.append(row);
    }
  } else
    for (const r of ticketState.shareRequests)
      $("#ticket-sharing").append(
        node("p", "muted", `Your sharing request: ${r.note} · ${r.status}`),
      );
  if (ticketFocus && ticketState.tickets.some((t) => t.id === ticketFocus))
    ticketDetail(ticketFocus);
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
function showBrief(b) {
  const box = $("#ticket-detail");
  box.replaceChildren(
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
function shareTickets(recipient = "") {
  const box = $("#ticket-detail");
  box.replaceChildren(node("h3", "", "Time-limited read-only sharing"));
  const l = node("label", "field", "Recipient"),
    sel = document.createElement("select");
  for (const u of dash.users.filter((u) => u.active && u.role !== "owner"))
    sel.append(new Option(u.username, u.id));
  if (recipient) sel.value = recipient;
  l.append(sel);
  box.append(l);
  const choose = (label, max, initial) => {
    const l = node("label", "field", label),
      s = document.createElement("select");
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
  ]);
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
function ticketDetail(id) {
  const t = ticketState.tickets.find((t) => t.id === id);
  if (!t) return;
  const box = $("#ticket-detail");
  box.replaceChildren(node("h3", "", `${t.title} · ${t.id}`));
  box.dataset.ticketId = t.id;
  if (t.sharedUntil) {
    const c = node("p", "warning");
    c.dataset.ticketExpiry = t.sharedUntil;
    box.append(c);
  }
  box.append(
    answer("Original submission", t.original),
    answer("Current submitter wording", t.wording),
    answer("Owner requirements", t.ownerText),
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
    !$("#ticket-compose")?.textContent
  )
    void refreshTickets().catch(() => {});
}, 30000);
