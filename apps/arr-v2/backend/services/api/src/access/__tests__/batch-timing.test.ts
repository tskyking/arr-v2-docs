import { it, expect } from "vitest";
import { recoverBatchTiming } from "../workspace/batch-timing.js";
const h = (action: string, at: string, text = "") => ({
  action,
  at,
  text,
  by: "owner",
});
const batch = {
  id: "batch",
  at: "2026-09-20T10:00:00.000Z",
  ids: ["one", "two"],
  title: "Manual Batch 1",
  brief: "Immutable requirements",
  implementations: [{ date: "2026-09-21" }],
};
const ticket = (id: string, approved: string, completed: string): any => ({
  id,
  status: "completed",
  createdAt: "2026-09-20T00:00:00.000Z",
  history: [
    h("submitted", "2026-09-20T00:00:00.000Z"),
    h("Owner quick approved", approved),
    h("implementation batch", batch.at, batch.id),
    h("Owner marked implemented", completed),
  ],
});
it("recovers explicit legacy timestamps, floors longest interval and freezes at last completion", () => {
  const a = ticket(
      "one",
      "2026-09-20T02:59:00.000Z",
      "2026-09-21T00:00:00.000Z",
    ),
    b = ticket("two", "2026-09-20T05:01:00.000Z", "2026-09-21T01:00:00.000Z");
  const recovered = recoverBatchTiming(batch, [a, b]);
  expect(recovered.approvalStartedAt).toBe("2026-09-20T02:59:00.000Z");
  expect(recovered.submissionApprovalHours).toBe(5);
  expect(recovered.completedAt).toBe("2026-09-21T01:00:00.000Z");
  expect(recovered.title).toBe(batch.title);
  expect(recovered.brief).toBe(batch.brief);
  expect(recovered.implementations).toEqual(batch.implementations);
  expect(recovered.number).toBeUndefined();
  expect(recoverBatchTiming(recovered, [a, b])).toEqual(recovered);
});
it("does not infer approval from generic Owner edits or batch creation", () => {
  const a = ticket(
    "one",
    "2026-09-20T02:59:00.000Z",
    "2026-09-21T00:00:00.000Z",
  );
  a.history.splice(
    2,
    0,
    h("owner requirements updated", "2026-09-20T03:00:00.000Z"),
  );
  const b = ticket(
    "two",
    "2026-09-20T05:01:00.000Z",
    "2026-09-21T01:00:00.000Z",
  );
  const r = recoverBatchTiming(batch, [a, b]);
  expect(r.approvalStartedAt).toBeNull();
  expect(r.submissionApprovalHours).toBeNull();
  expect(r.approvalTimingMissing).toBe("Approval time not recorded");
  expect(r.completedAt).toBeTruthy();
});
it("uses latest submission and never day-only archive dates for completion", () => {
  const a = ticket(
    "one",
    "2026-09-20T02:59:00.000Z",
    "2026-09-21T00:00:00.000Z",
  );
  a.history.splice(1, 0, h("submitter revised", "2026-09-20T02:00:00.000Z"));
  a.history.pop();
  const r = recoverBatchTiming({ ...batch, ids: ["one"] }, [a]);
  expect(r.submissionApprovalHours).toBe(0);
  expect(r.allCompleted).toBe(true);
  expect(r.completedAt).toBeNull();
  a.status = "implementation requested";
  expect(recoverBatchTiming({ ...batch, ids: ["one"] }, [a]).allCompleted).toBe(
    false,
  );
});
it("preserves existing snapshots over later edits and reports missing members honestly", () => {
  const stored = {
    ...batch,
    approvalStartedAt: "2026-09-20T03:00:00.000Z",
    submissionApprovalHours: 2,
    completedAt: "2026-09-21T01:00:00.000Z",
  };
  expect(recoverBatchTiming(stored, [])).toMatchObject({
    approvalStartedAt: stored.approvalStartedAt,
    submissionApprovalHours: 2,
    completedAt: stored.completedAt,
  });
  expect(recoverBatchTiming(batch, []).approvalStartedAt).toBeNull();
});
