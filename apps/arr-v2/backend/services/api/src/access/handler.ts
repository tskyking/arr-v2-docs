/**
 * Same-origin Access Request Review HTTP API and static asset handler.
 * This is a functional demo, not security accreditation. Comments are explanatory;
 * County SSO, sponsor-directory, Smartsheet and physical-access APIs remain out of scope.
 * The owner-authorized workspace adds personal accounts and an optional email outbox.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  AccessError,
  newRequest,
  sha256,
  transition,
  validateIntake,
  validateFirstPage,
  type Role,
} from "./domain.js";
import { AccessStore, productionStore } from "./store.js";
import credentials from "./credentials.json";
import { WorkspaceStore } from "./workspace/store.js";
import { WorkspaceService } from "./workspace/service.js";
import { deliverMail } from "./workspace/mail.js";

const derive = promisify(scrypt);
const MAX_BYTES = 900_000;
const COOKIE = "tschutes_arr_session";
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const assets = new Map<string, { type: string; body: Buffer }>();
const publicDir = existsSync(
  join(process.cwd(), "dist/access-public/index.html"),
)
  ? join(process.cwd(), "dist/access-public")
  : join(process.cwd(), "services/api/src/access/public");
for (const [file, type] of [
  ["index.html", "text/html; charset=utf-8"],
  ["app.js", "application/javascript; charset=utf-8"],
  ["style.css", "text/css; charset=utf-8"],
  ["workspace.html", "text/html; charset=utf-8"],
  ["tickets.js", "application/javascript; charset=utf-8"],
  ["workspace.js", "application/javascript; charset=utf-8"],
  ["workspace.css", "text/css; charset=utf-8"],
]) {
  assets.set(file, { type, body: readFileSync(join(publicDir, file)) });
}
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
// Bound the entire JSON body before parsing. This cap limits one request, not
// aggregate CPU/memory/socket consumption; edge timeout/concurrency limits remain needed.
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json"))
    throw new AccessError(415, "JSON content is required.");
  if (Number(req.headers["content-length"]) > MAX_BYTES)
    throw new AccessError(413, "Photo/request is too large.");
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BYTES)
      throw new AccessError(413, "Photo/request is too large.");
    chunks.push(Buffer.from(chunk));
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new AccessError(400, "Invalid request data.");
  }
}
// Treat image bytes as hostile: decode with a pixel ceiling, resize and re-encode
// to JPEG so EXIF/GPS is dropped. This is NOT malware scanning or proof of identity.
// PROPOSED: approved quarantine/scanner and isolated decoding for real-data uploads.
async function cleanPhoto(input: unknown): Promise<string | null> {
  if (!input) return null;
  if (
    typeof input !== "string" ||
    input.length > 800_000 ||
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(input)
  )
    throw new AccessError(
      400,
      "Use a JPG, PNG, or WebP photo under 600 KB after resizing.",
    );
  try {
    const bytes = Buffer.from(input.split(",")[1], "base64");
    // Decode, bound pixel count, re-encode and strip EXIF/GPS on the server as well as client.
    const output = await sharp(bytes, {
      limitInputPixels: 20_000_000,
      animated: false,
    })
      .rotate()
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    return "data:image/jpeg;base64," + output.toString("base64");
  } catch {
    throw new AccessError(
      400,
      "That photo could not be read. Please select a different image.",
    );
  }
}
function token(req: IncomingMessage) {
  return (
    req.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1) ?? ""
  );
}
function safeRecord(record: Record<string, unknown>) {
  const { receiptHash: _receipt, photo, ...rest } = record;
  return { ...rest, hasPhoto: Boolean(photo) };
}
// HTTP trust boundary: public intake/receipt routes precede the staff-session gate.
// The local flag permits non-Secure cookies for loopback testing only; never expose
// that configuration as a County internet-facing service.
export function createAccessHandler(
  store: AccessStore | undefined,
  local = false,
  auth = credentials,
  workspaceEnabled = true,
) {
  let lastCleanup = 0;
  const workspaceStore = store ? new WorkspaceStore(store.pool) : undefined;
  const workspace = workspaceStore
    ? new WorkspaceService(workspaceStore)
    : undefined;
  let sendingMail = false;
  if (
    workspaceStore &&
    process.env.TSCHUTES_MAIL_API_KEY &&
    process.env.TSCHUTES_MAIL_FROM
  ) {
    const timer = setInterval(() => {
      if (sendingMail) return;
      sendingMail = true;
      void deliverMail(workspaceStore)
        .catch(() => {})
        .finally(() => {
          sendingMail = false;
        });
    }, 10000);
    timer.unref();
  }
  return async function handle(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
  ): Promise<boolean> {
    if (path !== "/access-demo" && !path.startsWith("/access-demo/"))
      return false;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Permissions-Policy",
      "camera=(self), microphone=(), geolocation=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const suffix = path.slice("/access-demo".length).replace(/^\//, "");
    const method = req.method;
    try {
      if (method === "GET" && (!suffix || assets.has(suffix))) {
        if (!suffix && !req.url?.split("?")[0].endsWith("/")) {
          res.writeHead(308, { Location: (req.url ?? "").split("?")[0] + "/" });
          res.end();
          return true;
        }
        const asset = assets.get(
          suffix || (workspaceEnabled ? "workspace.html" : "index.html"),
        )!;
        res.writeHead(200, { "Content-Type": asset.type });
        res.end(asset.body);
        return true;
      }
      if (!store)
        throw new AccessError(
          503,
          "Durable storage is not configured. No request was saved.",
        );
      await store.init();
      if (Date.now() - lastCleanup > 3600000) {
        await store.cleanup();
        lastCleanup = Date.now();
      }
      if (["POST", "PATCH", "DELETE"].includes(method ?? "")) {
        // JSON plus a required custom header prevents cross-origin simple-form submission.
        if (req.headers["x-arr-request"] !== "1")
          throw new AccessError(403, "Open the form and try again.");
        const origin = req.headers.origin;
        const host = String(req.headers["x-forwarded-host"] ?? req.headers.host)
          .split(",")[0]
          .trim();
        if (origin && new URL(origin).host !== host)
          throw new AccessError(403, "Cross-origin requests are not allowed.");
        if (req.headers["sec-fetch-site"] === "cross-site")
          throw new AccessError(403, "Cross-origin requests are not allowed.");
      }
      // DEMO ASSUMPTION: forwarding headers come from a trusted edge. Direct callers
      // must not be able to spoof these headers to rotate a rate-limit identity.
      const ip = String(
        req.headers["cf-connecting-ip"] ??
          req.headers["x-forwarded-for"] ??
          req.socket.remoteAddress,
      ).split(",")[0];
      // New workspace is additive; legacy records and endpoints remain isolated.
      if (suffix.startsWith("v2/") && workspace && workspaceStore) {
        if (method !== "POST") throw new AccessError(405, "Use POST.");
        const route = suffix.slice(3);
        await store.limit(
          "v2:" + route + ":" + sha256(ip),
          ["login", "activate", "activation-info", "reset-request"].includes(route) ? 12 : 120,
          900,
        );
        await store.limit("v2:global", 3000, 3600);
        if (
          ["login", "activate", "activation-info", "reset-request", "submit", "draft"].includes(
            route,
          )
        )
          await store.limit(
            "v2:bounded:" + route,
            route === "draft" ? 400 : 200,
            3600,
          );
        const input = await body(req);
        if (input.website)
          throw new AccessError(400, "Unable to process request.");
        const session =
          req.headers.cookie
            ?.split(";")
            .map((v) => v.trim())
            .find((v) => v.startsWith("tschutes_workspace="))
            ?.slice(19) ?? "";
        const photo =
          ["submit", "ticket-attach"].includes(route) ? await cleanPhoto(input.photo) : undefined;
        const result = await workspace.execute(route, input, session, photo);
        if (route === "login" || route === "logout" || route === "password" || route === "activate") {
          const value = route === "login" ? result.token : "";
          res.setHeader(
            "Set-Cookie",
            `tschutes_workspace=${value}; HttpOnly; SameSite=Strict; Path=/api/access-demo; Max-Age=${value ? 14400 : 0}${local ? "" : "; Secure"}`,
          );
          delete result.token;
        }
        if (!sendingMail) {
          sendingMail = true;
          void deliverMail(workspaceStore)
            .catch(() => {})
            .finally(() => {
              sendingMail = false;
            });
        }
        json(res, 200, result);
        return true;
      }
      if (suffix === "health" && method === "GET") {
        json(res, 200, {
          status: "ok",
          storage: "postgres",
          demo: true,
          retentionDays: 7,
        });
        return true;
      }
      // First-page capture returns only timing metadata, never a confirmation number.
      // Only validateFirstPage fields are retained; the client token is hashed.
      if (suffix === "drafts" && method === "POST") {
        await store.limit("draft:" + sha256(ip), 60, 3600);
        await store.limit("draft:global", 400, 3600);
        const input = await body(req);
        if (
          input.website ||
          typeof input.draftToken !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(input.draftToken)
        )
          throw new AccessError(400, "Open the form and complete page one.");
        // Preserve already-open legacy attempts, but prevent fresh intake on an
        // archived version once the versioned workspace is the public entry.
        if (workspaceEnabled) {
          const existing = await store.pool.query(
            "SELECT 1 FROM tschutes_arr_drafts WHERE token_hash=$1",
            [sha256(input.draftToken)],
          );
          if (!existing.rows.length)
            throw new AccessError(
              409,
              "This is the archived ARR 0.1 form. Open the main demo for the latest version.",
            );
        }
        const saved = await store.saveDraft(
          sha256(input.draftToken),
          randomUUID(),
          validateFirstPage(input.data),
        );
        json(res, 200, saved);
        return true;
      }
      // Final submit validates again, cleans the image and atomically consumes the
      // draft window. Validation/acknowledgment is not sponsor or identity verification.
      if (suffix === "requests" && method === "POST") {
        await store.limit("submit:" + sha256(ip), 30, 3600);
        // A global hourly ceiling bounds public demo storage even with rotating source IPs.
        await store.limit("submit:global", 200, 3600);
        const input = await body(req);
        if (input.website)
          throw new AccessError(400, "Unable to submit this request.");
        if (
          typeof input.draftToken !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(input.draftToken)
        )
          throw new AccessError(
            428,
            "Return to page one and click Continue before submitting.",
          );
        const data = validateIntake(input.data);
        const photo = await cleanPhoto(input.photo);
        const { record, receipt } = newRequest(data, photo);
        const result = await store.completeDraft(
          sha256(input.draftToken),
          record,
          receipt,
        );
        json(res, 201, result);
        return true;
      }
      // Receipt lookup is deliberately public but requires a 256-bit capability.
      // Keep URLs/fragments, receipt bodies and responses out of logs/analytics.
      if (suffix === "status" && method === "POST") {
        await store.limit("status:" + sha256(ip), 100, 600);
        const input = await body(req);
        if (typeof input.receipt !== "string" || input.receipt.length !== 43)
          throw new AccessError(404, "Receipt not found or expired.");
        const found = await store.byReceipt(sha256(input.receipt));
        if (!found) throw new AccessError(404, "Receipt not found or expired.");
        json(res, 200, found);
        return true;
      }
      // DEMO ONLY: selecting a role does not grant it without that role password,
      // but anyone knowing both passwords can act in both roles. No individual SSO.
      // PROPOSED: County IdP + MFA, admin-assigned entitlements and separation of duties.
      if (suffix === "login" && method === "POST") {
        await store.limit("login:" + sha256(ip), 12, 900);
        await store.limit("login:global", 100, 900);
        const input = await body(req);
        const role = input.role === "manager" ? "manager" : "reviewer";
        const stored = auth[role];
        const password =
          typeof input.password === "string" ? input.password : "";
        if (password.length > 200)
          throw new AccessError(400, "Invalid password.");
        const calculated = (await derive(password, stored.salt, 64)) as Buffer;
        if (!timingSafeEqual(calculated, Buffer.from(stored.hash, "hex")))
          throw new AccessError(401, "Role or password is incorrect.");
        const sessionToken = randomBytes(32).toString("base64url");
        await store.login(sha256(sessionToken), role);
        res.setHeader(
          "Set-Cookie",
          `${COOKIE}=${sessionToken}; HttpOnly; SameSite=Strict; Path=/api/access-demo; Max-Age=14400${local ? "" : "; Secure"}`,
        );
        json(res, 200, { role });
        return true;
      }
      // All following request-list, attachment and decision routes require a session.
      // Access is role-wide, not facility/department/record-scoped.
      const role: Role | undefined = await store.session(sha256(token(req)));
      if (suffix === "session" && method === "GET") {
        json(res, 200, { role: role ?? null });
        return true;
      }
      if (!role)
        throw new AccessError(401, "Please sign in to the staff workspace.");
      if (suffix === "logout" && method === "POST") {
        await store.logout(sha256(token(req)));
        res.setHeader(
          "Set-Cookie",
          `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/access-demo; Max-Age=0${local ? "" : "; Secure"}`,
        );
        json(res, 200, { ok: true });
        return true;
      }
      if (suffix === "requests" && method === "GET") {
        json(res, 200, await store.list());
        return true;
      }
      const match = /^requests\/([^/]+)(\/photo)?$/.exec(suffix);
      if (match && uuid.test(match[1])) {
        const id = match[1];
        if (method === "GET" && match[2]) {
          const record = await store.get(id);
          if (!record?.photo) throw new AccessError(404, "Photo not found.");
          res.writeHead(200, { "Content-Type": "image/jpeg" });
          res.end(Buffer.from(record.photo.split(",")[1], "base64"));
          return true;
        }
        if (method === "PATCH" && !match[2]) {
          const input = await body(req);
          const record = await store.update(id, (r) =>
            transition(r, role, input),
          );
          json(
            res,
            200,
            safeRecord(record as unknown as Record<string, unknown>),
          );
          return true;
        }
      }
      throw new AccessError(404, "Page or operation not found.");
    } catch (e) {
      if (e instanceof AccessError) json(res, e.status, { error: e.message });
      else {
        // Access errors intentionally log only the exception class, not request data.
        // Reverse-proxy, shared ARR routes and platform logging need separate review.
        console.error(
          "[T-schutes ARR] operation failed",
          e instanceof Error ? e.name : "Error",
        );
        json(res, 503, {
          error:
            "Service temporarily unavailable. Please try again; do not assume your request was saved.",
        });
      }
      return true;
    }
  };
}
let handler: ReturnType<typeof createAccessHandler> | undefined;
export async function handleAccessRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
) {
  // Instantiate only for this sub-application; startup failure must not interrupt ARR-V2.
  if (path !== "/access-demo" && !path.startsWith("/access-demo/"))
    return false;
  handler ??= createAccessHandler(
    productionStore(),
    process.env.TSCHUTES_LOCAL === "true",
  );
  return handler(req, res, path);
}
