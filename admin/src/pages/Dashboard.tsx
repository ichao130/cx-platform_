import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type StatRow = {
  siteId: string;
  day: string; // YYYY-MM-DD
  scenarioId: string | null;
  actionId: string | null;
  variantId: string | null;
  event: "impression" | "click" | "click_link" | "close";
  count: number;
};

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState<string>("");

  const [rows, setRows] = useState<StatRow[]>([]);

  useEffect(() => {
    const q = query(collection(db, "sites"), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setSites(list);
      if (!siteId && list.length) setSiteId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!siteId) return;

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 13);

    const startDay = isoDay(start);
    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", ">=", startDay),
      orderBy("day", "asc")
    );

    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => d.data() as any));
    });
  }, [siteId]);

  // day × variant で impression/click_link を揃える
  const chartData = useMemo(() => {
    const map = new Map<string, any>(); // key: day
    const variants = new Set<string>();

    for (const r of rows) {
      const day = r.day;
      const v = r.variantId || "na";
      variants.add(v);

      if (!map.has(day)) map.set(day, { day });
      const obj = map.get(day);

      const key = `${v}__${r.event}`;
      obj[key] = (obj[key] || 0) + Number(r.count || 0);
    }

    // CTR列も作る
    const out = Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
    for (const row of out) {
      for (const v of Array.from(variants)) {
        const imp = Number(row[`${v}__impression`] || 0);
        const clk = Number(row[`${v}__click_link`] || 0);
        row[`${v}__ctr`] = imp > 0 ? Math.round((clk / imp) * 1000) / 10 : 0; // %
      }
    }
    return { out, variants: Array.from(variants).sort() };
  }, [rows]);

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Dashboard</h1>
        <div className="small">過去14日 / stats_daily（variant別）</div>

        <div style={{ height: 12 }} />

        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <div className="h2" style={{ margin: 0 }}>site</div>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.id}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="h2">Impression / Click_link</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.out}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartData.variants.map((v) => (
                <React.Fragment key={v}>
                  <Line type="monotone" dataKey={`${v}__impression`} name={`${v} impression`} dot={false} />
                  <Line type="monotone" dataKey={`${v}__click_link`} name={`${v} click_link`} dot={false} />
                </React.Fragment>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="h2">CTR（click_link / impression）%</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.out}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartData.variants.map((v) => (
                <Line key={v} type="monotone" dataKey={`${v}__ctr`} name={`${v} CTR%`} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}