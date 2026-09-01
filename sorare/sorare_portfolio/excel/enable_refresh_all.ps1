# Optional: turn the workbook's static data blocks into live Power Query tables,
# so you can press Data > Refresh All instead of letting the updater rebuild the
# file. Run it once, from this folder, with Excel closed:
#
#     powershell -ExecutionPolicy Bypass -File sorare_portfolio\excel\enable_refresh_all.ps1
#
# It needs desktop Excel (it drives Excel itself). If it fails, nothing is lost:
# the workbook keeps working exactly as it does now, rebuilt by the updater.

param(
    [string]$Workbook = "$PSScriptRoot\..\..\workbook\Sorare_Portfolio.xlsx",
    [string]$ExportFolder = "$PSScriptRoot\..\..\data\exports"
)

$ErrorActionPreference = "Stop"
$Workbook = (Resolve-Path $Workbook).Path
$ExportFolder = (Resolve-Path $ExportFolder).Path

# dataset name -> sheet and top-left cell it must load into. These match
# PLACEMENTS in build_workbook.py; keep the two in step.
$targets = @(
    @{ Name = "holdings";           Sheet = "Holdings";        Anchor = "A6" },
    @{ Name = "liquidity";          Sheet = "Liquidity";       Anchor = "A6" },
    @{ Name = "transactions";       Sheet = "Transactions";    Anchor = "A6" },
    @{ Name = "realised_trades";    Sheet = "Transactions";    Anchor = "T6" },
    @{ Name = "rewards";            Sheet = "Rewards";         Anchor = "A6" },
    @{ Name = "essence_summary";    Sheet = "Essence";         Anchor = "A6" },
    @{ Name = "essence_ledger";     Sheet = "Essence";         Anchor = "A14" },
    @{ Name = "essence_by_draw";    Sheet = "Essence";         Anchor = "W6" },
    @{ Name = "investments";        Sheet = "Investments";     Anchor = "A6" },
    @{ Name = "price_tape";         Sheet = "Price History";   Anchor = "A6" },
    @{ Name = "kpis";               Sheet = "_data_kpis";      Anchor = "A1" },
    @{ Name = "player_stats";       Sheet = "_data_stats";     Anchor = "A1" },
    @{ Name = "price_tape_index";   Sheet = "_data_tapeindex"; Anchor = "A1" },
    @{ Name = "positions_list";     Sheet = "_data_positions"; Anchor = "A1" },
    @{ Name = "allocations";        Sheet = "_data_alloc";     Anchor = "A1" },
    @{ Name = "top_exposures";      Sheet = "_data_top";       Anchor = "A1" },
    @{ Name = "nav_history";        Sheet = "_data_nav";       Anchor = "A1" },
    @{ Name = "rewards_by_month";   Sheet = "_data_rw_month";  Anchor = "A1" },
    @{ Name = "rewards_by_competition"; Sheet = "_data_rw_comp"; Anchor = "A1" },
    @{ Name = "rewards_by_scarcity"; Sheet = "_data_rw_scar";  Anchor = "A1" },
    @{ Name = "meta";               Sheet = "_data_meta";      Anchor = "A1" },
    @{ Name = "refresh_log";        Sheet = "_data_refresh";   Anchor = "A1" },
    @{ Name = "settings";           Sheet = "_data_settings";  Anchor = "A1" }
)

Write-Host "Opening Excel ..."
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $book = $excel.Workbooks.Open($Workbook)

    foreach ($target in $targets) {
        $csv = Join-Path $ExportFolder ("{0}.csv" -f $target.Name)
        if (-not (Test-Path $csv)) {
            Write-Host ("  skipped {0} (no export yet)" -f $target.Name)
            continue
        }

        $queryName = "sorare_" + $target.Name
        $m = @"
let
    Source = Csv.Document(File.Contents("$csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Headers, List.Transform(Table.ColumnNames(Headers), each {_, type any}))
in
    Typed
"@

        # Replace the query if this script has run before.
        foreach ($existing in @($book.Queries)) {
            if ($existing.Name -eq $queryName) { $existing.Delete() }
        }
        $book.Queries.Add($queryName, $m) | Out-Null

        $sheet = $book.Worksheets.Item($target.Sheet)

        # Clear whatever is sitting where the table must go: either the static
        # block written by the builder, or a table from an earlier run.
        foreach ($listObject in @($sheet.ListObjects)) {
            if ($listObject.Name -like "sorare_*") { $listObject.Delete() }
        }
        $anchor = $sheet.Range($target.Anchor)
        $lastRow = $sheet.UsedRange.Row + $sheet.UsedRange.Rows.Count
        $lastColumn = $anchor.Column + 60
        $sheet.Range($anchor, $sheet.Cells.Item($lastRow, $lastColumn)).Clear() | Out-Null

        $connectionString = "OLEDB;Provider=Microsoft.Mashup.OleDb.1;Data Source=`$Workbook`$;Location=$queryName"
        $connection = $book.Connections.Add2($queryName, "Sorare portfolio export", $connectionString, $queryName, 2)
        $table = $sheet.ListObjects.Add(4, $connection, $null, 1, $anchor)
        $table.Name = $queryName
        $table.TableStyle = ""
        Write-Host ("  linked {0} -> {1}!{2}" -f $target.Name, $target.Sheet, $target.Anchor)
    }

    $book.RefreshAll()
    $excel.CalculateUntilAsyncQueriesDone()
    $book.Save()
    $book.Close($true)
    Write-Host ""
    Write-Host "Done. From now on: run the updater, open the workbook, press Data > Refresh All."
}
catch {
    Write-Host ""
    Write-Host "Could not enable Power Query: $_"
    Write-Host "Nothing was broken - keep using the workbook as it is; the updater rebuilds it."
    exit 1
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
