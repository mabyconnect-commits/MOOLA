import { css } from '../css'
import CalfLogo from '../CalfLogo'
import type { MoolaVals } from '../useMoola'

export default function Home({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:relative;padding:18px 18px 120px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:18px')}>
        <div style={css('display:flex;align-items:center;gap:9px')}>
          <div style={css('width:36px;height:36px;filter:drop-shadow(0 0 10px rgba(35,211,154,.55))')}>
            <CalfLogo />
          </div>
          <span style={css('font-size:21px;font-weight:700;letter-spacing:.2px;position:relative;top:3px')}>Moola</span>
        </div>
        <div onClick={v.openWallet} style={css('display:flex;align-items:center;gap:8px;padding:8px 13px;border-radius:22px;background:rgba(22,52,38,.6);border:1px solid rgba(110,200,150,.22);cursor:pointer')}>
          <span style={css('font-size:15px')}>💳</span>
          <span style={css('font-weight:600;font-size:15px')}>{v.balanceStr}</span>
          <span style={css('color:#7ea98f;font-size:11px')}>▼</span>
        </div>
      </div>

      {/* airdrop banner */}
      <div style={css('display:flex;align-items:center;gap:13px;padding:14px;border-radius:16px;background:linear-gradient(120deg,rgba(47,227,194,.12),rgba(123,92,255,.12));border:1px solid rgba(110,200,150,.2);margin-bottom:12px')}>
        <div style={css('font-size:30px;filter:drop-shadow(0 0 8px rgba(255,180,80,.6))')}>🎁</div>
        <div style={css('flex:1')}>
          <div style={css('font-size:12px;color:#92b8a3')}>Airdrop &amp; Stake · ≈ $2</div>
          <div style={css('font-size:19px;font-weight:700')}>{v.airdropAmt} $MOOLA</div>
        </div>
        {v.airdropClaimed ? (
          <div style={css('padding:9px 20px;border-radius:20px;background:rgba(35,211,154,.14);border:1px solid rgba(35,211,154,.35);color:#23d39a;font-weight:800;font-size:14px;cursor:default')}>✓ Claimed</div>
        ) : (
          <div onClick={v.openClaim} style={css('padding:9px 22px;border-radius:20px;background:linear-gradient(120deg,#23d39a,#16c07e);color:#062018;font-weight:800;font-size:14px;cursor:pointer;animation:claimPulse 1.5s ease-in-out infinite')}>Claim</div>
        )}
      </div>

      {/* telegram banner */}
      <div style={css('display:flex;align-items:center;gap:13px;padding:14px;border-radius:16px;background:rgba(16,44,32,.55);border:1px solid rgba(110,200,150,.16);margin-bottom:22px')}>
        <div style={css('width:42px;height:42px;border-radius:50%;background:linear-gradient(150deg,#2aabee,#1c8adb);display:flex;align-items:center;justify-content:center;font-size:22px')}>✈️</div>
        <div style={css('flex:1')}>
          <div style={css('font-size:12px;color:#92b8a3')}>$MOOLA Community</div>
          <div style={css('font-size:17px;font-weight:700')}>Telegram Channel</div>
        </div>
        {v.joinedTg ? (
          <div style={css('padding:9px 20px;border-radius:20px;background:rgba(35,211,154,.14);border:1px solid rgba(35,211,154,.35);color:#23d39a;font-weight:700;font-size:14px;cursor:default')}>✓ Joined</div>
        ) : (
          <div onClick={v.joinTelegram} style={css('padding:9px 22px;border-radius:20px;border:1px solid #23d39a;color:#23d39a;font-weight:600;font-size:14px;cursor:pointer')}>Join</div>
        )}
      </div>

      {/* 100x hero: write-up ON TOP, calf below and fully visible */}
      <div style={css('padding:6px 0 0')}>
        <div style={css('margin-bottom:18px')}>
          <h1 style={css('font-size:33px;line-height:1.12;font-weight:800;margin:0 0 12px;letter-spacing:-.5px')}>
            Let's create a 100x<br />Meme coin together!
          </h1>
          <p style={css('font-size:14px;line-height:1.6;color:#d4e7dc;margin:0;max-width:340px')}>
            Many meme tokens skyrocket by tens of thousands of times. $MOOLA is a brand-new meme token, and now is the best
            time to grab it. Don't miss out on $MOOLA like you did with $DOGE and $SHIB.
          </p>
        </div>
        <div style={css('position:relative;margin:0 -18px 6px')}>
          <div style={css('position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:78%;height:78%;border-radius:50%;background:radial-gradient(circle,rgba(35,211,154,.28),transparent 68%);filter:blur(6px);pointer-events:none')}></div>
          <img src="assets/moola-hero-full.png" alt="Moola — the 100x meme calf" style={css('position:relative;display:block;width:100%;height:auto;animation:floaty 6s ease-in-out infinite')} />
          <div style={css('position:absolute;left:0;right:0;top:0;height:54px;background:linear-gradient(180deg,#08160e,transparent);pointer-events:none')}></div>
          <div style={css('position:absolute;left:0;right:0;bottom:0;height:64px;background:linear-gradient(180deg,transparent,#08160e);pointer-events:none')}></div>
        </div>
      </div>

      {/* CTA buttons */}
      <div style={css('display:flex;gap:11px;margin:4px 0 30px')}>
        <div onClick={v.goPresale} style={css('flex:1;text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#16c07e);color:#06160e;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 6px 20px rgba(35,211,154,.32)')}>Buy Presale</div>
        {v.airdropClaimed ? (
          <div style={css('flex:1;text-align:center;padding:15px;border-radius:14px;border:1px solid rgba(35,211,154,.35);background:rgba(35,211,154,.1);color:#23d39a;font-weight:800;font-size:15px;cursor:default')}>✓ Claimed</div>
        ) : (
          <div onClick={v.openClaim} style={css('flex:1;text-align:center;padding:15px;border-radius:14px;border:1px solid rgba(110,200,150,.35);color:#cfe7da;font-weight:700;font-size:15px;cursor:pointer')}>Claim Airdrop</div>
        )}
      </div>

      {/* live stats strip */}
      <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:34px')}>
        <div style={css('border-radius:16px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:15px 8px;text-align:center')}>
          <div style={css('font-size:20px;font-weight:800;color:#23d39a')}>{v.raisedStr}</div>
          <div style={css('font-size:11px;color:#92b8a3;margin-top:3px')}>Raised</div>
        </div>
        <div style={css('border-radius:16px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:15px 8px;text-align:center')}>
          <div style={css('font-size:20px;font-weight:800;color:#f2b34e')}>{v.holdersStr}</div>
          <div style={css('font-size:11px;color:#92b8a3;margin-top:3px')}>Holders</div>
        </div>
        <div style={css('border-radius:16px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:15px 8px;text-align:center')}>
          <div style={css('font-size:20px;font-weight:800')}>2.05%</div>
          <div style={css('font-size:11px;color:#92b8a3;margin-top:3px')}>Daily APR</div>
        </div>
      </div>

      {/* presale progress */}
      <div onClick={v.goPresale} style={css('border-radius:20px;background:linear-gradient(150deg,rgba(47,227,194,.14),rgba(242,179,78,.12));border:1px solid rgba(110,200,150,.2);padding:18px 18px;margin-bottom:34px;cursor:pointer')}>
        <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:12px')}>
          <div style={css('display:flex;align-items:center;gap:8px')}>
            <span style={css('width:9px;height:9px;border-radius:50%;background:#23d39a;box-shadow:0 0 8px #23d39a;animation:pulseGlow 2s ease-in-out infinite')}></span>
            <span style={css('font-size:14px;font-weight:700')}>Presale Stage 1 · Live</span>
          </div>
          <span style={css('font-size:13px;font-weight:700;color:#f2b34e')}>$0.01</span>
        </div>
        <div style={css('height:12px;border-radius:8px;background:rgba(6,22,14,.6);overflow:hidden;margin-bottom:9px')}>
          <div style={css('width:' + v.soldBarWidth + ';height:100%;border-radius:8px;background:linear-gradient(90deg,#23d39a,#f2b34e);box-shadow:0 0 14px rgba(35,211,154,.5)')}></div>
        </div>
        <div style={css('display:flex;justify-content:space-between;font-size:12px;color:#92b8a3')}>
          <span><b style={css('color:#cfe7da')}>{v.soldStr}</b> sold</span>
          <span>of {v.totalStr}</span>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={css('margin-bottom:34px')}>
        <div style={css('font-size:12px;letter-spacing:2px;color:#23d39a;font-weight:700;margin-bottom:6px')}>HOW IT WORKS</div>
        <h2 style={css('font-size:25px;font-weight:800;margin:0 0 18px;letter-spacing:-.4px')}>Earn in 3 simple steps</h2>
        <div style={css('display:flex;flex-direction:column;gap:12px')}>
          <div style={css('display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:16px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14)')}>
            <div style={css('width:38px;height:38px;flex-shrink:0;border-radius:11px;background:linear-gradient(150deg,#23d39a,#16c07e);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;color:#06160e')}>1</div>
            <div><div style={css('font-size:16px;font-weight:700;margin-bottom:3px')}>Claim your airdrop</div><div style={css('font-size:13px;color:#92b8a3;line-height:1.5')}>Grab 200 $MOOLA free. It auto-stakes the moment you claim and starts earning.</div></div>
          </div>
          <div style={css('display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:16px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14)')}>
            <div style={css('width:38px;height:38px;flex-shrink:0;border-radius:11px;background:linear-gradient(150deg,#f2b34e,#ff9d3c);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;color:#2a1a06')}>2</div>
            <div><div style={css('font-size:16px;font-weight:700;margin-bottom:3px')}>Stake &amp; compound</div><div style={css('font-size:13px;color:#92b8a3;line-height:1.5')}>Earn 2.05% every day for 20 days. Buy more in the presale and stake that too.</div></div>
          </div>
          <div style={css('display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:16px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14)')}>
            <div style={css('width:38px;height:38px;flex-shrink:0;border-radius:11px;background:linear-gradient(150deg,#23d39a,#f2b34e);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;color:#06160e')}>3</div>
            <div><div style={css('font-size:16px;font-weight:700;margin-bottom:3px')}>Refer &amp; cash out</div><div style={css('font-size:13px;color:#92b8a3;line-height:1.5')}>Earn across 10 referral levels, then sell your $MOOLA back to SOL anytime.</div></div>
          </div>
        </div>
      </div>

      {/* ROADMAP */}
      <div style={css('margin-bottom:34px')}>
        <div style={css('font-size:12px;letter-spacing:2px;color:#23d39a;font-weight:700;margin-bottom:6px')}>ROADMAP</div>
        <h2 style={css('font-size:25px;font-weight:800;margin:0 0 20px;letter-spacing:-.4px')}>The road to 100x</h2>
        <div style={css('position:relative;padding-left:30px')}>
          <div style={css('position:absolute;left:9px;top:6px;bottom:6px;width:2px;background:linear-gradient(180deg,#23d39a,#f2b34e,rgba(110,200,150,.2))')}></div>
          {v.roadmap.map((ph, i) => (
            <div key={i} style={css('position:relative;margin-bottom:22px')}>
              <div style={css(`position:absolute;left:-30px;top:2px;width:20px;height:20px;border-radius:50%;background:${ph.dotBg};border:3px solid #0a1d14;box-shadow:0 0 0 1px ${ph.dotRing}`)}></div>
              <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:5px')}>
                <span style={css(`font-size:12px;font-weight:700;color:${ph.labelColor}`)}>{ph.phase}</span>
                <span style={css(`font-size:10px;padding:2px 8px;border-radius:10px;background:${ph.tagBg};color:${ph.tagColor};font-weight:700`)}>{ph.status}</span>
              </div>
              <div style={css('font-size:16px;font-weight:700;margin-bottom:6px')}>{ph.title}</div>
              <div style={css('font-size:13px;color:#92b8a3;line-height:1.6')}>{ph.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TOKENOMICS */}
      <div style={css('margin-bottom:34px')}>
        <div style={css('font-size:12px;letter-spacing:2px;color:#23d39a;font-weight:700;margin-bottom:6px')}>TOKENOMICS</div>
        <h2 style={css('font-size:25px;font-weight:800;margin:0 0 6px;letter-spacing:-.4px')}>1,000,000,000 $MOOLA</h2>
        <p style={css('font-size:13px;color:#92b8a3;margin:0 0 20px;line-height:1.6')}>Fixed supply. 70% to the community presale. No team unlocks for 12 months.</p>
        <div style={css('border-radius:20px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:22px 18px')}>
          <div style={css('display:flex;align-items:center;gap:20px;justify-content:center')}>
            <div style={css('position:relative;width:130px;height:130px;flex-shrink:0;border-radius:50%;background:conic-gradient(#23d39a 0 70%,#f2b34e 70% 85%,#ff9d3c 85% 95%,#7fe0a0 95% 100%);box-shadow:0 0 30px rgba(35,211,154,.3)')}>
              <div style={css('position:absolute;inset:26px;border-radius:50%;background:#0a1d14;display:flex;flex-direction:column;align-items:center;justify-content:center')}><div style={css('font-size:13px;font-weight:800;color:#23d39a')}>1B</div><div style={css('font-size:9px;color:#92b8a3')}>SUPPLY</div></div>
            </div>
            <div style={css('font-size:13px;line-height:1;display:flex;flex-direction:column;gap:13px')}>
              <div style={css('display:flex;align-items:center;gap:9px')}><span style={css('width:11px;height:11px;border-radius:3px;background:#23d39a')}></span><div><b>Presale 70%</b><div style={css('font-size:11px;color:#92b8a3;margin-top:2px')}>700,000,000</div></div></div>
              <div style={css('display:flex;align-items:center;gap:9px')}><span style={css('width:11px;height:11px;border-radius:3px;background:#f2b34e')}></span><div><b>Exchanges 15%</b><div style={css('font-size:11px;color:#92b8a3;margin-top:2px')}>150,000,000</div></div></div>
              <div style={css('display:flex;align-items:center;gap:9px')}><span style={css('width:11px;height:11px;border-radius:3px;background:#ff9d3c')}></span><div><b>Marketing 10%</b><div style={css('font-size:11px;color:#92b8a3;margin-top:2px')}>100,000,000</div></div></div>
              <div style={css('display:flex;align-items:center;gap:9px')}><span style={css('width:11px;height:11px;border-radius:3px;background:#7fe0a0')}></span><div><b>Ecosystem 5%</b><div style={css('font-size:11px;color:#92b8a3;margin-top:2px')}>50,000,000</div></div></div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={css('margin-bottom:24px')}>
        <div style={css('font-size:12px;letter-spacing:2px;color:#23d39a;font-weight:700;margin-bottom:6px')}>FAQ</div>
        <h2 style={css('font-size:25px;font-weight:800;margin:0 0 18px;letter-spacing:-.4px')}>Good to know</h2>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          {v.faqs.map((f, i) => (
            <div key={i} onClick={f.toggle} style={css('border-radius:14px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14);padding:15px 16px;cursor:pointer')}>
              <div style={css('display:flex;justify-content:space-between;align-items:center;gap:10px')}>
                <span style={css('font-size:14.5px;font-weight:600')}>{f.q}</span>
                <span style={css('font-size:18px;color:#23d39a;flex-shrink:0')}>{f.sign}</span>
              </div>
              {f.open && (
                <div style={css('font-size:13px;color:#92b8a3;line-height:1.6;margin-top:10px')}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div style={css('text-align:center;padding:20px 0 8px;border-top:1px solid rgba(110,200,150,.12)')}>
        <div style={css('display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px')}>
          <div style={css('width:28px;height:28px')}><CalfLogo /></div>
          <span style={css('font-size:16px;font-weight:700')}>Moola</span>
        </div>
        <div style={css('font-size:11.5px;color:#5e7d6a;line-height:1.6')}>
          Built on Solana · Not financial advice<br />© 2026 Moola. To the moo. 🐮
        </div>
      </div>
    </div>
  )
}
