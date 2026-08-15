// Applies a SQL file to the local dev.db (file-based libSQL), the counterpart
// of run-sql-file.mjs which targets Turso.
//   node scripts/run-sql-local.mjs <path-to-sql-file>
import { createClient } from "@libsql/client";
import fs from "node:fs";

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error("Usage: node scripts/run-sql-local.mjs <path-to-sql-file>");
  process.exit(1);
}

const db = createClient({ url: "file:./dev.db" });
await db.executeMultiple(fs.readFileSync(filePath, "utf8"));
console.log(`Applied ${filePath} to file:./dev.db`);
