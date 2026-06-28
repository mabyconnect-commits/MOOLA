import { css } from './css'
import CalfLogo from './CalfLogo'
import type { MoolaVals } from './useMoola'

export default function Auth({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:absolute;inset:0;z-index:80;overflow-x:hidden;overflow-y:auto;background:radial-gradient(130% 80% at 50% -10%, #123a2a 0%, #0a1d14 45%, #06110b 100%)')}>
      <div style={css('position:absolute;top:-70px;left:-90px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#23d39a 0%,transparent 70%);opacity:.18;pointer-events:none')}></div>
      <div style={css('position:absolute;top:90px;right:-120px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,#f2b34e 0%,transparent 70%);opacity:.16;pointer-events:none')}></div>

      {v.authWelcome ? (
        /* ===== WELCOME — full-height splash ===== */
        <div style={css('position:relative;min-height:100dvh;display:flex;flex-direction:column;justify-content:space-between;padding:48px 24px 28px;text-align:center;animation:riseIn .45s ease')}>
          {/* TOP: title */}
          <div style={css('flex-shrink:0')}>
            <div style={css('font-size:38px;font-weight:800;line-height:1.0;letter-spacing:.5px;text-transform:uppercase;text-shadow:0 0 34px rgba(35,211,154,.4)')}>
              <span style={css('color:#23d39a')}>$Moola</span>
              <br />
              <span style={css('color:#eafff4')}>Airdrop</span>
            </div>
            <div style={css('font-size:14.5px;color:#bfe3d0;margin-top:11px;font-weight:500')}>The Best Web3.0 Community Token</div>
          </div>

          {/* MIDDLE: hero + orb ring (+ free badge), nudged down so it clears the subtitle */}
          <div style={css('flex:1;min-height:0;display:flex;align-items:center;justify-content:center;margin:34px 0 8px')}>
            <div style={css('position:relative;width:100%;max-width:300px;margin:0 auto')}>
              {v.orbs.map((o, i) => (
                <div key={i} style={css(o.style)}></div>
              ))}
              {/* free airdrop badge */}
              <div style={css('position:absolute;top:10px;right:8px;z-index:3;display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-size:11.5px;font-weight:800;box-shadow:0 6px 18px rgba(35,211,154,.5);animation:floaty 4s ease-in-out infinite')}>🎁 200 $MOOLA FREE</div>
              <div style={css('position:absolute;left:50%;bottom:4px;transform:translateX(-50%);width:82%;height:30px;border-radius:50%;background:radial-gradient(ellipse,rgba(35,211,154,.5),transparent 70%);filter:blur(7px);pointer-events:none')}></div>
              <img src="assets/moola-hero-full.png" alt="Moola" style={css('position:relative;display:block;width:84%;max-width:280px;margin:0 auto;border-radius:24px;animation:floaty 6s ease-in-out infinite;filter:drop-shadow(0 0 32px rgba(35,211,154,.4))')} />
            </div>
          </div>

          {/* BOTTOM: actions */}
          <div style={css('flex-shrink:0')}>
            <div onClick={v.goSignup} style={css('padding:17px;border-radius:18px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:800;font-size:16.5px;cursor:pointer;letter-spacing:.3px;animation:btnGlow 2.2s ease-in-out infinite')}>Claim Your Airdrop →</div>
            <div onClick={v.goLogin} style={css('margin-top:12px;padding:16px;border-radius:18px;background:rgba(35,211,154,.08);border:1.5px solid rgba(35,211,154,.45);color:#eafff4;font-weight:700;font-size:15.5px;cursor:pointer;letter-spacing:.3px')}>I already have an account</div>
            <div style={css('font-size:11.5px;color:#5e7d6a;margin-top:14px;line-height:1.5')}>By continuing you agree to Moola's Terms &amp; Privacy Policy.</div>
          </div>
        </div>
      ) : (
        /* ===== SIGNUP / VERIFY / LOGIN — centered ===== */
        <div style={css('position:relative;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;padding:34px 26px')}>
          <div style={css('display:flex;flex-direction:column;align-items:center;margin-bottom:30px')}>
            <div style={css('width:84px;height:84px;filter:drop-shadow(0 0 26px rgba(35,211,154,.5));animation:floaty 6s ease-in-out infinite')}><CalfLogo /></div>
            <div style={css('font-size:24px;font-weight:800;margin-top:14px;letter-spacing:.2px')}>Moola</div>
            <div style={css('font-size:13px;color:#92b8a3;margin-top:3px')}>{v.authTagline}</div>
          </div>

          {v.authSignup && (
            <div style={css('animation:riseIn .4s ease')}>
              <div style={css('font-size:21px;font-weight:700;margin-bottom:4px')}>Create your account</div>
              <div style={css('font-size:13.5px;color:#92b8a3;margin-bottom:22px;line-height:1.5')}>Sign up with your email — we'll send a code to verify it before you log in.</div>

              <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>EMAIL</label>
              <input value={v.email} onChange={v.onEmail} type="email" placeholder="you@email.com" style={css('width:100%;margin:7px 0 16px;padding:14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />

              <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>PASSWORD</label>
              <div style={css('position:relative;margin:7px 0 16px')}>
                <input value={v.password} onChange={v.onPassword} type={v.pwType} placeholder="At least 8 characters" style={css('width:100%;padding:14px 46px 14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />
                <span onClick={v.toggleShowPw} style={css('position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:6px 9px;font-size:17px;cursor:pointer;user-select:none')}>{v.pwEye}</span>
              </div>

              <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>CONFIRM PASSWORD</label>
              <div style={css('position:relative;margin:7px 0 22px')}>
                <input value={v.confirm} onChange={v.onConfirm} type={v.pwType} placeholder="Re-enter password" style={css('width:100%;padding:14px 46px 14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />
                <span onClick={v.toggleShowPw} style={css('position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:6px 9px;font-size:17px;cursor:pointer;user-select:none')}>{v.pwEye}</span>
              </div>

              <div onClick={v.doSignup} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:15.5px;cursor:pointer;box-shadow:0 8px 24px rgba(35,211,154,.3)')}>Create account</div>

              <div style={css('text-align:center;font-size:13.5px;color:#92b8a3;margin-top:20px')}>Already have an account? <span onClick={v.goLogin} style={css('color:#23d39a;font-weight:700;cursor:pointer')}>Log in</span></div>
              <div onClick={v.goWelcome} style={css('text-align:center;font-size:13px;color:#5e7d6a;margin-top:14px;cursor:pointer')}>‹ Back</div>
            </div>
          )}

          {v.authVerify && (
            <div style={css('animation:riseIn .4s ease')}>
              <div style={css('font-size:21px;font-weight:700;margin-bottom:4px')}>Verify your email</div>
              <div style={css('font-size:13.5px;color:#92b8a3;margin-bottom:10px;line-height:1.5')}>We sent a 6-digit code to <b style={css('color:#eafff4')}>{v.email}</b>. Enter it below to activate your account.</div>
              {v.demoCode && (
                <div style={css('font-size:12.5px;color:#f2b34e;background:rgba(242,179,78,.12);border:1px solid rgba(242,179,78,.3);border-radius:12px;padding:10px 13px;margin-bottom:20px')}>Email isn't configured yet — use code: <b style={css('letter-spacing:2px')}>{v.demoCode}</b></div>
              )}

              <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>VERIFICATION CODE</label>
              <input value={v.code} onChange={v.onCode} inputMode="numeric" maxLength={6} placeholder="••••••" style={css('width:100%;margin:7px 0 22px;padding:15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:24px;font-weight:700;letter-spacing:10px;text-align:center;font-family:Sora,sans-serif;outline:none')} />

              <div onClick={v.doVerify} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:15.5px;cursor:pointer;box-shadow:0 8px 24px rgba(35,211,154,.3)')}>Verify &amp; continue</div>

              <div style={css('text-align:center;font-size:13.5px;color:#92b8a3;margin-top:20px')}><span onClick={v.resendCode} style={css('color:#23d39a;font-weight:700;cursor:pointer')}>Resend code</span> · <span onClick={v.goSignup} style={css('color:#92b8a3;cursor:pointer')}>Change email</span></div>
            </div>
          )}

          {v.authLogin && (
            <div style={css('animation:riseIn .4s ease')}>
              <div style={css('font-size:21px;font-weight:700;margin-bottom:4px')}>Welcome back</div>
              <div style={css('font-size:13.5px;color:#92b8a3;margin-bottom:22px;line-height:1.5')}>Log in to your Moola account to keep stacking rewards.</div>

              <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>EMAIL</label>
              <input value={v.email} onChange={v.onEmail} type="email" placeholder="you@email.com" style={css('width:100%;margin:7px 0 16px;padding:14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />

              <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>PASSWORD</label>
              <div style={css('position:relative;margin:7px 0 8px')}>
                <input value={v.password} onChange={v.onPassword} type={v.pwType} placeholder="Your password" style={css('width:100%;padding:14px 46px 14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />
                <span onClick={v.toggleShowPw} style={css('position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:6px 9px;font-size:17px;cursor:pointer;user-select:none')}>{v.pwEye}</span>
              </div>
              <div style={css('text-align:right;font-size:12.5px;color:#23d39a;font-weight:600;margin-bottom:22px;cursor:pointer')} onClick={v.toastSoon}>Forgot password?</div>

              <div onClick={v.doLogin} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:15.5px;cursor:pointer;box-shadow:0 8px 24px rgba(35,211,154,.3)')}>Log in</div>

              <div style={css('text-align:center;font-size:13.5px;color:#92b8a3;margin-top:20px')}>New to Moola? <span onClick={v.goSignup} style={css('color:#23d39a;font-weight:700;cursor:pointer')}>Create an account</span></div>
              <div onClick={v.goWelcome} style={css('text-align:center;font-size:13px;color:#5e7d6a;margin-top:14px;cursor:pointer')}>‹ Back</div>
            </div>
          )}

          <div style={css('text-align:center;font-size:11.5px;color:#5e7d6a;margin-top:30px;line-height:1.5')}>By continuing you agree to Moola's Terms &amp; Privacy Policy.</div>
        </div>
      )}
    </div>
  )
}
