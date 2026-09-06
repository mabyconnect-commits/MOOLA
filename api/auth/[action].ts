import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureSchema, sql } from '../_lib/db.js'
import { EMAIL_RE, hashPassword, signToken, verifyPassword } from '../_lib/auth.js'
import { sendVerificationEmail } from '../_lib/email.js'
import { ensureAccount, loadAccount, loadTxns } from '../_lib/economics.js'
import { buildUpline, distributeAirdropCommission, genRefCode, loadReferral, resolveReferrer } from '../_lib/referral.js'
import { clientIp, rateLimit } from '../_lib/ratelimit.js'
import { isAdminEmail } from '../_lib/admin.js'
import { isBlockedEmailDomain } from '../_lib/email-blocklist.js'

interface UserRow {
  id: number
  email: string
  password_hash: string
  email_verified: boolean
  verify_code: string | null
  verify_expires: string | null
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureSchema()
  } catch (e) {
    console.error('[moola] schema init failed:', e)
    return res.status(500).json({ error: 'Service is temporarily unavailable. Please try again.' })
  }

  // Rate limit auth by client IP to blunt brute-force / abuse.
  const ip = clientIp(req.headers)
  if (!(await rateLimit(`auth:${ip}`, 30, 60_000))) {
    return res.status(429).json({ error: 'Too many attempts — please wait a minute and try again.' })
  }

  const action = req.query.action as string
  const body = (req.body || {}) as Record<string, string>
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const code = (body.code || '').trim()

  try {
    switch (action) {
      // ---- SIGNUP ---------------------------------------------------------
      case 'signup': {
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email' })
        if (isBlockedEmailDomain(email)) {
          return res.status(400).json({ error: 'Please sign up with a real, permanent email address (temporary/disposable emails aren’t allowed).' })
        }
        if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

        const existing = await sql<UserRow>`SELECT * FROM users WHERE email = ${email}`
        if (existing.rows.length && existing.rows[0].email_verified) {
          return res.status(409).json({ error: 'That email is already registered. Try logging in.' })
        }

        const hash = await hashPassword(password)
        const verifyCode = genCode()
        const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()

        if (existing.rows.length) {
          // Unverified account re-signing up — refresh credentials + code, and
          // backfill a referral code if it somehow has none. Keep any existing
          // referrer/upline as-is.
          await sql`
            UPDATE users SET
              password_hash = ${hash},
              verify_code = ${verifyCode},
              verify_expires = ${expires},
              ref_code = COALESCE(ref_code, ${genRefCode()})
            WHERE email = ${email}
          `
        } else {
          // Cap accounts per IP (anti mass-farming). Rolling window by default so
          // shared/NAT networks aren't permanently locked. MAX_ACCOUNTS_PER_IP=0
          // disables; IP_WINDOW_HOURS=0 makes it an all-time cap.
          const maxPerIp = Number(process.env.MAX_ACCOUNTS_PER_IP ?? '5')
          const windowHours = Number(process.env.IP_WINDOW_HOURS ?? '24')
          if (maxPerIp > 0 && ip && ip !== 'unknown') {
            const count = windowHours > 0
              ? await sql<{ n: number }>`SELECT count(*)::int AS n FROM users WHERE signup_ip = ${ip} AND created_at > now() - make_interval(hours => ${windowHours})`
              : await sql<{ n: number }>`SELECT count(*)::int AS n FROM users WHERE signup_ip = ${ip}`
            if (Number(count.rows[0]?.n || 0) >= maxPerIp) {
              return res.status(429).json({ error: 'Too many accounts have been created from your network. Please try again later or contact support.' })
            }
          }

          // Capture the referrer (if the signup carried a ?ref code) and store
          // the new user's own code + upline chain up front.
          const referrer = await resolveReferrer(body.ref || '')
          const upline = buildUpline(referrer)
          await sql`
            INSERT INTO users (email, password_hash, verify_code, verify_expires, ref_code, referred_by, upline, signup_ip)
            VALUES (${email}, ${hash}, ${verifyCode}, ${expires}, ${genRefCode()}, ${referrer ? referrer.id : null}, ${upline}::bigint[], ${ip || null})
          `
        }

        const { sent } = await sendVerificationEmail(email, verifyCode)
        // When email isn't wired up yet, return the code so the UI can show it.
        return res.status(200).json({ ok: true, emailed: sent, devCode: sent ? null : verifyCode })
      }

      // ---- VERIFY ---------------------------------------------------------
      case 'verify': {
        const found = await sql<UserRow>`SELECT * FROM users WHERE email = ${email}`
        if (!found.rows.length) return res.status(404).json({ error: 'No account found for that email' })
        const user = found.rows[0]

        if (user.email_verified) {
          // Already verified — just issue a session.
          await ensureAccount(user.id)
        } else {
          if (!user.verify_code || code !== user.verify_code) {
            return res.status(400).json({ error: 'Incorrect code — try again' })
          }
          if (user.verify_expires && new Date(user.verify_expires).getTime() < Date.now()) {
            return res.status(400).json({ error: 'Code expired — request a new one' })
          }
          await sql`UPDATE users SET email_verified = TRUE, verify_code = NULL, verify_expires = NULL WHERE id = ${user.id}`
          await ensureAccount(user.id)
          // First successful registration — pay the airdrop referral bonus up
          // this user's upline (auto-staked). Runs exactly once, here.
          await distributeAirdropCommission(user.id)
        }

        const token = signToken(user.id)
        const account = await loadAccount(user.id)
        const txns = await loadTxns(user.id)
        const referral = await loadReferral(user.id)
        return res.status(200).json({ token, account, txns, referral, email: user.email, isAdmin: isAdminEmail(user.email) })
      }

      // ---- RESEND ---------------------------------------------------------
      case 'resend': {
        const found = await sql<UserRow>`SELECT * FROM users WHERE email = ${email}`
        if (!found.rows.length) return res.status(404).json({ error: 'No account found for that email' })

        const verifyCode = genCode()
        const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        await sql`UPDATE users SET verify_code = ${verifyCode}, verify_expires = ${expires} WHERE email = ${email}`

        const { sent } = await sendVerificationEmail(email, verifyCode)
        return res.status(200).json({ ok: true, emailed: sent, devCode: sent ? null : verifyCode })
      }

      // ---- LOGIN ----------------------------------------------------------
      case 'login': {
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email' })
        if (!password) return res.status(400).json({ error: 'Enter your password' })

        const found = await sql<UserRow>`SELECT * FROM users WHERE email = ${email}`
        if (!found.rows.length) return res.status(401).json({ error: 'Invalid email or password' })
        const user = found.rows[0]

        const ok = await verifyPassword(password, user.password_hash)
        if (!ok) return res.status(401).json({ error: 'Invalid email or password' })

        if (!user.email_verified) {
          // Bounce them back into verification rather than letting them in.
          const verifyCode = genCode()
          const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
          await sql`UPDATE users SET verify_code = ${verifyCode}, verify_expires = ${expires} WHERE id = ${user.id}`
          const { sent } = await sendVerificationEmail(email, verifyCode)
          return res.status(403).json({ error: 'Please verify your email first', needsVerify: true, emailed: sent, devCode: sent ? null : verifyCode })
        }

        await ensureAccount(user.id)
        const token = signToken(user.id)
        const account = await loadAccount(user.id)
        const txns = await loadTxns(user.id)
        const referral = await loadReferral(user.id)
        return res.status(200).json({ token, account, txns, referral, email: user.email, isAdmin: isAdminEmail(user.email) })
      }

      default:
        return res.status(404).json({ error: 'Unknown auth action' })
    }
  } catch (e) {
    console.error('[moola] auth error:', e)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
