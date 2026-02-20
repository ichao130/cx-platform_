"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
// ★これを追加（必ず “app作る前” に）
const admin_1 = require("./services/admin");
(0, v2_1.setGlobalOptions)({ region: "asia-northeast1" });
// ★ここで初期化を確定させる
(0, admin_1.ensureAdminApp)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json({ limit: "1mb" }));
const v1_1 = require("./routes/v1");
(0, v1_1.registerV1Routes)(app);
exports.api = (0, https_1.onRequest)(app);
