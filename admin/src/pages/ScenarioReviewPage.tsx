import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminPreviewWithPins from "../components/AdminPreviewWithPins";

export default function ScenarioReviewPage() {
  const { scenarioId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const siteId = "site_s1rfu064_1771496065677"; // TODO: 実際は context から取得
  const today = new Date().toISOString().slice(0, 10);

  async function fetchReview() {
    setLoading(true);

    const res = await fetch("/api/v1/ai/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_id: siteId,
        day: today,
        scenario_id: scenarioId,
        variant_id: "na",
      }),
    });

    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    fetchReview();
  }, [scenarioId]);

  if (loading) return <div>AI分析中...</div>;

  if (!data) return null;

  const pack = data.packs?.[0];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">AIレビュー</h1>

      {data.rule?.grade === "need_data" && (
        <div className="bg-gray-100 p-4 rounded">
          データ不足のため分析できません（30imp以上で有効）
        </div>
      )}

      {pack && (
        <AdminPreviewWithPins
          actions={pack.actions}
          highlights={pack.highlights}
        />
      )}
    </div>
  );
}