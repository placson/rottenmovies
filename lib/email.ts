import type { Book } from "./db";

export type LoanEmailInput = {
  toEmail: string;
  borrowerName: string;
  ownerName: string;
  book: Book;
  dueDate: string; // ISO
};

export type SendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "failed"; detail?: string };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Warm, friend-to-friend borrow note (not a stern library notice). */
export function renderLoanEmail(input: LoanEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { borrowerName, ownerName, book, dueDate } = input;
  const title = book.title;
  const by = book.authors ? ` by ${book.authors}` : "";
  const due = fmtDate(dueDate);
  const firstName = borrowerName.trim().split(/\s+/)[0] || "friend";

  const subject = `📚 You borrowed “${title}” from ${ownerName}`;

  const text = `Hi ${firstName}!

${ownerName} just lent you a book from their shelf — “${title}”${by}. Enjoy it! 📖

No pressure at all, but whenever you're finished (ideally within about 30 days, so by ${due}) it'd be lovely to get it back so it can find its way home to the nest. 🪺

Thanks for borrowing, and happy reading!

— sent with a smile on behalf of ${ownerName}, via Shelf Nest`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a2318">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <div style="background:#fff;border-radius:16px;padding:28px 26px;box-shadow:0 4px 18px rgba(0,0,0,.06)">
      <div style="font-size:20px;font-weight:700;margin-bottom:6px">🪺 Shelf Nest</div>
      <p style="font-size:16px;line-height:1.6;margin:18px 0 0">Hi ${esc(firstName)}! 👋</p>
      <p style="font-size:16px;line-height:1.6;margin:14px 0 0">
        <strong>${esc(ownerName)}</strong> just lent you a book from their shelf —
        <strong>“${esc(title)}”</strong>${esc(by)}. Enjoy it! 📖
      </p>
      <p style="font-size:16px;line-height:1.6;margin:14px 0 0">
        No pressure at all, but whenever you're finished — ideally within about
        <strong>30 days</strong>, so by <strong>${esc(due)}</strong> — it'd be lovely
        to get it back so it can find its way home to the nest. 🪺
      </p>
      <p style="font-size:16px;line-height:1.6;margin:14px 0 0">
        Thanks for borrowing, and happy reading!
      </p>
      <p style="font-size:15px;color:#7a6f5f;margin:22px 0 0">
        — sent with a smile on behalf of ${esc(ownerName)}, via Shelf Nest
      </p>
    </div>
  </div></body></html>`;

  return { subject, html, text };
}

/**
 * Send the loan email via Resend. If no RESEND_API_KEY is configured, the loan
 * is still recorded elsewhere; we just report it wasn't sent.
 */
export async function sendLoanEmail(input: LoanEmailInput): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "not_configured" };

  const from = process.env.LEND_FROM_EMAIL || "Shelf Nest <onboarding@resend.dev>";
  const { subject, html, text } = renderLoanEmail(input);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [input.toEmail], subject, html, text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { sent: false, reason: "failed", detail: detail.slice(0, 300) };
    }
    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      reason: "failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
