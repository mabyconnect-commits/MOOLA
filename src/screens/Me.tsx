import { css } from '../css'
import type { MoolaVals } from '../useMoola'

export default function Me({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:relative;padding:18px 16px 120px')}>
      <div style={css('display:flex;align-items:center;gap:13px;margin-bottom:20px')}>
        <div style={css('width:54px;height:54px;border-radius:16px;background:linear-gradient(150deg,#23d39a,#f2b34e);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 0 18px rgba(47,227,194,.4)')}>🐮</div>
        <div style={css('flex:1')}>
          <div style={css('font-size:18px;font-weight:700')}>Moola Holder</div>
          <div style={css('font-size:12.5px;color:#92b8a3')}>0xCa1f…9aE2 · Solana</div>
        </div>
        <div onClick={v.openWallet} style={css('padding:8px 14px;border-radius:18px;border:1px solid rgba(110,200,150,.25);font-size:13px;font-weight:600;cursor:pointer')}>Wallet</div>
      </div>

      <div style={css('display:flex;gap:10px;margin-bottom:18px')}>
        <div style={css('flex:1;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px;text-align:center')}>
          <div style={css('font-size:12px;color:#92b8a3')}>Available</div>
          <div style={css('font-size:16px;font-weight:700')}>{v.availStr}</div>
        </div>
        <div style={css('flex:1;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px;text-align:center')}>
          <div style={css('font-size:12px;color:#92b8a3')}>Staked</div>
          <div style={css('font-size:16px;font-weight:700;color:#23d39a')}>{v.stakedStr}</div>
        </div>
        <div style={css('flex:1;border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px;text-align:center')}>
          <div style={css('font-size:12px;color:#92b8a3')}>Airdrop</div>
          <div style={css('font-size:16px;font-weight:700')}>{v.airdropBalStr}</div>
        </div>
      </div>

      <div style={css('display:flex;gap:11px;margin-bottom:18px')}>
        <div onClick={v.openSell} style={css('flex:1;text-align:center;padding:14px;border-radius:14px;background:rgba(242,179,78,.16);border:1px solid rgba(242,179,78,.35);color:#f2b34e;font-weight:800;font-size:15px;cursor:pointer')}>↑ Sell $MOOLA</div>
        <div onClick={v.openWithdraw} style={css('flex:1;text-align:center;padding:14px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 6px 18px rgba(35,211,154,.25)')}>🏧 Withdraw</div>
      </div>

      <div style={css('border-radius:18px;background:linear-gradient(150deg,rgba(123,92,255,.2),rgba(47,227,194,.1));border:1px solid rgba(110,200,150,.2);padding:18px 16px;margin-bottom:16px')}>
        <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:4px')}>
          <span style={css('font-size:15px;font-weight:700')}>Referral Commission</span>
          <span style={css('font-size:12px;color:#92b8a3')}>10 levels</span>
        </div>
        <div style={css('font-size:30px;font-weight:800;color:#23d39a')}>{v.refCommissionStr} <span style={css('font-size:14px;color:#92b8a3;font-weight:600')}>$MOOLA</span></div>
        <div style={css('display:flex;align-items:center;gap:8px;padding:5px 5px 5px 14px;border-radius:22px;background:rgba(8,16,38,.45);border:1px solid rgba(110,200,150,.18);margin-top:14px')}>
          <span style={css('flex:1;text-align:left;font-size:13px;color:#cfe7da;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{v.refLink}</span>
          <div onClick={v.copyRef} style={css('padding:8px 18px;border-radius:18px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#062018;font-weight:700;font-size:13px;cursor:pointer')}>{v.copyLabel}</div>
        </div>
      </div>

      <div style={css('border-radius:18px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);overflow:hidden')}>
        <div onClick={v.goStake} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1);cursor:pointer')}>
          <span style={css('font-size:19px')}>📈</span><span style={css('flex:1;font-size:15px;font-weight:600')}>My Staking</span><span style={css('color:#7ea98f')}>›</span>
        </div>
        <div onClick={v.goNft} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1);cursor:pointer')}>
          <span style={css('font-size:19px')}>🖼️</span><span style={css('flex:1;font-size:15px;font-weight:600')}>My NFTs</span><span style={css('color:#7ea98f')}>›</span>
        </div>
        <div onClick={v.openHistory} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;border-bottom:1px solid rgba(110,200,150,.1);cursor:pointer')}>
          <span style={css('font-size:19px')}>🧾</span><span style={css('flex:1;font-size:15px;font-weight:600')}>Transaction History</span><span style={css('color:#7ea98f')}>›</span>
        </div>
        <div onClick={v.openSettings} style={css('display:flex;align-items:center;gap:13px;padding:15px 16px;cursor:pointer')}>
          <span style={css('font-size:19px')}>⚙️</span><span style={css('flex:1;font-size:15px;font-weight:600')}>Settings</span><span style={css('color:#7ea98f')}>›</span>
        </div>
      </div>
    </div>
  )
}
