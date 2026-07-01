import { css } from '../css'
import CalfLogo from '../CalfLogo'
import type { MoolaVals } from '../useMoola'

export default function Stake({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:relative;padding:18px 16px 120px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:16px')}>
        <div style={css('display:flex;align-items:center;gap:9px')}>
          <div style={css('width:36px;height:36px;filter:drop-shadow(0 0 10px rgba(35,211,154,.55))')}><CalfLogo /></div>
          <span style={css('font-size:21px;font-weight:700')}>Moola</span>
        </div>
        <div onClick={v.openWallet} style={css('display:flex;align-items:center;gap:8px;padding:8px 13px;border-radius:22px;background:rgba(22,52,38,.6);border:1px solid rgba(110,200,150,.22);cursor:pointer')}>
          <span style={css('font-size:15px')}>💳</span>
          <span style={css('font-weight:600;font-size:15px')}>{v.availStr}</span>
          <span style={css('color:#7ea98f;font-size:11px')}>▼</span>
        </div>
      </div>

      {/* presale strip */}
      <div onClick={v.goPresale} style={css('display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-radius:26px;background:rgba(16,44,32,.55);border:1px solid rgba(110,200,150,.16);margin-bottom:22px;cursor:pointer')}>
        <div style={css('font-size:15px;font-weight:600')}>$MOOLA Presale <span style={css('color:#23d39a')}>($0.01)</span></div>
        <div style={css('font-weight:700;color:#cfe7da')}>BUY ›</div>
      </div>

      {/* reward ring */}
      <div style={css('display:flex;justify-content:center;margin-bottom:8px')}>
        <div style={css('position:relative;width:262px;height:262px')}>
          <div style={css('position:absolute;inset:-14px;border-radius:50%;background:radial-gradient(circle,#23d39a 0%,transparent 62%);opacity:.4;animation:pulseGlow 3.5s ease-in-out infinite')}></div>
          <div style={css('position:relative;width:262px;height:262px;border-radius:50%;background:linear-gradient(180deg,#23d39a 0%,#1bbd84 44%,#f2b34e 100%);box-shadow:0 0 55px rgba(47,227,194,.45),0 0 110px rgba(123,92,255,.4),inset 0 0 60px rgba(8,14,38,.55),inset 0 0 0 2px rgba(150,255,235,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center')}>
            <div style={css('display:flex;align-items:center;gap:5px;font-size:12px;padding:3px 10px;border-radius:12px;background:rgba(8,16,38,.4);margin-bottom:8px')}>⏱ {v.cdStr}</div>
            <div style={css('font-size:14px;color:#eafff5;display:flex;align-items:center;gap:5px;opacity:.92')}>Stake Rewards <span style={css('opacity:.6')}>ⓘ</span></div>
            <div style={css('font-size:33px;font-weight:800;letter-spacing:-.5px;margin:2px 0 8px;font-variant-numeric:tabular-nums')}>{v.rewardStr}</div>
            <div style={css('padding:6px 16px;border-radius:16px;background:rgba(8,16,38,.42);font-weight:700;font-size:15px;margin-bottom:9px')}>Daily + 2.05% 🚀</div>
            <div onClick={v.openRewards} style={css('padding:7px 18px;border-radius:16px;border:1px solid rgba(255,255,255,.45);font-size:13px;font-weight:600;cursor:pointer')}>My Rewards ›</div>
          </div>
        </div>
      </div>

      {/* total staked card */}
      <div style={css('border-radius:18px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:18px 16px 4px;margin-bottom:18px')}>
        <div style={css('text-align:center')}>
          <div style={css('font-size:13px;color:#92b8a3')}>Total Staked</div>
          <div style={css('font-size:27px;font-weight:800;margin:3px 0')}>{v.stakedStr} <span style={css('font-size:15px;color:#92b8a3')}>$MOOLA</span></div>
          <div style={css('font-size:12px;color:#92b8a3;margin-bottom:13px')}>Your Stake Cap <b style={css('color:#cfe7da')}>1,000,000</b> $MOOLA</div>
          {v.hasLockedAirdrop && (
            <div style={css('display:inline-block;padding:6px 14px;border-radius:14px;background:rgba(123,92,255,.14);border:1px solid rgba(123,92,255,.3);font-size:12px;color:#bda6ff;font-weight:600;margin-bottom:13px')}>🔒 {v.airdropLockedStr} locked till launch</div>
          )}
          <div style={css('display:flex;gap:11px;justify-content:center;margin-bottom:15px')}>
            <div onClick={v.openStakeForm} style={css('padding:11px 28px;border-radius:12px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(47,227,194,.3)')}>⊕ Stake</div>
            <div onClick={v.openDetails} style={css('padding:11px 28px;border-radius:12px;border:1px solid #23d39a;color:#23d39a;font-weight:600;font-size:15px;cursor:pointer')}>Details</div>
          </div>
        </div>
        <div style={css('display:flex;border-top:1px solid rgba(110,200,150,.14)')}>
          <div style={css('flex:1;text-align:center;padding:13px 0;border-right:1px solid rgba(110,200,150,.14)')}>
            <div style={css('font-size:12px;color:#92b8a3')}>Daily Rewards</div>
            <div style={css('font-size:17px;font-weight:700')}>{v.dailyRewardsStr}</div>
          </div>
          <div style={css('flex:1;text-align:center;padding:13px 0')}>
            <div style={css('font-size:12px;color:#92b8a3')}>Total Rewards</div>
            <div style={css('font-size:17px;font-weight:700')}>{v.totalRewardsStr}</div>
          </div>
        </div>
      </div>

      {/* refer & earn */}
      <div style={css('border-radius:18px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:18px 16px;text-align:center')}>
        <div style={css('font-size:16px;font-weight:700')}>REFER &amp; EARN</div>
        <div style={css('font-size:12.5px;color:#92b8a3;margin-bottom:14px')}>10-levels of commission</div>
        <div style={css('display:flex;flex-wrap:wrap;justify-content:center;gap:7px 4px;margin-bottom:16px')}>
          {v.refLevels.map((lv) => (
            <div key={lv.n} style={css('display:flex;align-items:baseline;gap:2px')}>
              <span style={css('font-size:16px;font-weight:800;color:#eafff4')}>{lv.pct}<span style={css('font-size:9px')}>%</span></span>
              <span style={css('font-size:8px;color:#7ea98f')}>LV.{lv.n}</span>
              <span style={css('color:#4d6e5c;margin:0 2px')}>/</span>
            </div>
          ))}
        </div>
        <div onClick={v.goMe} style={css('display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:20px;background:rgba(8,16,38,.4);border:1px solid rgba(110,200,150,.2);font-size:14px;font-weight:600;cursor:pointer;margin-bottom:14px')}>🧮 Calculate income</div>
        <div style={css('font-size:13px;color:#92b8a3;margin-bottom:8px')}>Your referral link</div>
        <div style={css('display:flex;align-items:center;gap:8px;padding:5px 5px 5px 14px;border-radius:22px;background:rgba(8,16,38,.45);border:1px solid rgba(110,200,150,.18)')}>
          <span style={css('flex:1;text-align:left;font-size:13px;color:#cfe7da;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{v.refLink}</span>
          <div onClick={v.copyRef} style={css('padding:8px 18px;border-radius:18px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:13px;cursor:pointer')}>{v.copyLabel}</div>
        </div>
        <div style={css('display:flex;justify-content:center;gap:16px;font-size:12px;color:#92b8a3;margin-top:11px')}>
          <span>Commission: <b style={css('color:#23d39a')}>{v.refCommissionStr}</b></span>
          <span>Airdrop bonus: <b style={css('color:#f2b34e')}>{v.refBonusStr}</b></span>
        </div>
      </div>

      {/* referral breakdown table */}
      <div style={css('padding:8px 4px 0')}>
        <div style={css('display:grid;grid-template-columns:0.8fr 0.9fr 1fr 1fr;padding:14px 6px;font-size:12.5px;color:#cfe7da;font-weight:600')}>
          <div style={css('text-align:left')}>Referrals</div>
          <div style={css('text-align:center')}>Buy</div>
          <div style={css('text-align:right')}>Commission</div>
          <div style={css('text-align:right')}>Airdrop</div>
        </div>
        {v.refRows.map((r, i) => (
          <div key={i} style={css('display:grid;grid-template-columns:0.8fr 0.9fr 1fr 1fr;padding:13px 6px;font-size:13.5px;border-top:1px solid rgba(110,200,150,.1);font-variant-numeric:tabular-nums')}>
            <div style={css('text-align:left;color:#eafff4')}>L{i + 1} · {r.refs}</div>
            <div style={css('text-align:center;color:#92b8a3')}>{r.buy}</div>
            <div style={css('text-align:right;color:#23d39a')}>{r.comm}</div>
            <div style={css('text-align:right;color:#f2b34e')}>{r.bonus}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
