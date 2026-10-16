// Know UAV — transactional emails.
// Sends from noreply@knowuav.com through Resend (RESEND_API_KEY), or Brevo: the API (BREVO_API_KEY) or Brevo SMTP on port 465
// (BREVO_SMTP_KEY, login BREVO_SMTP_LOGIN). Otherwise falls back to Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD).
// Called by database triggers (see supabase/emails.sql). Always needs HOOK_SECRET.
import nodemailer from "npm:nodemailer@6.9.14";

const SITE = "https://www.knowuav.com";
const WA = "966534344581", WA_SHOW = "0534344581";
const USER = Deno.env.get("GMAIL_USER") ?? "";
const PASS = (Deno.env.get("GMAIL_APP_PASSWORD") ?? "").replace(/\s+/g, "");
const SECRET = Deno.env.get("HOOK_SECRET") ?? "";
const BREVO = Deno.env.get("BREVO_API_KEY") ?? "";
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const BSMTP = Deno.env.get("BREVO_SMTP_KEY") ?? "";
const BLOGIN = Deno.env.get("BREVO_SMTP_LOGIN") ?? "be44a3001@smtp-brevo.com";
const FROM = Deno.env.get("MAIL_FROM") ?? "noreply@knowuav.com";
const REPLY = Deno.env.get("MAIL_REPLY_TO") ?? "info@knowuav.com";
const ADMIN = Deno.env.get("ADMIN_EMAIL") ?? (USER || "TraFilt.store@gmail.com");

const mailer = BSMTP
  ? nodemailer.createTransport({ host: "smtp-relay.brevo.com", port: 465, secure: true, auth: { user: BLOGIN, pass: BSMTP } })
  : nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: USER, pass: PASS } });

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
للدعم: واتساب <a href="https://wa.me/${WA}" style="color:#d8bf86">${WA_SHOW}</a> · <a href="mailto:${REPLY}" style="color:#d8bf86">${REPLY}</a><br>
Know UAV منصة تعليمية مستقلة · <a href="${SITE}" style="color:#9aa595">knowuav.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 12px;color:#cfc9b8">${t}</p>`;

type Mail = { to: string; subject: string; html: string; headers?: Record<string, string> };

// promotional email to accounts that signed up but did not activate (sent in batches from the admin panel)
function promo(d: Record<string, any>, it: Record<string, any>): Mail {
  const name = first(it.name);
  const unsub = `${SITE}/unsubscribe?t=${encodeURIComponent(it.token || "")}`;
  const code = d.code ? esc(d.code) : "";
  const hasDeal = code && d.price != null && +d.price < +d.base;
  const li = (t: string) => `<tr><td style="padding:6px 0;color:#cfc9b8;font-size:15px">✔️ ${t}</td></tr>`;
  const html = shell(`${name ? name + "، " : ""}طيارتك تنتظرك 🚁`,
    p("سجّلت في <b style=\"color:#f2ead2\">Know UAV</b> وما لحقت تجرّب. جهّزنا لك تجربة مجانية تبدأها الحين بدون ما تدفع شي:") +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 14px">${li("مهمة <b style=\"color:#f2ead2\">البوابات الليلية</b> في المحاكي")}${li("مهمة <b style=\"color:#f2ead2\">اجمع الكرات</b> داخل المبنى الكبير")}${li("<b style=\"color:#f2ead2\">الدرس الأول</b> كامل مع الاختبار")}</table>` +
    (hasDeal
      ? `<div style="margin:6px 0 16px;padding:16px;border:1px dashed #d8bf86;border-radius:12px;background:#0f1511;text-align:center">
           <div style="color:#9aa595;font-size:13px;margin-bottom:6px">ولو عجبتك، فعّل كل الدروس والمهام بكود الخصم</div>
           <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:bold;letter-spacing:3px;color:#d8bf86">${code}</div>
           <div style="margin-top:6px;color:#f2ead2">${ar(d.price)} ريال بدل <s style="color:#9aa595">${ar(d.base)}</s> · دفعة وحدة مدى الحياة</div></div>`
      : p(`ولو عجبتك، تفعّل كل الدروس والمهام بـ ${ar(d.base)} ريال، دفعة وحدة مدى الحياة.`)),
    { href: `${SITE}/app#sim`, label: "جرّب المحاكي مجاناً" });
  const foot = `<p style="text-align:center;font-family:Tahoma,Arial,sans-serif;font-size:12px;color:#6a7568;margin:14px 0 0">وصلك هذا الإيميل لأنك سجّلت في knowuav.com · <a href="${unsub}" style="color:#6a7568">إلغاء الاشتراك في الرسائل</a></p>`;
  return {
    to: it.email,
    subject: hasDeal ? `جرّب المحاكي مجاناً + كود خصم ${d.code} 🚁` : "جرّب محاكي الدرون مجاناً 🚁",
    html: html.replace("</td></tr></table></body>", foot + "</td></tr></table></body>"),
    headers: { "List-Unsubscribe": `<${unsub}>, <mailto:${REPLY}?subject=unsubscribe>` },
  };
}

