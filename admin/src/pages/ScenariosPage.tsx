import React, { Fragment, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

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

type TargetingRule = {
  op: "contains" | "equals" | "startsWith";
  value: string;
};

type ScenarioTargeting = {
  enabled?: boolean;
  audience?: {
    visitorType?: "all" | "new" | "returning";
    device?: "all" | "pc" | "sp";
    loginStatus?: "all" | "guest" | "member";
    cartStatus?: "all" | "empty" | "hasItems";
    urlRules?: TargetingRule[];
    utmRules?: {
      source?: string[];
      medium?: string[];
      campaign?: string[];
    };
  };
  exclude?: {
    shownWithinDays?: number;
    maxImpressionsPerUser?: number;
    converted?: boolean;
  };
};

type Scenario = {
  workspaceId: string;
  siteId: string;
  name: string;
  status: "active" | "paused";
  priority?: number;

  memo?: string;

  schedule?: {
    startAt?: string; // "YYYY-MM-DDTHH:mm"
    endAt?: string;   // "YYYY-MM-DDTHH:mm"
  };

  // conversion goal（Phase1）
  goal?: Goal | null;

  entry_rules?: any;

  // non-AB mode: scenario.actionRefs
  actionRefs?: ActionRef[];

  targeting?: ScenarioTargeting;

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

function siteLabel(site: SiteRow | undefined) {
  if (!site) return "";
  return String(site.data?.name || site.id || "");
}

function workspaceLabel(sites: SiteRow[], workspaceId: string) {
  const hit = sites.find((s) => String(s.data?.workspaceId || "") === String(workspaceId || ""));
  return String(hit?.data?.workspaceName || hit?.data?.workspace_name || workspaceId || "");
}

const LS_SITE_KEY = "cx_admin_site_id";

function readSelectedSiteId(): string {
  try {
    return localStorage.getItem(LS_SITE_KEY) || "";
  } catch {
    return "";
  }
}

function writeSelectedSiteId(siteId: string) {
  try {
    localStorage.setItem(LS_SITE_KEY, siteId);
    window.dispatchEvent(new CustomEvent("cx_admin_site_changed", { detail: { siteId } }));
  } catch {
    // ignore
  }
}

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || "";
  } catch {
    return "";
  }
}

