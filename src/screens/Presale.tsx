import { css } from '../css'
import CalfLogo from '../CalfLogo'
import type { MoolaVals } from '../useMoola'

export default function Presale({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:relative;padding:18px 16px 120px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:20px')}>
        <div style={css('display:flex;align-items:center;gap:9px')}>
          <div style={css('width:36px;height:36px;filter:drop-shadow(0 0 10px rgba(35,211,154,.55))')}><CalfLogo /></div>
          <span style={css('font-size:20px;font-weight:700')}>Presale</span>
        </div>
        <div onClick={v.openWallet} style={css('display:flex;align-items:center;gap:8px;padding:8px 13px;border-radius:22px;background:rgba(22,52,38,.6);border:1px solid rgba(110,200,150,.22);cursor:pointer')}>
          <span style={css('font-size:15px')}>💳</span><span style={css('font-weight:600;font-size:15px')}>{v.balanceStr}</span>
        </div>
      </div>

      <div style={css('border-radius:20px;padding:22px 18px;text-align:center;background:linear-gradient(150deg,rgba(47,227,194,.16),rgba(123,92,255,.18));border:1px solid rgba(110,200,150,.22);margin-bottom:16px')}>
        <div style={css('font-size:13px;color:#bfe3d0;letter-spacing:.4px')}>CURRENT PRESALE PRICE</div>
        <div style={css('font-size:40px;font-weight:800;margin:4px 0;letter-spacing:-1px')}>$0.01</div>
        <div style={css('display:inline-block;padding:5px 14px;border-radius:14px;background:rgba(8,16,38,.4);font-size:12.5px;color:#9fefc6')}>▲ Next stage $0.015</div>
        <div style={css('height:9px;border-radius:6px;background:rgba(8,16,38,.5);margin:16px 0 7px;overflow:hidden')}>
          <div style={css('width:42%;height:100%;background:linear-gradient(90deg,#23d39a,#f2b34e)')}></div>
        </div>
        <div style={css('display:flex;justify-content:space-between;font-size:12px;color:#92b8a3')}>
          <span>294,000,000 sold</span><span>700,000,000 total</span>
        </div>
      </div>

      <div style={css('border-radius:20px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:18px 16px;margin-bottom:16px')}>
        <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:8px')}>
          <div style={css('width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#9945ff,#14f195);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff')}>◎</div>
          <span style={css('font-size:13px;color:#92b8a3')}>You pay (Solana)</span>
        </div>
        <div style={css('display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:13px;background:rgba(8,16,38,.5);border:1px solid rgba(110,200,150,.18);margin-bottom:14px')}>
          <input value={v.solIn} onChange={v.onSol} inputMode="decimal" placeholder="0.0" style={css("flex:1;background:transparent;border:none;outline:none;color:#eafff4;font-size:22px;font-weight:700;font-family:'Sora',sans-serif;width:100%")} />
          <span style={css('font-weight:700;color:#cfe7da')}>SOL</span>
        </div>
        <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:8px')}>
          <div style={css('width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#23d39a,#f2b34e);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#06160e')}>M</div>
          <span style={css('font-size:13px;color:#92b8a3')}>You receive</span>
        </div>
        <div style={css('display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:13px;background:rgba(8,16,38,.5);border:1px solid rgba(110,200,150,.18);margin-bottom:16px')}>
          <span style={css('flex:1;font-size:22px;font-weight:700;color:#23d39a')}>{v.buyTokens}</span>
          <span style={css('font-weight:700;color:#cfe7da')}>$MOOLA</span>
        </div>
        <div onClick={v.doBuy} style={css('text-align:center;padding:15px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#f2b34e);color:#06160e;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 6px 20px rgba(47,227,194,.32)')}>Buy $MOOLA</div>
        <div style={css('text-align:center;font-size:11.5px;color:#7ea98f;margin-top:10px')}>Tokens auto-stake on purchase · Buy/Sell fee 7%</div>
      </div>

      <div style={css('border-radius:20px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:18px 16px')}>
        <div style={css('text-align:center;font-size:16px;font-weight:700;margin-bottom:16px')}>Tokenomics · 1B Supply</div>
        <div style={css('display:flex;align-items:center;gap:18px;justify-content:center')}>
          <div style={css('position:relative;width:118px;height:118px;border-radius:50%;background:conic-gradient(#f2b34e 0 70%,#f5a524 70% 85%,#ff9d3c 85% 95%,#23d39a 95% 100%);box-shadow:0 0 26px rgba(123,92,255,.4)')}>
            <div style={css('position:absolute;inset:24px;border-radius:50%;background:#0a1d14;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#23d39a')}>M</div>
          </div>
          <div style={css('font-size:13px;line-height:2')}>
            <div><span style={css('display:inline-block;width:9px;height:9px;border-radius:2px;background:#f2b34e;margin-right:7px')}></span>Public Presale 70%</div>
            <div><span style={css('display:inline-block;width:9px;height:9px;border-radius:2px;background:#f5a524;margin-right:7px')}></span>Exchanges 15%</div>
            <div><span style={css('display:inline-block;width:9px;height:9px;border-radius:2px;background:#ff9d3c;margin-right:7px')}></span>Marketing 10%</div>
            <div><span style={css('display:inline-block;width:9px;height:9px;border-radius:2px;background:#23d39a;margin-right:7px')}></span>Ecosystem 5%</div>
          </div>
        </div>
      </div>
    </div>
  )
}
