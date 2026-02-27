import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { genId } from "../components/id";

type SiteRow = { id: string; data: any };
type ActionRow = { id: string; data: any };

type ActionRef = {
  actionId: string;
  enabled?: boolean;
  order?: number;
  overrideCreative?: any;
};

type Goal =
  | { type: "path_prefix"; value: string }
  | { type: "path_exact"; value: string }
  | { type: "url_contains"; value: string };

type ExperimentVariant = {
  id: string;
  name?: string;
  weight?: number; // 0..100
  actionRefs?: ActionRef[];
};

type Experiment = {
  enabled: boolean;
  sticky: "vid" | "sid";
  variants: ExperimentVariant[];
};

type Scenario = {
  workspaceId: string;
  siteId: string;
  name: string;
  status: "active" | "paused";
  priority?: number;

  memo?: string;

  // conversion goal（Phase1）
  goal?: Goal | null;

  entry_rules?: any;

  // non-AB mode: scenario.actionRefs
  actionRefs?: ActionRef[];

  // AB mode: scenario.experiment.variants[*].actionRefs を使う（serverがそちらを優先）
  experiment?: Experiment;
};

const PAGE_TYPES = ["product", "blog_post", "other"] as const;
const GOAL_TYPES = ["path_prefix", "path_exact", "url_contains"] as const;

function stripUndefinedDeep<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedDeep) as any;
  }
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === undefined) continue; // ★ undefinedは捨てる
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return obj;
}


function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeActionRefs(refs: any): ActionRef[] {
  if (!Array.isArray(refs)) return [];
  return refs
    .filter(Boolean)
    .map((r, idx) => ({
      actionId: String(r.actionId || ""),
      enabled: r.enabled ?? true,
      order: Number(r.order ?? idx),
      overrideCreative: r.overrideCreative ?? undefined,
    }))
    .filter((r) => !!r.actionId);
}

function reorder(refs: ActionRef[]): ActionRef[] {
  return (refs || []).map((r, i) => ({ ...r, order: i }));
}

function newVariant(): ExperimentVariant {
  const id = genId("var");
  return {
    id,
    name: `Variant ${id}`,
    weight: 50,
    actionRefs: [],
  };
}

