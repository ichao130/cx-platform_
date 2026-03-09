import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { genId } from '../components/id';

type RoleKey = 'owner' | 'admin' | 'member' | 'viewer';
type AccessKey =
  | 'dashboard'
  | 'workspaces'
  | 'sites'
  | 'scenarios'
  | 'actions'
  | 'templates'
  | 'media'
  | 'ai'
  | 'members'
  | 'billing';

type Workspace = {
  name?: string;
  domains: string[];
  defaults?: {
    ai?: { decision?: boolean; discovery?: 'suggest' | 'off'; copy?: 'approve' | 'auto' };
    log_sample_rate?: number;
    access?: Record<RoleKey, Partial<Record<AccessKey, boolean>>>;
  };
  createdAt?: any;
  updatedAt?: any;
};

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

const ROLE_KEYS: RoleKey[] = ['owner', 'admin', 'member', 'viewer'];
const ACCESS_ITEMS: Array<{ key: AccessKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'workspaces', label: 'Workspaces' },
  { key: 'sites', label: 'Sites' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'actions', label: 'Actions' },
  { key: 'templates', label: 'Templates' },
  { key: 'media', label: 'Media' },
  { key: 'ai', label: 'AI / Review' },
  { key: 'members', label: 'Members' },
  { key: 'billing', label: 'Billing' },
];

function defaultAccessMatrix(): Record<RoleKey, Record<AccessKey, boolean>> {
  return {
    owner: {
      dashboard: true,
      workspaces: true,
      sites: true,
      scenarios: true,
      actions: true,
      templates: true,
      media: true,
      ai: true,
      members: true,
      billing: true,
    },
    admin: {
      dashboard: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: true,
      templates: true,
      media: true,
      ai: true,
      members: true,
      billing: false,
    },
    member: {
      dashboard: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: true,
      templates: false,
      media: false,
      ai: true,
      members: false,
      billing: false,
    },
    viewer: {
      dashboard: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: false,
      templates: false,
      media: false,
      ai: true,
      members: false,
      billing: false,
    },
  };
}

function normalizeAccessMatrix(input?: Workspace['defaults'] extends { access?: infer T } ? T : never) {
  const base = defaultAccessMatrix();
  for (const role of ROLE_KEYS) {
    for (const item of ACCESS_ITEMS) {
      const next = (input as any)?.[role]?.[item.key];
      if (typeof next === 'boolean') base[role][item.key] = next;
    }
  }
  return base;
}

function summarizeAccess(access?: Workspace['defaults'] extends { access?: infer T } ? T : never) {
  const normalized = normalizeAccessMatrix(access);
  return ROLE_KEYS.map((role) => {
    const enabled = ACCESS_ITEMS.filter((item) => normalized[role]?.[item.key]).map((item) => item.label);
    return {
      role,
      count: enabled.length,
      preview: enabled.slice(0, 3).join(' / '),
    };
  });
}

function findWorkspaceName(rows: Array<{ id: string; data: Workspace }>, workspaceId: string) {
  const row = rows.find((r) => r.id === workspaceId);
  return row?.data?.name || '';
}

function getSelectedWorkspaceIdForUid(uid?: string) {
  if (!uid) return '';
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || '';
  } catch {
    return '';
  }
}

function setSelectedWorkspaceId(workspaceId: string, uid?: string) {
  if (!uid) return;
  try {
    localStorage.setItem(workspaceKeyForUid(uid), workspaceId);
    window.dispatchEvent(new CustomEvent('cx_admin_workspace_changed', { detail: { workspaceId } }));
  } catch {
    // ignore
  }
}

