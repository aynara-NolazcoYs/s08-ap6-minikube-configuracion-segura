const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = Number(process.env.APP_PORT || 3000);
const { DB_HOST, DB_NAME, DB_USER, DB_PASS } = process.env;

if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASS) {
  throw new Error("DB_HOST, DB_NAME, DB_USER, and DB_PASS must be configured");
}

const mongoUri =
  `mongodb://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASS)}` +
  `@${DB_HOST}:27017/${encodeURIComponent(DB_NAME)}?authSource=admin`;
const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
let items;

app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
  res.status(items ? 200 : 503).json({ status: items ? "ok" : "starting" });
});

app.get("/live", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/items", async (_req, res, next) => {
  try {
    const results = await items.find().sort({ _id: -1 }).limit(100).toArray();
    res.json(results);
  } catch (error) {
    next(error);
  }
});

app.post("/api/items", async (req, res, next) => {
  if (typeof req.body?.name !== "string" || !req.body.name.trim()) {
    return res.status(400).json({ error: "name must be a non-empty string" });
  }

  try {
    const item = { name: req.body.name.trim(), createdAt: new Date() };
    const result = await items.insertOne(item);
    res.status(201).json({ ...item, _id: result.insertedId });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

async function connectToMongo() {
  while (!items) {
    try {
      await client.connect();
      items = client.db(DB_NAME).collection("items");
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Could not connect to MongoDB; retrying in 3 seconds:", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${port}`);
});
connectToMongo();

async function shutdown() {
  server.close(async () => {
    await client.close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