function build(d: Record<string, any>): Mail[] {
  const name = first(d.name);
  switch (d.type) {
    case "welcome":
      return [{
        to: d.email,
        subject: "أهلاً فيك في Know UAV 🚁",
        html: shell(`أهلاً ${name || "فيك"} 👋`,
          p("حياك الله في <b style=\"color:#f2ead2\">Know UAV</b>، حسابك جاهز.") +
          p("ابدأ بـ<b style=\"color:#f2ead2\">الدرس الأول المجاني</b>، وبعده جرّب المحاكي مجاناً: مهمة <b style=\"color:#f2ead2\">البوابات الليلية</b> ومهمة <b style=\"color:#f2ead2\">اجمع الكرات</b> داخل المبنى الكبير، باللمس أو الكيبورد أو يد البلايستيشن والإكس بوكس.") +
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
      if (ADMIN) out.push({
        to: ADMIN,
        subject: `إيصال جديد للمراجعة #${d.id} · ${d.email}`,
        html: shell("إيصال جديد 🧾",
          p(`<b style="color:#f2ead2">${esc(d.email)}</b>${d.name ? " · " + esc(d.name) : ""}`) +
          p(`المحوِّل: ${esc(d.sender || "—")} · المبلغ: ${ar(d.amount)} ريال · رقم #${esc(d.id)}`),
          { href: `${SITE}/admin`, label: "راجع الإيصال" }),
      });
      return out;
    }
    case "promo":
      return (Array.isArray(d.items) ? d.items : []).slice(0, 100).map((it: Record<string, any>) => promo(d, it));
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
  if (!RESEND && !BREVO && !BSMTP && (!USER || !PASS)) return new Response("missing RESEND_API_KEY / BREVO_API_KEY / BREVO_SMTP_KEY (or GMAIL_USER / GMAIL_APP_PASSWORD)", { status: 500 });
  let d: Record<string, any>;
  try { d = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const mails = build(d).filter((m) => m.to);
  const res: string[] = [];
  // promo batches go through Resend's batch endpoint: one request for up to 100 emails (stays under the rate limit)
  if (RESEND && d.type === "promo" && mails.length) {
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND, "content-type": "application/json" },
      body: JSON.stringify(mails.map((m) => ({ from: `Know UAV <${FROM}>`, reply_to: REPLY, to: [m.to], subject: m.subject, html: m.html, headers: m.headers }))),
    });
    const t = await r.text();
    if (!r.ok) console.error("resend batch failed", r.status, t.slice(0, 300));
    return new Response(JSON.stringify({ type: d.type, n: mails.length, ok: r.ok, status: r.status, body: t.slice(0, 300) }), { headers: { "content-type": "application/json" } });
  }
  for (const m of mails) {
    try {
      if (RESEND) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + RESEND, "content-type": "application/json" },
          body: JSON.stringify({ from: `Know UAV <${FROM}>`, reply_to: REPLY, to: [m.to], subject: m.subject, html: m.html, headers: m.headers }),
        });
        if (!r.ok) throw new Error("resend " + r.status + " " + (await r.text()).slice(0, 200));
      } else if (BREVO) {
        const r = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": BREVO, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sender: { name: "Know UAV", email: FROM }, replyTo: { email: REPLY }, to: [{ email: m.to }], subject: m.subject, htmlContent: m.html }),
        });
        if (!r.ok) throw new Error("brevo " + r.status + " " + (await r.text()).slice(0, 200));
      } else if (BSMTP) {
        await mailer.sendMail({ from: `"Know UAV" <${FROM}>`, replyTo: REPLY, to: m.to, subject: m.subject, html: m.html });
      } else {
        await mailer.sendMail({ from: `"Know UAV" <${USER}>`, replyTo: USER, to: m.to, subject: m.subject, html: m.html });
      }
      res.push("sent:" + m.to);
    } catch (e) {
      console.error("send failed", m.to, e);
      res.push("fail:" + m.to + ":" + (e as Error).message);
    }
  }
  return new Response(JSON.stringify({ type: d.type, res }), { headers: { "content-type": "application/json" } });
});
