"use strict";

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;
const POLESTAR_BASE = "https://api.polestar-production.com";

app.use(cors());
app.use(express.json());

app.all("/proxy", async (req, res) => {
  const upstreamPath = req.query.path;

  if (!upstreamPath) {
    return res.status(400).json({ error: "Missing required query param: path" });
  }

  const apiKey = req.headers["api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "Missing required header: api-key" });
  }

  // Forward all query params except `path` to the upstream URL
  const forwardedParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== "path") {
      forwardedParams.append(key, value);
    }
  }

  const paramString = forwardedParams.toString();
  const upstreamUrl = `${POLESTAR_BASE}${upstreamPath}${paramString ? `?${paramString}` : ""}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: ["POST", "PUT", "PATCH"].includes(req.method)
        ? JSON.stringify(req.body)
        : undefined,
    });

    const contentType = upstreamRes.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await upstreamRes.json()
      : await upstreamRes.text();

    res.status(upstreamRes.status);
    res.setHeader("Content-Type", contentType || "application/json");
    res.send(body);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(502).json({ error: "Bad gateway", detail: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Polestar proxy listening on port ${PORT}`);
});
