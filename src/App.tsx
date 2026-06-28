import { css } from './css'
import { useMoola } from './useMoola'
import Home from './screens/Home'
import Stake from './screens/Stake'
import Presale from './screens/Presale'
import Nft from './screens/Nft'
import Me from './screens/Me'
import Auth from './Auth'
import Overlays from './modals/Overlays'
import BottomNav from './BottomNav'

export default function App() {
  const v = useMoola()

  return (
    <div style={css('min-height:100dvh;display:flex;justify-content:center;background:#05060d;font-family:Sora,sans-serif')}>
      <div style={css('position:relative;width:440px;max-width:100vw;min-height:100dvh;overflow:hidden;color:#eafff4;background:radial-gradient(130% 80% at 50% -10%, #123a2a 0%, #0a1d14 42%, #06110b 100%)')}>
        {/* ambient glow blobs */}
        <div style={css('position:absolute;top:-60px;left:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#23d39a 0%,transparent 70%);opacity:.16;pointer-events:none')}></div>
        <div style={css('position:absolute;top:120px;right:-110px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,#f2b34e 0%,transparent 70%);opacity:.18;pointer-events:none')}></div>

        {/* app shell — only mounted once signed in, so the auth gate isn't
            stretched by the (long) screens rendered behind it */}
        {!v.showAuth && (
          <>
            {v.isHome && <Home v={v} />}
            {v.isStake && <Stake v={v} />}
            {v.isPresale && <Presale v={v} />}
            {v.isNft && <Nft v={v} />}
            {v.isMe && <Me v={v} />}

            <Overlays v={v} />
            <BottomNav v={v} />
          </>
        )}

        {/* auth gate (covers everything until authed) */}
        {v.showAuth && <Auth v={v} />}
      </div>
    </div>
  )
}
