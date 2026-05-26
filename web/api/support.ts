import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, category, message } = req.body as {
    name?: string;
    email?: string;
    category?: string;
    message?: string;
  };

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  try {
    await resend.emails.send({
      from: "Palleto Support <support@palleto-labs.com>",
      to: "aidanlynde@gmail.com",
      replyTo: email.trim(),
      subject: `[Palleto Support] ${category ?? "General"} — ${name.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #1C1A17;">
          <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em">Palleto Support Request</p>
          <h2 style="margin:0 0 24px;font-size:22px">${category ?? "General"}</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;width:80px">Name</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px">${name.trim()}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;font-size:13px">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px"><a href="mailto:${email.trim()}">${email.trim()}</a></td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px">Topic</td><td style="padding:8px 0;font-size:13px">${category ?? "General"}</td></tr>
          </table>
          <p style="margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Message</p>
          <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Resend error", err);
    return res.status(500).json({ error: "Failed to send. Please email aidanlynde@gmail.com directly." });
  }
}
