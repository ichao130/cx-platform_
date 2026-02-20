import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { genId } from '../components/id';
import { TextAreaList, parseLines } from '../components/forms';

type WorkspaceRow = { id: string; data: any };

type Site = {
  workspaceId: string;
  domains: string[];
  publicKey?: string;
  defaults?: any;
};

export default function SitesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: Site }>>([]);

  useEffect(() => {
    const q = query(collection(db, 'workspaces'), orderBy('__name__'));
    return onSnapshot(q, (snap) => {
      setWorkspaces(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('__name__'));
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as Site })));
    });
  }, []);

  const [id, setId] = useState(() => genId('site'));
  const [workspaceId, setWorkspaceId] = useState('');
  const [domainsText, setDomainsText] = useState('https://nurihiro.website');
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    if (!workspaceId && workspaces.length) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);

  const parsedDomains = useMemo(() => parseLines(domainsText), [domainsText]);

  async function createOrUpdate() {
    if (!workspaceId) throw new Error('workspaceId required');
    const payload: Site = {
      workspaceId,
      domains: parsedDomains,
      publicKey: publicKey.trim() || undefined,
    };
    await setDoc(doc(db, 'sites', id.trim()), payload, { merge: true });
    setId(genId('site'));
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Sites</h1>
        <div className="small">サイト単位の設定。SDKはここで作った siteId を data-site-id に入れる</div>
        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">siteId</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />
            <div style={{ height: 10 }} />
            <div className="h2">workspaceId</div>
            <select className="input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.id}</option>
              ))}
            </select>
            <div style={{ height: 12 }} />
            <TextAreaList
              label="domains"
              value={domainsText}
              onChange={setDomainsText}
              help="site単位でCORS/Origin allowを決める。空なら workspace.domains を使う"
            />
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">publicKey（任意）</div>
            <input className="input" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="空でOK" />
            <div className="small">設定すると /v1/serve に X-Site-Key が必須になる（より安全）</div>
            <div style={{ height: 14 }} />
            <button className="btn btn--primary" onClick={createOrUpdate}>保存</button>

            <div style={{ height: 14 }} />
            <div className="card" style={{ background: 'rgba(255,255,255,.03)' }}>
              <div className="h2">埋め込みタグ（例）</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`<script
  src="https://YOUR_HOSTING_DOMAIN/sdk.js"
  data-site-id="${id}"
  data-api-base="https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/api/v1/serve"
></script>`}</pre>
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
              <th>workspaceId</th>
              <th>domains</th>
              <th>publicKey</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td><code>{r.data.workspaceId}</code></td>
                <td>{(r.data.domains || []).join('\n')}</td>
                <td>{r.data.publicKey ? 'set' : ''}</td>
                <td>
                  <button className="btn" onClick={() => {
                    setId(r.id);
                    setWorkspaceId(r.data.workspaceId);
                    setDomainsText((r.data.domains || []).join('\n'));
                    setPublicKey(r.data.publicKey || '');
                  }}>編集</button>
                  <span style={{ width: 8, display: 'inline-block' }} />
                  <button className="btn btn--danger" onClick={() => deleteDoc(doc(db, 'sites', r.id))}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
