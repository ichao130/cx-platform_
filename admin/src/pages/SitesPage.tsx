import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, apiPostJson } from '../firebase';
import { genId } from '../components/id';

function genPublicKey() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PK${date}-${rand}`;
}
import { TextAreaList, parseLines } from '../components/forms';

type WorkspaceRow = { id: string; data: any };

type Site = {
  name?: string;
  workspaceId: string;
  domains?: string[];
  publicKey?: string;
  memberUids?: string[];
};

type WorkspaceMember = { uid: string; role: string; email: string; displayName: string };

function AddMemberSelect({
  siteId,
  currentMemberUids,
  workspaceMembers,
  onAdd,
  loading,
}: {
  siteId: string;
  currentMemberUids: string[];
  workspaceMembers: WorkspaceMember[];
  onAdd: (siteId: string, uid: string) => void;
  loading: string | null;
}) {
  const [selectedUid, setSelectedUid] = useState('');
  const available = workspaceMembers.filter((m) => !currentMemberUids.includes(m.uid));
  if (!available.length) {
    return <div className="small" style={{ opacity: 0.6 }}>追加できるメンバーはいません</div>;
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        className="input"
        style={{ minWidth: 200 }}
        value={selectedUid}
        onChange={(e) => setSelectedUid(e.target.value)}
      >
        <option value="">メンバーを選択...</option>
        {available.map((m) => (
          <option key={m.uid} value={m.uid}>
            {m.displayName || m.email || m.uid} ({m.role})
          </option>
        ))}
      </select>
      <button
        className="btn btn--primary"
        disabled={!selectedUid || loading === `${siteId}:${selectedUid}`}
        onClick={() => { onAdd(siteId, selectedUid); setSelectedUid(''); }}
      >
        追加
      </button>
    </div>
  );
}

function workspaceLabel(workspaces: WorkspaceRow[], workspaceId: string) {
  const row = workspaces.find((w) => w.id === workspaceId);
  return row?.data?.name || workspaceId;
}

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return '';
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || '';
  } catch {
    return '';
  }
}

function writeSelectedWorkspaceId(workspaceId: string, uid?: string) {
  if (!uid) return;
  try {
    localStorage.setItem(workspaceKeyForUid(uid), workspaceId);
    window.dispatchEvent(new CustomEvent('cx_admin_workspace_changed', { detail: { workspaceId } }));
  } catch {
    // ignore
  }
}

function summarizeDomains(domains: string[]) {
  const list = Array.isArray(domains) ? domains.filter(Boolean) : [];
  return {
    first: list[0] || '',
    extra: Math.max(0, list.length - 1),
  };
}

export default function SitesPage() {
  const [id, setId] = useState(() => genId('site'));
  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [domainsText, setDomainsText] = useState('https://nurihiro.website');
  const [publicKey, setPublicKey] = useState('');

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: Site }>>([]);
  const [error, setError] = useState('');
  const [currentUid, setCurrentUid] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tagMode, setTagMode] = useState<'direct' | 'gtm' | 'shopify'>('direct');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [memberOpLoading, setMemberOpLoading] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const migratedWs = useRef<Set<string>>(new Set());

  // マイグレーション: workspaceId が変わったら1回だけ実行（冪等）
  const runMigration = useCallback(async (wsId: string, uid: string) => {
    if (!wsId || !uid || migratedWs.current.has(wsId)) return;
    migratedWs.current.add(wsId);
    try {
      await apiPostJson('/v1/sites/migrate-member-uids', { workspace_id: wsId });
    } catch (e) { /* fire-and-forget */ }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || '';
      setCurrentUid(uid);
      setWorkspaceId(readSelectedWorkspaceId(uid));
    });
  }, []);



  useEffect(() => {
    if (!currentUid) {
      setWorkspaceId('');
      return;
    }
    try {
      const saved = localStorage.getItem(workspaceKeyForUid(currentUid));
      setWorkspaceId(saved || '');
    } catch {
      setWorkspaceId('');
    }
  }, [currentUid]);


  useEffect(() => {
    if (!currentUid) return;

    const applySelectedWorkspace = () => {
      setWorkspaceId(readSelectedWorkspaceId(currentUid));
    };

    applySelectedWorkspace();

    const onWorkspaceChanged = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      if (typeof next === 'string') {
        setWorkspaceId(next);
        return;
      }
      applySelectedWorkspace();
    };

    const onStorageChanged = () => applySelectedWorkspace();

    window.addEventListener('cx_admin_workspace_changed', onWorkspaceChanged as EventListener);
    window.addEventListener('storage', onStorageChanged);

    return () => {
      window.removeEventListener('cx_admin_workspace_changed', onWorkspaceChanged as EventListener);
      window.removeEventListener('storage', onStorageChanged);
    };
  }, [currentUid]);


  useEffect(() => {
    if (!currentUid) {
      setWorkspaces([]);
      setRows([]);
      return;
    }

    const q = query(
      collection(db, 'workspaces'),
      where(`members.${currentUid}`, 'in', ['owner', 'admin', 'member', 'viewer'])
    );

    return onSnapshot(q, (snap) => {
      setWorkspaces(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
    });
  }, [currentUid]);

  useEffect(() => {
    if (!workspaces.length) return;
    const exists = !!workspaceId && workspaces.some((w) => w.id === workspaceId);
    if (!exists) {
      const nextWorkspaceId = workspaces[0]?.id || '';
      setWorkspaceId(nextWorkspaceId);
      if (nextWorkspaceId) writeSelectedWorkspaceId(nextWorkspaceId, currentUid);
    }
  }, [workspaces, workspaceId, currentUid]);

  // 現在のユーザーのワークスペースロール
  const currentRole = useMemo(() => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    return (ws?.data?.members?.[currentUid] as string) || '';
  }, [workspaces, workspaceId, currentUid]);

  useEffect(() => {
    if (!currentUid || !currentRole) { setRows([]); return; }
    if (workspaceId) runMigration(workspaceId, currentUid);

    const isAdmin = currentRole === 'owner' || currentRole === 'admin';

    // owner/admin: ワークスペース内の全サイトを取得
    // member/viewer: 自分が memberUids に含まれるサイトのみ
    const q = isAdmin && workspaceId
      ? query(collection(db, 'sites'), where('workspaceId', '==', workspaceId))
      : query(collection(db, 'sites'), where('memberUids', 'array-contains', currentUid));

    return onSnapshot(q, (snap) => {
      setRows(
        snap.docs
          .filter((d) => d.data().status !== 'deleted')
          .map((d) => ({ id: d.id, data: d.data() as Site }))
      );
    });
  }, [currentUid, workspaceId, currentRole, runMigration]);

  const selectedWorkspaceName = useMemo(() => workspaceLabel(workspaces, workspaceId), [workspaces, workspaceId]);

  // owner/admin のときワークスペースメンバー一覧を取得
  useEffect(() => {
    const isAdmin = currentRole === 'owner' || currentRole === 'admin';
    if (!workspaceId || !isAdmin) { setWorkspaceMembers([]); return; }
    apiPostJson<{ ok: boolean; items: WorkspaceMember[] }>(
      '/v1/workspaces/members/list',
      { workspace_id: workspaceId }
    )
      .then((res) => { if (res.ok) setWorkspaceMembers(res.items || []); })
      .catch(() => {});
  }, [workspaceId, currentRole]);

  const embedTag = useMemo(() => {
    const safeSiteId = String(id || '').trim();
    const safePublicKey = String(publicKey || '').trim();
    if (tagMode === 'gtm') {
      return `<script>\n(function() {\n  var s = document.createElement('script');\n  s.src = 'https://app.mokkeda.com/sdk.js';\n  s.setAttribute('data-site-id', '${safeSiteId}');\n  s.setAttribute('data-site-key', '${safePublicKey}');\n  document.head.appendChild(s);\n})();\n</script>`;
    }
    if (tagMode === 'shopify') {
      return `{% comment %}Mokkeda{% endcomment %}\n<script\n  src="https://app.mokkeda.com/sdk.js"\n  data-site-id="${safeSiteId}"\n  data-site-key="${safePublicKey}"\n  defer\n></script>`;
    }
    return `<script\n  src="https://app.mokkeda.com/sdk.js"\n  data-site-id="${safeSiteId}"\n  data-site-key="${safePublicKey}"\n  defer\n></script>`;
  }, [id, publicKey, tagMode]);

  function resetEditor() {
    setId(genId('site'));
    setName('');
    setDomainsText('https://nurihiro.website');
    setPublicKey(genPublicKey());
    setError('');
    setCopyMessage('');
  }

  function openCreateModal() {
    resetEditor();
    if (!workspaceId && workspaces.length) {
      setWorkspaceId(workspaces[0].id);
    }
    setIsModalOpen(true);
  }

  function openEditModal(row: { id: string; data: Site }) {
    setId(row.id);
    setName(row.data.name || '');
    setWorkspaceId(row.data.workspaceId || '');
    writeSelectedWorkspaceId(row.data.workspaceId || '', currentUid);
    setDomainsText((row.data.domains || []).join('\n'));
    setPublicKey(row.data.publicKey || '');
    setError('');
    setCopyMessage('');
    setIsModalOpen(true);
  }

  async function copyEmbedTag() {
    try {
      await navigator.clipboard.writeText(embedTag);
      setCopyMessage('埋め込みタグをコピーしました');
      window.setTimeout(() => setCopyMessage(''), 2000);
    } catch {
      setCopyMessage('コピーに失敗しました');
      window.setTimeout(() => setCopyMessage(''), 2000);
    }
  }

  async function handleAddSiteMember(siteId: string, uid: string) {
    if (!uid) return;
    const key = `${siteId}:${uid}`;
    setMemberOpLoading(key);
    try {
      await apiPostJson('/v1/sites/members/add', { site_id: siteId, uid });
      // ローカルstateを即時更新（onSnapshotを待たずに反映）
      setRows((prev) => prev.map((r) =>
        r.id === siteId
          ? { ...r, data: { ...r.data, memberUids: Array.from(new Set([...(r.data.memberUids || []), uid])) } }
          : r
      ));
    } catch (e: any) {
      alert(e?.message || 'メンバーの追加に失敗しました');
    } finally {
      setMemberOpLoading(null);
    }
  }

  async function handleRemoveSiteMember(siteId: string, uid: string) {
    if (uid === currentUid) {
      alert('自分自身をサイトから削除することはできません');
      return;
    }
    const key = `${siteId}:${uid}`;
    setMemberOpLoading(key);
    try {
      const res = await apiPostJson<{ ok: boolean; not_member?: boolean }>('/v1/sites/members/remove', { site_id: siteId, uid });
      if (res.not_member) {
        console.warn('[remove] uid not found in memberUids:', uid, 'site:', siteId);
        // Firestoreの実データを強制リロード（onSnapshotが最新値を返す）
        return;
      }
      // ローカルstateを即時更新
      setRows((prev) => prev.map((r) =>
        r.id === siteId
          ? { ...r, data: { ...r.data, memberUids: (r.data.memberUids || []).filter((u) => u !== uid) } }
          : r
      ));
    } catch (e: any) {
      alert(e?.message || 'メンバーの削除に失敗しました');
    } finally {
      setMemberOpLoading(null);
    }
  }

  async function createOrUpdate() {
    const safeId = String(id || '').trim();
    const safeName = String(name || '').trim();
    const safeWorkspaceId = String(workspaceId || '').trim();
    const safePublicKey = String(publicKey || '').trim();
    const domains = parseLines(domainsText);

    if (!safeWorkspaceId) {
      setError('ワークスペースを選択してください。');
      return;
    }
    if (!safeId) {
      setError('siteId が必要です。');
      return;
    }
    if (!safeName) {
      setError('サイト名を入力してください。');
      return;
    }
    if (!safePublicKey) {
      setError('公開キーは必須です。');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      const isEditing = rows.some((r) => r.id === safeId);

      if (isEditing) {
        const j = await apiPostJson('/v1/sites/updateDomains', { site_id: safeId, domains });
        if (!j.ok) throw new Error(j.message || j.error || "更新に失敗しました");
      } else {
        const j = await apiPostJson('/v1/sites/create', {
          workspace_id: safeWorkspaceId,
          name: safeName,
          public_key: safePublicKey,
          domains,
        });
        if (!j.ok) throw new Error(j.message || j.error || "作成に失敗しました");
      }

      resetEditor();
      setIsModalOpen(false);
    } catch (e: any) {
      setError(e?.message || '保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="container liquid-page">
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Main</div>
          <h1 className="h1">サイト</h1>
          <div className="small">実際に運用するブランド・店舗・LPなどの単位です。まずは一覧から確認し、必要なときだけ登録・編集します。</div>
          <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
            現在のワークスペース: <b>{selectedWorkspaceName || '（未選択）'}</b>
            {workspaceId ? (
              <React.Fragment>
                {' '}<span style={{ opacity: 0.62 }}> / ID: <code>{workspaceId}</code></span>
              </React.Fragment>
            ) : null}
          </div>
        </div>

        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={openCreateModal}>
            新規サイト
          </button>
        </div>
      </div>

      <div className="card">
        <div className="list-toolbar">
          <div className="list-toolbar__filters">
            <div className="small" style={{ opacity: 0.74 }}>
              名前を中心に一覧化しています。埋め込みタグや公開キーは編集時に確認します。
            </div>
          </div>
          <div className="list-toolbar__actions">
            <div style={{ minWidth: 240 }}>
              <div className="h2">ワークスペース</div>
              <select
                className="input"
                value={workspaceId}
                onChange={(e) => {
                  const next = e.target.value;
                  setWorkspaceId(next);
                  writeSelectedWorkspaceId(next, currentUid);
                }}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.data?.name ? `${w.data.name} (${w.id})` : w.id}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" onClick={openCreateModal}>作成</button>
          </div>
        </div>

        <div className="liquid-scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>サイト</th>
                <th>ワークスペース</th>
                <th>対象ドメイン</th>
                <th>公開キー</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {rows.map((r) => {
              const domainSummary = summarizeDomains(r.data.domains || []);
              return (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.data.name || '名称未設定'}</div>
                      <div className="small" style={{ opacity: 0.72 }}>
                        ID: <code>{r.id}</code>
                      </div>
                    </td>
                    <td>
                      <div>{workspaceLabel(workspaces, r.data.workspaceId)}</div>
                      <div className="small" style={{ opacity: 0.72 }}>
                        <code>{r.data.workspaceId}</code>
                      </div>
                    </td>
                    <td>
                      {domainSummary.first ? (
                        <div>
                          <div>{domainSummary.first}</div>
                          {domainSummary.extra > 0 ? (
                            <div className="small" style={{ opacity: 0.72 }}>
                              他 {domainSummary.extra} 件
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="small" style={{ opacity: 0.72 }}>未設定</span>
                      )}
                    </td>
                    <td>
                      {r.data.publicKey ? (
                        <span className="small">設定済み</span>
                      ) : (
                        <span className="small" style={{ opacity: 0.72 }}>未設定</span>
                      )}
                    </td>
                    <td>
                      <button className="btn" onClick={() => openEditModal(r)}>
                        編集
                      </button>
                      <span style={{ width: 8, display: 'inline-block' }} />
                      {(currentRole === 'owner' || currentRole === 'admin') && (
                        <>
                          <button
                            className="btn"
                            onClick={() => setExpandedSiteId(expandedSiteId === r.id ? null : r.id)}
                          >
                            {expandedSiteId === r.id ? '閉じる' : 'メンバー'}
                          </button>
                          <span style={{ width: 8, display: 'inline-block' }} />
                        </>
                      )}
                      <button className="btn btn--danger" onClick={async () => {
                        if (!window.confirm(`サイト「${r.data?.name || r.id}」を削除しますか？`)) return;
                        try {
                          await apiPostJson('/v1/sites/delete', { site_id: r.id });
                        } catch (e) { console.error(e); }
                      }}>
                        削除
                      </button>
                    </td>
                  </tr>
                  {expandedSiteId === r.id && (currentRole === 'owner' || currentRole === 'admin') && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--panel2, rgba(0,0,0,.04))', padding: '12px 16px' }}>
                        <div className="h2" style={{ marginBottom: 8 }}>メンバー管理</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          {(r.data.memberUids || []).length === 0 && (
                            <div className="small" style={{ opacity: 0.6 }}>メンバーが設定されていません</div>
                          )}
                          {(r.data.memberUids || []).map((mUid) => {
                            const m = workspaceMembers.find((wm) => wm.uid === mUid);
                            const label = m?.displayName || m?.email || mUid;
                            const key = `${r.id}:${mUid}`;
                            return (
                              <span key={mUid} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,.08)', borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>
                                {label}
                                {mUid !== currentUid && (
                                  <button
                                    className="btn btn--danger"
                                    style={{ padding: '1px 6px', fontSize: 11 }}
                                    disabled={memberOpLoading === key}
                                    onClick={() => handleRemoveSiteMember(r.id, mUid)}
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                        <AddMemberSelect
                          siteId={r.id}
                          currentMemberUids={r.data.memberUids || []}
                          workspaceMembers={workspaceMembers}
                          onAdd={handleAddSiteMember}
                          loading={memberOpLoading}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            </tbody>
          </table>
        </div>
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
            setCopyMessage('');
          }}
        >
          <div
            className="card liquid-page"
            style={{ width: 'min(980px, 100%)', maxHeight: '88vh', overflow: 'auto', minWidth: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 10 }}>
              <div className="page-header__meta">
                <h2 className="h1" style={{ fontSize: 22 }}>{rows.some((r) => r.id === id) ? 'サイトを編集' : 'サイトを作成'}</h2>
                <div className="small">新規登録・編集はモーダルで行います。公開キーや埋め込みタグは必要な時だけ確認してください。</div>
              </div>
              <div className="page-header__actions">
                <button className="btn" onClick={() => { setIsModalOpen(false); setError(''); setCopyMessage(''); }}>閉じる</button>
              </div>
            </div>

            <div className="row liquid-page" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">サイト名</div>
                <input className="input" placeholder="例:サイト名" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
                  実際に運用担当者が見て分かる名前を付けてください。
                </div>
                <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
                  サイトID: <code>{id}</code>
                </div>
                <div style={{ height: 14 }} />
                <div className="h2">ワークスペース</div>
                  <select
                    className="input"
                    value={workspaceId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setWorkspaceId(next);
                      writeSelectedWorkspaceId(next, currentUid);
                    }}
                  >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.data?.name ? `${w.data.name} (${w.id})` : w.id}
                    </option>
                  ))}
                </select>
                <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
                  このサイトをどのワークスペースで管理するかを選びます。
                </div>
                <div style={{ height: 14 }} />
                <div style={{ height: 12 }} />
                <TextAreaList
                  label="対象ドメイン"
                  value={domainsText}
                  onChange={setDomainsText}
                  help="このサイトで許可するドメインを1行ずつ入力します。未入力の場合は workspace 側のドメイン設定を利用します。"
                />
              </div>

              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">公開キー</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }} value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="英数字で入力してください" readOnly={rows.some((r) => r.id === id)} />
                  {!rows.some((r) => r.id === id) && (
                    <button className="btn" style={{ flexShrink: 0 }} onClick={() => setPublicKey(genPublicKey())}>再生成</button>
                  )}
                </div>
                <div className="small">{rows.some((r) => r.id === id) ? '公開キーは変更できません（変更するとSDKの埋め込みタグの更新が必要になります）。' : 'SDKの埋め込みタグに使用します。自動生成されたものをそのまま使えます。'}</div>
                <div style={{ height: 14 }} />
                {error ? (
                  <div className="small" style={{ color: 'salmon', marginBottom: 8 }}>
                    {error}
                  </div>
                ) : null}
                <div className="page-header__actions" style={{ marginBottom: 14 }}>
                  <button className="btn" onClick={() => { setIsModalOpen(false); setError(''); setCopyMessage(''); }}>
                    キャンセル
                  </button>
                  <button className="btn btn--primary" onClick={createOrUpdate} disabled={isSaving}>
                    {isSaving ? '保存中...' : rows.some((r) => r.id === id) ? 'サイトを更新' : 'サイトを作成'}
                  </button>
                </div>

                <div className="card" style={{ background: 'var(--panel2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div className="h2" style={{ marginBottom: 6 }}>埋め込みタグ</div>
                      {/* タブ切り替え */}
                      <div style={{ display: 'flex', gap: 0, background: 'rgba(0,0,0,.15)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
                        {(['direct', 'gtm', 'shopify'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setTagMode(mode)}
                            style={{
                              padding: '4px 14px',
                              borderRadius: 6,
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                              background: tagMode === mode ? '#fff' : 'transparent',
                              color: tagMode === mode ? '#1e293b' : 'rgba(255,255,255,.6)',
                              boxShadow: tagMode === mode ? '0 1px 3px rgba(0,0,0,.15)' : 'none',
                              transition: 'all .15s',
                            }}
                          >
                            {mode === 'direct' ? '直接埋め込み' : mode === 'gtm' ? 'タグマネージャー' : '🛍️ Shopify'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn btn--primary"
                      onClick={copyEmbedTag}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {copyMessage === '埋め込みタグをコピーしました' ? (
                        <>✓ コピーしました</>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          コピー
                        </>
                      )}
                    </button>
                  </div>
                  {/* 説明文 */}
                  {tagMode === 'shopify' ? (
                    <div style={{ marginBottom: 12 }}>
                      <div className="small" style={{ opacity: 0.85, marginBottom: 8 }}>
                        Shopify管理画面 → <b>オンラインストア &gt; テーマ &gt; コードを編集</b> → <code>theme.liquid</code> を開き、<code>&lt;/head&gt;</code> の直前に貼り付けてください。
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        {[
                          { step: '1', label: 'Shopify管理画面 → オンラインストア → テーマ' },
                          { step: '2', label: '「コードを編集」→ Layout/theme.liquid を開く' },
                          { step: '3', label: '</head> の直前に下のコードを貼り付けて保存' },
                        ].map(({ step, label }) => (
                          <div key={step} className="small" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: 0.8 }}>
                            <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0, fontSize: 11 }}>{step}</span>
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="small" style={{ marginBottom: 8, opacity: 0.7 }}>
                      {tagMode === 'direct'
                        ? 'サイトの <head> 内に直接貼り付けてください'
                        : 'GTM の「カスタムHTML」タグとして貼り付けてください'}
                    </div>
                  )}
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    background: '#1a2a3a',
                    color: '#e2f0f5',
                    borderRadius: 10,
                    fontSize: 12,
                    lineHeight: 1.75,
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    userSelect: 'all',
                    cursor: 'text',
                    border: '1px solid rgba(255,255,255,.06)',
                  }}>
                    {tagMode === 'direct' ? (
                      <>
                        <span style={{ color: '#7ec8e3' }}>&lt;script</span>{'\n'}
                        {'  '}<span style={{ color: '#a8d8a8' }}>src</span><span style={{ color: '#e2f0f5' }}>="</span><span style={{ color: '#ffd580' }}>https://app.mokkeda.com/sdk.js</span><span style={{ color: '#e2f0f5' }}>"</span>{'\n'}
                        {'  '}<span style={{ color: '#a8d8a8' }}>data-site-id</span><span style={{ color: '#e2f0f5' }}>="</span><span style={{ color: '#ffd580' }}>{String(id || '').trim()}</span><span style={{ color: '#e2f0f5' }}>"</span>{'\n'}
                        {'  '}<span style={{ color: '#a8d8a8' }}>data-site-key</span><span style={{ color: '#e2f0f5' }}>="</span><span style={{ color: '#ffd580' }}>{String(publicKey || '').trim()}</span><span style={{ color: '#e2f0f5' }}>"</span>{'\n'}
                        {'  '}<span style={{ color: '#a8d8a8' }}>defer</span>{'\n'}
                        <span style={{ color: '#7ec8e3' }}>&gt;&lt;/script&gt;</span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#7ec8e3' }}>&lt;script&gt;</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'(function() {'}</span>{'\n'}
                        {'  '}<span style={{ color: '#94a3b8' }}>var s = </span><span style={{ color: '#a8d8a8' }}>document</span><span style={{ color: '#94a3b8' }}>.createElement(</span><span style={{ color: '#ffd580' }}>'script'</span><span style={{ color: '#94a3b8' }}>);</span>{'\n'}
                        {'  '}<span style={{ color: '#94a3b8' }}>s.src = </span><span style={{ color: '#ffd580' }}>'https://app.mokkeda.com/sdk.js'</span><span style={{ color: '#94a3b8' }}>;</span>{'\n'}
                        {'  '}<span style={{ color: '#94a3b8' }}>s.setAttribute(</span><span style={{ color: '#ffd580' }}>'data-site-id'</span><span style={{ color: '#94a3b8' }}>, </span><span style={{ color: '#ffd580' }}>'{String(id || '').trim()}'</span><span style={{ color: '#94a3b8' }}>);</span>{'\n'}
                        {'  '}<span style={{ color: '#94a3b8' }}>s.setAttribute(</span><span style={{ color: '#ffd580' }}>'data-site-key'</span><span style={{ color: '#94a3b8' }}>, </span><span style={{ color: '#ffd580' }}>'{String(publicKey || '').trim()}'</span><span style={{ color: '#94a3b8' }}>);</span>{'\n'}
                        {'  '}<span style={{ color: '#a8d8a8' }}>document</span><span style={{ color: '#94a3b8' }}>.head.appendChild(s);</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'})();'}</span>{'\n'}
                        <span style={{ color: '#7ec8e3' }}>&lt;/script&gt;</span>
                      </>
                    )}
                  </pre>
                  {copyMessage === 'コピーに失敗しました' && (
                    <div className="small" style={{ marginTop: 8, color: 'var(--danger)' }}>
                      クリップボードへのコピーに失敗しました。上のコードを直接選択してコピーしてください。
                    </div>
                  )}

                  {tagMode === 'shopify' && (
                    <div style={{ marginTop: 16 }}>
                      <div className="small" style={{ fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                        🛒 カートイベントフック（任意）
                      </div>
                      <div className="small" style={{ opacity: 0.7, marginBottom: 8 }}>
                        カートに商品が追加されたタイミングでシナリオを起動したい場合は、上のスクリプトの直後に追加してください。「これと一緒によく買われています」などのアップセル訴求に使えます。
                      </div>
                      <pre style={{
                        margin: 0,
                        padding: '14px',
                        background: '#1a2a3a',
                        color: '#e2f0f5',
                        borderRadius: 10,
                        fontSize: 12,
                        lineHeight: 1.75,
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                        userSelect: 'all',
                        cursor: 'text',
                        border: '1px solid rgba(255,255,255,.06)',
                      }}>
                        <span style={{ color: '#94a3b8' }}>{`/* Mokkeda: Shopify カートイベントフック */`}</span>{'\n'}
                        <span style={{ color: '#7ec8e3' }}>{'document'}</span><span style={{ color: '#94a3b8' }}>{'.'}</span><span style={{ color: '#a8d8a8' }}>{'addEventListener'}</span><span style={{ color: '#94a3b8' }}>{'('}</span><span style={{ color: '#ffd580' }}>{"'DOMContentLoaded'"}</span><span style={{ color: '#94a3b8' }}>{', function() {'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'  var _fetch = window.fetch;'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'  window.fetch = function(url, opts) {'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'    var res = _fetch.apply(this, arguments);'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'    if (typeof url === '}</span><span style={{ color: '#ffd580' }}>{"'string'"}</span><span style={{ color: '#94a3b8' }}>{' && url.indexOf('}</span><span style={{ color: '#ffd580' }}>{"'/cart/add'"}</span><span style={{ color: '#94a3b8' }}>{') > -1) {'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'      res.then(function(r) {'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'        if (r.ok) window.dispatchEvent(new CustomEvent('}</span><span style={{ color: '#ffd580' }}>{"'cx:cart:add'"}</span><span style={{ color: '#94a3b8' }}>{'));'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'      });'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'    }'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'    return res;'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'  };'}</span>{'\n'}
                        <span style={{ color: '#94a3b8' }}>{'});'}</span>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
