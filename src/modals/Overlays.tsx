import { css } from '../css'
import type { MoolaVals } from '../useMoola'

export default function Overlays({ v }: { v: MoolaVals }) {
  return (
    <>
      {/* ===== WALLET DRAWER ===== */}
      {v.wallet && (
        <div onClick={v.closeWallet} style={css('position:fixed;inset:0;z-index:50;background:rgba(3,8,5,.62);display:flex;justify-content:center;align-items:flex-end')}>
          <div onClick={v.stop} style={css('width:440px;max-width:100vw;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#123322,#0a1d14);border-top:1px solid rgba(110,200,150,.25);padding:8px 18px 30px;animation:riseIn .3s ease')}>
            <div style={css('width:42px;height:4px;border-radius:3px;background:rgba(150,210,180,.35);margin:8px auto 16px')}></div>
            <div style={css('display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px')}>
              <div>
                <div style={css('font-size:13px;color:#92b8a3')}>Your balance</div>
                <div style={css('font-size:30px;font-weight:800')}>{v.balanceStr} <span style={css('font-size:15px;color:#92b8a3')}>$MOOLA</span></div>
                <div style={css('font-size:13px;color:#23d39a')}>≈ ${v.usdtStr} USDT</div>
              </div>
              <div onClick={v.closeWallet} style={css('width:32px;height:32px;border-radius:50%;background:rgba(6,22,14,.6);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer')}>✕</div>
            </div>
            <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:18px')}>
              <div style={css('border-radius:14px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.16);padding:13px;text-align:center')}>
                <div style={css('font-size:12px;color:#92b8a3')}>Available</div><div style={css('font-size:17px;font-weight:700')}>{v.availStr}</div>
              </div>
              <div style={css('border-radius:14px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.16);padding:13px;text-align:center')}>
                <div style={css('font-size:12px;color:#92b8a3')}>Staked</div><div style={css('font-size:17px;font-weight:700;color:#23d39a')}>{v.stakedStr}</div>
              </div>
            </div>
            {/* spendable assets on Solana: SOL (fees) + USDT (buy presale) */}
            <div style={css('font-size:13px;color:#92b8a3;margin-bottom:9px')}>Your assets</div>
            <div style={css('display:flex;flex-direction:column;gap:9px;margin-bottom:18px')}>
              <div style={css('display:flex;align-items:center;gap:11px;padding:12px 13px;border-radius:13px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.16)')}>
                <div style={css('width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#9945ff,#14f195);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff')}>◎</div>
                <div style={css('flex:1')}><div style={css('font-weight:700;font-size:14px')}>{v.solStr} SOL</div><div style={css('font-size:11.5px;color:#92b8a3')}>Solana · for network fees</div></div>
                <div onClick={() => v.openDeposit('SOL')} style={css('padding:7px 16px;border-radius:14px;background:rgba(35,211,154,.16);color:#23d39a;font-weight:700;font-size:12px;cursor:pointer')}>Deposit</div>
              </div>
              <div style={css('display:flex;align-items:center;gap:11px;padding:12px 13px;border-radius:13px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.16)')}>
                <div style={css('width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#26a17b,#2fd6a6);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff')}>₮</div>
                <div style={css('flex:1')}><div style={css('font-weight:700;font-size:14px')}>{v.usdtBalStr} USDT</div><div style={css('font-size:11.5px;color:#92b8a3')}>Solana (SPL) · buy presale</div></div>
                <div onClick={() => v.openDeposit('USDT')} style={css('padding:7px 16px;border-radius:14px;background:rgba(35,211,154,.16);color:#23d39a;font-weight:700;font-size:12px;cursor:pointer')}>Deposit</div>
              </div>
              <div style={css('display:flex;align-items:center;gap:11px;padding:12px 13px;border-radius:13px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.16)')}>
                <div style={css('width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#2775ca,#3b9bff);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff')}>$</div>
                <div style={css('flex:1')}><div style={css('font-weight:700;font-size:14px')}>{v.usdcBalStr} USDC</div><div style={css('font-size:11.5px;color:#92b8a3')}>Solana (SPL) · buy presale</div></div>
                <div onClick={() => v.openDeposit('USDC')} style={css('padding:7px 16px;border-radius:14px;background:rgba(35,211,154,.16);color:#23d39a;font-weight:700;font-size:12px;cursor:pointer')}>Deposit</div>
              </div>
            </div>
            <div style={css('display:flex;gap:11px;margin-bottom:18px')}>
              <div onClick={v.goPresale} style={css('flex:1;text-align:center;padding:14px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;cursor:pointer')}>↓ Buy</div>
              <div onClick={v.openSell} style={css('flex:1;text-align:center;padding:14px;border-radius:14px;background:linear-gradient(120deg,#f2b34e,#ff9d3c);color:#2a1a06;font-weight:800;cursor:pointer')}>↑ Sell</div>
              <div onClick={v.openStakeForm} style={css('flex:1;text-align:center;padding:14px;border-radius:14px;border:1px solid rgba(110,200,150,.3);color:#cfe7da;font-weight:700;cursor:pointer')}>⊕ Stake</div>
            </div>
            <div style={css('font-size:13px;color:#92b8a3;margin-bottom:9px')}>Deposit network</div>
            <div style={css('display:flex;align-items:center;gap:11px;padding:13px 14px;border-radius:13px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.16)')}>
              <div style={css('width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#9945ff,#14f195);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff')}>◎</div>
              <div style={css('flex:1')}><div style={css('font-weight:700;font-size:14px')}>Solana (SPL)</div><div style={css('font-size:11.5px;color:#92b8a3')}>So1a…MooLa9aE2 · tap to copy</div></div>
              <div onClick={v.copyRef} style={css('padding:7px 14px;border-radius:14px;background:rgba(35,211,154,.16);color:#23d39a;font-weight:700;font-size:12px;cursor:pointer')}>Copy</div>
            </div>
            <div style={css('font-size:13px;color:#92b8a3;margin:18px 0 9px')}>Recent activity</div>
            <div style={css('text-align:center;padding:18px 0;border-top:1px solid rgba(110,200,150,.1);font-size:13px;color:#7ea98f')}>No activity yet — claim your airdrop to get started.</div>
          </div>
        </div>
      )}

      {/* ===== AIRDROP CLAIM ===== */}
      {v.claim && (
        <div onClick={v.closeClaim} style={css('position:fixed;inset:0;z-index:55;background:rgba(3,8,5,.74);display:flex;justify-content:center;align-items:center;padding:20px')}>
          <div onClick={v.stop} style={css('position:relative;width:380px;max-width:100%')}>
            {/* pulsing glow halo behind the card */}
            <div style={css('position:absolute;inset:-26px;border-radius:42px;background:radial-gradient(circle,rgba(35,211,154,.5),rgba(242,179,78,.18) 55%,transparent 72%);filter:blur(24px);animation:pulseGlow 2.4s ease-in-out infinite;pointer-events:none')}></div>
            <div style={css('position:relative;border-radius:22px;background:linear-gradient(180deg,#123322,#0a1d14);border:1px solid rgba(150,255,235,.3);padding:24px 20px;text-align:center;animation:pop .3s ease, claimGlow 2.4s ease-in-out infinite')}>
              {/* attention pill */}
              <div style={css('display:inline-block;padding:5px 14px;border-radius:14px;background:rgba(242,179,78,.16);border:1px solid rgba(242,179,78,.4);color:#f2b34e;font-size:11.5px;font-weight:800;letter-spacing:1.5px;margin-bottom:12px;animation:pulseGlow 1.8s ease-in-out infinite')}>✨ FREE AIRDROP</div>
              {/* gift with glowing aura */}
              <div style={css('position:relative;display:flex;justify-content:center;align-items:center;margin-bottom:2px')}>
                <div style={css('position:absolute;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle,rgba(35,211,154,.55),transparent 70%);filter:blur(8px);animation:pulseGlow 2s ease-in-out infinite;pointer-events:none')}></div>
                <div style={css('position:relative;font-size:52px;animation:floaty 3s ease-in-out infinite')}>🎁</div>
              </div>
              <div style={css('font-size:22px;font-weight:800;margin:6px 0 2px')}>Claim your Airdrop</div>
              <div style={css('font-size:32px;font-weight:800;color:#23d39a;margin-bottom:4px')}>200 $MOOLA <span style={css('font-size:15px;color:#92b8a3;font-weight:600')}>≈ $2</span></div>
              <div style={css('font-size:13px;color:#92b8a3;line-height:1.55;margin-bottom:18px')}>Your airdrop auto-stakes on claim and starts earning <b style={css('color:#cfe7da')}>2.05% daily</b> instantly.</div>
              {v.claimStep1 && (
                <div onClick={v.claimAirdrop} style={css('padding:16px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;font-size:16px;cursor:pointer;animation:btnGlow 1.8s ease-in-out infinite')}>🎁 Claim &amp; Stake</div>
              )}
              {v.claimStep2 && (
                <>
                  <div style={css('font-size:13px;color:#92b8a3;text-align:left;margin-bottom:7px')}>Your Solana address</div>
                  <input value={v.claimAddr} onChange={v.onClaimAddr} placeholder="Paste SOL address" style={css('width:100%;box-sizing:border-box;padding:13px 14px;border-radius:13px;background:rgba(6,22,14,.6);border:1px solid rgba(110,200,150,.22);color:#eafff4;font-size:14px;outline:none;font-family:Sora,sans-serif;margin-bottom:13px')} />
                  <div onClick={v.confirmClaim} style={css('padding:16px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;font-size:16px;cursor:pointer;animation:btnGlow 1.8s ease-in-out infinite')}>Confirm Claim</div>
                </>
              )}
              <div onClick={v.closeClaim} style={css('margin-top:12px;font-size:13px;color:#7ea98f;cursor:pointer')}>Maybe later</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STAKE FORM ===== */}
      {v.stakeForm && (
        <div onClick={v.closeStakeForm} style={css('position:fixed;inset:0;z-index:55;background:rgba(3,8,5,.7);display:flex;justify-content:center;align-items:flex-end')}>
          <div onClick={v.stop} style={css('width:440px;max-width:100vw;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#123322,#0a1d14);border-top:1px solid rgba(110,200,150,.25);padding:8px 18px 30px;animation:riseIn .3s ease')}>
            <div style={css('width:42px;height:4px;border-radius:3px;background:rgba(150,210,180,.35);margin:8px auto 16px')}></div>
            <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:16px')}>
              <span style={css('font-size:19px;font-weight:800')}>Stake $MOOLA</span>
              <div onClick={v.closeStakeForm} style={css('width:32px;height:32px;border-radius:50%;background:rgba(6,22,14,.6);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer')}>✕</div>
            </div>
            <div style={css('display:flex;justify-content:space-between;font-size:13px;color:#92b8a3;margin-bottom:7px')}>
              <span>Amount</span><span>Available: <b style={css('color:#cfe7da')}>{v.availStr}</b></span>
            </div>
            <div style={css('display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:13px;background:rgba(6,22,14,.55);border:1px solid rgba(110,200,150,.2);margin-bottom:14px')}>
              <input value={v.stakeAmt} onChange={v.onStakeAmt} inputMode="decimal" placeholder="0.0" style={css("flex:1;background:transparent;border:none;outline:none;color:#eafff4;font-size:23px;font-weight:700;font-family:'Sora',sans-serif;width:100%")} />
              <div onClick={v.setMaxStake} style={css('padding:6px 13px;border-radius:12px;background:rgba(35,211,154,.16);color:#23d39a;font-weight:700;font-size:12px;cursor:pointer')}>MAX</div>
            </div>
            <div style={css('border-radius:14px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.14);padding:14px 16px;margin-bottom:16px')}>
              <div style={css('display:flex;justify-content:space-between;padding:5px 0;font-size:13.5px')}><span style={css('color:#92b8a3')}>Daily reward (2.05%)</span><span style={css('font-weight:700;color:#23d39a')}>{v.stakeEstDaily}</span></div>
              <div style={css('display:flex;justify-content:space-between;padding:5px 0;font-size:13.5px')}><span style={css('color:#92b8a3')}>Lock period</span><span style={css('font-weight:700')}>20 days</span></div>
              <div style={css('display:flex;justify-content:space-between;padding:5px 0;font-size:13.5px;border-top:1px solid rgba(110,200,150,.12);margin-top:4px;padding-top:9px')}><span style={css('color:#92b8a3')}>Total after 20d</span><span style={css('font-weight:800;color:#f2b34e')}>{v.stakeEstTotal} $MOOLA</span></div>
            </div>
            <div onClick={v.doStake} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;font-size:16px;cursor:pointer')}>Confirm Stake</div>
          </div>
        </div>
      )}

      {/* ===== MY REWARDS ===== */}
      {v.rewards && (
        <div onClick={v.closeRewards} style={css('position:fixed;inset:0;z-index:55;background:rgba(3,8,5,.7);display:flex;justify-content:center;align-items:flex-end')}>
          <div onClick={v.stop} style={css('width:440px;max-width:100vw;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#123322,#0a1d14);border-top:1px solid rgba(110,200,150,.25);padding:8px 18px 30px;animation:riseIn .3s ease')}>
            <div style={css('width:42px;height:4px;border-radius:3px;background:rgba(150,210,180,.35);margin:8px auto 16px')}></div>
            <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:16px')}>
              <span style={css('font-size:19px;font-weight:800')}>My Rewards</span>
              <div onClick={v.closeRewards} style={css('width:32px;height:32px;border-radius:50%;background:rgba(6,22,14,.6);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer')}>✕</div>
            </div>

            {/* next cycle countdown */}
            <div style={css('display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;color:#92b8a3;margin-bottom:14px')}>
              <span style={css('width:7px;height:7px;border-radius:50%;background:#23d39a;box-shadow:0 0 8px #23d39a;animation:pulseGlow 2s ease-in-out infinite')}></span>
              Next reward cycle in <b style={css('color:#cfe7da')}>{v.cdStr}</b>
            </div>

            {/* claimable card */}
            <div style={css('border-radius:18px;background:linear-gradient(150deg,rgba(47,227,194,.16),rgba(242,179,78,.12));border:1px solid rgba(110,200,150,.22);padding:20px 18px;text-align:center;margin-bottom:14px')}>
              <div style={css('font-size:12.5px;color:#bfe3d0;letter-spacing:.4px')}>CLAIMABLE REWARDS</div>
              <div style={css('font-size:38px;font-weight:800;letter-spacing:-.6px;margin:4px 0 2px;font-variant-numeric:tabular-nums')}>{v.rewardStr}</div>
              <div style={css('font-size:13px;color:#92b8a3')}>$MOOLA · ≈ ${v.rewardUsdStr}</div>
            </div>

            {/* claim / compound */}
            <div style={css('display:flex;gap:11px;margin-bottom:16px')}>
              <div onClick={v.claimRewards} style={css('flex:1;text-align:center;padding:14px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 6px 18px rgba(47,227,194,.3)')}>Claim to Wallet</div>
              <div onClick={v.compoundRewards} style={css('flex:1;text-align:center;padding:14px;border-radius:14px;border:1px solid #23d39a;color:#23d39a;font-weight:700;font-size:15px;cursor:pointer')}>🔁 Compound</div>
            </div>

            {/* breakdown */}
            <div style={css('border-radius:14px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.14);padding:14px 16px;margin-bottom:16px')}>
              <div style={css('display:flex;justify-content:space-between;padding:6px 0;font-size:13.5px')}><span style={css('color:#92b8a3')}>Staked</span><span style={css('font-weight:700')}>{v.stakedStr} $MOOLA</span></div>
              <div style={css('display:flex;justify-content:space-between;padding:6px 0;font-size:13.5px')}><span style={css('color:#92b8a3')}>Daily rate</span><span style={css('font-weight:700;color:#23d39a')}>2.05%</span></div>
              <div style={css('display:flex;justify-content:space-between;padding:6px 0;font-size:13.5px')}><span style={css('color:#92b8a3')}>Daily rewards</span><span style={css('font-weight:700')}>{v.dailyRewardsStr} $MOOLA</span></div>
              <div style={css('display:flex;justify-content:space-between;padding:6px 0;font-size:13.5px')}><span style={css('color:#92b8a3')}>Lock period</span><span style={css('font-weight:700')}>20 days</span></div>
              <div style={css('display:flex;justify-content:space-between;padding:6px 0;font-size:13.5px;border-top:1px solid rgba(110,200,150,.12);margin-top:4px;padding-top:9px')}><span style={css('color:#92b8a3')}>Projected (20d)</span><span style={css('font-weight:800;color:#f2b34e')}>{v.projectedStr} $MOOLA</span></div>
            </div>

            <div style={css('font-size:11.5px;color:#7ea98f;text-align:center;line-height:1.5')}>Rewards accrue every second. <b style={css('color:#cfe7da')}>Claim</b> sends them to your available balance · <b style={css('color:#cfe7da')}>Compound</b> re-stakes them to earn more.</div>
          </div>
        </div>
      )}

      {/* ===== STAKING DETAILS ===== */}
      {v.details && (
        <div onClick={v.closeDetails} style={css('position:fixed;inset:0;z-index:55;background:rgba(3,8,5,.7);display:flex;justify-content:center;align-items:flex-end')}>
          <div onClick={v.stop} style={css('width:440px;max-width:100vw;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#123322,#0a1d14);border-top:1px solid rgba(110,200,150,.25);padding:8px 18px 30px;animation:riseIn .3s ease')}>
            <div style={css('width:42px;height:4px;border-radius:3px;background:rgba(150,210,180,.35);margin:8px auto 16px')}></div>
            <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:16px')}>
              <span style={css('font-size:19px;font-weight:800')}>Staking Details</span>
              <div onClick={v.closeDetails} style={css('width:32px;height:32px;border-radius:50%;background:rgba(6,22,14,.6);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer')}>✕</div>
            </div>

            {/* total staked summary */}
            <div style={css('border-radius:18px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.16);padding:18px 16px;text-align:center;margin-bottom:14px')}>
              <div style={css('font-size:12.5px;color:#92b8a3')}>Total Staked</div>
              <div style={css('font-size:30px;font-weight:800;margin:3px 0;font-variant-numeric:tabular-nums')}>{v.stakedStr} <span style={css('font-size:15px;color:#92b8a3')}>$MOOLA</span></div>
              <div style={css('font-size:13px;color:#23d39a')}>≈ ${v.stakedUsdStr}</div>
            </div>

            {/* position breakdown */}
            <div style={css('border-radius:14px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.14);padding:6px 16px;margin-bottom:14px')}>
              <div style={css('display:flex;justify-content:space-between;align-items:center;padding:11px 0;font-size:13.5px;border-bottom:1px solid rgba(110,200,150,.1)')}><span style={css('color:#92b8a3')}>Status</span><span style={css('font-weight:700;color:#23d39a')}>● Active</span></div>
              <div style={css('display:flex;justify-content:space-between;align-items:center;padding:11px 0;font-size:13.5px;border-bottom:1px solid rgba(110,200,150,.1)')}><span style={css('color:#92b8a3')}>APR</span><span style={css('font-weight:700')}>2.05% / day · 41% / 20d</span></div>
              <div style={css('display:flex;justify-content:space-between;align-items:center;padding:11px 0;font-size:13.5px;border-bottom:1px solid rgba(110,200,150,.1)')}><span style={css('color:#92b8a3')}>Lock period</span><span style={css('font-weight:700')}>20 days</span></div>
              <div style={css('display:flex;justify-content:space-between;align-items:center;padding:11px 0;font-size:13.5px;border-bottom:1px solid rgba(110,200,150,.1)')}><span style={css('color:#92b8a3')}>Daily rewards</span><span style={css('font-weight:700;color:#23d39a')}>{v.dailyRewardsStr} $MOOLA</span></div>
              <div style={css('display:flex;justify-content:space-between;align-items:center;padding:11px 0;font-size:13.5px;border-bottom:1px solid rgba(110,200,150,.1)')}><span style={css('color:#92b8a3')}>Total rewards (20d)</span><span style={css('font-weight:700;color:#f2b34e')}>{v.totalRewardsStr} $MOOLA</span></div>
              <div style={css('display:flex;justify-content:space-between;align-items:center;padding:11px 0;font-size:13.5px')}><span style={css('color:#92b8a3')}>Stake cap</span><span style={css('font-weight:700')}>1,000,000 $MOOLA</span></div>
            </div>

            {/* lock progress */}
            <div style={css('border-radius:14px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.14);padding:14px 16px;margin-bottom:16px')}>
              <div style={css('display:flex;justify-content:space-between;font-size:12.5px;color:#92b8a3;margin-bottom:9px')}><span>Lock progress · Day 4 of 20</span><span style={css('color:#cfe7da;font-weight:700')}>~16 days left</span></div>
              <div style={css('height:10px;border-radius:6px;background:rgba(6,22,14,.7);overflow:hidden')}>
                <div style={css('width:20%;height:100%;border-radius:6px;background:linear-gradient(90deg,#23d39a,#f2b34e);box-shadow:0 0 12px rgba(35,211,154,.5)')}></div>
              </div>
            </div>

            <div onClick={v.openStakeForm} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;font-size:16px;cursor:pointer')}>⊕ Stake more</div>
          </div>
        </div>
      )}

      {/* ===== DEPOSIT (SOL or USDT on Solana / SPL) ===== */}
      {v.deposit && (
        <div style={css('position:fixed;inset:0;z-index:58;background:#06110b;display:flex;justify-content:center;overflow-y:auto')}>
          <div style={css('width:440px;max-width:100vw;min-height:100%;padding:18px 18px 40px;background:radial-gradient(130% 70% at 50% -5%, #123a2a 0%, #0a1d14 45%, #06110b 100%)')}>
            <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:22px')}>
              <div onClick={v.closeDeposit} style={css('width:36px;height:36px;border-radius:50%;background:rgba(15,40,28,.7);border:1px solid rgba(110,200,150,.2);display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer')}>‹</div>
              <span style={css('font-size:19px;font-weight:800')}>Deposit {v.depositAsset}</span>
            </div>

            {/* amount being deposited */}
            <div style={css('border-radius:18px;background:linear-gradient(150deg,rgba(47,227,194,.14),rgba(242,179,78,.12));border:1px solid rgba(110,200,150,.22);padding:18px;margin-bottom:18px')}>
              <div style={css('font-size:12.5px;color:#bfe3d0;letter-spacing:.3px;text-align:center;margin-bottom:10px')}>AMOUNT YOU'RE SENDING</div>
              <div style={css('display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:13px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.2)')}>
                <input value={v.depositAmt} onChange={v.onDepositAmt} inputMode="decimal" placeholder="0.0" style={css("flex:1;background:transparent;border:none;outline:none;color:#eafff4;font-size:24px;font-weight:800;font-family:'Sora',sans-serif;width:100%")} />
                <span style={css('font-weight:700;color:#9fefc6;font-size:16px')}>{v.depositAsset}</span>
              </div>
              {v.depTokensStr && (
                <div style={css('font-size:12.5px;color:#92b8a3;text-align:center;margin-top:10px')}>Covers a presale buy of <b style={css('color:#23d39a')}>{v.depTokensStr} $MOOLA</b></div>
              )}
            </div>

            <div style={css('display:flex;justify-content:center;margin-bottom:18px')}>
              <div style={css('padding:12px;border-radius:18px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.4)')}>
                <img src="assets/deposit-qr.png" alt="Deposit QR" style={css('width:188px;height:188px;display:block;border-radius:6px')} />
              </div>
            </div>

            <div style={css('display:flex;align-items:center;gap:11px;padding:13px 15px;border-radius:14px;background:rgba(15,40,28,.6);border:1px solid rgba(110,200,150,.16);margin-bottom:11px')}>
              <div style={css('width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#9945ff,#14f195);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff')}>◎</div>
              <div style={css('flex:1')}><div style={css('font-size:11.5px;color:#92b8a3')}>Network</div><div style={css('font-size:14.5px;font-weight:700')}>Solana (SPL)</div></div>
              <div style={css('font-size:11px;color:#f2b34e;font-weight:700;padding:4px 10px;border-radius:10px;background:rgba(242,179,78,.14)')}>{v.depositAsset} only</div>
            </div>

            <div style={css('font-size:12.5px;color:#92b8a3;margin:6px 2px 7px')}>Your Moola {v.depositAsset} deposit address</div>
            <div style={css('display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:14px;background:rgba(6,22,14,.6);border:1px solid rgba(110,200,150,.2);margin-bottom:18px')}>
              <span style={css('flex:1;font-size:13px;color:#cfe7da;word-break:break-all;line-height:1.4')}>{v.depAddr}</span>
              <div onClick={v.copyDepAddr} style={css('flex-shrink:0;padding:9px 16px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:700;font-size:13px;cursor:pointer')}>{v.depCopyLabel}</div>
            </div>

            <div style={css('border-radius:14px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14);padding:15px 16px;margin-bottom:18px')}>
              <div style={css('display:flex;gap:10px;align-items:flex-start;margin-bottom:11px')}><span style={css('color:#23d39a;font-weight:800')}>1.</span><span style={css('font-size:13px;color:#cfe7da;line-height:1.5')}>Send {v.depositAsset} on the <b style={css('color:#eafff4')}>Solana (SPL)</b> network to the address above — from any Solana wallet or exchange.</span></div>
              <div style={css('display:flex;gap:10px;align-items:flex-start;margin-bottom:11px')}><span style={css('color:#23d39a;font-weight:800')}>2.</span><span style={css('font-size:13px;color:#cfe7da;line-height:1.5')}>Enter the amount you sent above, then tap confirm.</span></div>
              <div style={css('display:flex;gap:10px;align-items:flex-start')}><span style={css('color:#23d39a;font-weight:800')}>3.</span><span style={css('font-size:13px;color:#cfe7da;line-height:1.5')}>Your {v.depositAsset} balance updates and is ready to use.</span></div>
            </div>

            <div style={css('display:flex;align-items:center;gap:8px;justify-content:center;font-size:12px;color:#7ea98f;margin-bottom:14px')}>
              <span style={css('width:8px;height:8px;border-radius:50%;background:#f2b34e;animation:pulseGlow 1.6s ease-in-out infinite')}></span>
              Waiting for your deposit…
            </div>

            <div onClick={v.confirmDeposit} style={css('text-align:center;padding:16px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#16c07e);color:#06160e;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 6px 20px rgba(35,211,154,.32)')}>I've sent the payment</div>
            <div onClick={v.closeDeposit} style={css('text-align:center;font-size:13px;color:#7ea98f;margin-top:13px;cursor:pointer')}>Cancel</div>
          </div>
        </div>
      )}

      {/* ===== SELL ===== */}
      {v.sell && (
        <div onClick={v.closeSell} style={css('position:fixed;inset:0;z-index:55;background:rgba(3,8,5,.7);display:flex;justify-content:center;align-items:flex-end')}>
          <div onClick={v.stop} style={css('width:440px;max-width:100vw;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#123322,#0a1d14);border-top:1px solid rgba(110,200,150,.25);padding:8px 18px 30px;animation:riseIn .3s ease')}>
            <div style={css('width:42px;height:4px;border-radius:3px;background:rgba(150,210,180,.35);margin:8px auto 16px')}></div>
            <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:16px')}>
              <span style={css('font-size:19px;font-weight:800')}>Sell $MOOLA</span>
              <div onClick={v.closeSell} style={css('width:32px;height:32px;border-radius:50%;background:rgba(6,22,14,.6);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer')}>✕</div>
            </div>
            <div style={css('display:flex;justify-content:space-between;font-size:13px;color:#92b8a3;margin-bottom:7px')}>
              <span>Amount to sell</span><span>Available: <b style={css('color:#cfe7da')}>{v.availStr}</b></span>
            </div>
            <div style={css('display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:13px;background:rgba(6,22,14,.55);border:1px solid rgba(110,200,150,.2);margin-bottom:14px')}>
              <input value={v.sellAmt} onChange={v.onSellAmt} inputMode="decimal" placeholder="0.0" style={css("flex:1;background:transparent;border:none;outline:none;color:#eafff4;font-size:23px;font-weight:700;font-family:'Sora',sans-serif;width:100%")} />
              <span style={css('font-weight:700;color:#cfe7da;font-size:14px')}>$MOOLA</span>
              <div onClick={v.setMaxSell} style={css('padding:6px 13px;border-radius:12px;background:rgba(242,179,78,.18);color:#f2b34e;font-weight:700;font-size:12px;cursor:pointer')}>MAX</div>
            </div>
            <div style={css('display:flex;align-items:center;justify-content:space-between;border-radius:14px;background:rgba(6,22,14,.5);border:1px solid rgba(110,200,150,.14);padding:14px 16px;margin-bottom:16px')}>
              <div style={css('display:flex;align-items:center;gap:9px')}>
                <div style={css('width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#9945ff,#14f195);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff')}>◎</div>
                <span style={css('font-size:13.5px;color:#92b8a3')}>You receive</span>
              </div>
              <span style={css('font-size:18px;font-weight:800;color:#f2b34e')}>{v.sellSolStr} SOL</span>
            </div>
            <div onClick={v.doSell} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#f2b34e,#ff9d3c);color:#2a1a06;font-weight:800;font-size:16px;cursor:pointer')}>Sell to SOL</div>
            <div style={css('text-align:center;font-size:11.5px;color:#7ea98f;margin-top:10px')}>Only unstaked $MOOLA can be sold · Sell fee 7%</div>
          </div>
        </div>
      )}

      {/* ===== TRANSACTION HISTORY ===== */}
      {v.history && (
        <div style={css('position:fixed;inset:0;z-index:58;background:#06110b;display:flex;justify-content:center;overflow-y:auto')}>
          <div style={css('width:440px;max-width:100vw;min-height:100%;padding:18px 18px 40px;background:radial-gradient(130% 70% at 50% -5%, #123a2a 0%, #0a1d14 45%, #06110b 100%)')}>
            <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:20px')}>
              <div onClick={v.closeHistory} style={css('width:36px;height:36px;border-radius:50%;background:rgba(15,40,28,.7);border:1px solid rgba(110,200,150,.2);display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer')}>‹</div>
              <span style={css('font-size:19px;font-weight:800')}>Transaction History</span>
            </div>
            {v.txns.length > 0 ? (
              <>
                <div style={css('border-radius:18px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14);overflow:hidden')}>
                  {v.txns.map((t, i) => (
                    <div key={i} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1)')}>
                      <div style={css('width:40px;height:40px;border-radius:12px;background:rgba(6,22,14,.6);display:flex;align-items:center;justify-content:center;font-size:18px')}>{t.icon}</div>
                      <div style={css('flex:1')}><div style={css('font-size:14.5px;font-weight:600')}>{t.title}</div><div style={css('font-size:11.5px;color:#92b8a3;margin-top:2px')}>{t.sub}</div></div>
                      <div style={css(`font-size:14.5px;font-weight:700;color:${t.amtColor}`)}>{t.amt}</div>
                    </div>
                  ))}
                </div>
                <div style={css('text-align:center;font-size:12px;color:#5e7d6a;margin-top:18px')}>Showing your recent transactions</div>
              </>
            ) : (
              <div style={css('text-align:center;padding:50px 20px;color:#7ea98f')}>
                <div style={css('font-size:40px;margin-bottom:10px')}>🧾</div>
                <div style={css('font-size:14.5px;font-weight:600;color:#cfe7da')}>No transactions yet</div>
                <div style={css('font-size:12.5px;margin-top:5px')}>Claim your airdrop or buy in the presale to get started.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SETTINGS ===== */}
      {v.settings && (
        <div style={css('position:fixed;inset:0;z-index:58;background:#06110b;display:flex;justify-content:center;overflow-y:auto')}>
          <div style={css('width:440px;max-width:100vw;min-height:100%;padding:18px 18px 40px;background:radial-gradient(130% 70% at 50% -5%, #123a2a 0%, #0a1d14 45%, #06110b 100%)')}>
            <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:20px')}>
              <div onClick={v.closeSettings} style={css('width:36px;height:36px;border-radius:50%;background:rgba(15,40,28,.7);border:1px solid rgba(110,200,150,.2);display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer')}>‹</div>
              <span style={css('font-size:19px;font-weight:800')}>Settings</span>
            </div>

            <div style={css('font-size:12px;letter-spacing:1.5px;color:#23d39a;font-weight:700;margin:6px 2px 9px')}>PREFERENCES</div>
            <div style={css('border-radius:16px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14);overflow:hidden;margin-bottom:20px')}>
              <div onClick={v.toggleNotif} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1);cursor:pointer')}>
                <span style={css('font-size:18px')}>🔔</span><span style={css('flex:1;font-size:14.5px;font-weight:600')}>Push notifications</span>
                <div style={css(`width:46px;height:27px;border-radius:14px;background:${v.notifTrack};position:relative;transition:.2s`)}><div style={css(`position:absolute;top:3px;left:${v.notifX};width:21px;height:21px;border-radius:50%;background:#fff;transition:.2s`)}></div></div>
              </div>
              <div onClick={v.toggleBio} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1);cursor:pointer')}>
                <span style={css('font-size:18px')}>🔒</span><span style={css('flex:1;font-size:14.5px;font-weight:600')}>Biometric unlock</span>
                <div style={css(`width:46px;height:27px;border-radius:14px;background:${v.bioTrack};position:relative;transition:.2s`)}><div style={css(`position:absolute;top:3px;left:${v.bioX};width:21px;height:21px;border-radius:50%;background:#fff;transition:.2s`)}></div></div>
              </div>
              <div onClick={v.toggleHide} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1);cursor:pointer')}>
                <span style={css('font-size:18px')}>👁️</span><span style={css('flex:1;font-size:14.5px;font-weight:600')}>Hide balances</span>
                <div style={css(`width:46px;height:27px;border-radius:14px;background:${v.hideTrack};position:relative;transition:.2s`)}><div style={css(`position:absolute;top:3px;left:${v.hideX};width:21px;height:21px;border-radius:50%;background:#fff;transition:.2s`)}></div></div>
              </div>
              <div onClick={v.toggleAuto} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;cursor:pointer')}>
                <span style={css('font-size:18px')}>⚡</span><span style={css('flex:1;font-size:14.5px;font-weight:600')}>Auto-stake purchases</span>
                <div style={css(`width:46px;height:27px;border-radius:14px;background:${v.autoTrack};position:relative;transition:.2s`)}><div style={css(`position:absolute;top:3px;left:${v.autoX};width:21px;height:21px;border-radius:50%;background:#fff;transition:.2s`)}></div></div>
              </div>
            </div>

            <div style={css('font-size:12px;letter-spacing:1.5px;color:#23d39a;font-weight:700;margin:6px 2px 9px')}>ACCOUNT</div>
            <div style={css('border-radius:16px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.14);overflow:hidden;margin-bottom:20px')}>
              <div style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1)')}>
                <span style={css('font-size:18px')}>💱</span><span style={css('flex:1;font-size:14.5px;font-weight:600')}>Display currency</span><span style={css('font-size:13.5px;color:#92b8a3')}>USD ›</span>
              </div>
              <div style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1)')}>
                <span style={css('font-size:18px')}>🌐</span><span style={css('flex:1;font-size:14.5px;font-weight:600')}>Network</span><span style={css('font-size:13.5px;color:#92b8a3')}>Solana ›</span>
              </div>
              <div onClick={v.joinTelegram} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;cursor:pointer')}>
                <span style={css('font-size:18px')}>💬</span><span style={css('flex:1;font-size:14.5px;font-weight:600')}>Support &amp; community</span><span style={css('color:#7ea98f')}>›</span>
              </div>
            </div>

            <div onClick={v.disconnect} style={css('text-align:center;padding:15px;border-radius:14px;border:1px solid rgba(255,120,120,.4);color:#ff8f8f;font-weight:700;font-size:15px;cursor:pointer')}>Disconnect wallet</div>
            <div style={css('text-align:center;font-size:11.5px;color:#5e7d6a;margin-top:16px')}>Moola v1.0.0 · Built on Solana</div>
          </div>
        </div>
      )}
    </>
  )
}
