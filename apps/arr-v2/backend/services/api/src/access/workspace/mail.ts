import { WorkspaceStore } from "./store.js";
import { now } from "./model.js";
/** Durable outbox; claim inside DB, send outside DB. Provider idempotency prevents
 * duplicate mail after a crash between delivery and marking sent. No mail content,
 * API keys or reset capabilities are logged. Missing config keeps mail pending.
 */
export async function deliverMail(store: WorkspaceStore) {
  const key = process.env.TSCHUTES_MAIL_API_KEY,
    from = process.env.TSCHUTES_MAIL_FROM;
  if (!key || !from) return;
  const job = await store.transaction(async (tx) => {
    const messages = await tx.list("mail");
    for (const m of messages)
      if (
        ["pending", "failed"].includes(m.status) &&
        m.expires &&
        m.expires <= now()
      ) {
        m.status = "expired";
        m.body = "[expired; sensitive content removed]";
        await tx.put("mail", m.id, m);
      }
    const job = messages.find(
      (m) =>
        ["pending", "failed"].includes(m.status) &&
        m.attempts < 5 &&
        (!m.next || m.next <= now()) &&
        (!m.lease || m.lease < now()),
    );
    if (!job) return;
    job.lease = new Date(Date.now() + 60000).toISOString();
    job.attempts++;
    await tx.put("mail", job.id, job);
    return job;
  });
  if (!job) return;
  let ok = false,
    providerId = "";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": job.id,
      },
      body: JSON.stringify({
        from,
        to: [job.to],
        subject: job.subject,
        text: job.body,
      }),
    });
    ok = r.ok;
    if (ok) providerId = String(((await r.json()) as { id?: string }).id ?? "");
  } catch {
    /* Retry without logging message/token. */
  }
  await store.transaction(async (tx) => {
    const current = await tx.get("mail", job.id);
    if (!current) return;
    current.status = ok ? "sent" : "failed";
    current.providerId = providerId;
    current.lease = null;
    current.next = new Date(
      Date.now() + Math.min(3600000, 60000 * 2 ** current.attempts),
    ).toISOString();
    if (ok)
      current.body = "[provider accepted; sensitive message body removed]";
    await tx.put("mail", job.id, current);
  });
}
