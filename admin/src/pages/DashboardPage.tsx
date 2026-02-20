import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

type SiteRow = { id: string; workspaceId: string };
type ScenarioRow = { id: string; name?: string; siteId?: string };
type ActionRow = { id: string; creative?: { title?: string } };

type StatRow = {
  siteId: string;
  day: string; // YYYY-MM-DD
  scenarioId?: string;
  actionId?: string;
  event: string; // impression | click | close ...
  count: number;
  updatedAt?: Timestamp;
};

function yyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function DashboardPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);

  const [siteId, setSiteId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return yyyyMmDd(d);
  });
  const [to, setTo] = useState(() => yyyyMmDd(new Date()));

  const [stats, setStats] = useState<Array<{ id: string; data: StatRow }>>([]);

  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('__name__'));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      setSites(rows.map((r) => ({ id: r.id, workspaceId: r.workspaceId }))); // keep light
      if (!siteId && rows.length) setSiteId(rows[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q1 = query(collection(db, 'scenarios'), orderBy('__name__'));
    const unsub1 = onSnapshot(q1, (snap) => {
      setScenarios(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
    });
    const q2 = query(collection(db, 'actions'), orderBy('__name__'));
    const unsub2 = onSnapshot(q2, (snap) => {
      setActions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    if (!siteId) return;
    // stats_daily: {siteId, day, scenarioId, actionId, event, count}
    // Note: this compound query may require an index (Firestore will show a link if needed).
    const q = query(
      collection(db, 'stats_daily'),
      where('siteId', '==', siteId),
      where('day', '>=', from),
      where('day', '<=', to),
      orderBy('day', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setStats(snap.docs.map((d) => ({ id: d.id, data: d.data() as StatRow })));
    });
  }, [siteId, from, to]);

  const scenarioNameById = useMemo(() => {
    const m = new Map<string, string>();
    scenarios.forEach((s) => m.set(s.id, s.name || s.id));
    return m;
  }, [scenarios]);

  const actionTitleById = useMemo(() => {
    const m = new Map<string, string>();
    actions.forEach((a) => m.set(a.id, a.creative?.title || a.id));
    return m;
  }, [actions]);

  const table = useMemo(() => {
    // group by scenarioId/actionId/event across date range
    const map = new Map<string, { scenarioId?: string; actionId?: string; event: string; count: number }>();
    for (const r of stats) {
      const d = r.data;
      const key = `${d.scenarioId || 'na'}__${d.actionId || 'na'}__${d.event}`;
      const cur = map.get(key) || { scenarioId: d.scenarioId, actionId: d.actionId, event: d.event, count: 0 };
      cur.count += Number(d.count || 0);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [stats]);

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Dashboard</h1>
        <div className="small">効果測定（β）。まずは <b>表示(impression)</b> / <b>クリック(click)</b> / <b>閉じる(close)</b> を集計。</div>
        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 240 }}>
            <div className="h2">site</div>
            <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="h2">from</div>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="h2">to</div>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div style={{ height: 14 }} />
        <div className="small">※ 数が増えたら BigQuery に逃がす（将来設計）。まずは Firestore 集計で“見える化”優先。</div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="h2">集計</div>
        <table className="table">
          <thead>
            <tr>
              <th>scenario</th>
              <th>action</th>
              <th>event</th>
              <th style={{ textAlign: 'right' }}>count</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, idx) => (
              <tr key={idx}>
                <td>{r.scenarioId ? scenarioNameById.get(r.scenarioId) || r.scenarioId : '-'}</td>
                <td>{r.actionId ? actionTitleById.get(r.actionId) || r.actionId : '-'}</td>
                <td><code>{r.event}</code></td>
                <td style={{ textAlign: 'right' }}><b>{r.count}</b></td>
              </tr>
            ))}
            {!table.length ? (
              <tr>
                <td colSpan={4} className="small">まだデータがない（SDKの表示・クリックで増える）</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
