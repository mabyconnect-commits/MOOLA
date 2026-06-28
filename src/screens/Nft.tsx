import { css } from '../css'
import type { MoolaVals } from '../useMoola'

export default function Nft({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:relative;padding:18px 16px 120px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:18px')}>
        <span style={css('font-size:22px;font-weight:800')}>Calf NFTs</span>
        <div onClick={v.openWallet} style={css('display:flex;align-items:center;gap:8px;padding:8px 13px;border-radius:22px;background:rgba(22,52,38,.6);border:1px solid rgba(110,200,150,.22);cursor:pointer')}>
          <span style={css('font-size:15px')}>💳</span><span style={css('font-weight:600;font-size:15px')}>{v.balanceStr}</span>
        </div>
      </div>
      <div style={css('border-radius:18px;padding:16px;background:linear-gradient(150deg,rgba(123,92,255,.2),rgba(47,227,194,.12));border:1px solid rgba(110,200,150,.2);margin-bottom:18px')}>
        <div style={css('font-size:16px;font-weight:700;margin-bottom:4px')}>Boost your stake APR 🔥</div>
        <div style={css('font-size:13px;color:#bfe3d0;line-height:1.5')}>Hold a Calf NFT to earn up to <b style={css('color:#23d39a')}>+1.5% daily</b> bonus rewards. Genesis calves are capped at 500 forever.</div>
      </div>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:13px')}>
        {v.nfts.map((n, i) => (
          <div key={i} style={css('border-radius:16px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);overflow:hidden')}>
            <div style={css('height:150px;position:relative;overflow:hidden')}>
              <img src={n.img} alt={n.name} style={css('width:100%;height:100%;object-fit:cover;display:block')} />
              <div style={css('position:absolute;top:8px;left:8px;padding:3px 9px;border-radius:10px;background:rgba(6,16,11,.7);font-size:10px;font-weight:700;letter-spacing:.3px')}>{n.tier}</div>
            </div>
            <div style={css('padding:11px 12px')}>
              <div style={css('font-size:14px;font-weight:700')}>{n.name}</div>
              <div style={css('display:flex;align-items:center;justify-content:space-between;margin-top:7px')}>
                <span style={css('font-size:13px;color:#23d39a;font-weight:700')}>{n.price} <span style={css('font-size:10px;color:#92b8a3')}>MOOLA</span></span>
                <div onClick={n.mint} style={css('padding:5px 12px;border-radius:14px;border:1px solid #23d39a;color:#23d39a;font-size:11px;font-weight:700;cursor:pointer')}>Mint</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
