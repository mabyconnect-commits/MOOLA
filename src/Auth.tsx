import { css } from './css'
import CalfLogo from './CalfLogo'
import type { MoolaVals } from './useMoola'

export default function Auth({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:absolute;inset:0;z-index:80;overflow-y:auto;background:radial-gradient(130% 80% at 50% -10%, #123a2a 0%, #0a1d14 45%, #06110b 100%)')}>
      <div style={css('position:absolute;top:-70px;left:-90px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#23d39a 0%,transparent 70%);opacity:.18;pointer-events:none')}></div>
      <div style={css('position:absolute;top:90px;right:-120px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,#f2b34e 0%,transparent 70%);opacity:.16;pointer-events:none')}></div>

      <div style={css('position:relative;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:40px 26px')}>
        {v.authChrome && (
          <div style={css('display:flex;flex-direction:column;align-items:center;margin-bottom:30px')}>
            <div style={css('width:84px;height:84px;filter:drop-shadow(0 0 26px rgba(35,211,154,.5));animation:floaty 6s ease-in-out infinite')}><CalfLogo /></div>
            <div style={css('font-size:24px;font-weight:800;margin-top:14px;letter-spacing:.2px')}>Moola</div>
            <div style={css('font-size:13px;color:#92b8a3;margin-top:3px')}>{v.authTagline}</div>
          </div>
        )}

        {v.authWelcome && (
          <div style={css('animation:riseIn .45s ease;text-align:center')}>
            <div style={css('font-size:32px;font-weight:800;letter-spacing:.5px;line-height:1.05;text-transform:uppercase')}>$MOOLA<br />Airdrop</div>
            <div style={css('font-size:15px;color:#bfe3d0;margin-top:10px;font-weight:500')}>The Best Web3.0 Community Token</div>

            <div style={css('position:relative;margin:22px 0 26px;height:330px')}>
              {v.orbs.map((o, i) => (
                <div key={i} style={css(o.style)}></div>
              ))}
              <div style={css('position:absolute;left:50%;bottom:6px;transform:translateX(-50%);width:82%;height:30px;border-radius:50%;background:radial-gradient(ellipse,rgba(35,211,154,.5),transparent 70%);filter:blur(7px);pointer-events:none')}></div>
              <img src="assets/moola-hero-full.png" alt="Moola" style={css('position:relative;display:block;width:84%;max-width:300px;margin:0 auto;border-radius:24px;animation:floaty 6s ease-in-out infinite;filter:drop-shadow(0 0 32px rgba(35,211,154,.4))')} />
            </div>

            <div onClick={v.goSignup} style={css('padding:17px;border-radius:30px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 10px 30px rgba(35,211,154,.35);letter-spacing:.3px')}>Sign Up</div>
            <div onClick={v.goLogin} style={css('margin-top:14px;padding:17px;border-radius:30px;background:#fff;color:#0a1d14;font-weight:700;font-size:16px;cursor:pointer;letter-spacing:.3px')}>Sign In</div>
          </div>
        )}

        {v.authSignup && (
          <div style={css('animation:riseIn .4s ease')}>
            <div style={css('font-size:21px;font-weight:700;margin-bottom:4px')}>Create your account</div>
            <div style={css('font-size:13.5px;color:#92b8a3;margin-bottom:22px;line-height:1.5')}>Sign up with your email — we'll send a code to verify it before you log in.</div>

            <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>EMAIL</label>
            <input value={v.email} onChange={v.onEmail} type="email" placeholder="you@email.com" style={css('width:100%;margin:7px 0 16px;padding:14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />

            <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>PASSWORD</label>
            <input value={v.password} onChange={v.onPassword} type="password" placeholder="At least 8 characters" style={css('width:100%;margin:7px 0 16px;padding:14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />

            <label style={css('font-size:12px;color:#92b8a3;font-weight:600;letter-spacing:.3px')}>CONFIRM PASSWORD</label>
            <input value={v.confirm} onChange={v.onConfirm} type="password" placeholder="Re-enter password" style={css('width:100%;margin:7px 0 22px;padding:14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />

            <div onClick={v.doSignup} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:15.5px;cursor:pointer;box-shadow:0 8px 24px rgba(35,211,154,.3)')}>Create account</div>

            <div style={css('text-align:center;font-size:13.5px;color:#92b8a3;margin-top:20px')}>Already have an account? <span onClick={v.goLogin} style={css('color:#23d39a;font-weight:700;cursor:pointer')}>Log in</span></div>
            <div onClick={v.goWelcome} style={css('text-align:center;font-size:13px;color:#5e7d6a;margin-top:14px;cursor:pointer')}>‹ Back</div>
          </div>
        )}

        {v.authVerify && (
          <div style={css('animation:riseIn .4s ease')}>
            <div style={css('font-size:21px;font-weight:700;margin-bottom:4px')}>Verify your email</div>
            <div style={css('font-size:13.5px;color:#92b8a3;margin-bottom:10px;line-height:1.5')}>We sent a 6-digit code to <b style={css('color:#eafff4')}>{v.email}</b>. Enter it below to activate your account.</div>
            <div style={css('font-size:12.5px;color:#f2b34e;background:rgba(242,179,78,.12);border:1px solid rgba(242,179,78,.3);border-radius:12px;padding:10px 13px;margin-bottom:20px')}>Demo code: <b style={css('letter-spacing:2px')}>{v.demoCode}</b></div>

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
            <input value={v.password} onChange={v.onPassword} type="password" placeholder="Your password" style={css('width:100%;margin:7px 0 8px;padding:14px 15px;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:15px;font-family:Sora,sans-serif;outline:none')} />
            <div style={css('text-align:right;font-size:12.5px;color:#23d39a;font-weight:600;margin-bottom:22px;cursor:pointer')} onClick={v.toastSoon}>Forgot password?</div>

            <div onClick={v.doLogin} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:15.5px;cursor:pointer;box-shadow:0 8px 24px rgba(35,211,154,.3)')}>Log in</div>

            <div style={css('text-align:center;font-size:13.5px;color:#92b8a3;margin-top:20px')}>New to Moola? <span onClick={v.goSignup} style={css('color:#23d39a;font-weight:700;cursor:pointer')}>Create an account</span></div>
            <div onClick={v.goWelcome} style={css('text-align:center;font-size:13px;color:#5e7d6a;margin-top:14px;cursor:pointer')}>‹ Back</div>
          </div>
        )}

        {v.authChrome && (
          <div style={css('text-align:center;font-size:11.5px;color:#5e7d6a;margin-top:30px;line-height:1.5')}>By continuing you agree to Moola's Terms &amp; Privacy Policy.</div>
        )}
      </div>
    </div>
  )
}
