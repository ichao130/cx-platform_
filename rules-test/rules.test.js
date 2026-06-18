/**
 * Firestoreルールのユニットテスト（@firebase/rules-unit-testing）
 * 実行: firebase emulators:exec --only firestore "node rules-test/rules.test.js"
 * 許可/拒否マトリクスを検証。1つでも想定外ならexit 1。
 */
const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc, setDoc, getDocs, query, collection, where,
} = require("firebase/firestore");

let passed = 0, failed = 0;
async function check(label, p) {
  try { await p; console.log(`  ✓ ${label}`); passed++; }
  catch (e) { console.error(`  ✗ ${label}  -> ${e.message}`); failed++; }
}

(async () => {
  const testEnv = await initializeTestEnvironment({
    projectId: "demo-cx-rules",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8") },
  });

  // ── seed（ルール無効で投入）──
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "workspaces/ws1"), { members: { userA: "admin" } });
    await setDoc(doc(db, "workspaces/ws2"), { members: { userB: "owner" } });
    await setDoc(doc(db, "sites/siteA"), { workspaceId: "ws1", memberUids: ["userA"], name: "A" });
    await setDoc(doc(db, "sites/siteB"), { workspaceId: "ws2", memberUids: ["userB"], name: "B" });
    await setDoc(doc(db, "scenarios/scnA"), { siteId: "siteA", workspaceId: "ws1", name: "x" });
    await setDoc(doc(db, "scenarios/scnB"), { siteId: "siteB", workspaceId: "ws2", name: "y" });
    await setDoc(doc(db, "actions/actA"), { siteId: "siteA", workspaceId: "ws1" });
    await setDoc(doc(db, "actions/actB"), { siteId: "siteB", workspaceId: "ws2" });
    await setDoc(doc(db, "templates/tA"), { workspaceId: "ws1" });
    await setDoc(doc(db, "templates/tB"), { workspaceId: "ws2" });
    await setDoc(doc(db, "media/mA"), { workspaceId: "ws1" });
    await setDoc(doc(db, "logs/lA"), { site_id: "siteA", event: "pageview", createdAt: "2026-06-18T00:00:00Z" });
    await setDoc(doc(db, "logs/lB"), { site_id: "siteB", event: "pageview", createdAt: "2026-06-18T00:00:00Z" });
    await setDoc(doc(db, "stats_daily/sA"), { siteId: "siteA", day: "2026-06-18", event: "pageview" });
    await setDoc(doc(db, "stats_daily/sB"), { siteId: "siteB", day: "2026-06-18", event: "pageview" });
  });

  const aDb = testEnv.authenticatedContext("userA").firestore();
  const C = (n) => collection(aDb, n);

  console.log("=== 許可されるべき（userA = ws1/siteA メンバー）===");
  await check("scenarios where siteId==siteA", assertSucceeds(getDocs(query(C("scenarios"), where("siteId", "==", "siteA")))));
  await check("logs where site_id==siteA", assertSucceeds(getDocs(query(C("logs"), where("site_id", "==", "siteA")))));
  await check("stats_daily where siteId==siteA", assertSucceeds(getDocs(query(C("stats_daily"), where("siteId", "==", "siteA")))));
  await check("templates where workspaceId==ws1", assertSucceeds(getDocs(query(C("templates"), where("workspaceId", "==", "ws1")))));
  await check("media where workspaceId==ws1", assertSucceeds(getDocs(query(C("media"), where("workspaceId", "==", "ws1")))));
  await check("actions where workspaceId==ws1", assertSucceeds(getDocs(query(C("actions"), where("workspaceId", "==", "ws1")))));
  await check("actions where siteId==siteA", assertSucceeds(getDocs(query(C("actions"), where("siteId", "==", "siteA")))));
  await check("sites where memberUids array-contains userA", assertSucceeds(getDocs(query(C("sites"), where("memberUids", "array-contains", "userA")))));
  await check("sites where workspaceId==ws1", assertSucceeds(getDocs(query(C("sites"), where("workspaceId", "==", "ws1")))));

  console.log("=== 拒否されるべき（他テナント / 無フィルタ）===");
  await check("scenarios where siteId==siteB (他テナント)", assertFails(getDocs(query(C("scenarios"), where("siteId", "==", "siteB")))));
  await check("scenarios 無フィルタ", assertFails(getDocs(C("scenarios"))));
  await check("logs where site_id==siteB", assertFails(getDocs(query(C("logs"), where("site_id", "==", "siteB")))));
  await check("stats_daily where siteId==siteB", assertFails(getDocs(query(C("stats_daily"), where("siteId", "==", "siteB")))));
  await check("templates where workspaceId==ws2", assertFails(getDocs(query(C("templates"), where("workspaceId", "==", "ws2")))));
  await check("media where workspaceId==ws2", assertFails(getDocs(query(C("media"), where("workspaceId", "==", "ws2")))));
  await check("actions where siteId==siteB", assertFails(getDocs(query(C("actions"), where("siteId", "==", "siteB")))));
  await check("sites where workspaceId==ws2", assertFails(getDocs(query(C("sites"), where("workspaceId", "==", "ws2")))));
  await check("sites 無フィルタ", assertFails(getDocs(C("sites"))));

  await testEnv.cleanup();
  console.log(`\n結果: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
