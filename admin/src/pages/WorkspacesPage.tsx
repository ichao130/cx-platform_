import React, { Fragment, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { db, apiPostJson } from "../firebase";
import { uploadMediaToWorkspace } from "../lib/media";

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
  logoUrl?: string;
  description?: string;
  tagline?: string;
  accentColor?: string;
  domains: string[];
  theme?: {
    accent?: string;
  };
  defaults?: {
    ai?: { decision?: boolean; discovery?: 'suggest' | 'off'; copy?: 'approve' | 'auto' };
    log_sample_rate?: number;
    access?: Record<RoleKey, Partial<Record<AccessKey, boolean>>>;
  };
  createdAt?: any;
  updatedAt?: any;
};

type MediaRow = {
  id: string;
  data: {
    workspaceId?: string;
    downloadURL?: string;
    storagePath?: string;
    originalName?: string;
    contentType?: string;
    size?: number;
    createdAt?: any;
  };
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

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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

  const [id, setId] = useState(() => genId('ws'));
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [decision, setDecision] = useState(false);
  const [discovery, setDiscovery] = useState<'suggest' | 'off'>('suggest');
  const [copyMode, setCopyMode] = useState<'approve' | 'auto'>('approve');
  const [logSampleRate, setLogSampleRate] = useState(1);
  const [accessMatrix, setAccessMatrix] = useState(() => defaultAccessMatrix());
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);
  const [logoSearch, setLogoSearch] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [isLogoDragOver, setIsLogoDragOver] = useState(false);

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

  useEffect(() => {
    const targetWorkspaceId = String(id || selectedWorkspaceId || '').trim();
    if (!targetWorkspaceId) {
      setMediaRows([]);
      return;
    }

    const q = query(
      collection(db, 'media'),
      where('workspaceId', '==', targetWorkspaceId),
      orderBy('createdAt', 'desc'),
      limit(60)
    );

    return onSnapshot(q, (snap) => {
      setMediaRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as any })));
    });
  }, [id, selectedWorkspaceId]);


  const editingRow = useMemo(
    () => rows.find((r) => r.id === String(id || '').trim()),
    [rows, id]
  );
  const selectedWorkspaceName = useMemo(
    () => findWorkspaceName(rows, selectedWorkspaceId),
    [rows, selectedWorkspaceId]
  );

  function resetEditor() {
    setId(genId('ws'));
    setName('');
    setLogoUrl('');
    setDescription('');
    setTagline('');
    setDecision(false);
    setDiscovery('suggest');
    setCopyMode('approve');
    setLogSampleRate(1);
    setAccentColor('#2563eb');
    setAccessMatrix(defaultAccessMatrix());
    setError('');
  }

  function openCreateModal() {
    resetEditor();
    setLogoSearch('');
    setIsLogoPickerOpen(false);
    setIsModalOpen(true);
  }

  function openEditModal(row: { id: string; data: Workspace }) {
    setId(row.id);
    setName(row.data.name || '');
    setLogoUrl(String(row.data.logoUrl || ''));
    setDescription(String(row.data.description || ''));
    setTagline(String(row.data.tagline || ''));
    setSelectedWorkspaceId(row.id, currentUid);
    setSelectedWorkspaceIdState(row.id);
    setDecision(!!row.data.defaults?.ai?.decision);
    setDiscovery((row.data.defaults?.ai?.discovery as any) || 'suggest');
    setCopyMode((row.data.defaults?.ai?.copy as any) || 'approve');
    setLogSampleRate(Number(row.data.defaults?.log_sample_rate ?? 1));
    setAccessMatrix(normalizeAccessMatrix(row.data.defaults?.access));
    setAccentColor(String(row.data.theme?.accent || row.data.accentColor || '#2563eb'));
    setError('');
    setLogoSearch('');
    setIsLogoPickerOpen(false);
    setIsModalOpen(true);
  }

  const filteredLogoMedia = useMemo(() => {
    const key = logoSearch.trim().toLowerCase();
    return mediaRows.filter((row) => {
      const ct = String(row.data.contentType || '').toLowerCase();
      const isImage = ct.startsWith('image/') || !!row.data.downloadURL;
      if (!isImage) return false;
      if (!key) return true;
      const name = String(row.data.originalName || '').toLowerCase();
      const idText = String(row.id || '').toLowerCase();
      return name.includes(key) || idText.includes(key);
    });
  }, [mediaRows, logoSearch]);

  function applyLogoFromMedia(row: MediaRow) {
    setLogoUrl(String(row.data.downloadURL || ''));
    setIsLogoPickerOpen(false);
  }

  async function uploadWorkspaceLogo(file: File) {
    const targetWorkspaceId = String(id || '').trim();
    if (!targetWorkspaceId) {
      setError('先にワークスペースIDを確定してください');
      return;
    }
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    setError('');
    setLogoUploading(true);
    try {
      const result = await uploadMediaToWorkspace({ workspaceId: targetWorkspaceId, file });
      const nextLogoUrl = String(result?.data?.downloadURL || '');
      if (nextLogoUrl) setLogoUrl(nextLogoUrl);
      setIsLogoPickerOpen(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLogoUploading(false);
      setIsLogoDragOver(false);
    }
  }  

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

    const isNewWorkspace = !editingRow;

    let resolvedId = safeId;

    if (isNewWorkspace) {
      // 新規: APIを経由してbootstrap（users/{uid}の作成含む）
      const res = await apiPostJson<{ ok: boolean; workspace_id: string }>('/v1/workspaces/create', { name: safeName });
      if (!res.ok || !res.workspace_id) throw new Error('ワークスペースの作成に失敗しました');
      resolvedId = res.workspace_id;
    }

    // 追加フィールド（ロゴ・説明・設定など）はFirestore直接更新
    const docRef = doc(db, 'workspaces', resolvedId);
    const payload: Workspace & { updatedAt?: any } = {
      name: safeName,
      logoUrl: String(logoUrl || '').trim(),
      description: String(description || '').trim(),
      tagline: String(tagline || '').trim(),
      accentColor: String(accentColor || '#2563eb').trim() || '#2563eb',
      theme: {
        accent: String(accentColor || '#2563eb').trim() || '#2563eb',
      },
      domains: safeDomains,
      defaults: {
        ai: { decision, discovery, copy: copyMode },
        log_sample_rate: Number.isFinite(Number(logSampleRate)) ? Number(logSampleRate) : 1,
        access: accessMatrix,
      },
      updatedAt: new Date(),
    };
    await setDoc(docRef, payload, { merge: true });

    const savedId = resolvedId;
    setSelectedWorkspaceId(savedId, currentUid);
    setSelectedWorkspaceIdState(savedId);
    resetEditor();
    setIsModalOpen(false);
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Settings</div>
          <h1 className="h1">ワークスペース</h1>
          <div className="small">メンバー・サイト・権限設定をまとめて管理する単位です。まずは一覧から確認し、必要なときだけ登録・編集します。</div>
          <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
            現在のワークスペース: <b>{selectedWorkspaceName || '（未選択）'}</b>
            {selectedWorkspaceId ? (
              <Fragment>
                {' '}<span style={{ opacity: 0.62 }}> / ID: <code>{selectedWorkspaceId}</code></span>
              </Fragment>
            ) : null}
          </div>
        </div>

        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={openCreateModal}>
            新規ワークスペース
          </button>
        </div>
      </div>

      <div className="card">
        <div className="list-toolbar">
          <div className="list-toolbar__filters">
            <div className="small" style={{ opacity: 0.74 }}>
              名前を中心に一覧化しています。詳細設定は編集時に確認します。
            </div>
          </div>
          <div className="list-toolbar__actions">
            <button className="btn" onClick={openCreateModal}>作成</button>
          </div>
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
              const isSelected = selectedWorkspaceId === r.id;
              return (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.data.name || '名称未設定'}</div>
                      {(r.data.tagline || r.data.description) ? (
                        <div className="small" style={{ marginTop: 4, opacity: 0.76 }}>
                          {r.data.tagline || r.data.description}
                        </div>
                      ) : null}
                      <div className="small" style={{ marginTop: 4, opacity: 0.72, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            display: 'inline-block',
                            background: String(r.data.theme?.accent || r.data.accentColor || '#2563eb'),
                            border: '1px solid rgba(15,23,42,.12)',
                          }}
                        />
                        accent: <code>{String(r.data.theme?.accent || r.data.accentColor || '#2563eb')}</code>
                      </div>
                      <div className="small" style={{ opacity: 0.72 }}>
                        ID: <code>{r.id}</code>
                      </div>
                      {isSelected ? (
                        <div className="small" style={{ marginTop: 6 }}>
                          <span className="badge">選択中</span>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="small" style={{ display: 'grid', gap: 4 }}>
                        <div>ログ率: <b>{Number(r.data.defaults?.log_sample_rate ?? 1)}</b></div>
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
                        className={"btn " + (isSelected ? 'btn--primary' : '')}
                        onClick={() => {
                          setSelectedWorkspaceId(r.id, currentUid);
                          setSelectedWorkspaceIdState(r.id);
                        }}
                      >
                        選択
                      </button>
                      <span style={{ width: 8, display: 'inline-block' }} />
                      <button className="btn" onClick={() => openEditModal(r)}>
                        編集
                      </button>
                      <span style={{ width: 8, display: 'inline-block' }} />
                      <button className="btn btn--danger" onClick={() => {
                        if (!window.confirm(`ワークスペース「${r.data?.name || r.id}」を削除しますか？\nメンバー・サイト情報は残ります。`)) return;
                        deleteDoc(doc(db, 'workspaces', r.id));
                      }}>
                        削除
                      </button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 50,
          }}
          onClick={() => {
            setIsModalOpen(false);
            setError('');
          }}
        >
          <div
            className="card"
            style={{ width: 'min(980px, 100%)', maxHeight: '88vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 10 }}>
              <div className="page-header__meta">
                <h2 className="h1" style={{ fontSize: 22 }}>{rows.some((r) => r.id === id) ? 'ワークスペースを編集' : 'ワークスペースを作成'}</h2>
                <div className="small">新規登録・編集はモーダルで行います。内部IDや詳細設定は必要な時だけ確認してください。</div>
              </div>
              <div className="page-header__actions">
                <button className="btn" onClick={() => { setIsModalOpen(false); setError(''); }}>閉じる</button>
              </div>
            </div>

            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">ワークスペース名</div>
                <input className="input" placeholder="例: RUHAKU 管理用ワークスペース" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
                  メンバーに見せる名前です。ブランド名や運用目的がすぐ分かる名前がおすすめです。
                </div>
                <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
                  ワークスペースID: <code>{id}</code>
                </div>

                  <div style={{ height: 14 }} />
                  <div className="h2">ロゴ</div>
                  <input
                    className="input"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <div className="row" style={{ marginTop: 10, gap: 8 }}>
                    <button className="btn" type="button" onClick={() => setIsLogoPickerOpen(true)}>
                      メディアから選ぶ
                    </button>
                    <button className="btn" type="button" onClick={() => setLogoUrl('')}>
                      クリア
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      border: isLogoDragOver ? '2px dashed rgba(37,99,235,.55)' : '1px dashed rgba(15,23,42,.18)',
                      borderRadius: 14,
                      padding: 12,
                      background: isLogoDragOver ? 'rgba(37,99,235,.06)' : 'rgba(15,23,42,.02)',
                      transition: 'border-color .15s ease, background .15s ease',
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (logoUploading) return;
                      setIsLogoDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (logoUploading) return;
                      if (!isLogoDragOver) setIsLogoDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const next = e.relatedTarget as Node | null;
                      if (next && e.currentTarget.contains(next)) return;
                      setIsLogoDragOver(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer?.files?.[0];
                      if (!file) {
                        setIsLogoDragOver(false);
                        return;
                      }
                      await uploadWorkspaceLogo(file);
                    }}
                  >
                    <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={logoUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await uploadWorkspaceLogo(file);
                          e.currentTarget.value = '';
                        }}
                      />
                      {logoUploading ? <div className="small">アップロード中...</div> : null}
                    </div>
                    <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
                      ファイル選択またはここへ画像をドラッグ＆ドロップできます。
                    </div>
                  </div>

                  {logoUrl ? (
                    <div style={{ marginTop: 10 }}>
                      <div className="small" style={{ marginBottom: 6, opacity: 0.72 }}>プレビュー</div>
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 14,
                          overflow: 'hidden',
                          border: '1px solid rgba(15,23,42,.12)',
                          background: '#fff',
                        }}
                      >
                        <img src={logoUrl} alt={name || 'workspace logo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  ) : null}

                  <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
                    左メニューのワークスペースロゴ表示に使います。URL入力・メディア選択・ドラッグ＆ドロップに対応しています。
                  </div>




                <div style={{ height: 14 }} />
                <div className="h2">タグライン</div>
                <input
                  className="input"
                  placeholder="例: AI接客・運用改善プラットフォーム"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />

                <div style={{ height: 14 }} />
                <div className="h2">アクセントカラー</div>
                <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    style={{ width: 56, height: 40, padding: 0, border: '1px solid rgba(15,23,42,.12)', borderRadius: 10, background: '#fff' }}
                  />
                  <input
                    className="input"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#2563eb"
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
                  左端のワークスペースレールと全体の配色トーンに使います。Slack風の切り替え感を出すための色です。
                </div>

                <div style={{ height: 14 }} />
                <div className="h2">説明文</div>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="ワークスペースの用途やブランド説明を入力"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
                  左メニューや各種UIで表示する説明文です。短めでもOKです。
                </div>

                <div style={{ height: 12 }} />
                <div className="small" style={{ opacity: 0.72 }}>
                  URL / ドメイン設定はこの画面では扱いません。必要な設定はサイト側で管理します。
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">ログ取得サンプル率</div>
                <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>アクセスのうち何割をログに記録するか（1 = 全件、0.1 = 10%のみ）。トラフィックが多いサイトでは下げるとコスト削減になります。</div>
                <input className="input" type="number" min="0" max="1" step="0.1" value={logSampleRate} onChange={(e) => setLogSampleRate(Number(e.target.value))} />
                <div style={{ height: 14 }} />

                <div className="h2">ロールごとの表示権限</div>
                <div className="small" style={{ marginBottom: 8 }}>
                  オーナー / 管理者 / メンバー / 閲覧者のそれぞれが、どの画面を見られるかをここで決めます。
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8 }}>
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
                <div className="page-header__actions">
                  <button className="btn" onClick={() => { setIsModalOpen(false); setError(''); }}>
                    キャンセル
                  </button>
                  <button className="btn btn--primary" onClick={createOrUpdate}>
                    {rows.some((r) => r.id === id) ? 'ワークスペースを更新' : 'ワークスペースを作成'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isLogoPickerOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 60,
          }}
          onClick={() => setIsLogoPickerOpen(false)}
        >
          <div
            className="card"
            style={{ width: 'min(920px, 100%)', maxHeight: '86vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 10 }}>
              <div className="page-header__meta">
                <h2 className="h1" style={{ fontSize: 22 }}>メディアからロゴを選択</h2>
                <div className="small">このワークスペースに登録されている画像からロゴを選べます。</div>
              </div>
              <div className="page-header__actions">
                <button className="btn" onClick={() => setIsLogoPickerOpen(false)}>閉じる</button>
              </div>
            </div>

            <input
              className="input"
              placeholder="画像名で検索"
              value={logoSearch}
              onChange={(e) => setLogoSearch(e.target.value)}
            />

            <div style={{ height: 12 }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 12,
              }}
            >
              {filteredLogoMedia.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="card"
                  style={{ textAlign: 'left', padding: 10, cursor: 'pointer' }}
                  onClick={() => applyLogoFromMedia(row)}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'rgba(15,23,42,.04)',
                      border: '1px solid rgba(15,23,42,.08)',
                      marginBottom: 8,
                    }}
                  >
                    {row.data.downloadURL ? (
                      <img src={row.data.downloadURL} alt={row.data.originalName || row.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-all' }}>
                    {row.data.originalName || '名称未設定'}
                  </div>
                  <div className="small" style={{ marginTop: 4, opacity: 0.72 }}>
                    <code>{row.id}</code>
                  </div>
                </button>
              ))}
            </div>

            {!filteredLogoMedia.length ? (
              <div className="small" style={{ marginTop: 14, opacity: 0.72 }}>
                選択できる画像がありません。先にメディアを登録するか、ロゴ画像をドラッグ＆ドロップしてください。
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
