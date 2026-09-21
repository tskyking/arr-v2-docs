import { tickets } from "./tickets.js";
import legacySnapshot from "./legacy-v01.json";
import bootstrap from "./owner-bootstrap.json";
import { WorkspaceStore, WorkspaceTx } from "./store.js";
import {
  id,
  secret,
  now,
  sha256,
  check,
  text,
  email,
  hashPassword,
  verifyPassword,
  seedForms,
  validateDefinition,
  answers,
  applicable,
  can,
  publicUser,
  businessMinutes,
  type User,
  type Form,
  type Request,
  type Definition,
} from "./model.js";
type Input = Record<string, any>;
const until = (ms: number) => new Date(Date.now() + ms).toISOString();
const safe = (r: Request) => {
  const { receiptHash, photo, ...rest } = r;
  return { ...rest, hasPhoto: !!photo };
};
export class WorkspaceService {
  private lastCleanup = 0;
  constructor(public store: WorkspaceStore) {}
  async seed(tx: WorkspaceTx) {
    if (!(await tx.get("form", "arr"))) {
      for (const f of seedForms()) await tx.put("form", f.id, f);
    }
    if (!(await tx.get("settings", "main")))
      await tx.put("settings", "main", { holidays: [] });
    // A+ is bootstrapped by an operator-supplied secret, never by public registration.
    if (!(await tx.get("user", "owner"))) {
      await tx.put("user", "owner", {
        id: "owner",
        username: "owner",
        email: email(
          process.env.TSCHUTES_OWNER_EMAIL || "todd.king.tk42@gmail.com",
        ),
        role: "owner",
        active: true,
        forms: [],
        generation: 1,
        password: process.env.TSCHUTES_OWNER_PASSWORD
          ? hashPassword(process.env.TSCHUTES_OWNER_PASSWORD)
          : bootstrap,
      });
    }
  }
  async user(tx: WorkspaceTx, token: string) {
    const s = await tx.get("session", sha256(token));
    if (!s || s.expires < now()) return undefined;
    const u = await tx.get<User>("user", s.user);
    return u?.active && u.generation === s.generation ? u : undefined;
  }
  async event(tx: WorkspaceTx, u: User, action: string, note: string) {
    const key = id();
    await tx.put("event", key, {
      id: key,
      at: now(),
      actor: u.username,
      action,
      note,
    });
  }
  async mail(
    tx: WorkspaceTx,
    key: string,
    to: string,
    subject: string,
    body: string,
  ) {
    if (await tx.get("mail", key)) return;
    await tx.put("mail", key, {
      id: key,
      to,
      subject,
      body,
      status: /@(example\.(com|org|net)|[^@]+\.test)$/.test(to)
        ? "demo-only"
        : "pending",
      expires: key.startsWith("activation-") ? until(3600000) : until(86400000),
      attempts: 0,
      at: now(),
    });
  }
  async activation(tx: WorkspaceTx, u: User) {
    const token = secret();
    await tx.put("activation", sha256(token), {
      user: u.id,
      expires: until(3600000),
      generation: u.generation,
    });
    const base =
      process.env.TSCHUTES_PUBLIC_URL ||
      "https://access.arrweb.com/api/access-demo/";
    await this.mail(
      tx,
      "activation-" + id(),
      u.email,
      "ARR demo: set your account password",
      `An authorized administrator approved your account setup/reset. This link expires in one hour. Do not forward it.\n${base}#activate=${token}\nIf you did not expect this, contact the demo owner.`,
    );
  }
  async execute(
    route: string,
    input: Input,
    token: string,
    photo?: string | null,
  ): Promise<any> {
    return this.store.transaction(async (tx) => {
      await this.seed(tx);
      if (Date.now() - this.lastCleanup > 3600000) {
        await tx.cleanup();
        this.lastCleanup = Date.now();
      }
      const u = await this.user(tx, token);
      if (route === "catalog")
        return {
          forms: (await tx.list<Form>("form"))
            .filter((f) => f.published)
            .map((f) => ({
              id: f.id,
              version: f.published,
              definition: f.versions.find((v) => v.number === f.published)!
                .definition,
            })),
          user: u ? publicUser(u) : null,
          emailConfigured: !!(
            process.env.TSCHUTES_MAIL_API_KEY && process.env.TSCHUTES_MAIL_FROM
          ),
        };
      if (route === "login") {
        const users = await tx.list<User>("user");
        const found = users.find(
          (v) =>
            v.username.toLowerCase() === String(input.username).toLowerCase() ||
            v.email === String(input.username).toLowerCase(),
        );
        check(
          found?.active && verifyPassword(input.password, found.password),
          "Username or password is incorrect.",
          401,
        );
        const session = secret();
        await tx.put("session", sha256(session), {
          user: found.id,
          generation: found.generation,
          expires: until(4 * 3600000),
        });
        return { token: session, user: publicUser(found) };
      }
      if (route === "logout") {
        await tx.remove("session", sha256(token));
        return { ok: true };
      }
      if (route === "activate" || route === "activation-info") {
        check(
          typeof input.token === "string" && input.token.length === 43,
          "Invalid setup link.",
        );
        const key = sha256(input.token);
        const activation = await tx.get("activation", key);
        check(
          activation && activation.expires > now(),
          "Setup link expired or unavailable.",
          410,
        );
        const user = await tx.get<User>("user", activation.user);
        check(
          user?.active && user.generation === activation.generation,
          "Account is inactive or link was replaced.",
          403,
        );
        if (route === "activation-info") return { username: user.username };
        user.password = hashPassword(input.password);
        user.generation++;
        await tx.put("user", user.id, user);
        await tx.remove("activation", key);
        await tx.remove("session", sha256(token));
        return { ok: true, username: user.username };
      }
      if (route === "reset-request") {
        const name = text(input.username);
        const found = (await tx.list<User>("user")).find(
          (v) => v.username === name || v.email === name.toLowerCase(),
        );
        if (found?.active) {
          await tx.put("reset", found.id, {
            id: found.id,
            user: found.id,
            at: now(),
          });
          const owner = await tx.get<User>("user", "owner");
          if (owner)
            await this.mail(
              tx,
              "reset-request-" +
                found.id +
                "-" +
                new Date().toISOString().slice(0, 10),
              owner.email,
              "ARR demo: account reset awaiting approval",
              `Account ${found.username} requested a reset. Sign in to A+ to review. No password has been changed.`,
            );
        }
        return {
          ok: true,
          message: "If the account is eligible, A+ will receive the request.",
        };
      }
      if (route === "visit") {
        const form = text(input.form, 30);
        check(await tx.get("form", form), "Unknown form.");
        const key = now().slice(0, 10) + "-" + form;
        const count = (await tx.get("visit", key)) || {
          id: key,
          form,
          date: now().slice(0, 10),
          views: 0,
        };
        count.views++;
        await tx.put("visit", key, count);
        return { ok: true };
      }
      if (route === "draft") {
        check(
          typeof input.token === "string" && input.token.length === 43,
          "Invalid draft token.",
        );
        const key = sha256(input.token);
        const old = await tx.get("draft", key);
        check(
          !old || (!old.completed && old.expires > now()),
          "The 20-minute window ended. Start again.",
          410,
        );
        const f = await tx.get<Form>("form", text(input.form, 30));
        check(f?.published, "Form not available.", 404);
        const version = old?.formVersion ?? Number(input.version);
        check(
          old ? old.form === f.id : version === f.published,
          "A new form version is available. Reload before starting.",
          409,
        );
        const def = f.versions.find((v) => v.number === version)!.definition;
        const draft = {
          id: old?.id ?? id(),
          form: f.id,
          formVersion: version,
          definition: def,
          data: answers(def, input.data, true),
          createdAt: old?.createdAt ?? now(),
          expires: old?.expires ?? until(20 * 60000),
          completed: null,
        };
        await tx.put("draft", key, draft);
        return { expires: draft.expires, serverNow: now() };
      }
      if (route === "submit") {
        check(
          typeof input.token === "string" && input.token.length === 43,
          "Start on page one.",
        );
        const key = sha256(input.token);
        const draft = await tx.get("draft", key);
        check(draft, "Start on page one.", 410);
        if (draft.completed) return draft.completed;
        check(
          draft.expires > now(),
          "The 20-minute window ended. Only page one was captured. Start again.",
          410,
        );
        const data = answers(draft.definition, input.data);
        const receipt = secret();
        const rid = id();
        let family: string = rid,
          attempt = 1;
        if (input.resubmit) {
          const previous = (await tx.list<Request>("request")).find(
            (r) => r.receiptHash === sha256(String(input.resubmit)),
          );
          check(
            previous?.status === "rejected" && previous.form === draft.form,
            "Only a rejected request can be resubmitted.",
          );
          check(
            String(previous.data.email) === data.email,
            "Resubmission must use the original requester email.",
          );
          family = previous.family;
          const siblings = (await tx.list<Request>("request")).filter(
            (r) => r.family === family,
          );
          check(
            !siblings.some(
              (r) => !["rejected", "provisioned"].includes(r.status),
            ),
            "This request already has an active attempt.",
          );
          attempt = Math.max(...siblings.map((r) => r.attempt)) + 1;
        }
        const r: Request = {
          id: rid,
          family,
          attempt,
          form: draft.form,
          formVersion: draft.formVersion,
          definition: draft.definition,
          reference:
            draft.form.toUpperCase() + "-" + rid.slice(0, 8).toUpperCase(),
          receiptHash: sha256(receipt),
          data,
          photo,
          createdAt: now(),
          updatedAt: now(),
          revision: 1,
          status: "pending",
          steps: draft.definition.steps.filter((s: any) => applicable(s, data)),
          step: 0,
          locked: false,
          actionableAt: now(),
          pauses: [],
          decisions: [],
          history: [
            {
              at: now(),
              actor: "requester",
              action: "submitted",
              note: "Attempt " + attempt,
            },
          ],
        };
        check(r.steps.length, "No approval route is configured.");
        await tx.put("request", rid, r);
        const result = {
          reference: r.reference,
          receipt,
          status: r.status,
          form: r.form,
          version: r.formVersion,
          latest: (await tx.get<Form>("form", r.form))!.published,
        };
        draft.completed = result;
        draft.data = {};
        await tx.put("draft", key, draft);
        await this.mail(
          tx,
          "submitted-" + rid,
          String(data.email),
          "ARR demo: request received",
          `${r.reference} was received (form 0.${r.formVersion}). No real access or permit is granted.\nKeep this private status/comment link: ${process.env.TSCHUTES_PUBLIC_URL || "https://access.arrweb.com/api/access-demo/"}#receipt=${receipt}`,
        );
        return result;
      }
      if (route === "receipt" || route === "requester-comment") {
        check(
          typeof input.receipt === "string" && input.receipt.length === 43,
          "Receipt unavailable.",
          404,
        );
        const r = (await tx.list<Request>("request")).find(
          (r) => r.receiptHash === sha256(input.receipt),
        );
        check(r, "Receipt unavailable or expired.", 404);
        if (route === "requester-comment") {
          check(
            ["pending", "clarification"].includes(r.status),
            "Requester comments close at approval or rejection.",
            409,
          );
          const note = text(input.note, 1500);
          check(note, "Enter a comment.");
          r.history.push({
            at: now(),
            actor: "requester",
            action: "comment",
            note,
          });
          if (r.status === "clarification") {
            r.status = "pending";
            r.pauses[r.pauses.length - 1].end = now();
          }
          r.updatedAt = now();
          r.revision++;
          await tx.put("request", r.id, r);
        }
        return {
          reference: r.reference,
          requesterName: r.data.name,
          status: r.status,
          form: r.form,
          formVersion: r.formVersion,
          latest: (await tx.get<Form>("form", r.form))!.published,
          history: r.history
            .filter((h) =>
              [
                "comment",
                "clarification",
                "rejected",
                "approved",
                "submitted",
                "provisioned",
              ].includes(h.action),
            )
            .map(({ at, action, note }) => ({ at, action, note })),
          canComment: ["pending", "clarification"].includes(r.status),
        };
      }
      check(u, "Please sign in.", 401);
      if (route.startsWith("ticket-")) return tickets(tx, u, route, input, photo);
      if (route === "dashboard") {
        const forms = await tx.list<Form>("form");
        const records = (await tx.list<Request>("request"))
          .filter((r) => u.role === "owner" || u.forms.includes(r.form))
          .map(safe);
        const drafts = (await tx.list("draft"))
          .filter(
            (d) =>
              !d.completed &&
              d.expires <= now() &&
              (u.role === "owner" || u.forms.includes(d.form)),
          )
          .map((d) => ({
            id: d.id,
            form: d.form,
            formVersion: d.formVersion,
            status: "partial",
            reference: "Partial form · timed out",
            data: d.data,
            createdAt: d.createdAt,
            updatedAt: d.expires,
            revision: 1,
          }));
        return {
          user: publicUser(u),
          forms: forms.filter(
            (f) => u.role === "owner" || u.forms.includes(f.id),
          ),
          requests: [...records, ...drafts],
          users: ["owner", "admin"].includes(u.role)
            ? (await tx.list<User>("user"))
                .filter(
                  (v) =>
                    u.role === "owner" ||
                    (["reviewer", "manager"].includes(v.role) &&
                      v.forms.every((f) => u.forms.includes(f))),
                )
                .map(publicUser)
            : [],
          resets: u.role === "owner" ? await tx.list("reset") : [],
          accessRequests: u.role === "owner" ? await tx.list("access") : [],
          mail:
            u.role === "owner"
              ? (await tx.list("mail")).map(({ body, to, ...v }) => v)
              : [],
          events: u.role === "owner" ? await tx.list("event") : [],
        };
      }
      if (route === "photo") {
        const r = await tx.get<Request>("request", text(input.id));
        check(r, "Request not found.", 404);
        can(u, r.form, ["admin", "reviewer", "manager"]);
        return { photo: r.photo ?? null };
      }
      if (route === "legacy-archive") {
        can(u, "arr", ["owner", "admin"]);
        return legacySnapshot;
      }
      if (route === "access-request") {
        check(
          u.role === "admin",
          "Only form admins request additional editing access.",
          403,
        );
        check(Array.isArray(input.forms), "Select forms.");
        const forms = input.forms.map((v: unknown) => text(v, 30));
        for (const f of forms) check(await tx.get("form", f), "Unknown form.");
        await tx.put("access", u.id, {
          id: u.id,
          username: u.username,
          forms,
          at: now(),
        });
        return { ok: true };
      }
      if (route === "user-save") {
        check(["owner", "admin"].includes(u.role), "Not permitted.", 403);
        const old = input.id
          ? await tx.get<User>("user", text(input.id))
          : undefined;
        check(!input.id || old, "Account not found.");
        check(
          !old || old.id !== "owner",
          "A+ cannot be disabled or reassigned here.",
        );
        const role = input.role;
        check(["admin", "reviewer", "manager"].includes(role), "Invalid role.");
        check(
          Array.isArray(input.forms) && input.forms.length > 0,
          "Assign at least one form.",
        );
        const forms = [
          ...new Set(input.forms.map((v: unknown) => text(v, 30))),
        ] as string[];
        for (const f of forms) check(await tx.get("form", f), "Unknown form.");
        if (u.role === "admin")
          check(
            ["reviewer", "manager"].includes(role) &&
              (!old || ["reviewer", "manager"].includes(old.role)) &&
              forms.every((f) => u.forms.includes(f)) &&
              (!old || old.forms.every((f) => u.forms.includes(f))),
            "Admins may only manage reviewers for their own forms.",
            403,
          );
        const username = text(input.username, 80).toLowerCase(),
          mail = email(input.email);
        check(
          /^[a-z0-9._-]{3,80}$/.test(username),
          "Use a username with letters, digits, dot, dash or underscore.",
        );
        check(
          !(await tx.list<User>("user")).some(
            (v) =>
              v.id !== old?.id && (v.username === username || v.email === mail),
          ),
          "Username or email already exists.",
        );
        const user: User = {
          id: old?.id ?? id(),
          username,
          email: mail,
          role,
          forms,
          active: input.active === true,
          generation: (old?.generation ?? 0) + 1,
          ...(old?.password && old.email === mail
            ? { password: old.password }
            : {}),
        };
        await tx.put("user", user.id, user);
        await tx.remove("access", user.id);
        if (user.active && !user.password) await this.activation(tx, user);
        await this.event(tx, u, "account updated", username);
        return { ok: true };
      }
      if (route === "setup-link") {
        check(
          u.role === "owner",
          "Only A+ can issue a manual setup link.",
          403,
        );
        const account = await tx.get<User>("user", text(input.id));
        check(account?.active, "Active account required.");
        account.generation++;
        await tx.put("user", account.id, account);
        const cap = secret();
        await tx.put("activation", sha256(cap), {
          user: account.id,
          expires: until(3600000),
          generation: account.generation,
        });
        await this.event(
          tx,
          u,
          "manual setup link issued",
          account.username +
            "; owner must verify recipient before private delivery",
        );
        return {
          username: account.username,
          link:
            (process.env.TSCHUTES_PUBLIC_URL ||
              "https://access.arrweb.com/api/access-demo/") +
            "#activate=" +
            cap,
        };
      }
      if (route === "reset-approve") {
        check(u.role === "owner", "Only A+ approves resets.", 403);
        const user = await tx.get<User>("user", text(input.id));
        check(user?.active, "Active account required.");
        user.generation++;
        await tx.put("user", user.id, user);
        await this.activation(tx, user);
        await tx.remove("reset", user.id);
        await this.event(tx, u, "reset approved", user.username);
        return { ok: true };
      }
      if (route === "password") {
        check(
          verifyPassword(input.current, u.password),
          "Current password incorrect.",
          401,
        );
        u.password = hashPassword(input.password);
        u.generation++;
        await tx.put("user", u.id, u);
        return { ok: true };
      }
      if (route === "form-create") {
        check(u.role === "owner", "Only A+ creates forms.", 403);
        const key = text(input.id, 20).toLowerCase();
        check(
          /^[a-z][a-z0-9-]{1,19}$/.test(key) && !(await tx.get("form", key)),
          "Choose an unused short form code.",
        );
        const base = seedForms()[1].versions[0].definition;
        base.title = text(input.title);
        await tx.put("form", key, {
          id: key,
          revision: 1,
          published: 0,
          versions: [],
          draft: {
            definition: base,
            by: u.username,
            summary: "New form",
            state: "draft",
          },
        });
        return { ok: true };
      }
      if (
        ["form-save", "form-review", "form-publish", "form-return"].includes(
          route,
        )
      ) {
        const f = await tx.get<Form>("form", text(input.id));
        check(f, "Form not found.", 404);
        can(u, f.id, ["admin", "owner"]);
        check(
          input.revision === f.revision,
          "Form changed. Reload before saving.",
          409,
        );
        if (route === "form-save") {
          check(
            f.draft?.state !== "pending",
            "Withdraw/return the pending version before editing.",
            409,
          );
          f.draft = {
            definition: validateDefinition(input.definition),
            by: u.username,
            summary: text(input.summary, 1000),
            state: "draft",
          };
        }
        if (route === "form-review") {
          check(f.draft?.state === "draft", "Save a draft first.");
          f.draft.state = "pending";
        }
        if (route === "form-return") {
          check(
            u.role === "owner" && f.draft,
            "Only A+ can return a draft.",
            403,
          );
          f.draft.state = "draft";
        }
        if (route === "form-publish") {
          check(u.role === "owner", "Only A+ publishes.", 403);
          check(
            f.draft?.state === "pending",
            "Submit the draft for A+ review first.",
          );
          const n = Math.max(0, ...f.versions.map((v) => v.number)) + 1;
          f.versions.push({
            number: n,
            definition: validateDefinition(f.draft.definition),
            at: now(),
            by: u.username,
            summary: f.draft.summary,
          });
          f.published = n;
          delete f.draft;
        }
        f.revision++;
        await tx.put("form", f.id, f);
        await this.event(tx, u, route, f.id);
        return f;
      }
      if (route === "request-action") {
        const r = await tx.get<Request>("request", text(input.id));
        check(r, "Request not found.", 404);
        can(u, r.form, ["admin", "reviewer", "manager"]);
        check(
          input.revision === r.revision,
          "Request changed. Reload before acting.",
          409,
        );
        const action = text(input.action);
        const note = text(input.note ?? "", 1500);
        const settings = await tx.get("settings", "main");
        if (action === "comment") {
          check(note, "Enter a comment.");
          check(
            u.role === "admin" ||
              ["pending", "clarification"].includes(r.status),
            "Only Admins comment after a decision.",
            403,
          );
          r.history.push({
            at: now(),
            actor: u.username,
            action: "comment",
            note,
          });
        } else if (action === "edit") {
          check(
            u.role === "admin" &&
              !r.locked &&
              ["pending", "clarification"].includes(r.status),
            "Answers are locked after first approval or closure.",
            403,
          );
          check(note, "Explain the edit.");
          const data = answers(r.definition, input.data);
          check(
            data.email === r.data.email,
            "Requester email cannot be changed after submission.",
          );
          r.history.push({
            at: now(),
            actor: u.username,
            action: "answers edited",
            note,
            before: r.data,
            after: data,
          });
          r.data = data;
          r.steps = r.definition.steps.filter((s) => applicable(s, data));
        } else if (action === "provision") {
          check(
            u.role === "reviewer" && r.status === "approved",
            "Reviewer may record completion only after all approvals.",
            403,
          );
          check(note, "Enter a completion note.");
          r.status = "provisioned";
          r.history.push({
            at: now(),
            actor: u.username,
            action: "provisioned",
            note,
          });
        } else {
          check(
            ["approve", "reject", "clarify"].includes(action),
            "Unknown action.",
          );
          check(
            ["pending", "clarification"].includes(r.status),
            "Attempt is already closed.",
            409,
          );
          check(
            r.steps[r.step]?.role === u.role,
            "This approval step belongs to a different role.",
            403,
          );
          check(
            r.status === "pending" || action === "reject",
            "Wait for clarification before approving.",
            409,
          );
          check(action === "approve" || note, "A reason is required.");
          if (action === "clarify") {
            r.status = "clarification";
            r.pauses.push({ start: now() });
            r.history.push({
              at: now(),
              actor: u.username,
              action: "clarification",
              note,
            });
            await this.mail(
              tx,
              "clarify-" + r.id + "-" + r.revision,
              String(r.data.email),
              r.reference + ": clarification requested",
              note + "\nUse your private receipt link to respond.",
            );
          } else {
            const result = action === "approve" ? "approved" : "rejected";
            r.decisions.push({
              step: r.steps[r.step].label,
              actor: u.username,
              result,
              at: now(),
              businessMinutes: businessMinutes(
                r.actionableAt,
                now(),
                settings.holidays,
                r.pauses,
              ),
            });
            r.history.push({
              at: now(),
              actor: u.username,
              action: result,
              note: note || "Approval recorded.",
            });
            if (action === "reject") {
              r.status = "rejected";
              if (r.pauses.at(-1) && !r.pauses.at(-1)!.end)
                r.pauses.at(-1)!.end = now();
            } else {
              r.locked = true;
              r.step++;
              r.status = r.step === r.steps.length ? "approved" : "pending";
              r.actionableAt = now();
            }
            if (r.status === "approved" || r.status === "rejected")
              await this.mail(
                tx,
                result + "-" + r.id,
                String(r.data.email),
                r.reference + ": " + result,
                `${note || "All required approvals are complete."}\nThis is a demo decision only. No real permit/access is issued. Use your private receipt link for status${r.status === "rejected" ? " or to start a linked resubmission (all approval steps restart)" : ""}.`,
              );
          }
        }
        r.updatedAt = now();
        r.revision++;
        await tx.put("request", r.id, r);
        return safe(r);
      }
      if (route === "settings") {
        check(
          u.role === "owner",
          "Only A+ manages the business calendar.",
          403,
        );
        check(
          Array.isArray(input.holidays) && input.holidays.length <= 100,
          "Invalid holiday list.",
        );
        const holidays = input.holidays.map((v: unknown) => text(v, 10));
        check(
          holidays.every((v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)),
          "Use YYYY-MM-DD dates.",
        );
        await tx.put("settings", "main", { holidays });
        return { ok: true };
      }
      if (route === "metrics") {
        check(u.role === "owner", "Metrics are A+ only.", 403);
        const all = await tx.list<Request>("request"),
          settings = await tx.get("settings", "main");
        return {
          calendar: settings,
          views: await tx.list("visit"),
          uniqueRequests: new Set(all.map((r) => r.family)).size,
          totalAttempts: all.length,
          pending: all.filter((r) =>
            ["pending", "clarification"].includes(r.status),
          ).length,
          byForm: (await tx.list<Form>("form")).map((f) => ({
            form: f.id,
            attempts: all.filter((r) => r.form === f.id).length,
            pending: all.filter(
              (r) =>
                r.form === f.id &&
                ["pending", "clarification"].includes(r.status),
            ).length,
          })),
          timings: all.map((r) => ({
            reference: r.reference,
            form: r.form,
            family: r.family,
            attempt: r.attempt,
            status: r.status,
            businessMinutes: businessMinutes(
              r.createdAt,
              ["approved", "rejected", "provisioned"].includes(r.status)
                ? (r.decisions.at(-1)?.at ?? r.updatedAt)
                : now(),
              settings.holidays,
              r.pauses,
            ),
            decisions: r.decisions,
          })),
          retentionDays: 7,
        };
      }
      check(false, "Operation not found.", 404);
    });
  }
}
