import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { genId } from '../components/id';
import { TextAreaList, parseLines } from '../components/forms';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api";

type WorkspaceRow = { id: string; data: any };

type Site = {
  name?: string;
  workspaceId: string;
  domains: string[];
  publicKey?: string;
  defaults?: any;
};

function workspaceLabel(workspaces: WorkspaceRow[], workspaceId: string) {
  const row = workspaces.find((w) => w.id === workspaceId);
  return row?.data?.name || workspaceId;
}

function summarizeDomains(domains: string[]) {
  if (!domains?.length) return { first: '', extra: 0 };
  return {
    first: domains[0],
    extra: Math.max(0, domains.length - 1),
  };
}

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
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

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || '';
      setCurrentUid(uid);
      setWorkspaceId('');
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
    if (!currentUid || !workspaceId) return;
    try {
      localStorage.setItem(workspaceKeyForUid(currentUid), workspaceId);
    } catch {}
  }, [currentUid, workspaceId]);

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

    // If workspaceId is empty OR no longer exists, fall back to first.
    const exists = workspaceId && workspaces.some((w) => w.id === workspaceId);
    if (!exists) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);

  useEffect(() => {
    // Sites are scoped by workspace in the admin UI.
    // (Backend also checks workspace role, but UI should not list other workspaces' data.)
    if (!workspaceId) {
      setRows([]);
      return;
    }

    const q = query(
      collection(db, 'sites'),
      where('workspaceId', '==', workspaceId),
      orderBy('__name__')
    );

    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as Site })));
    });
  }, [workspaceId]);

  const parsedDomains = useMemo(() => parseLines(domainsText), [domainsText]);
  const selectedWorkspaceName = useMemo(() => workspaceLabel(workspaces, workspaceId), [workspaces, workspaceId]);
  const embedTag = useMemo(() => {
    const safeSiteId = String(id || '').trim();
    const safePublicKey = String(publicKey || '').trim();
    return `<script\n  src="https://YOUR_HOSTING_DOMAIN/sdk.js"\n  data-site-id="${safeSiteId}"\n  data-site-key="${safePublicKey}"\n  data-api-base="https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/api/v1/serve"\n  defer\n></script>`;
  }, [id, publicKey]);

  async function copyEmbedTag() {
    try {
      await navigator.clipboard.writeText(embedTag);
      setCopyMessage('埋め込みタグをコピーしました。');
      setTimeout(() => setCopyMessage(''), 1800);
    } catch (e) {
      console.error(e);
      setCopyMessage('コピーに失敗しました。');
      setTimeout(() => setCopyMessage(''), 1800);
    }
  }

  async function createOrUpdate() {
    const safeId = String(id || '').trim();
    const safeName = String(name || '').trim();
    const safeWorkspaceId = String(workspaceId || '').trim();
    const safePublicKey = String(publicKey || '').trim();
    const safeDomains = parsedDomains.filter(Boolean);

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
      setError('公開キーを入力してください。');
      return;
    }

    setError('');

    const isEditing = rows.some((r) => r.id === safeId);

    try {
      if (isEditing) {
        // Update: user is a member, Firestore rules allow this
        await setDoc(doc(db, 'sites', safeId), {
          name: safeName,
          domains: safeDomains,
          publicKey: safePublicKey,
        }, { merge: true });
      } else {
        // Create: use API endpoint (admin SDK, bypasses Firestore rules)
        const u = getAuth().currentUser;
        if (!u) throw new Error("Not signed in");
        const token = await u.getIdToken(false);
        const res = await fetch(`${API_BASE}/v1/sites/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workspace_id: safeWorkspaceId,
            name: safeName,
            public_key: safePublicKey,
            domains: safeDomains,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.message || json.error || "作成に失敗しました");
      }

      setId(genId('site'));
      setName('');
      setDomainsText('https://nurihiro.website');
      setPublicKey('');
    } catch (e: any) {
      setError(e?.message || '保存に失敗しました。');
    }
  }

  async function handleDelete(siteId: string) {
    try {
      const u = getAuth().currentUser;
      if (!u) throw new Error("Not signed in");
      const token = await u.getIdToken(false);
      const res = await fetch(`${API_BASE}/v1/sites/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ site_id: siteId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || json.error || "削除に失敗しました");
    } catch (e: any) {
      setError(e?.message || '削除に失敗しました。');
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">サイト</h1>
        <div className="small">実際に運用するブランド・店舗・LPなどの単位です。まずは名前で見分けられるように整理します。</div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <span className="badge" style={{ width: 'fit-content' }}>
            現在のワークスペース:
            <b style={{ marginLeft: 6 }}>{selectedWorkspaceName || '（未選択）'}</b>
          </span>
          {workspaceId ? (
            <div className="small" style={{ opacity: 0.7 }}>
              workspace ID: <code>{workspaceId}</code>
            </div>
          ) : null}
        </div>
        <div style={{ height: 18 }} />

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">サイト名</div>
            <input className="input" placeholder="例: RUHAKU 本店 / RUHAKU LP 春キャンペーン" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
              実際に運用担当者が見て分かる名前を付けてください。
            </div>
            <div style={{ height: 14 }} />
            <div className="h2">ワークスペース</div>
            <select className="input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
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
            <div className="h2">サイトID</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />
            <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
              システム内部で使う識別子です。通常運用では名前を見れば十分です。
            </div>
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
            <input className="input" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="英数字で入力してください" />
            <div className="small">設定すると /v1/serve で X-Site-Key が必須になり、より安全に運用できます。</div>
            <div style={{ height: 14 }} />
            {error ? (
              <div className="small" style={{ color: 'salmon', marginBottom: 8 }}>
                {error}
              </div>
            ) : null}
            <button className="btn btn--primary" onClick={createOrUpdate}>
              {rows.some((r) => r.id === id) ? 'サイトを更新' : 'サイトを作成'}
            </button>

            <div style={{ height: 14 }} />
            <div className="card" style={{ background: 'rgba(255,255,255,.03)' }}>
              <div className="h2">埋め込みタグ</div>
              <div className="small" style={{ marginBottom: 8, opacity: 0.72 }}>
                このタグをサイトに貼り付けて SDK を読み込みます。公開キーも含めてコピーできます。
              </div>
              <textarea className="input" readOnly value={embedTag} style={{ minHeight: 140 }} />
              <div style={{ height: 8 }} />
              <button className="btn" onClick={copyEmbedTag}>埋め込みタグをコピー</button>
              {copyMessage ? (
                <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>{copyMessage}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="h2">サイト一覧</div>
        <div className="small" style={{ marginBottom: 10, opacity: 0.72 }}>
          名前を中心に一覧化しています。ID や公開キーは必要な時だけ確認できるようにしています。
        </div>
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
                <tr key={r.id}>
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
                    <button className="btn" onClick={() => {
                      setId(r.id);
                      setName(r.data.name || '');
                      setWorkspaceId(r.data.workspaceId);
                      setDomainsText((r.data.domains || []).join('\n'));
                      setPublicKey(r.data.publicKey || '');
                    }}>
                      編集
                    </button>
                    <span style={{ width: 8, display: 'inline-block' }} />
                    <button className="btn btn--danger" onClick={() => handleDelete(r.id)}>
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
