import { check, id, now, type User } from "./model.js";
import type { WorkspaceTx } from "./store.js";
export function isArchived(record: any, at = Date.now()) {
  const partial = !("status" in record) || record.status === "partial";
  if (!partial && !["rejected", "provisioned"].includes(record.status))
    return false;
  const last = Date.parse(
    record.updatedAt ||
      (partial ? record.expires : record.createdAt) ||
      record.createdAt,
  );
  return Number.isFinite(last) && at - last >= 60 * 86400000;
}
export async function queueLifecycle(tx: WorkspaceTx, u: User, input: any) {
  check(["owner", "admin"].includes(u.role), "Not permitted.", 403);
  check(
    ["delete", "restore", "purge"].includes(input.action),
    "Invalid queue action.",
  );
  if (input.action === "purge")
    check(u.role === "owner", "Only A+ can permanently delete records.", 403);
  check(input.confirm === true, "Confirmation required.");
  check(
    Array.isArray(input.targets) &&
      input.targets.length > 0 &&
      input.targets.length <= 100,
    "Select 1 to 100 records.",
  );
  const drafts = await tx.entries("draft"),
    seen = new Set<string>(),
    pending = [];
  for (const target of input.targets) {
    check(
      target &&
        ["draft", "request"].includes(target.kind) &&
        typeof target.id === "string",
      "Invalid record.",
    );
    const unique = target.kind + ":" + target.id;
    check(!seen.has(unique), "Duplicate record.");
    seen.add(unique);
    const entry =
      target.kind === "draft"
        ? drafts.find((d) => d.data.id === target.id)
        : { key: target.id, data: await tx.get("request", target.id) };
    const r = entry?.data;
    check(r, "Record not found.", 404);
    check(
      u.role === "owner" || u.forms.includes(r.form),
      "Form access denied.",
      403,
    );
    check(
      (r.revision || 1) === target.revision,
      "Record changed. Refresh before acting.",
      409,
    );
    if (target.kind === "draft")
      check(
        !r.completed && r.expires <= now(),
        "Only expired partial forms can be changed.",
        409,
      );
    if (input.action === "delete")
      check(
        target.kind === "draft" && !r.deletedAt,
        "Only undeleted partial forms can move to Deleted.",
        409,
      );
    if (input.action === "restore")
      check(
        target.kind === "draft" && r.deletedAt,
        "Only deleted partial forms can be restored.",
        409,
      );
    if (input.action === "purge")
      check(
        r.deletedAt || isArchived(r),
        "Only Deleted or Archive records can be permanently deleted.",
        409,
      );
    pending.push({ kind: target.kind, key: entry!.key, r });
  }
  // Validate the whole selection before changing anything; transaction serializes mutations.
  for (const { kind, key, r } of pending) {
    if (input.action === "purge") {
      await tx.remove(kind, key);
      if (kind === "request") {
        for (const d of drafts)
          if (d.data.completed?.reference === r.reference)
            await tx.remove("draft", d.key);
        for (const m of await tx.entries("mail"))
          if (m.key.includes(r.id)) await tx.remove("mail", m.key);
      }
    } else {
      if (input.action === "delete") {
        r.deletedAt = now();
        r.deletedBy = u.username;
      } else {
        delete r.deletedAt;
        delete r.deletedBy;
      }
      r.updatedAt = now();
      r.revision = (r.revision || 1) + 1;
      r.history = [
        ...(r.history || []),
        {
          at: now(),
          actor: u.username,
          action: input.action === "delete" ? "moved to Deleted" : "restored",
          note: "",
        },
      ];
      await tx.put(kind, key, r);
    }
  }
  const eventId = id();
  await tx.put("event", eventId, {
    id: eventId,
    at: now(),
    actor: u.username,
    action: "queue " + input.action,
    note: `${pending.length} record(s)`,
  });
  return { ok: true, count: pending.length };
}
