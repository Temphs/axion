import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const db = createClient({
  url,
  authToken,
});

const result = await db.execute(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name;
`);

console.log("Tables in Turso:");
for (const row of result.rows) {
  console.log("-", row.name);
}