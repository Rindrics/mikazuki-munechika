/**
 * Data extraction module for detected tables
 *
 * Extracts structured data from 2D table arrays.
 */
import { DetectedTable, detectColumnMapping, getDataRows } from "./table-detector";

/**
 * Parsed matrix data (row × column)
 */
export interface MatrixData<TCol, TRow> {
  /** Column values */
  columns: TCol[];
  /** Row values */
  rows: TRow[];
  /** Data array [column index][row index] */
  data: number[][];
}

/**
 * Extract row × column matrix data from a table
 *
 * @param table - Detected table with 2D data
 * @param columnFilter - Function to filter column values (e.g., year range check)
 * @param rowExtractor - Function to extract row label values (e.g., age extraction)
 * @param multiplier - Multiplier for unit conversion (default: 1)
 * @returns Matrix data
 */
export function parseMatrixData<TCol, TRow>(
  table: DetectedTable,
  columnFilter: (value: string) => TCol | null,
  rowExtractor: (label: string) => TRow | null,
  multiplier: number = 1
): MatrixData<TCol, TRow> {
  const columnMap = detectColumnMapping(table, columnFilter);

  if (columnMap.size === 0) {
    throw new Error(`No columns detected in table "${table.title}"`);
  }

  const columns = Array.from(columnMap.keys());
  const dataRows = getDataRows(table);

  const rows: TRow[] = [];
  const rowDataList: string[][] = [];

  // Identify data rows by extracting row labels
  for (const row of dataRows) {
    const labelValue = row[0];
    if (!labelValue) continue;

    const extracted = rowExtractor(labelValue);
    if (extracted !== null) {
      rows.push(extracted);
      rowDataList.push(row);
    }
  }

  if (rows.length === 0) {
    throw new Error(`No data rows detected in table "${table.title}"`);
  }

  // Extract numeric data for each column
  const data: number[][] = [];
  for (const [, colIndex] of columnMap) {
    const colData: number[] = [];

    for (const row of rowDataList) {
      const cellValue = row[colIndex];
      const numValue = parseFloat(cellValue);
      const value = !isNaN(numValue) ? numValue * multiplier : 0;
      colData.push(value);
    }

    data.push(colData);
  }

  return {
    columns,
    rows,
    data,
  };
}

/**
 * Extract single row data from a table by row label
 *
 * @param table - Detected table with 2D data
 * @param rowLabel - Label of the row to extract
 * @param columnFilter - Function to filter column values
 * @returns Map of column values to cell values
 */
export function parseRowByLabel<TCol>(
  table: DetectedTable,
  rowLabel: string,
  columnFilter: (value: string) => TCol | null
): Map<TCol, number> {
  const columnMap = detectColumnMapping(table, columnFilter);
  const result = new Map<TCol, number>();
  const dataRows = getDataRows(table);

  // Find the row with matching label
  let targetRow: string[] | undefined;
  for (const row of dataRows) {
    const labelValue = row[0];
    if (labelValue === rowLabel) {
      targetRow = row;
      break;
    }
  }

  if (!targetRow) {
    return result;
  }

  for (const [col, colIndex] of columnMap) {
    const cellValue = targetRow[colIndex];
    const numValue = parseFloat(cellValue);
    if (!isNaN(numValue)) {
      result.set(col, numValue);
    }
  }

  return result;
}