export default function ScenariosPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: Scenario }>>([]);

  useEffect(() => {
    const q = query(collection(db, "sites"), orderBy("__name__"));
    return onSnapshot(q, (snap) =>
      setSites(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "actions"), orderBy("__name__"));
    return onSnapshot(q, (snap) =>
      setActions(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "scenarios"), orderBy("__name__"));
    return onSnapshot(q, (snap) =>
      setRows(
        snap.docs.map((d) => ({ id: d.id, data: d.data() as Scenario }))
      )
    );
  }, []);

  // -------------------------
  // Form state
  // -------------------------
  const [id, setId] = useState(() => genId("scn"));
  const [siteId, setSiteId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("New scenario");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [priority, setPriority] = useState(0);
  const [memo, setMemo] = useState("");

  // entry rules
  const [pageTypeIn, setPageTypeIn] = useState<
    Array<(typeof PAGE_TYPES)[number]>
  >(["other"]);
  const [staySec, setStaySec] = useState(3);

  // non-AB actionRefs
  const [actionRefs, setActionRefs] = useState<ActionRef[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // goal
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalType, setGoalType] = useState<(typeof GOAL_TYPES)[number]>(
    "path_prefix"
  );
  const [goalValue, setGoalValue] = useState("/thanks");

  // experiment (A/B)
  const [expEnabled, setExpEnabled] = useState(false);
  const [expSticky, setExpSticky] = useState<"vid" | "sid">("vid");
  const [variants, setVariants] = useState<ExperimentVariant[]>([
    { id: "A", name: "A", weight: 50, actionRefs: [] },
    { id: "B", name: "B", weight: 50, actionRefs: [] },
  ]);

  // UI helpers
  const [actionIdToAdd, setActionIdToAdd] = useState("");
  const [variantIdToEdit, setVariantIdToEdit] = useState<string>("A");

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [sites, siteId]);

  useEffect(() => {
    const s = sites.find((x) => x.id === siteId);
    if (s?.data?.workspaceId) setWorkspaceId(s.data.workspaceId);
  }, [sites, siteId]);

  const actionsForWorkspace = useMemo(() => {
    return actions.filter((a) => a.data?.workspaceId === workspaceId);
  }, [actions, workspaceId]);

  useEffect(() => {
    if (!actionIdToAdd && actionsForWorkspace.length)
      setActionIdToAdd(actionsForWorkspace[0].id);
  }, [actionsForWorkspace, actionIdToAdd]);

  useEffect(() => {
    // variant選択の安全化
    if (!variants.length) return;
    const exists = variants.some((v) => v.id === variantIdToEdit);
    if (!exists) setVariantIdToEdit(variants[0].id);
  }, [variants, variantIdToEdit]);

  // entry rules (URL)
  const [urlEnabled, setUrlEnabled] = useState(false);
  const [urlMode, setUrlMode] = useState<"contains" | "equals" | "prefix" | "regex">("contains");
  const [urlValue, setUrlValue] = useState("/products/");
  const [urlTarget, setUrlTarget] = useState<"url" | "path">("path"); // 迷ったら path 推し

  const entry_rules = useMemo(
    () => ({
      page: {
        page_type_in: pageTypeIn,
        url: urlEnabled
          ? { mode: urlMode, value: String(urlValue || "").trim(), target: urlTarget }
          : undefined,
      },
      behavior: { stay_gte_sec: Number(staySec) },
      trigger: { type: "stay", ms: Number(staySec) * 1000 },
    }),
    [pageTypeIn, staySec, urlEnabled, urlMode, urlValue, urlTarget]
  );


  const goal: Goal | null = useMemo(() => {
    if (!goalEnabled) return null;
    const v = String(goalValue || "").trim();
    if (!v) return null;
    return { type: goalType, value: v } as any;
  }, [goalEnabled, goalType, goalValue]);

  const experiment: Experiment | null = useMemo(() => {
    if (!expEnabled) return null;
    const cleaned = (variants || []).map((v) => ({
      id: String(v.id || "").trim(),
      name: v.name || "",
      weight: Number(v.weight ?? 0),
      actionRefs: reorder(normalizeActionRefs(v.actionRefs)),
    })).filter((v) => !!v.id);

    return {
      enabled: true,
      sticky: expSticky,
      variants: cleaned,
    };
  }, [expEnabled, expSticky, variants]);

  const payload: Scenario = useMemo(
    () => ({
      workspaceId,
      siteId,
      name,
      status,
      priority: Number(priority),
      memo: memo || "",
      goal: goal || null,
      entry_rules,

      // 非ABのときだけ使う（AB有効でも残してOK。serverはvariant優先にしてる）
      actionRefs: reorder(normalizeActionRefs(actionRefs)),

      experiment: experiment || undefined,
    }),
    [workspaceId, siteId, name, status, priority, memo, goal, entry_rules, actionRefs, experiment]
  );

  function togglePageType(pt: (typeof PAGE_TYPES)[number]) {
    setPageTypeIn((cur) =>
      cur.includes(pt) ? cur.filter((x) => x !== pt) : [...cur, pt]
    );
  }

  // -------------------------
  // actionRefs helpers (shared)
  // -------------------------
  function addActionRefToList(list: ActionRef[], actionId: string): ActionRef[] {
    if (!actionId) return list;
    const next = [...(list || [])];
    next.push({ actionId, enabled: true, order: next.length });
    return reorder(next);
  }

  function moveActionInList(list: ActionRef[], from: number, to: number): ActionRef[] {
    const arr = [...(list || [])];
    if (from < 0 || from >= arr.length) return arr;
    if (to < 0 || to >= arr.length) return arr;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    return reorder(arr);
  }

  // -------------------------
  // AB: variant actionRefs
  // -------------------------
  const currentVariant = useMemo(() => {
    return variants.find((v) => v.id === variantIdToEdit) || null;
  }, [variants, variantIdToEdit]);

  function updateVariant(patch: Partial<ExperimentVariant>) {
    setVariants((cur) =>
      cur.map((v) => (v.id === variantIdToEdit ? { ...v, ...patch } : v))
    );
  }

  function addActionRefToCurrentVariant() {
    if (!currentVariant) return;
    if (!actionIdToAdd) return;
    updateVariant({
      actionRefs: addActionRefToList(currentVariant.actionRefs || [], actionIdToAdd),
    });
  }

  function moveVariantAction(from: number, to: number) {
    if (!currentVariant) return;
    updateVariant({
      actionRefs: moveActionInList(currentVariant.actionRefs || [], from, to),
    });
  }

  function removeVariantAction(idx: number) {
    if (!currentVariant) return;
    const next = [...(currentVariant.actionRefs || [])].filter((_, i) => i !== idx);
    updateVariant({ actionRefs: reorder(next) });
  }

  function toggleVariantActionEnabled(idx: number, enabled: boolean) {
    if (!currentVariant) return;
    const next = (currentVariant.actionRefs || []).map((r, i) =>
      i === idx ? { ...r, enabled } : r
    );
    updateVariant({ actionRefs: reorder(next) });
  }

  function addVariant() {
    setVariants((cur) => {
      const next = [...cur, newVariant()];
      return next;
    });
  }

  function removeVariant(vid: string) {
    setVariants((cur) => {
      const next = cur.filter((v) => v.id !== vid);
      return next.length ? next : cur;
    });
    if (variantIdToEdit === vid) {
      const fallback = variants.find((v) => v.id !== vid)?.id || "A";
      setVariantIdToEdit(fallback);
    }
  }

  function normalizeWeightsTo100() {
    setVariants((cur) => {
      const list = [...cur];
      const sum = list.reduce((acc, v) => acc + Number(v.weight ?? 0), 0);
      if (sum <= 0) {
        const even = Math.floor(100 / Math.max(1, list.length));
        return list.map((v, i) => ({ ...v, weight: i === list.length - 1 ? 100 - even * (list.length - 1) : even }));
      }
      // 比率で調整
      let used = 0;
      const out = list.map((v, i) => {
        const w = i === list.length - 1
          ? 0
          : Math.round((Number(v.weight ?? 0) / sum) * 100);
        used += w;
        return { ...v, weight: w };
      });
      out[out.length - 1].weight = clamp(100 - used, 0, 100);
      return out;
    });
  }

  // -------------------------
  // Non-AB actionRefs
  // -------------------------
  function addActionRef() {
    if (!actionIdToAdd) return;
    setActionRefs((cur) => addActionRefToList(cur || [], actionIdToAdd));
  }

  function moveAction(from: number, to: number) {
    setActionRefs((cur) => moveActionInList(cur || [], from, to));
  }

  // -------------------------
  // Save / Reset / Load
  // -------------------------
  function resetForm() {
    setId(genId("scn"));
    setName("New scenario");
    setStatus("active");
    setPriority(0);
    setMemo("");

    setPageTypeIn(["other"]);
    setStaySec(3);

    setActionRefs([]);

    setGoalEnabled(false);
    setGoalType("path_prefix");
    setGoalValue("/thanks");

    setExpEnabled(false);
    setExpSticky("vid");
    setVariants([
      { id: "A", name: "A", weight: 50, actionRefs: [] },
      { id: "B", name: "B", weight: 50, actionRefs: [] },
    ]);
    setVariantIdToEdit("A");

    setUrlEnabled(false);
    setUrlMode("contains");
    setUrlValue("/products/");
    setUrlTarget("path");


  }

  async function createOrUpdate() {
    if (!siteId) throw new Error("siteId required");
    if (!workspaceId) throw new Error("workspaceId required");

    const safePayload = stripUndefinedDeep(payload);
    await setDoc(doc(db, "scenarios", id.trim()), safePayload, { merge: true });

    resetForm();
  }

  function loadScenario(docId: string, s: Scenario) {
    setId(docId);
    setSiteId(s.siteId || "");
    setWorkspaceId(s.workspaceId || "");
    setName(s.name || "");
    setStatus(s.status || "active");
    setPriority(Number(s.priority ?? 0));
    setMemo(String(s.memo || ""));

    setPageTypeIn((s.entry_rules?.page?.page_type_in as any) || ["other"]);
    setStaySec(Number(s.entry_rules?.behavior?.stay_gte_sec ?? 3));

    setActionRefs(reorder(normalizeActionRefs(s.actionRefs)));

    const u = s.entry_rules?.page?.url;
    if (u?.mode && u?.value) {
      setUrlEnabled(true);
      setUrlMode(u.mode);
      setUrlValue(String(u.value || ""));
      setUrlTarget(u.target === "url" ? "url" : "path");
    } else {
      setUrlEnabled(false);
      setUrlMode("contains");
      setUrlValue("/products/");
      setUrlTarget("path");
    }



    // goal
    if (s.goal && (s.goal as any).type && (s.goal as any).value) {
      setGoalEnabled(true);
      setGoalType((s.goal as any).type);
      setGoalValue(String((s.goal as any).value || ""));
    } else {
      setGoalEnabled(false);
      setGoalType("path_prefix");
      setGoalValue("/thanks");
    }

    // experiment
    const exp = s.experiment as any;
    if (exp && exp.enabled && Array.isArray(exp.variants)) {
      setExpEnabled(true);
      setExpSticky(exp.sticky === "sid" ? "sid" : "vid");
      const vs: ExperimentVariant[] = exp.variants.map((v: any) => ({
        id: String(v.id || "").trim(),
        name: v.name || "",
        weight: Number(v.weight ?? 0),
        actionRefs: reorder(normalizeActionRefs(v.actionRefs)),
      })).filter((v: any) => !!v.id);

      setVariants(vs.length ? vs : [
        { id: "A", name: "A", weight: 50, actionRefs: [] },
        { id: "B", name: "B", weight: 50, actionRefs: [] },
      ]);

      setVariantIdToEdit(vs[0]?.id || "A");
    } else {
      setExpEnabled(false);
      setExpSticky("vid");
      setVariants([
        { id: "A", name: "A", weight: 50, actionRefs: [] },
        { id: "B", name: "B", weight: 50, actionRefs: [] },
      ]);
      setVariantIdToEdit("A");
    }
  }

  // name lookup for actions
  const actionTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of actionsForWorkspace) {
      m.set(a.id, a.data?.creative?.title || a.id);
    }
    return m;
  }, [actionsForWorkspace]);

  const weightsSum = useMemo(() => {
    if (!expEnabled) return 0;
    return (variants || []).reduce((acc, v) => acc + Number(v.weight ?? 0), 0);
  }, [expEnabled, variants]);

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Scenarios</h1>
        <div className="small">
          “いつ / どのページで / 何を出すか” の定義。
          <br />
          <b>Phase1</b>：A/B・効果測定・CV（goal）・DOM挿入の前提になる場所。
        </div>

        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: "flex-start" }}>
          {/* LEFT: editor */}
          <div style={{ flex: 1, minWidth: 360 }}>
            <div className="h2">scenarioId</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />

            <div style={{ height: 10 }} />
            <div className="h2">siteId</div>
            <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
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
                <input
                  className="input"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="h2">memo（施策メモ）</div>
            <textarea
              className="input"
              style={{ minHeight: 72 }}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：Topページで初回訪問者にクーポン訴求 / Aは画像あり、Bは画像なし…"
            />

            <div style={{ height: 12 }} />
            <div className="h2">entry_rules（最小セット）</div>
            <div className="row">
              {PAGE_TYPES.map((pt) => (
                <label key={pt} className="badge" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={pageTypeIn.includes(pt)} onChange={() => togglePageType(pt)} />
                  {pt}
                </label>
              ))}
              <label className="badge">
                stay_gte_sec
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

            <div style={{ height: 10 }} />
            <div className="h2">URL条件（発火URL）</div>

            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <label className="badge" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={urlEnabled}
                  onChange={(e) => setUrlEnabled(e.target.checked)}
                />
                enable url rule
              </label>

              <select
                className="input"
                style={{ width: 140 }}
                disabled={!urlEnabled}
                value={urlTarget}
                onChange={(e) => setUrlTarget(e.target.value as any)}
              >
                <option value="path">path</option>
                <option value="url">url</option>
              </select>

              <select
                className="input"
                style={{ width: 160 }}
                disabled={!urlEnabled}
                value={urlMode}
                onChange={(e) => setUrlMode(e.target.value as any)}
              >
                <option value="contains">contains</option>
                <option value="prefix">prefix</option>
                <option value="equals">equals</option>
                <option value="regex">regex</option>
              </select>

              <input
                className="input"
                style={{ flex: 1, minWidth: 220 }}
                disabled={!urlEnabled}
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder='例: /products/  or  ^/collections/.*'
              />
            </div>

            <div className="small" style={{ marginTop: 6 }}>
              例：<code>path + prefix = /products/</code>（Shopify商品ページ） /{" "}
              <code>regex = ^/lp/</code>
            </div>

            <div style={{ height: 12 }} />
            <div className="h2">goal（コンバージョン）</div>
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <label className="badge" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={goalEnabled}
                  onChange={(e) => setGoalEnabled(e.target.checked)}
                />
                enable goal
              </label>

              <select
                className="input"
                style={{ width: 180 }}
                disabled={!goalEnabled}
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as any)}
              >
                {GOAL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <input
                className="input"
                style={{ flex: 1, minWidth: 180 }}
                disabled={!goalEnabled}
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                placeholder="例：/thanks  or  complete"
              />
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              例：<code>path_prefix=/thanks</code> / <code>url_contains=complete</code>
            </div>

            <div style={{ height: 14 }} />
            <div className="h2">A/B test（experiment）</div>

            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <label className="badge" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={expEnabled}
                  onChange={(e) => setExpEnabled(e.target.checked)}
                />
                enable experiment
              </label>

              <div style={{ width: 10 }} />

              <div className="small">sticky</div>
              <select
                className="input"
                style={{ width: 120 }}
                disabled={!expEnabled}
                value={expSticky}
                onChange={(e) => setExpSticky(e.target.value as any)}
              >
                <option value="vid">vid</option>
                <option value="sid">sid</option>
              </select>

              <div style={{ flex: 1 }} />
              {expEnabled ? (
                <button className="btn" onClick={normalizeWeightsTo100}>
                  weightを100に正規化
                </button>
              ) : null}
              {expEnabled ? (
                <button className="btn" onClick={addVariant}>
                  variant追加
                </button>
              ) : null}
            </div>

            {expEnabled ? (
              <>
                <div style={{ height: 10 }} />
                <div className="small">
                  weight合計：<b>{weightsSum}</b>（目安100）
                </div>

                <div style={{ height: 10 }} />
                <table className="table">
                  <thead>
                    <tr>
                      <th>variant</th>
                      <th>name</th>
                      <th style={{ textAlign: "right" }}>weight</th>
                      <th>actions</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} style={{ opacity: v.id === variantIdToEdit ? 1 : 0.85 }}>
                        <td>
                          <button
                            className="btn"
                            onClick={() => setVariantIdToEdit(v.id)}
                            style={{ fontWeight: v.id === variantIdToEdit ? 800 : 600 }}
                          >
                            {v.id}
                          </button>
                        </td>
                        <td>
                          <input
                            className="input"
                            value={v.name || ""}
                            onChange={(e) =>
                              setVariants((cur) =>
                                cur.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <input
                            className="input"
                            type="number"
                            style={{ width: 90, textAlign: "right" }}
                            value={Number(v.weight ?? 0)}
                            onChange={(e) =>
                              setVariants((cur) =>
                                cur.map((x) =>
                                  x.id === v.id ? { ...x, weight: Number(e.target.value) } : x
                                )
                              )
                            }
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {(v.actionRefs || []).length}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn--danger" onClick={() => removeVariant(v.id)}>
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ height: 12 }} />
                <div className="h2">variant actions：<code>{variantIdToEdit}</code></div>

                <div className="row">
                  <select
                    className="input"
                    style={{ width: 360, maxWidth: "100%" }}
                    value={actionIdToAdd}
                    onChange={(e) => setActionIdToAdd(e.target.value)}
                  >
                    {actionsForWorkspace.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} — {a.data?.creative?.title || ""}
                      </option>
                    ))}
                  </select>
                  <button className="btn" onClick={addActionRefToCurrentVariant}>追加</button>
                </div>

                <div style={{ height: 10 }} />
                {(currentVariant?.actionRefs || []).length ? (
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
                      {(currentVariant?.actionRefs || []).map((r, idx) => (
                        <tr
                          key={`${r.actionId}-${idx}`}
                          draggable
                          onDragStart={() => setDragIndex(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragIndex == null) return;
                            moveVariantAction(dragIndex, idx);
                            setDragIndex(null);
                          }}
                          style={{ opacity: dragIndex === idx ? 0.6 : 1 }}
                        >
                          <td>{idx}</td>
                          <td>
                            <code>{r.actionId}</code>
                            <div className="small">
                              {actionTitleById.get(r.actionId) || ""}
                            </div>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={r.enabled ?? true}
                              onChange={(e) =>
                                toggleVariantActionEnabled(idx, e.target.checked)
                              }
                            />
                          </td>
                          <td>
                            <button className="btn" disabled={idx === 0} onClick={() => moveVariantAction(idx, idx - 1)}>↑</button>
                            <span style={{ width: 6, display: "inline-block" }} />
                            <button
                              className="btn"
                              disabled={idx === (currentVariant?.actionRefs || []).length - 1}
                              onClick={() => moveVariantAction(idx, idx + 1)}
                            >
                              ↓
                            </button>
                          </td>
                          <td>
                            <button className="btn" onClick={() => removeVariantAction(idx)}>削除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="small">
                    まだ何も追加されてない（このvariantだとSDKに出す actions が空になる）
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ height: 12 }} />
                <div className="h2">actionRefs（シナリオのアクション / 非A/B）</div>
                <div className="row">
                  <select
                    className="input"
                    style={{ width: 360, maxWidth: "100%" }}
                    value={actionIdToAdd}
                    onChange={(e) => setActionIdToAdd(e.target.value)}
                  >
                    {actionsForWorkspace.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} — {a.data?.creative?.title || ""}
                      </option>
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
                          <td>
                            <code>{r.actionId}</code>
                            <div className="small">
                              {actionTitleById.get(r.actionId) || ""}
                            </div>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={r.enabled ?? true}
                              onChange={(e) =>
                                setActionRefs((cur) =>
                                  reorder((cur || []).map((x, i) =>
                                    i === idx ? { ...x, enabled: e.target.checked } : x
                                  ))
                                )
                              }
                            />
                          </td>
                          <td>
                            <button className="btn" disabled={idx === 0} onClick={() => moveAction(idx, idx - 1)}>↑</button>
                            <span style={{ width: 6, display: "inline-block" }} />
                            <button
                              className="btn"
                              disabled={idx === (actionRefs || []).length - 1}
                              onClick={() => moveAction(idx, idx + 1)}
                            >
                              ↓
                            </button>
                          </td>
                          <td>
                            <button
                              className="btn"
                              onClick={() =>
                                setActionRefs((cur) => reorder((cur || []).filter((_, i) => i !== idx)))
                              }
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="small">
                    まだ何も追加されてない（これだとSDKに出す actions が空になる）
                  </div>
                )}
              </>
            )}

            <div style={{ height: 14 }} />
            <div className="row" style={{ gap: 10 }}>
              <button
                className="text-blue-600 underline"
                onClick={() => navigate(`/scenarios/${scenario.id}/review`)}
              >
              AIレビュー
              </button>
              <button className="btn btn--primary" onClick={createOrUpdate}>保存</button>
              <button className="btn" onClick={resetForm}>新規（リセット）</button>
            </div>
          </div>

          {/* RIGHT: JSON debug */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <div className="h2">確認用JSON</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(payload, null, 2)}
            </pre>

            <div style={{ height: 12 }} />
            <div className="card" style={{ background: "rgba(255,255,255,.03)" }}>
              <div className="h2">ここが “迷子” ポイント（超重要）</div>
              <ul className="small">
                <li><b>Actions</b> は部品（単体）</li>
                <li><b>Scenario</b> は「出し分けルール」</li>
                <li><b>A/B ON時</b>：scenario.experiment.variants[*].actionRefs を編集する（これが配信内容）</li>
                <li><b>A/B OFF時</b>：scenario.actionRefs を編集する</li>
                <li>SDKに返すのはサーバーが actionRefs を join して作る <code>scenario.actions</code></li>
                <li>goalは “conversionログ” を増やすための最小設定</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* LIST */}
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
              <th>A/B</th>
              <th>goal</th>
              <th>actions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ab = !!(r.data.experiment && (r.data.experiment as any).enabled);
              const g = r.data.goal as any;
              const goalLabel = g?.type ? `${g.type}:${String(g.value || "")}` : "-";
              const actionsCount = ab
                ? ((r.data.experiment as any)?.variants || []).reduce(
                    (acc: number, v: any) => acc + (Array.isArray(v.actionRefs) ? v.actionRefs.length : 0),
                    0
                  )
                : (r.data.actionRefs || []).length;

              return (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td><code>{r.data.siteId}</code></td>
                  <td>{r.data.name}</td>
                  <td>{r.data.status}</td>
                  <td>{r.data.priority ?? 0}</td>
                  <td>{ab ? "ON" : "OFF"}</td>
                  <td className="small">{goalLabel}</td>
                  <td style={{ textAlign: "center" }}>{actionsCount}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      className="btn"
                      onClick={() => loadScenario(r.id, r.data)}
                    >
                      編集
                    </button>
                    <span style={{ width: 8, display: "inline-block" }} />
                    <button
                      className="btn btn--danger"
                      onClick={() => deleteDoc(doc(db, "scenarios", r.id))}
                    >
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