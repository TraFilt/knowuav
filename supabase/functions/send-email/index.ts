// Know UAV — transactional emails through Gmail (SMTP port 465).
// Called by database triggers (see supabase/emails.sql). Secrets needed in
// Supabase → Edge Functions → Secrets: GMAIL_USER, GMAIL_APP_PASSWORD, HOOK_SECRET.
import nodemailer from "npm:nodemailer@6.9.14";

const SITE = "https://knowuav.vercel.app";
const WA = "966534344581", WA_SHOW = "0534344581";
const USER = Deno.env.get("GMAIL_USER") ?? "";
const PASS = (Deno.env.get("GMAIL_APP_PASSWORD") ?? "").replace(/\s+/g, "");
const SECRET = Deno.env.get("HOOK_SECRET") ?? "";

const mailer = nodemailer.createTransport({
  host: "smtp.gmail.com", port: 465, secure: true, auth: { user: USER, pass: PASS },
});

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const first = (n: unknown) => esc(String(n ?? "").trim().split(/\s+/)[0] || "");
const ar = (n: unknown) => String(n ?? "").replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

function shell(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#0b100d;padding:24px 12px;font-family:Tahoma,Arial,sans-serif;color:#ece7d8;direction:rtl">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141c17;border:1px solid #2a352d;border-radius:16px">
<tr><td style="padding:22px 26px;border-bottom:1px solid #2a352d;text-align:right"><span style="font-family:'Courier New',monospace;font-weight:bold;letter-spacing:2px;color:#d8bf86;font-size:18px">KNOW UAV</span></td></tr>
<tr><td style="padding:26px;text-align:right;font-size:16px;line-height:1.9">
<h1 style="margin:0 0 12px;font-size:22px;color:#f2ead2">${title}</h1>
${body}
${cta ? `<p style="margin:24px 0 6px"><a href="${cta.href}" style="display:inline-block;background:#d8bf86;color:#1a1408;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:999px">${cta.label}</a></p>` : ""}
</td></tr>
<tr><td style="padding:18px 26px;border-top:1px solid #2a352d;text-align:right;font-size:13px;color:#9aa595;line-height:1.8">
للدعم: واتساب <a href="https://wa.me/${WA}" style="color:#d8bf86">${WA_SHOW}</a> · <a href="mailto:${USER}" style="color:#d8bf86">${USER}</a><br>
Know UAV منصة تعليمية مستقلة · <a href="${SITE}" style="color:#9aa595">knowuav.vercel.app</a></td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 12px;color:#cfc9b8">${t}</p>`;

function build(d: Record<string, any>): { to: string; subject: string; html: string }[] {
  const name = first(d.name);
  switch (d.type) {
    case "welcome":
      return [{
        to: d.email,
        subject: "أهلاً فيك في Know UAV 🚁",
        html: shell(`أهلاً ${name || "فيك"} 👋`,
          p("حياك الله في <b style=\"color:#f2ead2\">Know UAV</b>، حسابك جاهز.") +
          p("ابدأ بـ<b style=\"color:#f2ead2\">الدرس الأول المجاني</b>، وبعده جرّب <b style=\"color:#f2ead2\">التمرين المجاني في المحاكي</b>: أقلع وحوّم بالطيارة بنفسك، باللمس أو الكيبورد أو يد البلايستيشن والإكس بوكس.") +
          p("💻 نصيحة: المحاكي أمتع على الكمبيوتر بشاشة أكبر."),
          { href: `${SITE}/app#home`, label: "ابدأ الدرس الأول" }),
      }];
    case "receipt": {
      const out = [{
        to: d.email,
        subject: "تم تفعيل حسابك في Know UAV ✅",
        html: shell(`تم تفعيل حسابك يا ${name || "بطل"} ✅`,
          p("استلمنا إيصال التحويل وتفعّل حسابك، وكل الدروس والاختبارات والمحاكي مفتوحة لك الحين.") +
          `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 14px;background:#0f1511;border:1px solid #2a352d;border-radius:12px;font-size:15px">
           <tr><td style="padding:10px 14px;color:#9aa595">رقم العملية</td><td style="padding:10px 14px;text-align:left;font-family:'Courier New',monospace;color:#d8bf86">#${esc(d.id)}</td></tr>
           <tr><td style="padding:10px 14px;color:#9aa595;border-top:1px solid #2a352d">المبلغ</td><td style="padding:10px 14px;text-align:left;border-top:1px solid #2a352d;color:#f2ead2">${ar(d.amount)} ريال · لمرة واحدة</td></tr></table>` +
          p("<span style=\"font-size:13px;color:#9aa595\">نراجع الإيصالات بعد التفعيل، والإيصال غير الصحيح يؤدي لإيقاف الحساب.</span>"),
          { href: `${SITE}/app#home`, label: "ادخل على الدروس" }),
      }];
      if (USER) out.push({
        to: USER,
        subject: `إيصال جديد للمراجعة #${d.id} · ${d.email}`,
        html: shell("إيصال جديد 🧾",
          p(`<b style="color:#f2ead2">${esc(d.email)}</b>${d.name ? " · " + esc(d.name) : ""}`) +
          p(`المحوِّل: ${esc(d.sender || "—")} · المبلغ: ${ar(d.amount)} ريال · رقم #${esc(d.id)}`),
          { href: `${SITE}/admin`, label: "راجع الإيصال" }),
      });
      return out;
    }
    case "rejected":
      return [{
        to: d.email,
        subject: "بخصوص حسابك في Know UAV",
        html: shell("تم إيقاف حسابك",
          p(`مرحباً ${name}، راجعنا إيصال التحويل رقم #${esc(d.id)} وما قدرنا نطابقه مع تحويل فعلي، فتم إيقاف الحساب.`) +
          (d.note ? p(`الملاحظة: ${esc(d.note)}`) : "") +
          p("إذا تشوف إن فيه خطأ، تواصل معنا على الواتساب ومعك صورة التحويل، ونحلها لك بإذن الله."),
          { href: `https://wa.me/${WA}`, label: "تواصل عبر واتساب" }),
      }];
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (!SECRET || req.headers.get("x-hook-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  if (!USER || !PASS) return new Response("missing GMAIL_USER / GMAIL_APP_PASSWORD", { status: 500 });
  let d: Record<string, any>;
  try { d = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const mails = build(d).filter((m) => m.to);
  const res: string[] = [];
  for (const m of mails) {
    try {
      await mailer.sendMail({ from: `"Know UAV" <${USER}>`, replyTo: USER, to: m.to, subject: m.subject, html: m.html });
      res.push("sent:" + m.to);
    } catch (e) {
      console.error("send failed", m.to, e);
      res.push("fail:" + m.to + ":" + (e as Error).message);
    }
  }
  return new Response(JSON.stringify({ type: d.type, res }), { headers: { "content-type": "application/json" } });
});
