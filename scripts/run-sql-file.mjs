import { createClient } from "@libsql/client";
import fs from "node:fs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const filePath = process.argv[2];

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

if (!filePath) {
  console.error("Usage: node scripts/run-sql-file.mjs <path-to-sql-file>");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`SQL file not found: ${filePath}`);
  process.exit(1);
}

const sql = fs.readFileSync(filePath, "utf8");

const statements = sql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const db = createClient({
  url,
  authToken,
});

for (const statement of statements) {
  console.log("Running:", statement.slice(0, 100).replace(/\s+/g, " ") + "...");
  await db.execute(statement);
}

console.log("SQL file applied successfully.");