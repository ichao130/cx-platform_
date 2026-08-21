// admin/src/pages/PartnerPage.tsx
// 代理店ポータル: 自社が担当するクライアントを横断で見る画面。
// ★アクセス制御はサーバー側 (/v1/agency/*) が agencies.members で判定する。
//   個々のクライアントデータの編集可否は従来どおり workspaces.members のロールに従う。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, apiPostJson } from '../firebase';

type AgencyRef = { id: string; name: string; role: string };
type SiteRef = { id: string; name: string };
type Stats = { pv: number; impressions: number; clicks: number; conversions: number; purchases: number; revenue: number };
type Client = {
  workspaceId: string;
  name: string;
  plan: string;
  status: string;
  sites: SiteRef[];
  myRole: string | null;
  stats: Stats;
};

function isoDay(d: Date) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
const yen = (n: number) => '¥' + Math.round(n || 0).toLocaleString();
const num = (n: number) => Math.round(n || 0).toLocaleString();

export default function PartnerPage() {
  const [ready, setReady] = useState(false);
  const [agencies, setAgencies] = useState<AgencyRef[]>([]);
  const [agencyId, setAgencyId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [dayTo, setDayTo] = useState(() => isoDay(new Date()));
  const [dayFrom, setDayFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86400000)));

  useEffect(() => onAuthStateChanged(auth, () => setReady(true)), []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const r = await apiPostJson<{ agencies: AgencyRef[] }>('/v1/agency/me', {});
        setAgencies(r.agencies || []);
        if (r.agencies?.length) setAgencyId((cur) => cur || r.agencies[0].id);
      } catch (e: any) {
        setErr(e?.message || '代理店情報の取得に失敗しました');
      }
    })();
  }, [ready]);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true); setErr('');
    try {
      const r = await apiPostJson<{ clients: Client[] }>('/v1/agency/clients', {
        agency_id: agencyId, day_from: dayFrom, day_to: dayTo,
      });
      setClients(r.clients || []);
    } catch (e: any) {
      setErr(e?.message || 'クライアントの取得に失敗しました');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [agencyId, dayFrom, dayTo]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => clients.reduce((a, c) => ({
    pv: a.pv + c.stats.pv,
    impressions: a.impressions + c.stats.impressions,
    clicks: a.clicks + c.stats.clicks,
    conversions: a.conversions + c.stats.conversions,
    purchases: a.purchases + c.stats.purchases,
    revenue: a.revenue + c.stats.revenue,
  }), { pv: 0, impressions: 0, clicks: 0, conversions: 0, purchases: 0, revenue: 0 }), [clients]);

  const activeCount = clients.filter((c) => c.status === 'active' || c.status === 'trialing').length;

  if (!ready) return <div className="container liquid-page"><div className="small">読み込み中…</div></div>;

  if (!agencies.length) {
    return (
      <div className="container liquid-page">
        <div className="page-header"><div className="page-header__meta">
          <h1 className="h1">代理店ポータル</h1>
          <div className="small">この画面は代理店アカウント専用です。</div>
        </div></div>
        <div className="card">
          <div className="small" style={{ opacity: 0.7, lineHeight: 1.8 }}>
            お使いのアカウントは、まだどの代理店にも登録されていません。<br />
            利用をご希望の場合は運営（MOKKEDA）にお問い合わせください。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container liquid-page">
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Partner</div>
          <h1 className="h1">代理店ポータル</h1>
          <div className="small">担当クライアントの成果をまとめて確認できます。</div>
        </div>
      </div>

      {/* コントロール */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {agencies.length > 1 && (
            <select className="input" style={{ maxWidth: 240 }} value={agencyId} onChange={(e) => setAgencyId(e.target.value)}>
              {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <span className="small">期間</span>
          <input className="input" type="date" style={{ width: 160 }} value={dayFrom} onChange={(e) => setDayFrom(e.target.value)} />
          <span className="small">〜</span>
          <input className="input" type="date" style={{ width: 160 }} value={dayTo} onChange={(e) => setDayTo(e.target.value)} />
          <button className="btn" onClick={load} disabled={loading}>{loading ? '更新中…' : '更新'}</button>
        </div>
      </div>

      {err && <div className="card" style={{ marginBottom: 16, color: '#b91c1c' }}>{err}</div>}

      {/* サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        {[
          ['担当クライアント', `${clients.length}社`, '#0f172a'],
          ['稼働中', `${activeCount}社`, '#16a34a'],
          ['PV', num(totals.pv), '#0f172a'],
          ['接客表示', num(totals.impressions), '#2563eb'],
          ['CV', num(totals.conversions), '#16a34a'],
          ['売上', yen(totals.revenue), '#b45309'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="card" style={{ padding: 16 }}>
            <div className="small" style={{ opacity: 0.6, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: color as string }}>{value}</div>
          </div>
        ))}
      </div>

      {/* クライアント一覧 */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 4 }}>担当クライアント</div>
        <div className="small" style={{ opacity: 0.68, marginBottom: 12 }}>
          売上の多い順。編集できるかどうかは、そのクライアントで付与されている権限によります。
        </div>
        {loading ? (
          <div className="small">読み込み中…</div>
        ) : clients.length === 0 ? (
          <div className="small" style={{ opacity: 0.6 }}>担当クライアントがまだ登録されていません。</div>
        ) : (
          <div className="liquid-scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>クライアント</th>
                  <th>プラン</th>
                  <th style={{ textAlign: 'right' }}>PV</th>
                  <th style={{ textAlign: 'right' }}>表示</th>
                  <th style={{ textAlign: 'right' }}>CV</th>
                  <th style={{ textAlign: 'right' }}>売上</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.workspaceId}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div className="small" style={{ opacity: 0.65 }}>
                        {c.sites.length ? c.sites.map((x) => x.name).join(' / ') : 'サイト未登録'}
                      </div>
                    </td>
                    <td>
                      <span className="badge">{c.plan}</span>
                      {(c.status === 'active' || c.status === 'trialing') ? (
                        <span className="badge" style={{ marginLeft: 4, background: 'rgba(22,163,74,.12)', color: '#16a34a' }}>稼働中</span>
                      ) : (
                        <span className="badge" style={{ marginLeft: 4, opacity: 0.6 }}>{c.status}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(c.stats.pv)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(c.stats.impressions)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(c.stats.conversions)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{yen(c.stats.revenue)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {c.myRole ? (
                        <a className="btn" href="/dashboard" title={`権限: ${c.myRole}`}>管理画面へ</a>
                      ) : (
                        <span className="small" style={{ opacity: 0.5 }} title="このクライアントのワークスペースメンバーに追加されていません">権限なし</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
