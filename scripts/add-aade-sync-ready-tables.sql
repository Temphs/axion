CREATE TABLE IF NOT EXISTS aade_connections (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  entity_vat_number TEXT NOT NULL,
  aade_user_id TEXT,
  credential_secret_name TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aade_sync_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connection_id TEXT,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  status TEXT NOT NULL,
  raw_s3_bucket TEXT,
  raw_s3_key TEXT,
  normalized_s3_bucket TEXT,
  normalized_s3_key TEXT,
  records_found INTEGER NOT NULL DEFAULT 0,
  records_imported INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  description TEXT,
  quantity REAL,
  unit_price_cents INTEGER,
  net_amount_cents INTEGER,
  vat_rate REAL,
  vat_amount_cents INTEGER,
  gross_amount_cents INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aade_connections_company_id
ON aade_connections(company_id);

CREATE INDEX IF NOT EXISTS idx_aade_sync_jobs_company_id
ON aade_sync_jobs(company_id);

CREATE INDEX IF NOT EXISTS idx_aade_sync_jobs_status
ON aade_sync_jobs(status);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id
ON invoice_line_items(invoice_id);

INSERT OR IGNORE INTO aade_connections (
  id,
  company_id,
  entity_vat_number,
  aade_user_id,
  credential_secret_name,
  environment,
  is_active
)
VALUES (
  'aade_connection_demo_1',
  'company_demo_1',
  '123456789',
  'demo_aade_user',
  'demo/aade/credentials',
  'sandbox',
  1
);