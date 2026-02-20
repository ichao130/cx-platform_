import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { genId } from '../components/id';

type SiteRow = { id: string; data: any };
type ActionRow = { id: string; data: any };

type Scenario = {
  workspaceId: string;
  siteId: string;
  name: string;
  status: 'active' | 'paused';
  priority?: number;
  entry_rules?: any;
  actionRefs?: Array<{
    actionId: string;
    enabled?: boolean;
    order?: number;
    overrideCreative?: any;
  }>;
};

const PAGE_TYPES = ['product', 'blog_post', 'other'] as const;

export default function ScenariosPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: Scenario }>>([]);

  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setSites(snap.docs.map((d) => ({ id: d.id, data: d.data() }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'actions'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setActions(snap.docs.map((d) => ({ id: d.id, data: d.data() }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'scenarios'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as Scenario }))));
  }, []);

  const [id, setId] = useState(() => genId('scn'));
  const [siteId, setSiteId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [name, setName] = useState('New scenario');
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [priority, setPriority] = useState(0);

  // entry rules
  const [pageTypeIn, setPageTypeIn] = useState<Array<(typeof PAGE_TYPES)[number]>>(['other']);
  const [staySec, setStaySec] = useState(3);

  // action refs
  const [actionIdToAdd, setActionIdToAdd] = useState('');
  const [actionRefs, setActionRefs] = useState<Scenario['actionRefs']>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [sites, siteId]);

  useEffect(() => {
    const s = sites.find((x) => x.id === siteId);
    if (s?.data?.workspaceId) setWorkspaceId(s.data.workspaceId);
  }, [sites, siteId]);

  const actionsForWorkspace = useMemo(() => actions.filter((a) => a.data?.workspaceId === workspaceId), [actions, workspaceId]);

  useEffect(() => {
    if (!actionIdToAdd && actionsForWorkspace.length) setActionIdToAdd(actionsForWorkspace[0].id);
  }, [actionsForWorkspace, actionIdToAdd]);

  const entry_rules = useMemo(() => ({
    page: { page_type_in: pageTypeIn },
    behavior: { stay_gte_sec: Number(staySec) },
    trigger: { type: 'stay', ms: Number(staySec) * 1000 }
  }), [pageTypeIn, staySec]);

  const payload: Scenario = useMemo(() => ({
    workspaceId,
    siteId,
    name,
    status,
    priority: Number(priority),
    entry_rules,
    actionRefs: (actionRefs || []).map((r, idx) => ({
      actionId: r.actionId,
      enabled: r.enabled ?? true,
      order: r.order ?? idx
    }))
  }), [workspaceId, siteId, name, status, priority, entry_rules, actionRefs]);

  function togglePageType(pt: (typeof PAGE_TYPES)[number]) {
    setPageTypeIn((cur) => (cur.includes(pt) ? cur.filter((x) => x !== pt) : [...cur, pt]));
  }

  function addActionRef() {
    if (!actionIdToAdd) return;
    setActionRefs((cur) => {
      const next = [...(cur || [])];
      next.push({ actionId: actionIdToAdd, enabled: true, order: next.length });
      return next;
    });
  }

  function moveAction(from: number, to: number) {
    setActionRefs((cur) => {
      const arr = [...(cur || [])];
      if (from < 0 || from >= arr.length) return arr;
      if (to < 0 || to >= arr.length) return arr;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  async function createOrUpdate() {
    if (!siteId) throw new Error('siteId required');
    if (!workspaceId) throw new Error('workspaceId required');
    await setDoc(doc(db, 'scenarios', id.trim()), payload, { merge: true });
    setId(genId('scn'));
    setName('New scenario');
    setStatus('active');
    setPriority(0);
    setPageTypeIn(['other']);
    setStaySec(3);
    setActionRefs([]);
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Scenarios</h1>
        <div className="small">“いつ / どのページで / 何を出すか” の定義。Actions は部品、Scenario は出し分けのルール</div>
        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <div className="h2">scenarioId</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />

            <div style={{ height: 10 }} />
            <div className="h2">siteId</div>
            <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>

            <div style={{ height: 10 }} />
            <div className="row">
              <div style={{ flex: 2 }}>
                <div className="h2">name</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="h2">status</div>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="h2">priority</div>
                <input className="input" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ height: 12 }} />
            <div className="h2">entry_rules（今は最小セット）</div>
            <div className="row">
              {PAGE_TYPES.map((pt) => (
                <label key={pt} className="badge" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={pageTypeIn.includes(pt)} onChange={() => togglePageType(pt)} />
                  {pt}
                </label>
              ))}
              <label className="badge">stay_gte_sec
                <input
                  className="input"
                  style={{ width: 110, marginLeft: 8 }}
                  type="number"
                  min={0}
                  value={staySec}
                  onChange={(e) => setStaySec(Number(e.target.value))}
                />
              </label>
            </div>

            <div style={{ height: 12 }} />
            <div className="h2">actionRefs（ここが “シナリオのアクション”）</div>
            <div className="row">
              <select className="input" style={{ width: 360, maxWidth: '100%' }} value={actionIdToAdd} onChange={(e) => setActionIdToAdd(e.target.value)}>
                {actionsForWorkspace.map((a) => (
                  <option key={a.id} value={a.id}>{a.id} — {a.data?.creative?.title || ''}</option>
                ))}
              </select>
              <button className="btn" onClick={addActionRef}>追加</button>
            </div>

            <div style={{ height: 10 }} />
            {(actionRefs || []).length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>actionId</th>
                    <th>enabled</th>
                    <th>order</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(actionRefs || []).map((r, idx) => (
                    <tr
                      key={`${r.actionId}-${idx}`}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex == null) return;
                        moveAction(dragIndex, idx);
                        setDragIndex(null);
                      }}
                      style={{ opacity: dragIndex === idx ? 0.6 : 1 }}
                    >
                      <td>{idx}</td>
                      <td><code>{r.actionId}</code></td>
                      <td>
                        <input
                          type="checkbox"
                          checked={r.enabled ?? true}
                          onChange={(e) => setActionRefs((cur) => (cur || []).map((x, i) => i === idx ? { ...x, enabled: e.target.checked } : x))}
                        />
                      </td>
                      <td>
                        <button className="btn" disabled={idx === 0} onClick={() => moveAction(idx, idx - 1)}>↑</button>
                        <span style={{ width: 6, display: 'inline-block' }} />
                        <button className="btn" disabled={idx === (actionRefs || []).length - 1} onClick={() => moveAction(idx, idx + 1)}>↓</button>
                      </td>
                      <td>
                        <button className="btn" onClick={() => setActionRefs((cur) => (cur || []).filter((_, i) => i !== idx))}>削除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="small">まだ何も追加されてない（これだとSDKに出す actions が空になる）</div>
            )}

            <div style={{ height: 14 }} />
            <button className="btn btn--primary" onClick={createOrUpdate}>保存</button>
          </div>

          <div style={{ flex: 1, minWidth: 320 }}>
            <div className="h2">確認用JSON</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(payload, null, 2)}</pre>
            <div style={{ height: 12 }} />
            <div className="card" style={{ background: 'rgba(255,255,255,.03)' }}>
              <div className="h2">このページで“迷子”になりやすい点</div>
              <ul className="small">
                <li><b>Actions</b> は部品（単体）</li>
                <li><b>Scenario の actionRefs</b> は「どの部品をどの順番で出すか」</li>
                <li>SDKに返すのはサーバーが actionRefs を join して作る <code>scenario.actions</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="h2">一覧</div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>siteId</th>
              <th>name</th>
              <th>status</th>
              <th>priority</th>
              <th>actions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td><code>{r.data.siteId}</code></td>
                <td>{r.data.name}</td>
                <td>{r.data.status}</td>
                <td>{r.data.priority ?? 0}</td>
                <td>{(r.data.actionRefs || []).length}</td>
                <td>
                  <button className="btn" onClick={() => {
                    setId(r.id);
                    setSiteId(r.data.siteId);
                    setWorkspaceId(r.data.workspaceId);
                    setName(r.data.name);
                    setStatus(r.data.status);
                    setPriority(Number(r.data.priority ?? 0));
                    setPageTypeIn((r.data.entry_rules?.page?.page_type_in as any) || ['other']);
                    setStaySec(Number(r.data.entry_rules?.behavior?.stay_gte_sec ?? 3));
                    setActionRefs(r.data.actionRefs || []);
                  }}>編集</button>
                  <span style={{ width: 8, display: 'inline-block' }} />
                  <button className="btn btn--danger" onClick={() => deleteDoc(doc(db, 'scenarios', r.id))}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