export default function WorkspacesPage() {
  const [rows, setRows] = useState<Array<{ id: string; data: Workspace }>>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState('');
  const [currentUid, setCurrentUid] = useState('');

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || '';
      setCurrentUid(uid);
      setSelectedWorkspaceIdState('');
      setSelectedWorkspaceIdState(getSelectedWorkspaceIdForUid(uid));
    });
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setRows([]);
      setSelectedWorkspaceIdState('');
      return;
    }

    const q = query(
      collection(db, 'workspaces'),
      where(`members.${currentUid}`, 'in', ['owner', 'admin', 'member', 'viewer'])
    );

    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as Workspace })));
    });
  }, [currentUid]);


  useEffect(() => {
    if (!currentUid) return;
    if (!selectedWorkspaceId) return;
    const visible = rows.some((r) => r.id === selectedWorkspaceId);
    if (!visible) {
      setSelectedWorkspaceIdState('');
    }
  }, [currentUid, rows, selectedWorkspaceId]);

  
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (currentUid && e.key === workspaceKeyForUid(currentUid)) {
        setSelectedWorkspaceIdState(getSelectedWorkspaceIdForUid(currentUid));
      }
    };
    const onCustom = (e: any) => {
      const next = e?.detail?.workspaceId;
      if (typeof next === 'string') setSelectedWorkspaceIdState(next);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('cx_admin_workspace_changed' as any, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cx_admin_workspace_changed' as any, onCustom);
    };
  }, [currentUid]);

  const [id, setId] = useState(() => genId('ws'));
  const [name, setName] = useState('');
  const [decision, setDecision] = useState(false);
  const [discovery, setDiscovery] = useState<'suggest' | 'off'>('suggest');
  const [copyMode, setCopyMode] = useState<'approve' | 'auto'>('approve');
  const [logSampleRate, setLogSampleRate] = useState(1);
  const [accessMatrix, setAccessMatrix] = useState(() => defaultAccessMatrix());
  const [error, setError] = useState('');

  const editingRow = useMemo(
    () => rows.find((r) => r.id === String(id || '').trim()),
    [rows, id]
  );
  const selectedWorkspaceName = useMemo(
    () => findWorkspaceName(rows, selectedWorkspaceId),
    [rows, selectedWorkspaceId]
  );

  async function createOrUpdate() {
    const safeId = String(id || '').trim();
    const safeName = String(name || '').trim();
    const safeDomains = editingRow?.data?.domains || [];

    if (!safeId) {
      setError('workspaceId is required');
      return;
    }
    if (!safeName) {
      setError('workspace name is required');
      return;
    }

    setError('');

    const docRef = doc(db, 'workspaces', safeId);
    const payload: Workspace = {
      name: safeName,
      domains: safeDomains,
      defaults: {
        ai: { decision, discovery, copy: copyMode },
        log_sample_rate: Number.isFinite(Number(logSampleRate)) ? Number(logSampleRate) : 1,
        access: accessMatrix,
      },
      updatedAt: new Date(),
    };

    await setDoc(docRef, payload, { merge: true });

    const savedId = safeId;
    setSelectedWorkspaceId(savedId, currentUid);
    setSelectedWorkspaceIdState(savedId);
    setId(genId('ws'));
    setName('');
    setDecision(false);
    setDiscovery('suggest');
    setCopyMode('approve');
    setLogSampleRate(1);
    setAccessMatrix(defaultAccessMatrix());
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">ワークスペース</h1>
        <div className="small">メンバー・サイト・権限設定をまとめて管理する単位です。まずは名前で見分けられるように整理します。</div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <span className="badge" style={{ width: 'fit-content' }}>
            現在のワークスペース:
            <b style={{ marginLeft: 6 }}>{selectedWorkspaceName || '（未選択）'}</b>
          </span>
          {selectedWorkspaceId ? (
            <div className="small" style={{ opacity: 0.7 }}>
              ID: <code>{selectedWorkspaceId}</code>
            </div>
          ) : null}
        </div>
        <div style={{ height: 18 }} />

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">ワークスペース名</div>
            <input className="input" placeholder="例: RUHAKU 管理用ワークスペース" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
              メンバーに見せる名前です。ブランド名や運用目的がすぐ分かる名前がおすすめです。
            </div>
            <div style={{ height: 14 }} />
            <div className="h2">ワークスペースID</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />
            <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
              システム内部で使う識別子です。通常運用では名前を見れば十分です。
            </div>
            <div style={{ height: 12 }} />
            <div className="small" style={{ opacity: 0.72 }}>
              URL / ドメイン設定はこの画面では扱いません。必要な設定はサイト側で管理します。
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">初期設定</div>
            <div className="row">
              <label className="badge">
                <input type="checkbox" checked={decision} onChange={(e) => setDecision(e.target.checked)} />
                AI decision
              </label>
              <label className="badge">discovery
                <select className="input" style={{ width: 140, marginLeft: 8 }} value={discovery} onChange={(e) => setDiscovery(e.target.value as any)}>
                  <option value="suggest">suggest</option>
                  <option value="off">off</option>
                </select>
              </label>
              <label className="badge">copy
                <select className="input" style={{ width: 140, marginLeft: 8 }} value={copyMode} onChange={(e) => setCopyMode(e.target.value as any)}>
                  <option value="approve">approve</option>
                  <option value="auto">auto</option>
                </select>
              </label>
            </div>
            <div style={{ height: 10 }} />
            <div className="h2">ログ取得サンプル率</div>
            <input className="input" type="number" step="0.1" value={logSampleRate} onChange={(e) => setLogSampleRate(Number(e.target.value))} />
            <div style={{ height: 14 }} />

            <div className="h2">ロールごとの表示権限</div>
            <div className="small" style={{ marginBottom: 8 }}>
              オーナー / 管理者 / メンバー / 閲覧者のそれぞれが、どの画面を見られるかをここで決めます。
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
              <table className="table" style={{ minWidth: 760, margin: 0 }}>
                <thead>
                  <tr>
                    <th>screen</th>
                    {ROLE_KEYS.map((role) => (
                      <th key={role}>{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACCESS_ITEMS.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <div>{item.label}</div>
                        <div className="small"><code>{item.key}</code></div>
                      </td>
                      {ROLE_KEYS.map((role) => (
                        <td key={role}>
                          <label className="badge">
                            <input
                              type="checkbox"
                              checked={!!accessMatrix[role]?.[item.key]}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAccessMatrix((prev) => ({
                                  ...prev,
                                  [role]: {
                                    ...prev[role],
                                    [item.key]: checked,
                                  },
                                }));
                              }}
                            />
                            visible
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ height: 14 }} />
            {error ? (
              <div className="small" style={{ color: 'salmon', marginBottom: 8 }}>
                {error}
              </div>
            ) : null}
            <button className="btn btn--primary" onClick={createOrUpdate}>
              {rows.some((r) => r.id === id) ? 'ワークスペースを更新' : 'ワークスペースを作成'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="h2">ワークスペース一覧</div>
        <div className="small" style={{ marginBottom: 10, opacity: 0.72 }}>
          名前を中心に一覧化しています。ここではワークスペース名と権限設定を中心に管理します。
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ワークスペース</th>
              <th>初期設定</th>
              <th>権限サマリー</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const accessSummary = summarizeAccess(r.data.defaults?.access);
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.data.name || '名称未設定'}</div>
                    <div className="small" style={{ opacity: 0.72 }}>
                      ID: <code>{r.id}</code>
                    </div>
                    {selectedWorkspaceId === r.id ? (
                      <div className="small" style={{ marginTop: 6 }}>
                        <span className="badge">選択中</span>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="small" style={{ display: 'grid', gap: 4 }}>
                      <div>AI decision: <b>{r.data.defaults?.ai?.decision ? 'ON' : 'OFF'}</b></div>
                      <div>discovery: <b>{r.data.defaults?.ai?.discovery || 'suggest'}</b></div>
                      <div>copy: <b>{r.data.defaults?.ai?.copy || 'approve'}</b></div>
                      <div>log sample: <b>{Number(r.data.defaults?.log_sample_rate ?? 1)}</b></div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {accessSummary.map((x) => (
                        <div key={x.role} className="small">
                          <b>{x.role}</b>: {x.count}画面{x.preview ? `（${x.preview}${x.count > 3 ? ' ...' : ''}）` : ''}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      className={"btn " + (selectedWorkspaceId === r.id ? 'btn--primary' : '')}
                      onClick={() => {
                        setSelectedWorkspaceId(r.id, currentUid);
                        setSelectedWorkspaceIdState(r.id);
                      }}
                    >
                      選択
                    </button>
                    <span style={{ width: 8, display: 'inline-block' }} />
                    <button className="btn" onClick={() => {
                      setId(r.id);
                      setName(r.data.name || '');
                      setSelectedWorkspaceId(r.id, currentUid);
                      setSelectedWorkspaceIdState(r.id);
                      setDecision(!!r.data.defaults?.ai?.decision);
                      setDiscovery((r.data.defaults?.ai?.discovery as any) || 'suggest');
                      setCopyMode((r.data.defaults?.ai?.copy as any) || 'approve');
                      setLogSampleRate(Number(r.data.defaults?.log_sample_rate ?? 1));
                      setAccessMatrix(normalizeAccessMatrix(r.data.defaults?.access));
                    }}>
                      編集
                    </button>
                    <span style={{ width: 8, display: 'inline-block' }} />
                    <button className="btn btn--danger" onClick={() => deleteDoc(doc(db, 'workspaces', r.id))}>
                      削除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
