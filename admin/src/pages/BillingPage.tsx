import React, { useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api/v1";

function readWorkspaceId() {
  try {
    return (
      localStorage.getItem("cx_admin_workspace_id") ||
      localStorage.getItem("cx_admin_selected_workspace") ||
      null
    );
  } catch {
    return null;
  }
}

type Billing = {
  plan: "free" | "pro" | "enterprise";
  status: "active" | "trialing" | "canceled" | "past_due" | "none";
  trial_days?: number;
  billing_email?: string;
};

export default function BillingPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaceId(readWorkspaceId());

    const handler = (e: any) => {
      const ws = e?.detail?.workspaceId;
      if (ws) setWorkspaceId(ws);
    };

    window.addEventListener("cx_admin_workspace_changed", handler);

    return () => window.removeEventListener("cx_admin_workspace_changed", handler);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    loadBilling();
  }, [workspaceId]);

  async function getToken() {
    const user = auth?.currentUser;
    if (!user) throw new Error("not logged in");

    return user.getIdToken();
  }

  async function loadBilling() {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      const res = await fetch(`${API_BASE}/workspaces/billing/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      const json = await res.json();

      if (!json.ok) throw new Error(json.message);

      setBilling(json.billing);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }

    setLoading(false);
  }

  async function saveBilling() {
    if (!workspaceId || !billing) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();

      const res = await fetch(`${API_BASE}/workspaces/billing/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          plan: billing.plan,
          status: billing.status,
          trial_days: billing.trial_days,
          billing_email: billing.billing_email,
        }),
      });

      const json = await res.json();

      if (!json.ok) throw new Error(json.message);

      alert("Billing updated");
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }

    setSaving(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Billing</h2>

      <div style={{ marginBottom: 12 }}>
        Workspace: <b>{workspaceId || "none"}</b>
      </div>

      {loading && <div>loading...</div>}

      {error && <div style={{ color: "red" }}>{error}</div>}

      {billing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          <label>
            Plan
            <select
              value={billing.plan}
              onChange={(e) =>
                setBilling({ ...billing, plan: e.target.value as Billing["plan"] })
              }
            >
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>

          <label>
            Status
            <select
              value={billing.status}
              onChange={(e) =>
                setBilling({ ...billing, status: e.target.value as Billing["status"] })
              }
            >
              <option value="none">none</option>
              <option value="trialing">trialing</option>
              <option value="active">active</option>
              <option value="past_due">past_due</option>
              <option value="canceled">canceled</option>
            </select>
          </label>

          <label>
            Trial Days
            <input
              type="number"
              value={billing.trial_days || 0}
              onChange={(e) =>
                setBilling({ ...billing, trial_days: Number(e.target.value) })
              }
            />
          </label>

          <label>
            Billing Email
            <input
              value={billing.billing_email || ""}
              onChange={(e) =>
                setBilling({ ...billing, billing_email: e.target.value })
              }
            />
          </label>

          <button onClick={saveBilling} disabled={saving}>
            Save Billing
          </button>
        </div>
      )}
    </div>
  );
}
