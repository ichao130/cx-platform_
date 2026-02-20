import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { genId } from '../components/id';
import { uploadImageToWorkspace } from '../lib/storage';

type ActionDoc = {
  workspaceId: string;
  type: 'modal' | 'banner' | 'toast';
  selector?: string;
  templateId?: string;
  creative: {
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    cta_url_text?: string;
    image_url?: string;
  };
};

type TemplateRow = { id: string; data: { workspaceId: string; type: 'modal' | 'banner' | 'toast'; name: string } };

export default function ActionsPage() {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: ActionDoc }>>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'workspaces'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setWorkspaces(snap.docs.map((d) => ({ id: d.id }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'actions'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as ActionDoc }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'templates'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setTemplates(snap.docs.map((d) => ({ id: d.id, data: d.data() as any }))));
  }, []);

  const [id, setId] = useState(() => genId('act'));
  const [workspaceId, setWorkspaceId] = useState('');
  const [type, setType] = useState<ActionDoc['type']>('modal');
  const [selector, setSelector] = useState('body');
  const [templateId, setTemplateId] = useState<string>('');
  const [title, setTitle] = useState('テスト表示');
  const [body, setBody] = useState('これが出れば成功🔥');
  const [ctaText, setCtaText] = useState('OK');
  const [ctaUrl, setCtaUrl] = useState('');
  const [ctaUrlText, setCtaUrlText] = useState('詳細を見る');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string>("");

  useEffect(() => {
    if (!workspaceId && workspaces.length) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);

  const payload: ActionDoc = useMemo(() => ({
    workspaceId,
    type,
    selector: selector.trim() || 'body',
    templateId: templateId.trim() || undefined,
    creative: {
      title,
      body,
      cta_text: ctaText,
      cta_url: ctaUrl,
      cta_url_text: ctaUrlText,
      image_url: imageUrl
    }
  }), [workspaceId, type, selector, templateId, title, body, ctaText, ctaUrl, ctaUrlText, imageUrl]);

  async function createOrUpdate() {
    if (!workspaceId) throw new Error('workspaceId required');
    await setDoc(doc(db, 'actions', id.trim()), payload, { merge: true });
    setId(genId('act'));
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Actions</h1>
        <div className="small">UIパーツ（モーダル等）の“部品”を作る。Scenario はここで作った Action を選んで並べる</div>
        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">actionId</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />
            <div style={{ height: 10 }} />

            <div className="h2">workspaceId</div>
            <select className="input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
            </select>
            <div style={{ height: 10 }} />

            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="h2">type</div>
                <select className="input" value={type} onChange={(e) => {
                  const t = e.target.value as any;
                  setType(t);
                  // reset template selection when type changes
                  setTemplateId('');
                }}>
                  <option value="modal">modal</option>
                  <option value="banner">banner</option>
                  <option value="toast">toast</option>
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <div className="h2">selector</div>
                <input className="input" value={selector} onChange={(e) => setSelector(e.target.value)} />
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="h2">templateId（任意）</div>
            <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">(default / built-in)</option>
              {templates
                .filter((t) => t.data.workspaceId === workspaceId && t.data.type === type)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.id} — {t.data.name || ''}</option>
                ))}
            </select>
            <div className="small">Templates で作ったHTML/CSSを使いたいときに選択。</div>

            <div style={{ height: 10 }} />
            <div className="h2">title</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div style={{ height: 10 }} />

            <div className="h2">body</div>
            <textarea className="input" value={body} onChange={(e) => setBody(e.target.value)} />
            <div style={{ height: 10 }} />

            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="h2">cta_text</div>
                <input className="input" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
              </div>
              <div style={{ flex: 2 }}>
                <div className="h2">cta_url</div>
                <input className="input" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://... (任意)" />
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="h2">cta_url_text（任意）</div>
            <input className="input" value={ctaUrlText} onChange={(e) => setCtaUrlText(e.target.value)} placeholder="詳細を見る" />

            <div style={{ height: 10 }} />
            <div className="h2">image_url（任意）</div>
            <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            <div className="small">画像URL直入力 or 下のアップロードで自動入力。</div>

            <div style={{ height: 10 }} />

            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <input
                type="file"
                accept="image/*"
                disabled={!workspaceId || uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!workspaceId) return;

                  setUploadErr("");
                  setUploading(true);
                  try {
                    // siteId で分けたいなら、ここに siteId を渡す（なければ undefined でOK）
                    const result = await uploadImageToWorkspace({
                      workspaceId,
                      file,
                      // siteId: "site_xxx" ← Actions単体だと未選択なので、後でUI追加が理想
                    });

                    setImageUrl(result.downloadURL);
                  } catch (err: any) {
                    setUploadErr(err?.message || String(err));
                  } finally {
                    setUploading(false);
                    // 同じファイルをもう一回選べるようにする
                    e.currentTarget.value = "";
                  }
                }}
              />

              {uploading && <div className="small">Uploading...</div>}
            </div>

            {uploadErr && <div className="small" style={{ color: "#ff6b6b" }}>{uploadErr}</div>}

            {imageUrl?.trim() && (
              <div style={{ marginTop: 10 }}>
                <div className="small">Preview</div>
                <img
                  src={imageUrl}
                  alt="preview"
                  style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}

            <div style={{ height: 10 }} />
            <div className="h2">画像アップロード</div>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const result = await uploadImageToWorkspace({
                  workspaceId,
                  siteId: undefined,
                  file,
                });
                setImageUrl(result.downloadURL);
              }}
            />
            <div className="small">いったん workspace 配下に保存（site別に分けたい場合は後で siteId を渡す形にする）。</div>

            <div style={{ height: 14 }} />
            <button className="btn btn--primary" onClick={createOrUpdate}>保存</button>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">プレビュー（JSON）</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(payload, null, 2)}</pre>
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
              <th>type</th>
              <th>title</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td><code>{r.data.workspaceId}</code></td>
                <td>{r.data.type}</td>
                <td>{r.data.creative?.title}</td>
                <td>
                  <button className="btn" onClick={() => {
                    setId(r.id);
                    setWorkspaceId(r.data.workspaceId);
                    setType(r.data.type);
                    setSelector(r.data.selector || 'body');
                    setTemplateId(r.data.templateId || '');
                    setTitle(r.data.creative?.title || '');
                    setBody(r.data.creative?.body || '');
                    setCtaText(r.data.creative?.cta_text || 'OK');
                    setCtaUrl(r.data.creative?.cta_url || '');
                    setCtaUrlText((r.data.creative as any)?.cta_url_text || '詳細を見る');
                    setImageUrl(r.data.creative?.image_url || '');
                  }}>編集</button>
                  <span style={{ width: 8, display: 'inline-block' }} />
                  <button className="btn btn--danger" onClick={() => deleteDoc(doc(db, 'actions', r.id))}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
