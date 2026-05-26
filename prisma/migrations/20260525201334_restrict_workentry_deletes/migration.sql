-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workType" TEXT,
    "minutes" INTEGER NOT NULL,
    "notes" TEXT,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkEntry" ("clientId", "createdAt", "date", "employeeId", "externalId", "id", "minutes", "notes", "updatedAt", "workType") SELECT "clientId", "createdAt", "date", "employeeId", "externalId", "id", "minutes", "notes", "updatedAt", "workType" FROM "WorkEntry";
DROP TABLE "WorkEntry";
ALTER TABLE "new_WorkEntry" RENAME TO "WorkEntry";
CREATE UNIQUE INDEX "WorkEntry_externalId_key" ON "WorkEntry"("externalId");
CREATE INDEX "WorkEntry_date_idx" ON "WorkEntry"("date");
CREATE INDEX "WorkEntry_employeeId_idx" ON "WorkEntry"("employeeId");
CREATE INDEX "WorkEntry_clientId_idx" ON "WorkEntry"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
