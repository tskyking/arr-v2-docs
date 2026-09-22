import type { Ticket } from "./tickets.js";
const valid = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
/** Recover only explicit recorded events. Never infer approval from generic edits
 * or batch creation, nor completion from day-only archive annotations. */
export function recoverBatchTiming(batch: any, tickets: Ticket[]) {
  if (!batch.ids?.length) return batch;
  const members: (Ticket | undefined)[] = batch.ids.map((id: string) =>
    tickets.find((t) => t.id === id),
  );
  const timing = batch.ids.map((id: string, index: number) => {
    const t = members[index];
    const saved = batch.timing?.find((v: any) => v.ticket === id);
    if (!t) return { ticket: id, ...saved };
    const cutoff = t.history.findIndex(
      (h) => h.action === "implementation batch" && h.text === batch.id,
    );
    const history =
      cutoff >= 0
        ? t.history.slice(0, cutoff)
        : t.history.filter(
            (h) => valid(h.at) && valid(batch.at) && h.at <= batch.at,
          );
    const submission = history
      .filter((h) => ["submitted", "submitter revised"].includes(h.action))
      .at(-1);
    const submittedAt = valid(saved?.submittedAt)
      ? saved.submittedAt
      : submission?.at || t.createdAt;
    // Later revisions/rejections or generic Owner saves make an older approval ambiguous.
    const decision = history
      .filter((h) =>
        [
          "Owner quick approved",
          "Owner quick rejected",
          "submitter revised",
          "owner requirements updated",
        ].includes(h.action),
      )
      .at(-1);
    const recorded =
      t.finalApprovedRevision === t.authorRevision &&
      valid(t.finalApprovedAt) &&
      valid(batch.at) &&
      t.finalApprovedAt <= batch.at
        ? t.finalApprovedAt
        : undefined;
    const approvedAt = valid(saved?.approvedAt)
      ? saved.approvedAt
      : recorded ||
        (decision?.action === "Owner quick approved" ? decision.at : undefined);
    return {
      ticket: id,
      submittedAt,
      approvedAt: valid(approvedAt) ? approvedAt : null,
      approvalSource:
        valid(saved?.approvedAt) || recorded
          ? saved?.approvalSource || "recorded"
          : approvedAt
            ? "explicit history"
            : "missing",
    };
  });
  const approvalsKnown = timing.every((v: any) => valid(v.approvedAt));
  const intervalsKnown =
    approvalsKnown &&
    timing.every(
      (v: any) =>
        valid(v.submittedAt) &&
        Date.parse(v.approvedAt) >= Date.parse(v.submittedAt),
    );
  const allCompleted = members.every(
    (t: Ticket | undefined) => t?.status === "completed",
  );
  const completions = members.map((t: Ticket | undefined) => {
    const last = t?.history
      .filter((h) =>
        ["Owner marked implemented", "owner requirements updated"].includes(
          h.action,
        ),
      )
      .at(-1);
    return last?.action === "Owner marked implemented" && valid(last.at)
      ? last.at
      : null;
  });
  const recoveredCompletion =
    allCompleted && completions.every((v: any) => valid(v))
      ? [...completions].sort().at(-1)
      : null;
  return {
    ...batch,
    timing,
    timingRecoveryVersion: 1,
    allCompleted,
    approvalStartedAt: valid(batch.approvalStartedAt)
      ? batch.approvalStartedAt
      : approvalsKnown
        ? timing.map((v: any) => v.approvedAt).sort()[0]
        : null,
    submissionApprovalHours:
      batch.submissionApprovalHours ??
      (intervalsKnown
        ? Math.floor(
            Math.max(
              ...timing.map(
                (v: any) =>
                  Date.parse(v.approvedAt) - Date.parse(v.submittedAt),
              ),
            ) / 3600000,
          )
        : null),
    completedAt: valid(batch.completedAt)
      ? batch.completedAt
      : recoveredCompletion,
    approvalTimingMissing:
      approvalsKnown || valid(batch.approvalStartedAt)
        ? null
        : "Approval time not recorded",
    submissionTimingMissing:
      intervalsKnown || batch.submissionApprovalHours != null
        ? null
        : approvalsKnown
          ? "Submission time not recorded or inconsistent"
          : "Approval time not recorded",
  };
}
