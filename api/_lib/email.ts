// Sends the 6-digit verification code by email via Resend.
//
// If RESEND_API_KEY is not configured (or sending fails) we return sent:false
// and the caller falls back to surfacing the code in the API response so the
// flow still works end-to-end before email is wired up.

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
      html: `
        <div style="font-family:sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;background:#06110b;color:#eafff4;border-radius:18px">
          <h1 style="color:#23d39a;font-size:22px;margin:0 0 8px">Moola 🐮</h1>
          <p style="color:#92b8a3;font-size:14px;margin:0 0 20px">Use this code to verify your email and activate your account.</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:10px;text-align:center;background:rgba(35,211,154,.12);border:1px solid rgba(35,211,154,.35);border-radius:14px;padding:18px;color:#eafff4">${code}</div>
          <p style="color:#5e7d6a;font-size:12px;margin:20px 0 0">This code expires in 15 minutes. If you didn't request it, you can ignore this email.</p>
        </div>
      `,
    })
    return { sent: true }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[moola] verification email failed to send:', e)
    return { sent: false }
  }
}
