import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { genId } from '../components/id';
import { TextAreaList, parseLines } from '../components/forms';

type Workspace = {
  domains: string[];
  defaults?: {
    ai?: { decision?: boolean; discovery?: 'suggest' | 'off'; copy?: 'approve' | 'auto' };
    log_sample_rate?: number;
  };
};

export default function WorkspacesPage() {
  const [rows, setRows] = useState<Array<{ id: string; data: Workspace }>>([]);

  useEffect(() => {
    const q = query(collection(db, 'workspaces'), orderBy('__name__'));
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as Workspace })));
    });
  }, []);

  const [id, setId] = useState(() => genId('ws'));
  const [domainsText, setDomainsText] = useState('https://nurihiro.website');
  const [decision, setDecision] = useState(false);
  const [discovery, setDiscovery] = useState<'suggest' | 'off'>('suggest');
  const [copyMode, setCopyMode] = useState<'approve' | 'auto'>('approve');
  const [logSampleRate, setLogSampleRate] = useState(1);

  const parsedDomains = useMemo(() => parseLines(domainsText), [domainsText]);

  async function createOrUpdate() {
    const docRef = doc(db, 'workspaces', id.trim());
    const payload: Workspace = {
      domains: parsedDomains,
      defaults: {
        ai: { decision, discovery, copy: copyMode },
        log_sample_rate: Number(logSampleRate)
      }
    };
    await setDoc(docRef, payload, { merge: true });
    setId(genId('ws'));
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Workspaces</h1>
        <div className="small">許可ドメインとデフォルト設定のまとまり（複数サイトを束ねる単位）</div>
        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">workspaceId</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />
            <div style={{ height: 12 }} />
            <TextAreaList
              label="domains"
              value={domainsText}
              onChange={setDomainsText}
              help="1行=1ドメイン（必ず https:// を付ける）"
            />
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">defaults</div>
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
            <div className="h2">log_sample_rate</div>
            <input className="input" type="number" step="0.1" value={logSampleRate} onChange={(e) => setLogSampleRate(Number(e.target.value))} />
            <div style={{ height: 14 }} />
            <button className="btn btn--primary" onClick={createOrUpdate}>保存</button>
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
              <th>domains</th>
              <th>defaults</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td>{(r.data.domains || []).join('\n')}</td>
                <td><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.data.defaults || {}, null, 2)}</pre></td>
                <td>
                  <button className="btn" onClick={() => {
                    setId(r.id);
                    setDomainsText((r.data.domains || []).join('\n'));
                    setDecision(!!r.data.defaults?.ai?.decision);
                    setDiscovery((r.data.defaults?.ai?.discovery as any) || 'suggest');
                    setCopyMode((r.data.defaults?.ai?.copy as any) || 'approve');
                    setLogSampleRate(Number(r.data.defaults?.log_sample_rate ?? 1));
                  }}>編集</button>
                  <span style={{ width: 8, display: 'inline-block' }} />
                  <button className="btn btn--danger" onClick={() => deleteDoc(doc(db, 'workspaces', r.id))}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
