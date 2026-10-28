/**
 * Envoi d'e-mails via Resend (https://resend.com) si RESEND_API_KEY et MAIL_FROM sont définis.
 * Sinon les e-mails sont simplement affichés dans les logs du serveur (pratique en développement).
 * Un échec d'envoi ne doit jamais faire échouer une commande : on journalise et on continue.
 */
type Mail = { to: string; subject: string; text: string; replyTo?: string };

export function appUrl(path = ""): string {
  return `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`;
}

export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.info(`[e-mail non envoyé — RESEND_API_KEY absent]\nÀ : ${mail.to}\nObjet : ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, reply_to: mail.replyTo }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`Envoi d'e-mail échoué (HTTP ${res.status}) : ${await res.text()}`);
  } catch (e) {
    console.error("Envoi d'e-mail échoué", e);
  }
}
