#!/usr/bin/env bash
# One-shot local dev setup for Axion.
#
#   ./scripts/dev-setup.sh && npm run dev
#
# Idempotent: safe to re-run. Never overwrites an existing .env.local.
#
# Why this exists: prisma/migrations only carries the pre-multi-tenant schema.
# The user-ownership, contract-hours, workforce and VAT changes live in
# scripts/*.sql and have to be applied on top, or the dashboard 500s on any
# page that touches userId, Invoice, AadeConnection or VatSyncLog.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
npm install

if [ -f .env.local ]; then
  echo "==> .env.local exists, leaving it alone"
else
  echo "==> Writing .env.local (local dev defaults)"
  key=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > .env.local <<EOF
# Local dev only. Gitignored. See .env.example for the full set of options.
DATABASE_URL=file:./dev.db
AXION_ENCRYPTION_KEY=$key
# mock = demo invoices, no live AADE calls. Use test/production with real creds.
AADE_ENV=mock
EOF
fi

echo "==> Applying Prisma migrations"
DATABASE_URL="file:./dev.db" npx prisma migrate deploy

echo "==> Applying out-of-band SQL migrations"
# SQLite has no ADD COLUMN IF NOT EXISTS, so each file is guarded by a sentinel
# column it introduces. Format: <file>:<table>:<column>
for spec in \
  add-user-ownership:Employee:userId \
  add-contract-hours:Employee:contractHoursPerMonth \
  add-workforce-targets:Employee:targetUtilizationPct \
  add-vat-module:Invoice:aadeMark
do
  f=${spec%%:*}; rest=${spec#*:}; table=${rest%%:*}; column=${rest#*:}
  if node scripts/has-column.mjs "$table" "$column"; then
    echo "    skip scripts/$f.sql (already applied)"
  else
    node scripts/run-sql-local.mjs "scripts/$f.sql"
  fi
done

echo
echo "Done. Start the app with:"
echo "    npm run dev"
echo "then open http://localhost:3000 (redirects to /el; /en for English)."
