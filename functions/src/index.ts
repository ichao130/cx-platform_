import express from "express";
import cors from "cors";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

// ★これを追加（必ず “app作る前” に）
import { ensureAdminApp } from "./services/admin";

setGlobalOptions({ region: "asia-northeast1" });

// ★ここで初期化を確定させる
ensureAdminApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

import { registerV1Routes } from "./routes/v1";
registerV1Routes(app);

export const api = onRequest(app);