export default function ScenariosPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: Scenario }>>([]);

  // -------------------------
  // Form state
  // -------------------------
  const [id, setId] = useState(() => genId("scn"));
  const [siteId, setSiteId] = useState(() => readSelectedSiteId());
  const [workspaceId, setWorkspaceId] = useState("");
  const [currentUid, setCurrentUid] = useState("");
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

  // targeting (Phase 1)
  const [targetingEnabled, setTargetingEnabled] = useState(false);
  const [targetVisitorType, setTargetVisitorType] = useState<"all" | "new" | "returning">("all");
  const [targetDevice, setTargetDevice] = useState<"all" | "pc" | "sp">("all");
  const [targetLoginStatus, setTargetLoginStatus] = useState<"all" | "guest" | "member">("all");
  const [targetCartStatus, setTargetCartStatus] = useState<"all" | "empty" | "hasItems">("all");
  const [targetUrlMode, setTargetUrlMode] = useState<"contains" | "equals" | "startsWith">("contains");
  const [targetUrlValue, setTargetUrlValue] = useState("");
  const [targetUtmSource, setTargetUtmSource] = useState("");
  const [targetUtmMedium, setTargetUtmMedium] = useState("");
  const [targetUtmCampaign, setTargetUtmCampaign] = useState("");
  const [excludeShownWithinDays, setExcludeShownWithinDays] = useState<number | "">("");
  const [excludeMaxImpressionsPerUser, setExcludeMaxImpressionsPerUser] = useState<number | "">("");
  const [excludeConverted, setExcludeConverted] = useState(false);

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  // schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  // toast / delete confirm
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // entry rules (URL)
  const [urlEnabled, setUrlEnabled] = useState(false);
  const [urlMode, setUrlMode] = useState<"contains" | "equals" | "prefix" | "regex">("contains");
  const [urlValue, setUrlValue] = useState("/products/");
  const [urlTarget, setUrlTarget] = useState<"url" | "path">("path");

  useEffect(() => {
    const q = query(collection(db, "sites"), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, data: d.data() }))
        .filter((row) => {
          const ws = String((row.data as any)?.workspaceId || "");
          if (!workspaceId) return true;
          return ws === String(workspaceId);
        });

      setSites(list);
    });
  }, [workspaceId]);

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setWorkspaceId(readSelectedWorkspaceId(uid));
    });
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setWorkspaceId("");
      return;
    }

    const applySelectedWorkspace = () => {
      setWorkspaceId(readSelectedWorkspaceId(currentUid));
    };

    applySelectedWorkspace();

    const onWorkspaceChanged = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      if (typeof next === "string") {
        setWorkspaceId(next);
        return;
      }
      applySelectedWorkspace();
    };

    const onStorageChanged = () => applySelectedWorkspace();

    window.addEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
    window.addEventListener("storage", onStorageChanged);

    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
      window.removeEventListener("storage", onStorageChanged);
    };
  }, [currentUid]);

  useEffect(() => {
    if (!workspaceId) {
      setActions([]);
      return;
    }

    const q = query(
      collection(db, "actions"),
      where("workspaceId", "==", workspaceId),
      orderBy("__name__")
    );
    return onSnapshot(q, (snap) =>
      setActions(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
    );
  }, [workspaceId]);

  useEffect(() => {
    if (!siteId) {
      setRows([]);
      return;
    }

    const q = query(
      collection(db, "scenarios"),
      where("siteId", "==", siteId),
      orderBy("__name__")
    );

    return onSnapshot(q, (snap) =>
      setRows(
        snap.docs.map((d) => ({ id: d.id, data: d.data() as Scenario }))
      )
    );
  }, [siteId]);


  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_SITE_KEY) setSiteId(readSelectedSiteId());
    };
    const onCustom = (e: any) => {
      const next = e?.detail?.siteId;
      if (typeof next === "string") setSiteId(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cx_admin_site_changed" as any, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cx_admin_site_changed" as any, onCustom);
    };
  }, []);

  useEffect(() => {
    if (!siteId) return;
    writeSelectedSiteId(siteId);
  }, [siteId]);

  const visibleSites = useMemo(() => {
    if (!workspaceId) return sites;
    return sites.filter((s) => String(s.data?.workspaceId || "") === String(workspaceId));
  }, [sites, workspaceId]);

  const actionsForWorkspace = useMemo(() => {
    return actions.filter((a) => a.data?.workspaceId === workspaceId);
  }, [actions, workspaceId]);

  const selectedSite = useMemo(() => visibleSites.find((s) => s.id === siteId), [visibleSites, siteId]);
  const selectedSiteName = useMemo(() => siteLabel(selectedSite), [selectedSite]);
  const selectedWorkspaceName = useMemo(() => {
    return workspaceLabel(visibleSites, workspaceId) || workspaceId || "";
  }, [visibleSites, workspaceId]);

  useEffect(() => {
    if (!visibleSites.length) {
      setSiteId("");
      return;
    }
    const exists = siteId && visibleSites.some((s) => s.id === siteId);
    if (!exists) {
      const nextSiteId = visibleSites[0]?.id || "";
      setSiteId(nextSiteId);
      if (nextSiteId) writeSelectedSiteId(nextSiteId);
    }
  }, [visibleSites, siteId]);  

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

  const targeting: ScenarioTargeting | undefined = useMemo(() => {
    if (!targetingEnabled) return undefined;

    const urlValue = String(targetUrlValue || "").trim();
    const parseCsv = (v: string) =>
      String(v || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    return {
      enabled: true,
      audience: {
        visitorType: targetVisitorType,
        device: targetDevice,
        loginStatus: targetLoginStatus,
        cartStatus: targetCartStatus,
        urlRules: urlValue ? [{ op: targetUrlMode, value: urlValue }] : [],
        utmRules: {
          source: parseCsv(targetUtmSource),
          medium: parseCsv(targetUtmMedium),
          campaign: parseCsv(targetUtmCampaign),
        },
      },
      exclude: {
        shownWithinDays:
          excludeShownWithinDays === "" ? undefined : Number(excludeShownWithinDays),
        maxImpressionsPerUser:
          excludeMaxImpressionsPerUser === "" ? undefined : Number(excludeMaxImpressionsPerUser),
        converted: excludeConverted,
      },
    };
  }, [
    targetingEnabled,
    targetVisitorType,
    targetDevice,
    targetLoginStatus,
    targetCartStatus,
    targetUrlMode,
    targetUrlValue,
    targetUtmSource,
    targetUtmMedium,
    targetUtmCampaign,
    excludeShownWithinDays,
    excludeMaxImpressionsPerUser,
    excludeConverted,
  ]);

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

  const schedule = useMemo(() => {
    if (!scheduleEnabled) return undefined;
    const s: { startAt?: string; endAt?: string } = {};
    if (scheduleStart) s.startAt = scheduleStart;
    if (scheduleEnd) s.endAt = scheduleEnd;
    return Object.keys(s).length ? s : undefined;
  }, [scheduleEnabled, scheduleStart, scheduleEnd]);

  const payload: Scenario = useMemo(
    () => ({
      workspaceId,
      siteId,
      name,
      status,
      priority: Number(priority),
      memo: memo || "",
      schedule: schedule || undefined,
      goal: goal || null,
      entry_rules,

      // 非ABのときだけ使う（AB有効でも残してOK。serverはvariant優先にしてる）
      actionRefs: reorder(normalizeActionRefs(actionRefs)),

      targeting,
      experiment: experiment || undefined,
    }),
    [workspaceId, siteId, name, status, priority, memo, schedule, goal, entry_rules, actionRefs, targeting, experiment]
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

    setTargetingEnabled(false);
    setTargetVisitorType("all");
    setTargetDevice("all");
    setTargetLoginStatus("all");
    setTargetCartStatus("all");
    setTargetUrlMode("contains");
    setTargetUrlValue("");
    setTargetUtmSource("");
    setTargetUtmMedium("");
    setTargetUtmCampaign("");
    setExcludeShownWithinDays("");
    setExcludeMaxImpressionsPerUser("");
    setExcludeConverted(false);

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

    setScheduleEnabled(false);
    setScheduleStart("");
    setScheduleEnd("");
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(docId: string, s: Scenario) {
    loadScenario(docId, s);
    setIsModalOpen(true);
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function createOrUpdate() {
    if (!siteId) { showToast("サイトを選択してください", "error"); return; }
    if (!workspaceId) { showToast("ワークスペースが未設定です", "error"); return; }
    try {
      const safePayload = stripUndefinedDeep(payload);
      await setDoc(doc(db, "scenarios", id.trim()), safePayload, { merge: true });
      showToast("シナリオを保存しました ✓");
      resetForm();
      setIsModalOpen(false);
    } catch (e: any) {
      showToast(`保存に失敗しました: ${e?.message || String(e)}`, "error");
    }
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

    // schedule
    if (s.schedule && (s.schedule.startAt || s.schedule.endAt)) {
      setScheduleEnabled(true);
      setScheduleStart(s.schedule.startAt || "");
      setScheduleEnd(s.schedule.endAt || "");
    } else {
      setScheduleEnabled(false);
      setScheduleStart("");
      setScheduleEnd("");
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

    const t = (s as any).targeting;
    if (t?.enabled) {
      setTargetingEnabled(true);
      setTargetVisitorType(t?.audience?.visitorType || "all");
      setTargetDevice(t?.audience?.device || "all");
      setTargetLoginStatus(t?.audience?.loginStatus || "all");
      setTargetCartStatus(t?.audience?.cartStatus || "all");
      setTargetUrlMode(t?.audience?.urlRules?.[0]?.op || "contains");
      setTargetUrlValue(String(t?.audience?.urlRules?.[0]?.value || ""));
      setTargetUtmSource(Array.isArray(t?.audience?.utmRules?.source) ? t.audience.utmRules.source.join(", ") : "");
      setTargetUtmMedium(Array.isArray(t?.audience?.utmRules?.medium) ? t.audience.utmRules.medium.join(", ") : "");
      setTargetUtmCampaign(Array.isArray(t?.audience?.utmRules?.campaign) ? t.audience.utmRules.campaign.join(", ") : "");
      setExcludeShownWithinDays(
        typeof t?.exclude?.shownWithinDays === "number" ? t.exclude.shownWithinDays : ""
      );
      setExcludeMaxImpressionsPerUser(
        typeof t?.exclude?.maxImpressionsPerUser === "number" ? t.exclude.maxImpressionsPerUser : ""
      );
      setExcludeConverted(!!t?.exclude?.converted);
    } else {
      setTargetingEnabled(false);
      setTargetVisitorType("all");
      setTargetDevice("all");
      setTargetLoginStatus("all");
      setTargetCartStatus("all");
      setTargetUrlMode("contains");
      setTargetUrlValue("");
      setTargetUtmSource("");
      setTargetUtmMedium("");
      setTargetUtmCampaign("");
      setExcludeShownWithinDays("");
      setExcludeMaxImpressionsPerUser("");
      setExcludeConverted(false);
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
    <div className="container liquid-page">
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Main</div>
          <h1 className="h1">シナリオ</h1>
          <div className="small">
            「どのサイトで」「どんな条件のときに」「何を表示するか」を決める画面です。まずは一覧から確認し、必要なときだけ登録・編集します。
          </div>
          <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
            現在のサイト: <b>{selectedSiteName || siteId || "-"}</b>
            {siteId ? (
              <React.Fragment>
                {" "} / siteId: <code>{siteId}</code>
              </React.Fragment>
            ) : null}
            <span style={{ opacity: 0.52 }}> / </span>
            ワークスペース: <b>{selectedWorkspaceName || workspaceId || "-"}</b>
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={openCreateModal}>
            新規シナリオ
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="list-toolbar">
          <div className="list-toolbar__filters" style={{ flex: 1 }}>
            <div style={{ minWidth: 280, flex: "1 1 320px" }}>
              <div className="h2">サイト</div>
              <select
                className="input"
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  writeSelectedSiteId(e.target.value);
                }}
              >
                {visibleSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {siteLabel(s)}{siteLabel(s) !== s.id ? ` (${s.id})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="list-toolbar__actions">
            <button className="btn" onClick={openCreateModal}>作成</button>
          </div>
        </div>

        <div className="small" style={{ opacity: 0.74, marginBottom: 10 }}>
          A/B、コンバージョン、アクション数、AIレビュー導線を一覧で確認できます。
        </div>
        <div className="liquid-scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>シナリオ</th>
              <th>サイト</th>
              <th>状態</th>
              <th>優先度</th>
              <th>A/B</th>
              <th>コンバージョン</th>
              <th>アクション数</th>
              <th>AIツール</th>
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
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.data.name || "名称未設定"}</div>
                      <div className="small" style={{ opacity: 0.72 }}>
                        ID: <code>{r.id}</code>
                      </div>
                    </td>
                    <td>
                      {siteLabel(sites.find((s) => s.id === r.data.siteId)) || r.data.siteId}
                    </td>
                    <td>{r.data.status}</td>
                    <td>{r.data.priority ?? 0}</td>
                    <td>{ab ? "ON" : "OFF"}</td>
                    <td className="small">{goalLabel}</td>
                    <td style={{ textAlign: "center" }}>{actionsCount}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn"
                        onClick={() => navigate(`/scenarios/${r.id}/review`)}
                      >
                        AIレビュー
                      </button>
                      <span style={{ width: 6, display: "inline-block" }} />
                      <button
                        className="btn"
                        onClick={() => navigate(`/scenarios/${r.id}/ai`)}
                      >
                        AI
                      </button>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn"
                        onClick={() => openEditModal(r.id, r.data)}
                      >
                        編集
                      </button>
                      <span style={{ width: 8, display: "inline-block" }} />
                      <button
                        className="btn btn--danger"
                        onClick={() => setDeleteTarget({ id: r.id, name: String(r.data?.name || r.id) })}
                      >
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
      </div>

      {isModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 50,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: "min(980px, 100%)", maxHeight: "88vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 10 }}>
              <div className="page-header__meta">
                <h2 className="h1" style={{ fontSize: 22 }}>
                  {rows.some((r) => r.id === id) ? "シナリオを編集" : "シナリオを作成"}
                </h2>
                <div className="small">
                  新規登録・編集はモーダルで行います。条件、A/B、アクションはここで確認してください。
                </div>
              </div>
              <div className="page-header__actions">
                <button className="btn" onClick={() => setIsModalOpen(false)}>閉じる</button>
              </div>
            </div>

            <div className="row liquid-page" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 360 }}>
                <div className="h2">シナリオ名</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="small" style={{ opacity: 0.72, marginTop: 6, marginBottom: 6 }}>
                  シナリオID: <code>{id}</code>
                </div>

                <div style={{ height: 10 }} />
                <div className="small" style={{ opacity: 0.72, marginBottom: 6 }}>
                  現在のサイト: <b>{selectedSiteName || siteId || "-"}</b> / ワークスペース: <b>{selectedWorkspaceName || workspaceId || "-"}</b>
                </div>
                <div className="h2">サイト</div>
                <select
                  className="input"
                  value={siteId}
                  onChange={(e) => {
                    setSiteId(e.target.value);
                    writeSelectedSiteId(e.target.value);
                  }}
                >
                  {visibleSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {siteLabel(s)}{siteLabel(s) !== s.id ? ` (${s.id})` : ""}
                    </option>
                  ))}
                </select>

                <div style={{ height: 10 }} />
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <div className="h2">状態</div>
                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                      <option value="active">active（配信中）</option>
                      <option value="paused">paused（一時停止）</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="h2">優先度</div>
                    <input
                      className="input"
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ height: 10 }} />
                <div className="h2">メモ（施策メモ）</div>
                <textarea
                  className="input"
                  style={{ minHeight: 72 }}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="例：Topページで初回訪問者にクーポン訴求 / Aは画像あり、Bは画像なし…"
                />

                <div style={{ height: 12 }} />
                <div className="h2">表示条件（基本設定）</div>
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
                <div className="h2">URL条件</div>

                <div className="row" style={{ alignItems: "center", gap: 10 }}>
                  <label className="badge" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={urlEnabled}
                      onChange={(e) => setUrlEnabled(e.target.checked)}
                    />
                    URL条件を有効化
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
                    placeholder="例: /products/  or  ^/collections/.*"
                  />
                </div>

                <div className="small" style={{ marginTop: 6 }}>
                  例：<code>path + prefix = /products/</code>（商品ページ） / <code>regex = ^/lp/</code>
                </div>

                <div style={{ height: 12 }} />
                <div className="h2">配信スケジュール</div>
                <div className="row" style={{ alignItems: "center", gap: 10 }}>
                  <label className="badge" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                    />
                    日時を指定する
                  </label>
                </div>
                {scheduleEnabled && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="row" style={{ alignItems: "center", gap: 10 }}>
                      <span className="small" style={{ minWidth: 80 }}>開始日時</span>
                      <input
                        className="input"
                        type="datetime-local"
                        value={scheduleStart}
                        onChange={(e) => setScheduleStart(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {scheduleStart && (
                        <button
                          type="button"
                          className="badge"
                          style={{ cursor: "pointer" }}
                          onClick={() => setScheduleStart("")}
                        >
                          クリア
                        </button>
                      )}
                    </div>
                    <div className="row" style={{ alignItems: "center", gap: 10 }}>
                      <span className="small" style={{ minWidth: 80 }}>終了日時</span>
                      <input
                        className="input"
                        type="datetime-local"
                        value={scheduleEnd}
                        onChange={(e) => setScheduleEnd(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {scheduleEnd && (
                        <button
                          type="button"
                          className="badge"
                          style={{ cursor: "pointer" }}
                          onClick={() => setScheduleEnd("")}
                        >
                          クリア
                        </button>
                      )}
                    </div>
                    <div className="small" style={{ opacity: 0.72 }}>
                      ※ 訪問者のブラウザ時間を基準に判定します。開始・終了はどちらか一方だけでも設定できます。
                    </div>
                  </div>
                )}

                <div style={{ height: 12 }} />
                <div className="h2">コンバージョン条件</div>
                <div className="row" style={{ alignItems: "center", gap: 10 }}>
                  <label className="badge" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={goalEnabled}
                      onChange={(e) => setGoalEnabled(e.target.checked)}
                    />
                    コンバージョン計測を有効化
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
                <div className="h2">ターゲット設定（Phase 1）</div>
                <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <label className="badge" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={targetingEnabled}
                      onChange={(e) => setTargetingEnabled(e.target.checked)}
                    />
                    ターゲット設定を有効化
                  </label>
                </div>

                <div style={{ height: 10 }} />
                <div className="row" style={{ gap: 10, flexWrap: "wrap", opacity: targetingEnabled ? 1 : 0.6 }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="h2">訪問種別</div>
                    <select className="input" disabled={!targetingEnabled} value={targetVisitorType} onChange={(e) => setTargetVisitorType(e.target.value as any)}>
                      <option value="all">all</option>
                      <option value="new">new</option>
                      <option value="returning">returning</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="h2">デバイス</div>
                    <select className="input" disabled={!targetingEnabled} value={targetDevice} onChange={(e) => setTargetDevice(e.target.value as any)}>
                      <option value="all">all</option>
                      <option value="pc">pc</option>
                      <option value="sp">sp</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="h2">ログイン状態</div>
                    <select className="input" disabled={!targetingEnabled} value={targetLoginStatus} onChange={(e) => setTargetLoginStatus(e.target.value as any)}>
                      <option value="all">all</option>
                      <option value="guest">guest</option>
                      <option value="member">member</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="h2">カート状態</div>
                    <select className="input" disabled={!targetingEnabled} value={targetCartStatus} onChange={(e) => setTargetCartStatus(e.target.value as any)}>
                      <option value="all">all</option>
                      <option value="empty">empty</option>
                      <option value="hasItems">hasItems</option>
                    </select>
                  </div>
                </div>

                <div style={{ height: 10 }} />
                <div className="h2">ターゲットURL条件</div>
                <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap", opacity: targetingEnabled ? 1 : 0.6 }}>
                  <select className="input" style={{ width: 160 }} disabled={!targetingEnabled} value={targetUrlMode} onChange={(e) => setTargetUrlMode(e.target.value as any)}>
                    <option value="contains">contains</option>
                    <option value="equals">equals</option>
                    <option value="startsWith">startsWith</option>
                  </select>
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 220 }}
                    disabled={!targetingEnabled}
                    value={targetUrlValue}
                    onChange={(e) => setTargetUrlValue(e.target.value)}
                    placeholder="例: /products/"
                  />
                </div>

                <div style={{ height: 10 }} />
                <div className="h2">UTM条件（カンマ区切り）</div>
                <div className="row" style={{ gap: 10, flexWrap: "wrap", opacity: targetingEnabled ? 1 : 0.6 }}>
                  <input className="input" style={{ flex: 1, minWidth: 220 }} disabled={!targetingEnabled} value={targetUtmSource} onChange={(e) => setTargetUtmSource(e.target.value)} placeholder="source: instagram, meta" />
                  <input className="input" style={{ flex: 1, minWidth: 220 }} disabled={!targetingEnabled} value={targetUtmMedium} onChange={(e) => setTargetUtmMedium(e.target.value)} placeholder="medium: cpc, social" />
                  <input className="input" style={{ flex: 1, minWidth: 220 }} disabled={!targetingEnabled} value={targetUtmCampaign} onChange={(e) => setTargetUtmCampaign(e.target.value)} placeholder="campaign: spring_sale" />
                </div>

                <div style={{ height: 10 }} />
                <div className="h2">除外条件</div>
                <div className="row" style={{ gap: 10, flexWrap: "wrap", opacity: targetingEnabled ? 1 : 0.6 }}>
                  <div style={{ minWidth: 180 }}>
                    <div className="small">直近表示除外（日）</div>
                    <input className="input" type="number" min={0} disabled={!targetingEnabled} value={excludeShownWithinDays} onChange={(e) => setExcludeShownWithinDays(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div style={{ minWidth: 220 }}>
                    <div className="small">最大表示回数 / user</div>
                    <input className="input" type="number" min={0} disabled={!targetingEnabled} value={excludeMaxImpressionsPerUser} onChange={(e) => setExcludeMaxImpressionsPerUser(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <label className="badge" style={{ cursor: "pointer", alignSelf: "flex-end" }}>
                    <input type="checkbox" disabled={!targetingEnabled} checked={excludeConverted} onChange={(e) => setExcludeConverted(e.target.checked)} />
                    CV済みを除外
                  </label>
                </div>

                <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
                  まずは「誰に出すか」をここで決めます。発火タイミングやA/B設定とは分けて管理します。
                </div>

                <div style={{ height: 14 }} />
                <div className="h2">A/Bテスト設定</div>

                <div className="row" style={{ alignItems: "center", gap: 10 }}>
                  <label className="badge" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={expEnabled}
                      onChange={(e) => setExpEnabled(e.target.checked)}
                    />
                    A/Bテストを有効化
                  </label>

                  <div style={{ width: 10 }} />

                  <div className="small">固定単位</div>
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
                      配分合計を100に調整
                    </button>
                  ) : null}
                  {expEnabled ? (
                    <button className="btn" onClick={addVariant}>
                      パターン追加
                    </button>
                  ) : null}
                </div>

                {expEnabled ? (
                  <>
                    <div style={{ height: 10 }} />
                    <div className="small">
                      配分合計：<b>{weightsSum}</b>（目安100）
                    </div>

                    <div style={{ height: 10 }} />
                    <div className="liquid-scroll-x">
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
                    </div>
                    <div style={{ height: 12 }} />
                    <div className="h2">パターン別アクション：<code>{variantIdToEdit}</code></div>

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
                      <div className="liquid-scroll-x">
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
                      </div>
                    ) : (
                      <div className="small">
                        まだアクションが追加されていません（このパターンでは何も表示されません）。
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ height: 12 }} />
                    <div className="h2">アクション設定（通常配信 / 非A/B）</div>
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
                    <div className="liquid-scroll-x">
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
                    </div>
                    ) : (
                      <div className="small">
                        まだアクションが追加されていません（このシナリオでは何も表示されません）。
                      </div>
                    )}
                  </>
                )}

                <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                  <button className="btn btn--primary" onClick={createOrUpdate}>保存</button>
                  <button className="btn" onClick={resetForm}>新規作成に戻す</button>
                  <button
                    className="btn"
                    onClick={() => navigate(`/scenarios/${id}/review`)}
                  >
                    AIレビューを見る
                  </button>
                  <button
                    className="btn"
                    onClick={() => navigate(`/scenarios/${id}/ai`)}
                  >
                    AIインサイトを見る
                  </button>
                  <button className="btn" onClick={() => navigate("/dashboard")}>
                    ダッシュボードへ
                  </button>
                  <button className="btn" onClick={() => navigate("/actions")}>
                    アクション一覧へ
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="card" style={{ background: "linear-gradient(180deg,#ffffff,#f8fbff)" }}>
                  <div className="h2">この画面の考え方</div>
                  <ul className="small">
                    <li><b>アクション</b> は表示する部品です。</li>
                    <li><b>シナリオ</b> は「どの条件で何を出すか」を決めるルールです。</li>
                    <li><b>A/BテストON</b> のときは、各パターンごとにアクションを設定します。</li>
                    <li><b>A/BテストOFF</b> のときは、通常配信用のアクションを設定します。</li>
                    <li>サーバー側で actionRefs をもとに、実際に配信する actions を組み立てます。</li>
                    <li>コンバージョン条件は、成果地点の計測に使います。</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* トースト通知 */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "success" ? "#16a34a" : "#dc2626",
          color: "#fff", padding: "12px 24px", borderRadius: 12,
          fontWeight: 700, fontSize: 14, zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          animation: "fadeInUp .2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ padding: 28, maxWidth: 400, width: "92vw", background: "#fff" }}>
            <div className="h2" style={{ marginBottom: 12 }}>シナリオを削除しますか？</div>
            <div className="small" style={{ marginBottom: 20 }}>
              「<b>{deleteTarget.name}</b>」を削除します。この操作は元に戻せません。
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setDeleteTarget(null)}>キャンセル</button>
              <button
                className="btn"
                style={{ background: "#dc2626", color: "#fff" }}
                onClick={async () => {
                  try {
                    await deleteDoc(doc(db, "scenarios", deleteTarget.id));
                    showToast("シナリオを削除しました");
                  } catch (e: any) {
                    showToast(`削除に失敗: ${e?.message || String(e)}`, "error");
                  }
                  setDeleteTarget(null);
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );

}