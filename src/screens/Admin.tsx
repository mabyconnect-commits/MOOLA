import { css } from '../css'
import type { MoolaVals } from '../useMoola'

const n = (x: number, d = 2) =>
  Number(x || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

function Wallet({ label, address, bal }: { label: string; address: string; bal: { sol: number; usdt: number; usdc: number } | null }) {
  return (
    <div style={css('border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px')}>
      <div style={css('font-size:12px;color:#92b8a3;margin-bottom:2px')}>{label} wallet</div>
      <div style={css('font-size:11px;color:#5e7d6a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:8px')}>{address || '— not set —'}</div>
      {bal ? (
        <div style={css('font-size:13.5px;font-weight:700;line-height:1.6')}>
          ◎ {n(bal.sol, 4)} SOL<br />₮ {n(bal.usdt)} USDT<br />$ {n(bal.usdc)} USDC
        </div>
      ) : (
        <div style={css('font-size:12px;color:#7ea98f')}>unavailable</div>
      )}
    </div>
  )
}

export default function Admin({ v }: { v: MoolaVals }) {
  const o = v.adminOverview
  const dep = v.adminDepResult
  const stuck = v.adminStuck
  const pending = v.adminWithdrawals.filter((w) => w.status === 'pending')
  return (
    <div style={css('position:relative;padding:18px 16px 120px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:18px')}>
        <div style={css('display:flex;align-items:center;gap:10px')}>
          <div onClick={v.goMe} style={css('width:34px;height:34px;border-radius:50%;border:1px solid rgba(110,200,150,.25);display:flex;align-items:center;justify-content:center;cursor:pointer')}>‹</div>
          <span style={css('font-size:21px;font-weight:800')}>🛠 Admin</span>
        </div>
        <div onClick={v.adminRefresh} style={css('padding:8px 14px;border-radius:18px;border:1px solid rgba(110,200,150,.25);font-size:13px;font-weight:600;cursor:pointer')}>{v.adminBusy ? '…' : '↻ Refresh'}</div>
      </div>

      {/* Overview */}
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:14px')}>
        <div style={css('border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px;text-align:center')}>
          <div style={css('font-size:12px;color:#92b8a3')}>Users</div>
          <div style={css('font-size:22px;font-weight:800')}>{o ? o.users.total : '—'}</div>
          <div style={css('font-size:11px;color:#7ea98f')}>{o ? o.users.verified + ' verified' : ''}</div>
        </div>
        <div style={css('border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px;text-align:center')}>
          <div style={css('font-size:12px;color:#92b8a3')}>Total Staked</div>
          <div style={css('font-size:22px;font-weight:800;color:#23d39a')}>{o ? n(o.totals.staked, 0) : '—'}</div>
          <div style={css('font-size:11px;color:#7ea98f')}>$MOOLA</div>
        </div>
      </div>

      {o && (
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:14px')}>
          <Wallet label={`Treasury (${100 - o.wallets.splitPct}%)`} address={o.wallets.treasury.address} bal={o.wallets.treasury.balances} />
          <Wallet label={`Payout (${o.wallets.splitPct}%)`} address={o.wallets.payout.address} bal={o.wallets.payout.balances} />
        </div>
      )}

      {/* Withdrawal status counts */}
      {o && (
        <div style={css('border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px;margin-bottom:14px')}>
          <div style={css('font-size:13px;color:#92b8a3;margin-bottom:8px')}>Withdrawals</div>
          <div style={css('display:flex;flex-wrap:wrap;gap:8px')}>
            {o.withdrawals.length === 0 && <span style={css('font-size:13px;color:#7ea98f')}>none yet</span>}
            {o.withdrawals.map((w) => (
              <span key={w.status} style={css('padding:5px 11px;border-radius:12px;background:rgba(8,16,38,.45);font-size:12.5px;font-weight:600')}>{w.status}: {w.n}</span>
            ))}
          </div>
        </div>
      )}

      {/* Stuck deposits (funds sitting in deposit wallets, not yet swept) */}
      <div style={css('border-radius:14px;background:rgba(242,179,78,.1);border:1px solid rgba(242,179,78,.28);padding:14px;margin-bottom:12px')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:6px')}>
          <span style={css('font-size:13px;color:#f2b34e;font-weight:700')}>💰 Unswept in deposit wallets</span>
          <div onClick={v.adminScan} style={css('font-size:12px;color:#7ea98f;cursor:pointer')}>↻ Scan</div>
        </div>
        {stuck ? (
          <div style={css('font-size:14px;font-weight:700;line-height:1.6')}>
            ◎ {n(stuck.sol, 4)} SOL · ₮ {n(stuck.usdt)} USDT · $ {n(stuck.usdc)} USDC
            <div style={css('font-size:11.5px;color:#92b8a3;font-weight:400')}>across {stuck.n} wallet{stuck.n === 1 ? '' : 's'} · sweep to move it to treasury + payout</div>
          </div>
        ) : (
          <div style={css('font-size:12.5px;color:#7ea98f')}>Tap Scan to check.</div>
        )}
      </div>

      {/* Sweep all — loops batches until every stuck wallet is drained */}
      <div onClick={v.adminSweepAll} style={css('text-align:center;padding:14px;border-radius:14px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:6px;' + (v.adminBusy ? 'opacity:.6;pointer-events:none' : ''))}>{v.adminBusy ? 'Sweeping…' : '🧹 Sweep all deposit wallets'}</div>
      {v.adminSweepMsg && <div style={css('text-align:center;font-size:12px;color:#7ea98f;margin-bottom:18px')}>{v.adminSweepMsg}</div>}
      {!v.adminSweepMsg && <div style={css('margin-bottom:18px')}></div>}

      {/* Deposit lookup & reconcile — "I deposited but it didn't reflect" */}
      <div style={css('border-radius:14px;background:rgba(15,40,28,.55);border:1px solid rgba(110,200,150,.16);padding:14px;margin-bottom:18px')}>
        <div style={css('font-size:14px;font-weight:700;margin-bottom:4px')}>🔍 Deposit lookup</div>
        <div style={css('font-size:11.5px;color:#7ea98f;margin-bottom:10px')}>Find a user's deposit address & credit any funds sitting there.</div>
        <div style={css('display:flex;gap:8px;margin-bottom:10px')}>
          <input value={v.adminDepQuery} onChange={v.onAdminDepQuery} placeholder="email or user id" style={css("flex:1;box-sizing:border-box;padding:11px 13px;border-radius:11px;background:rgba(6,22,14,.55);border:1px solid rgba(110,200,150,.2);color:#eafff4;font-size:13.5px;outline:none;font-family:'Sora',sans-serif")} />
          <div onClick={v.adminDepLookup} style={css('padding:11px 16px;border-radius:11px;border:1px solid rgba(110,200,150,.3);font-size:13px;font-weight:700;cursor:pointer;' + (v.adminBusy ? 'opacity:.6;pointer-events:none' : ''))}>Look up</div>
        </div>
        {dep && (
          <div style={css('border-radius:12px;background:rgba(8,16,38,.4);padding:12px;font-size:12.5px')}>
            <div style={css('font-weight:700;margin-bottom:6px')}>{dep.user.email} <span style={css('color:#7ea98f;font-weight:400')}>#{dep.user.id}</span></div>
            <div style={css('color:#92b8a3;margin-bottom:2px')}>Deposit address</div>
            <div style={css('color:#cfe7da;word-break:break-all;margin-bottom:8px')}>{dep.depositAddress || (dep.user.depositIndex == null ? '— never generated (user never opened deposit) —' : '— unavailable —')}</div>
            <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:6px 10px')}>
              <div style={css('color:#92b8a3')}>On-chain now</div>
              <div style={css('text-align:right')}>{dep.onchain ? `◎${n(dep.onchain.sol,4)} · ₮${n(dep.onchain.usdt)} · $${n(dep.onchain.usdc)}` : '—'}</div>
              <div style={css('color:#92b8a3')}>Already credited</div>
              <div style={css('text-align:right')}>◎{n(dep.credited.sol,4)} · ₮{n(dep.credited.usdt)} · ${n(dep.credited.usdc)}</div>
              <div style={css('color:#92b8a3')}>In-app balance</div>
              <div style={css('text-align:right')}>◎{n(dep.balances.sol,4)} · ₮{n(dep.balances.usdt)} · ${n(dep.balances.usdc)}</div>
              <div style={css('color:#bda6ff')}>Uncredited</div>
              <div style={css('text-align:right;color:#bda6ff;font-weight:700')}>{dep.uncredited ? `◎${n(dep.uncredited.sol,4)} · ₮${n(dep.uncredited.usdt)} · $${n(dep.uncredited.usdc)}` : '—'}</div>
            </div>
            <div onClick={v.adminDepReconcile} style={css('text-align:center;margin-top:11px;padding:11px;border-radius:11px;background:linear-gradient(120deg,#23d39a,#1bbd84);color:#06160e;font-weight:800;font-size:13.5px;cursor:pointer;' + (v.adminBusy ? 'opacity:.6;pointer-events:none' : ''))}>{v.adminBusy ? 'Working…' : '⬇️ Credit deposit & sweep'}</div>
            {!dep.depositReady && <div style={css('text-align:center;font-size:11px;color:#ff8f8f;margin-top:7px')}>Deposit system not configured (RPC/MASTER/TREASURY).</div>}
          </div>
        )}
      </div>

      {/* Pending withdrawals to resolve */}
      <div style={css('font-size:15px;font-weight:700;margin-bottom:10px')}>Pending withdrawals ({pending.length})</div>
      {pending.length === 0 && <div style={css('font-size:13px;color:#7ea98f;margin-bottom:18px')}>None pending. 🎉</div>}
      {pending.map((w) => (
        <div key={w.id} style={css('border-radius:13px;background:rgba(15,40,28,.55);border:1px solid rgba(242,179,78,.3);padding:13px 14px;margin-bottom:9px')}>
          <div style={css('display:flex;justify-content:space-between;align-items:center')}>
            <div>
              <div style={css('font-size:14px;font-weight:700')}>{n(w.amount, w.asset === 'SOL' ? 4 : 2)} {w.asset}</div>
              <div style={css('font-size:11px;color:#92b8a3')}>{w.email || 'user #' + w.user_id} · {w.address.slice(0, 4)}…{w.address.slice(-4)}</div>
            </div>
            <div onClick={() => v.adminResolve(w.id)} style={css('padding:8px 14px;border-radius:12px;background:rgba(35,211,154,.16);color:#23d39a;font-weight:700;font-size:12.5px;cursor:pointer')}>Resolve</div>
          </div>
        </div>
      ))}

      {/* Users */}
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin:20px 0 10px')}>
        <span style={css('font-size:15px;font-weight:700')}>Users</span>
        <div onClick={() => v.adminLoadUsers()} style={css('padding:7px 13px;border-radius:16px;border:1px solid rgba(110,200,150,.25);font-size:12.5px;font-weight:600;cursor:pointer')}>Load users</div>
      </div>
      {v.adminUsers.map((u) => (
        <div key={u.id} style={css('display:flex;justify-content:space-between;align-items:center;border-radius:12px;background:rgba(15,40,28,.5);border:1px solid rgba(110,200,150,.12);padding:11px 13px;margin-bottom:7px')}>
          <div style={css('overflow:hidden')}>
            <div style={css('font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{u.email}</div>
            <div style={css('font-size:11px;color:#92b8a3')}>staked {n(u.staked, 0)} · avail {n(u.available, 0)} $MOOLA</div>
          </div>
          <div style={css('font-size:11.5px;color:#7ea98f;text-align:right;flex-shrink:0;margin-left:8px')}>◎{n(u.sol, 3)}<br />₮{n(u.usdt)} ${n(u.usdc)}</div>
        </div>
      ))}
    </div>
  )
}
