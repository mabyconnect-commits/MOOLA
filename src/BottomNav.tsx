import { css } from './css'
import CalfLogo from './CalfLogo'
import type { MoolaVals } from './useMoola'

export default function BottomNav({ v }: { v: MoolaVals }) {
  return (
    <div style={css('position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:440px;max-width:100vw;display:flex;align-items:flex-end;justify-content:space-around;padding:10px 8px 14px;background:linear-gradient(180deg,rgba(7,10,28,.2),rgba(5,7,16,.96));backdrop-filter:blur(12px);border-top:1px solid rgba(110,200,150,.1);z-index:40')}>
      <div onClick={v.goHome} style={{ ...css('flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer'), color: v.cHome }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" /><path d="M12 7.5v9M8.2 9.7l7.6 4.6M15.8 9.7l-7.6 4.6" opacity=".55" /></svg>
        <div style={css('font-size:11px;font-weight:600')}>Token</div>
      </div>
      <div onClick={v.goNft} style={{ ...css('flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer'), color: v.cNft }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M3.8 16.5 9 11.5l3.2 3.1L15 12l5.2 4.8" /><circle cx="8.5" cy="8.5" r="1.6" /></svg>
        <div style={css('font-size:11px;font-weight:600')}>NFT</div>
      </div>
      <div onClick={v.goStake} style={css('flex:1;text-align:center;cursor:pointer;margin-top:-20px')}>
        <div style={css('width:56px;height:56px;margin:0 auto;filter:drop-shadow(0 0 16px rgba(35,211,154,.65))')}>
          <CalfLogo />
        </div>
      </div>
      <div onClick={v.goPresale} style={{ ...css('flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer'), color: v.cPresale }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5h12.5M13 5l3.5 3.5L13 12" /><path d="M20 15.5H7.5M11 12l-3.5 3.5L11 19" /></svg>
        <div style={css('font-size:11px;font-weight:600')}>Swap</div>
      </div>
      <div onClick={v.goMe} style={{ ...css('flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer'), color: v.cMe }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.6" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></svg>
        <div style={css('font-size:11px;font-weight:600')}>Me</div>
      </div>
    </div>
  )
}
