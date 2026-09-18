/**
 * REVIEW NOTE (2026-09-17): demonstration policy, not County-approved access policy.
 * This module has no network or database side effects. It validates untrusted input
 * and decides permitted transitions; handler/store perform authentication/persistence.
 * All PROPOSED comments describe future work only. No control is enabled by a comment.
 */
import { randomBytes, randomUUID, createHash } from "node:crypto";

export type Role = "reviewer" | "manager";
export type Status =
  | "submitted"
  | "needs_approval"
  | "approved"
  | "needs_info"
  | "denied"
  | "provisioned";
export type Intake = {
  name: string;
  email: string;
  phone: string;
  department: string;
  affiliation: string;
  sponsor: string;
  sponsorEmail: string;
  facility: string;
  areas: string;
  accessTypes: string[];
  reason: string;
  startDate: string;
  endDate: string;
  schedule: string;
  exception: string;
  badge: string;
  plate: string;
  vehicle: string;
  urgency: string;
  consent: boolean;
};
export type Event = {
  at: string;
  actor: string;
  action: string;
  note: string;
  status: Status;
};
export type RequestRecord = {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  status: Status;
  data: Intake;
  approvalReasons: string[];
  managementRequired: boolean;
  owner: string;
  history: Event[];
  receiptHash: string;
  photo: string | null;
};
export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const facilities = [
  "Cascades Administration Building",
  "Juniper Public Services Center",
  "High Desert Operations Yard",
];
const choices: Record<string, string[]> = {
  affiliation: ["Employee", "Contractor", "Visitor"],
  department: [
    "Facilities",
    "Public Works",
    "Health Services",
    "Community Development",
    "Administration",
    "9-1-1 Service District",
    "Assessor's Office",
    "Community Justice",
    "District Attorney's Office",
    "Information Technology",
    "Road Department",
    "Sheriff's Office",
    "Other",
  ],
  facility: facilities,
  schedule: ["Business hours", "After hours", "24/7"],
  urgency: ["Standard", "Time-sensitive"],
};
export const firstPageKeys = [
  "name",
  "email",
  "phone",
  "department",
  "affiliation",
  "sponsor",
  "sponsorEmail",
  "badge",
] as const;
export type FirstPage = Pick<Intake, (typeof firstPageKeys)[number]>;
// First-page allowlist: discard later-page fields and any caller-supplied roles.
// Email syntax is checked; employee/sponsor identity is NOT verified by a directory.
export function validateFirstPage(raw: unknown): FirstPage {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new AccessError(400, "Complete the requester information.");
  const input = raw as Record<string, unknown>;
  const out = {} as FirstPage;
  for (const key of firstPageKeys) {
    if (input[key] !== undefined && typeof input[key] !== "string")
      throw new AccessError(400, "Invalid " + key + ".");
    const value = String(input[key] ?? "").trim();
    if (
      value.length > 160 ||
      /[\x00-\x1f]/.test(value) ||
      (!["phone", "badge"].includes(key) && !value)
    )
      throw new AccessError(400, "Please complete a valid " + key + ".");
    out[key] = value;
  }
  for (const key of ["email", "sponsorEmail"] as const) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out[key]))
      throw new AccessError(
        400,
        "Enter valid requester and sponsor email addresses.",
      );
    out[key] = out[key].toLowerCase();
  }
  for (const key of ["department", "affiliation"] as const)
    if (!choices[key].includes(out[key]))
      throw new AccessError(400, "Choose a valid " + key + ".");
  return out;
}
// Authoritative validation for final submissions; browser validation is convenience only.
// Hard-coded choices are demo policy. PROPOSED: versioned, admin-approved form/routing
// definitions shared with the UI, preserving the version used for each approval.
export function validateIntake(raw: unknown): Intake {
  if (!raw || typeof raw !== "object")
    throw new AccessError(400, "Enter the request details.");
  const input = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const required = [
    "name",
    "email",
    "department",
    "affiliation",
    "sponsor",
    "sponsorEmail",
    "facility",
    "areas",
    "reason",
    "startDate",
    "endDate",
    "schedule",
    "urgency",
  ];
  const text = [...required, "phone", "exception", "badge", "plate", "vehicle"];
  for (const key of text) {
    const value = input[key];
    if (value !== undefined && typeof value !== "string")
      throw new AccessError(400, `Invalid ${key}.`);
    const clean = String(value ?? "").trim();
    const max = ["reason", "exception", "areas"].includes(key) ? 1500 : 160;
    if (clean.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(clean))
      throw new AccessError(
        400,
        `${key} is too long or contains invalid characters.`,
      );
    if (required.includes(key) && !clean)
      throw new AccessError(400, `Please complete ${key}.`);
    out[key] = clean;
  }
  for (const [key, allowed] of Object.entries(choices)) {
    if (!allowed.includes(String(out[key])))
      throw new AccessError(400, `Choose a valid ${key}.`);
  }
  for (const key of ["email", "sponsorEmail"]) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(out[key])))
      throw new AccessError(
        400,
        "Enter valid requester and sponsor email addresses.",
      );
    out[key] = String(out[key]).toLowerCase();
  }
  for (const key of ["startDate", "endDate"]) {
    const value = String(out[key]);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      throw new AccessError(400, "Enter valid access dates.");
  }
  const days =
    (Date.parse(String(out.endDate)) - Date.parse(String(out.startDate))) /
    86400000;
  if (days < 0 || days > 366)
    throw new AccessError(
      400,
      "End date must follow the start date and be within one year.",
    );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (String(out.startDate) < today)
    throw new AccessError(400, "Start date cannot be in the past.");
  if (
    !Array.isArray(input.accessTypes) ||
    input.accessTypes.length === 0 ||
    input.accessTypes.length > 3 ||
    input.accessTypes.some(
      (x) => !["Building / badge", "Physical key", "Parking"].includes(x),
    )
  )
    throw new AccessError(400, "Choose at least one access type.");
  out.accessTypes = [...new Set(input.accessTypes)];
  if (input.consent !== true)
    throw new AccessError(400, "Please confirm the demo-data acknowledgment.");
  out.consent = true;
  if (out.schedule !== "Business hours" && !out.exception)
    throw new AccessError(400, "Explain why nonstandard hours are needed.");
  if ((out.accessTypes as string[]).includes("Parking") && !out.plate)
    throw new AccessError(
      400,
      "Enter a sample license plate for parking access.",
    );
  return out as Intake;
}
// Create a complete request only after validation. The random receipt is a bearer
// capability; its public lookup reveals status, not the underlying personal record.
// PROPOSED: bind approvals to an immutable request/scope version and an SSO identity.
export function newRequest(
  data: Intake,
  photo: string | null,
): { record: RequestRecord; receipt: string } {
  const approvalReasons = [];
  if (data.schedule !== "Business hours")
    approvalReasons.push(data.schedule + " access");
  if (data.affiliation !== "Employee")
    approvalReasons.push(data.affiliation + " access");
  if (data.exception) approvalReasons.push("Nonstandard request");
  if (data.accessTypes.includes("Physical key"))
    approvalReasons.push("Physical key issuance");
  const receipt = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const status: Status = approvalReasons.length
    ? "needs_approval"
    : "submitted";
  return {
    receipt,
    record: {
      id: randomUUID(),
      reference: "ARR-" + randomBytes(5).toString("hex").toUpperCase(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      status,
      data,
      approvalReasons,
      managementRequired: approvalReasons.length > 0,
      owner: "",
      photo,
      receiptHash: sha256(receipt),
      history: [
        {
          at: now,
          actor: "Requester",
          action: "submitted",
          note: approvalReasons.length
            ? "Routed to management: " + approvalReasons.join(", ")
            : "Entered the review queue.",
          status,
        },
      ],
    },
  };
}
// SECURITY: role + state + version checks are enforced server-side, under the store
// row lock. Shared demo role labels are not person-attributable audit identities.
// The provision action records a human assertion; it never calls a badge/door API.
// PROPOSED: independent provisioner role and tamper-evident external audit sink.
export function transition(
  record: RequestRecord,
  role: Role,
  input: Record<string, unknown>,
): RequestRecord {
  if (input.version !== record.version)
    throw new AccessError(
      409,
      "This request changed. Refresh before reviewing it.",
    );
  const action = input.action;
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 2000)
    throw new AccessError(400, "Keep the note under 2,000 characters.");
  if (["provisioned", "denied"].includes(record.status))
    throw new AccessError(409, "This request is closed.");
  let status = record.status;
  switch (action) {
    case "assign":
      if (role !== "reviewer")
        throw new AccessError(403, "Assignment is a reviewer action.");
      record.owner = "Facilities reviewer";
      break;
    case "escalate":
      if (!["submitted", "approved"].includes(status))
        throw new AccessError(
          409,
          "This request cannot be escalated in its current state.",
        );
      if (!note)
        throw new AccessError(400, "Add the reason for management review.");
      record.managementRequired = true;
      status = "needs_approval";
      break;
    case "approve":
      if (!["submitted", "needs_approval"].includes(status))
        throw new AccessError(409, "Only ready requests can be approved.");
      if (record.managementRequired && role !== "manager")
        throw new AccessError(403, "A manager must approve this exception.");
      if (!note) throw new AccessError(400, "Record the basis for approval.");
      if (input.verified !== true)
        throw new AccessError(
          400,
          "Confirm sponsor and access scope verification first.",
        );
      status = "approved";
      break;
    case "provision":
      if (role !== "reviewer" || status !== "approved")
        throw new AccessError(
          403,
          "Only a reviewer can provision an approved request.",
        );
      if (input.verified !== true || !note)
        throw new AccessError(
          400,
          "Confirm provisioning and record the badge/key reference or verification details.",
        );
      status = "provisioned";
      break;
    case "needs_info":
      if (!note)
        throw new AccessError(400, "Describe the missing information.");
      status = "needs_info";
      break;
    case "resume":
      if (role !== "reviewer" || status !== "needs_info")
        throw new AccessError(
          409,
          "Only a reviewer can resume a request awaiting information.",
        );
      if (!note)
        throw new AccessError(400, "Document the clarification received.");
      status = record.managementRequired ? "needs_approval" : "submitted";
      break;
    case "deny":
      if (!note) throw new AccessError(400, "Record the reason for denial.");
      status = "denied";
      break;
    default:
      throw new AccessError(400, "Choose a valid review action.");
  }
  record.status = status;
  record.version++;
  record.updatedAt = new Date().toISOString();
  record.history.push({
    at: record.updatedAt,
    actor: role === "manager" ? "Demo manager" : "Facilities reviewer",
    action: String(action),
    note,
    status,
  });
  return record;
}
