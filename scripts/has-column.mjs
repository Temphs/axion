// Exits 0 if <table>.<column> exists in the local dev.db, 1 otherwise.
// Lets dev-setup.sh skip SQL files that are already applied, since SQLite has
// no ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
//   node scripts/has-column.mjs Employee userId
import { createClient } from "@libsql/client";

const [table, column] = process.argv.slice(2);
if (!table || !column) {
  console.error("Usage: node scripts/has-column.mjs <table> <column>");
  process.exit(2);
}

const db = createClient({ url: "file:./dev.db" });
const { rows } = await db.execute(`PRAGMA table_info("${table}")`);
process.exit(rows.some((r) => r.name === column) ? 0 : 1);
