// Sends the 6-digit verification code by email via Resend.
//
// If RESEND_API_KEY is not configured (or sending fails) we return sent:false
// and the caller falls back to surfacing the code in the API response so the
// flow still works end-to-end before email is wired up.

// Branded assets live in /public/assets and are served from the live site, so
// the email pulls them over absolute URLs (email clients can't load relative
// paths). Override the base with MOOLA_SITE_URL if the domain ever changes.
const SITE = (process.env.MOOLA_SITE_URL || 'https://www.moolas.site').replace(/\/$/, '')
const LOGO = `${SITE}/assets/moola-logo.png`
const HERO = `${SITE}/assets/moola-hero-full.png`

// Builds the neon, on-brand verification email. The 6-digit code is rendered
// in HTML (not baked into an image) so it's always the real, current code and
// stays selectable/copyable in every mail client.
function verificationHtml(code: string): string {
  const digits = code
    .split('')
    .map(
      (d) =>
        `<td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:800;color:#eafff4;width:44px;padding:14px 0;border:1px solid rgba(115,225,90,.30);border-radius:10px;background:rgba(115,225,90,.06)">${d}</td>` +
        `<td style="width:8px"></td>`,
    )
    .join('')

  return `
  <body style="margin:0;padding:0;background:#05100a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Moola code is ${code} — expires in 15 minutes.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05100a;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#0a160e;border:1px solid rgba(115,225,90,.18);border-radius:20px;overflow:hidden;">

          <!-- Header: logo + wordmark -->
          <tr><td style="padding:24px 28px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;"><img src="${LOGO}" width="46" height="46" alt="Moola" style="display:block;border:0;"></td>
                <td style="font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:26px;font-weight:800;letter-spacing:1px;color:#7ee63a;line-height:1;">MOOLA</div>
                  <div style="font-size:10px;letter-spacing:2px;color:#cfeede;margin-top:3px;">THE FUTURE IS MOOING</div>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Hero mascot -->
          <tr><td align="center" style="padding:8px 0 0;">
            <img src="${HERO}" width="260" alt="" style="display:block;border:0;width:260px;max-width:80%;height:auto;">
          </td></tr>

          <!-- Heading -->
          <tr><td align="center" style="padding:4px 28px 0;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1.15;">YOUR <span style="color:#7ee63a;">MOOLA</span><br>VERIFICATION CODE</div>
            <p style="font-size:14px;color:#9fc4ad;margin:12px 0 0;line-height:1.5;">Use the code below to verify your email and activate your Moola account.</p>
          </td></tr>

          <!-- Code -->
          <tr><td align="center" style="padding:22px 24px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
          </td></tr>

          <!-- Expiry note -->
          <tr><td align="center" style="padding:10px 28px 4px;font-family:Arial,Helvetica,sans-serif;">
            <p style="font-size:13px;color:#9fc4ad;margin:0;">⏱ This code expires in <span style="color:#7ee63a;font-weight:700;">15 minutes</span>.</p>
            <p style="font-size:12px;color:#5e7d6a;margin:6px 0 0;">If you didn't request this, you can safely ignore this email.</p>
          </td></tr>

          <!-- Divider -->
          <tr><td style="padding:20px 28px 0;"><div style="height:1px;background:rgba(115,225,90,.25);"></div></td></tr>

          <!-- Footer -->
          <tr><td style="padding:18px 28px 26px;font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;"><img src="${LOGO}" width="30" height="30" alt="" style="display:block;border:0;"></td>
              <td>
                <div style="font-size:14px;font-weight:800;color:#ffffff;">THANK YOU FOR JOINING <span style="color:#7ee63a;">MOOLA</span></div>
                <div style="font-size:11px;color:#9fc4ad;margin-top:3px;">Together, we're building the <span style="color:#7ee63a;font-weight:700;">FUTURE OF MEMEFI</span>.</div>
              </td>
            </tr></table>
            <p style="text-align:center;font-size:11px;color:#5e7d6a;margin:16px 0 0;">
              <a href="${SITE}" style="color:#7ee63a;text-decoration:none;">moolas.site</a>
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>`
}

export async function sendVerificationEmail(
  email: string,
  code: string,
): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false }

  const from = process.env.MOOLA_EMAIL_FROM || 'Moola <onboarding@resend.dev>'

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    await resend.emails.send({
      from,
      to: email,
      subject: 'Your Moola verification code',
      html: verificationHtml(code),
    })
    return { sent: true }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[moola] verification email failed to send:', e)
    return { sent: false }
  }
}
