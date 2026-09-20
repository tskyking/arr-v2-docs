/** Versioned demonstration forms. Definitions are data, never executable templates. */
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { AccessError, sha256, facilities } from "../domain.js";
export { sha256 };
export const id = () => randomUUID();
export const secret = () => randomBytes(32).toString("base64url");
export const now = () => new Date().toISOString();
export function check(ok: unknown, message: string, status = 400): asserts ok {
  if (!ok) throw new AccessError(status, message);
}
export function text(v: unknown, max = 160) {
  check(
    typeof v === "string" &&
      v.length <= max &&
      !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),
    "Invalid text.",
  );
  return v.trim();
}
export function email(v: unknown) {
  const s = text(v).toLowerCase();
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Enter a valid email.");
  return s;
}
export function hashPassword(value: unknown) {
  const p = text(value, 200);
  check(p.length >= 14, "Use at least 14 characters for your password.");
  const salt = secret();
  return { salt, hash: scryptSync(p, salt, 64).toString("hex") };
}
export function verifyPassword(
  p: unknown,
  stored?: { salt: string; hash: string },
) {
  if (!stored || typeof p !== "string" || p.length > 200) return false;
  return timingSafeEqual(
    scryptSync(p, stored.salt, 64),
    Buffer.from(stored.hash, "hex"),
  );
}
export type Role = "owner" | "admin" | "reviewer" | "manager";
export type User = {
  id: string;
  username: string;
  email: string;
  role: Role;
  active: boolean;
  forms: string[];
  password?: { salt: string; hash: string };
  generation: number;
};
export type Field = {
  key: string;
  label: string;
  help: string;
  type:
    | "text"
    | "textarea"
    | "email"
    | "date"
    | "select"
    | "multi"
    | "checkbox";
  page: number;
  required: boolean;
  options: string[];
};
export type Condition = {
  field: string;
  op: "equals" | "not_equals" | "contains" | "not_empty";
  value: string;
};
export type Step = {
  id: string;
  label: string;
  role: "reviewer" | "manager";
  when: Condition[];
};
export type Definition = {
  title: string;
  description: string;
  fields: Field[];
  steps: Step[];
};
export type Form = {
  id: string;
  revision: number;
  published: number;
  versions: {
    number: number;
    definition: Definition;
    at: string;
    by: string;
    summary: string;
  }[];
  draft?: {
    definition: Definition;
    by: string;
    summary: string;
    state: "draft" | "pending";
  };
};
export type History = {
  at: string;
  actor: string;
  action: string;
  note: string;
  before?: unknown;
  after?: unknown;
};
export type Request = {
  id: string;
  family: string;
  attempt: number;
  form: string;
  formVersion: number;
  definition: Definition;
  reference: string;
  receiptHash: string;
  data: Record<string, unknown>;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  status: "pending" | "clarification" | "approved" | "rejected" | "provisioned";
  steps: Step[];
  step: number;
  locked: boolean;
  actionableAt: string;
  pauses: { start: string; end?: string }[];
  decisions: {
    step: string;
    actor: string;
    result: string;
    at: string;
    businessMinutes: number;
  }[];
  history: History[];
};
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  page = 1,
  required = true,
  options: string[] = [],
): Field => ({ key, label, type, page, required, options, help: "" });
const departments = [
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
];
export function seedForms(): Form[] {
  const common = [
    f("name", "Requester name"),
    f("email", "Requester email", "email"),
    f("phone", "Phone", "text", 1, false),
    f("department", "Department", "select", 1, true, departments),
  ];
  const arr: Definition = {
    title: "Access Request Review",
    description: "Fictional facilities • no real access is granted",
    fields: [
      ...common,
      f("affiliation", "Affiliation", "select", 1, true, [
        "Employee",
        "Contractor",
        "Visitor",
      ]),
      f("sponsor", "Sponsor"),
      f("sponsorEmail", "Sponsor email", "email"),
      f("badge", "Existing badge reference", "text", 1, false),
      f("facility", "Facility", "select", 2, true, facilities),
      f("areas", "Areas / rooms", "textarea", 2),
      f("accessTypes", "Access types", "multi", 2, true, [
        "Building / badge",
        "Physical key",
        "Parking",
      ]),
      f("reason", "Reason", "textarea", 2),
      f("startDate", "Start date", "date", 2),
      f("endDate", "End date", "date", 2),
      f("schedule", "Schedule", "select", 2, true, [
        "Business hours",
        "After hours",
        "24/7",
      ]),
      f("exception", "Exception details", "textarea", 2, false),
      f("plate", "Sample license plate", "text", 3, false),
      f("vehicle", "Vehicle description", "text", 3, false),
      f("urgency", "Urgency", "select", 3, true, [
        "Standard",
        "Time-sensitive",
      ]),
      f("consent", "I am using fictional demo information", "checkbox", 4),
    ],
    steps: [
      { id: "review", label: "Request review", role: "reviewer", when: [] },
      {
        id: "exception",
        label: "Exception approval",
        role: "manager",
        when: [
          { field: "schedule", op: "not_equals", value: "Business hours" },
          { field: "affiliation", op: "not_equals", value: "Employee" },
          { field: "accessTypes", op: "contains", value: "Physical key" },
          { field: "exception", op: "not_empty", value: "" },
        ],
      },
    ],
  };
  const prr: Definition = {
    title: "Parking Permit Review",
    description: "Fictional parking demonstration • no permit is issued",
    fields: [
      ...common,
      f("lot", "Parking location", "select", 2, true, [
        "Lot A",
        "Lot B",
        "Lot C",
        "Fairgrounds special parking",
      ]),
      f("category", "Parking category", "select", 2, true, [
        "General",
        "Accessible (handicapped)",
        "VIP",
        "Covered parking",
      ]),
      f("escort", "Escorted service needed", "checkbox", 2, false),
      f("security", "Security needed", "checkbox", 2, false),
      f(
        "largeVehicle",
        "Vehicle needs more than one space",
        "checkbox",
        2,
        false,
      ),
      f("plate", "Fictional plate", "text", 2),
      f("startDate", "Start date", "date", 2),
      f("endDate", "End date", "date", 2),
      f("reason", "Details", "textarea", 2),
      f("consent", "I am using fictional demo information", "checkbox", 3),
    ],
    steps: [
      { id: "review", label: "Parking review", role: "reviewer", when: [] },
      { id: "approval", label: "Parking approval", role: "manager", when: [] },
    ],
  };
  return [
    ["arr", arr],
    ["prr", prr],
  ].map(([key, d]) => {
    const definition = d as Definition;
    const versions = [
      {
        number: 1,
        definition,
        at: now(),
        by: "system",
        summary:
          key === "arr"
            ? "Archived pre-enhancement 0.1: see exact legacy snapshot; structured fields are a migration reference, not a re-execution of the old policy."
            : "Initial parking form 0.1",
      },
    ];
    if (key === "arr")
      versions.push({
        number: 2,
        definition: structuredClone(definition),
        at: now(),
        by: "system",
        summary:
          "Owner-authorized multi-form release: personal accounts and ordered approval workflow.",
      });
    return {
      id: key as string,
      revision: 1,
      published: key === "arr" ? 2 : 1,
      versions,
    };
  });
}
export function validateDefinition(raw: unknown): Definition {
  check(raw && typeof raw === "object", "Invalid definition.");
  const d = raw as Definition;
  const title = text(d.title);
  check(title, "Title is required.");
  const description = text(d.description, 1000);
  check(
    Array.isArray(d.fields) && d.fields.length >= 3 && d.fields.length <= 60,
    "Use 3–60 questions.",
  );
  const keys = new Set<string>();
  const fields = d.fields.map((x) => {
    const key = text(x.key, 50);
    check(
      /^[a-z][a-zA-Z0-9_]*$/.test(key) &&
        !["__proto__", "constructor", "prototype"].includes(key) &&
        !keys.has(key),
      "Question keys must be unique safe identifiers.",
    );
    keys.add(key);
    check(
      [
        "text",
        "textarea",
        "email",
        "date",
        "select",
        "multi",
        "checkbox",
      ].includes(x.type),
      "Unsupported question type.",
    );
    check(
      Number.isInteger(x.page) && x.page >= 1 && x.page <= 6,
      "Page must be 1–6.",
    );
    check(
      Array.isArray(x.options) && x.options.length <= 60,
      "Too many options.",
    );
    const options = x.options.map((v) => text(v));
    check(
      !["select", "multi"].includes(x.type) || options.length > 0,
      "Choice questions need options.",
    );
    return {
      key,
      label: text(x.label),
      help: text(x.help ?? "", 1000),
      type: x.type,
      page: x.page,
      required: !!x.required,
      options,
    };
  });
  check(
    fields.some(
      (x) =>
        x.key === "name" && x.required && x.page === 1 && x.type === "text",
    ) &&
      fields.some(
        (x) =>
          x.key === "email" && x.required && x.page === 1 && x.type === "email",
      ),
    "Required name and email must stay on page one.",
  );
  check(
    fields.some(
      (x) => x.key === "consent" && x.required && x.type === "checkbox",
    ),
    "Required demo acknowledgment must remain.",
  );
  check(
    Array.isArray(d.steps) && d.steps.length > 0 && d.steps.length <= 8,
    "Use 1–8 approval steps.",
  );
  const ids = new Set();
  const steps = d.steps.map((s) => {
    check(
      ["reviewer", "manager"].includes(s.role),
      "Step needs reviewer or manager.",
    );
    const key = text(s.id, 50);
    check(
      /^[a-z][a-z0-9_-]*$/.test(key) && !ids.has(key),
      "Unique step ID required.",
    );
    ids.add(key);
    check(Array.isArray(s.when) && s.when.length <= 12, "Too many conditions.");
    return {
      id: key,
      label: text(s.label),
      role: s.role,
      when: s.when.map((c) => {
        check(
          keys.has(c.field) &&
            ["equals", "not_equals", "contains", "not_empty"].includes(c.op),
          "Invalid step condition.",
        );
        return { field: c.field, op: c.op, value: text(c.value) };
      }),
    };
  });
  check(
    steps.some((s) => s.when.length === 0),
    "At least one unconditional approval step is required.",
  );
  return { title, description, fields, steps };
}
export function answers(def: Definition, raw: unknown, first = false) {
  check(
    raw && typeof raw === "object" && !Array.isArray(raw),
    "Enter answers.",
  );
  const input = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const f of def.fields.filter((f) => !first || f.page === 1)) {
    let v = input[f.key];
    if (f.type === "checkbox") {
      v = v === true;
      check(!f.required || v, `Confirm ${f.label}.`);
    } else if (f.type === "multi") {
      check(v === undefined || Array.isArray(v), `Invalid ${f.label}.`);
      v = [...new Set((v ?? []) as string[])];
      check(
        (v as string[]).every((x) => f.options.includes(x)) &&
          (!f.required || (v as string[]).length > 0),
        `Choose ${f.label}.`,
      );
    } else {
      v = text(v ?? "", f.type === "textarea" ? 1500 : 160);
      check(!f.required || v, `Complete ${f.label}.`);
      if (v && f.type === "email") v = email(v);
      if (v && f.type === "select")
        check(f.options.includes(v as string), `Choose ${f.label}.`);
      if (v && f.type === "date")
        check(
          /^\d{4}-\d{2}-\d{2}$/.test(v as string) &&
            Number.isFinite(Date.parse(v as string)) &&
            new Date(v as string).toISOString().slice(0, 10) === v,
          "Use a valid date.",
        );
    }
    result[f.key] = v;
  }
  if (!first && result.startDate && result.endDate)
    check(
      String(result.endDate) >= String(result.startDate),
      "End date must follow start date.",
    );
  return result;
}
export function applicable(step: Step, data: Record<string, unknown>) {
  return (
    !step.when.length ||
    step.when.some((c) => {
      const v = data[c.field];
      return c.op === "not_empty"
        ? Boolean(v)
        : c.op === "contains"
          ? Array.isArray(v) && v.includes(c.value)
          : c.op === "equals"
            ? String(v) === c.value
            : String(v) !== c.value;
    })
  );
}
// Business-minute integration uses actual UTC instants and Pacific wall-clock parts,
// so weekends and DST transitions are handled without assuming a fixed UTC offset.
const pacific = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function businessMinutes(
  start: string,
  end: string,
  holidays: string[] = [],
  pauses: { start: string; end?: string }[] = [],
) {
  const a = Date.parse(start),
    b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  let sum = 0;
  for (let t = a; t < b; ) {
    const next = Math.min(b, Math.floor(t / 60000) * 60000 + 60000);
    const p = Object.fromEntries(
      pacific.formatToParts(new Date(t)).map((p) => [p.type, p.value]),
    );
    const date = `${p.year}-${p.month}-${p.day}`;
    if (
      !["Sat", "Sun"].includes(p.weekday) &&
      +p.hour >= 8 &&
      +p.hour < 17 &&
      !holidays.includes(date)
    ) {
      let active = next - t;
      for (const pause of pauses)
        active -= Math.max(
          0,
          Math.min(next, Date.parse(pause.end ?? end)) -
            Math.max(t, Date.parse(pause.start)),
        );
      sum += Math.max(0, active) / 60000;
    }
    t = next;
  }
  return Math.round(sum * 100) / 100;
}
export function can(user: User, form: string, roles: Role[]) {
  check(
    user.active &&
      roles.includes(user.role) &&
      (user.role === "owner" || user.forms.includes(form)),
    "You do not have access to this form or action.",
    403,
  );
}
export function publicUser(u: User) {
  const { password, ...rest } = u;
  return rest;
}
