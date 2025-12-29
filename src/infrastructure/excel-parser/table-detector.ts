/**
 * Table detection module for Excel sheets
 *
 * Uses @rindrics/tblparse to detect table blocks and extract data as 2D arrays.
 * Table pattern: Title row → Header row → Data rows (separated by empty rows)
 */
import type { WorkSheet } from "xlsx";
import {
  detectTableBlocks,
  analyzeBlockStructure,
  extractBlockData,
  type TableBlock,
  type HeaderDetectionOptions,
} from "@rindrics/tblparse";

/**
 * Detected table information
 */
export interface DetectedTable {
  /** Table title */
  title: string;
  /** Title row number (1-based) */
  titleRow: number;
  /** Header row number (1-based) */
  headerRow: number;
  /** Data start row number (1-based) */
  dataStartRow: number;
  /** Data end row number (1-based, inclusive) */
  dataEndRow: number;
  /** Table data as 2D string array (includes title, header, and data rows) */
  data: string[][];
  /** Header row index within data array (0-based) */
  headerIndex: number;
  /** Data start index within data array (0-based) */
  dataStartIndex: number;
}

/**
 * Options for table detection
 */
export interface DetectTablesOptions {
  /** Function to determine if a row is a table title */
  isTableTitle?: (value: string | undefined) => boolean;
  /** Function to determine if a row is a header row */
  isHeaderRow?: (value: string | undefined) => boolean;
  /** Regex pattern for header detection (alternative to isHeaderRow) */
  headerPattern?: RegExp;
  /** Label column to scan (default: "A") */
  labelColumn?: string;
}

/**
 * Default table title detection (non-empty row)
 */
const defaultIsTableTitle = (value: string | undefined): boolean => {
  return !!value && value.trim().length > 0;
};

/**
 * Detect tables by scanning for table blocks
 *
 * Uses tblparse to detect blocks separated by empty rows,
 * then filters by isTableTitle and analyzes structure.
 *
 * @param sheet - Excel worksheet
 * @param options - Detection options
 * @returns Array of detected tables
 */
export function detectTables(
  sheet: WorkSheet,
  options: DetectTablesOptions = {}
): DetectedTable[] {
  const {
    isTableTitle = defaultIsTableTitle,
    isHeaderRow,
    headerPattern,
    labelColumn = "A",
  } = options;

  // Detect all blocks separated by empty rows
  const blocks = detectTableBlocks(sheet, labelColumn);

  const tables: DetectedTable[] = [];

  for (const block of blocks) {
    // Build header detection options
    const headerOptions = buildHeaderOptions(isHeaderRow, headerPattern, block);

    // Analyze block structure
    const structure = analyzeBlockStructure(block, headerOptions);

    // Get title from structure or first row
    const titleValue = structure.titleRow?.labelValue ?? block.rows[0]?.labelValue;

    // Skip blocks that don't match title filter
    if (!isTableTitle(titleValue)) {
      continue;
    }

    // Extract 2D data
    const data = extractBlockData(sheet, block);

    // Calculate indices within data array
    const titleRowIndex = structure.titleRow ? 0 : -1;
    const headerIndex = calculateHeaderIndex(structure, block);
    const dataStartIndex = headerIndex + 1;

    tables.push({
      title: titleValue ?? "",
      titleRow: structure.titleRow?.row ?? block.startRow,
      headerRow: structure.headerRow?.row ?? block.startRow + 1,
      dataStartRow: structure.dataRows[0]?.row ?? block.startRow + 2,
      dataEndRow: structure.dataRows[structure.dataRows.length - 1]?.row ?? block.endRow,
      data,
      headerIndex,
      dataStartIndex,
    });
  }

  return tables;
}

/**
 * Build header detection options for tblparse
 */
function buildHeaderOptions(
  isHeaderRow: ((value: string | undefined) => boolean) | undefined,
  headerPattern: RegExp | undefined,
  block: TableBlock
): HeaderDetectionOptions {
  // If headerPattern is provided, use it directly
  if (headerPattern) {
    return { headerPattern };
  }

  // If isHeaderRow function is provided, find matching row and create pattern
  if (isHeaderRow) {
    for (const row of block.rows) {
      if (isHeaderRow(row.labelValue)) {
        // Create exact match pattern from the label value
        const escapedLabel = escapeRegExp(row.labelValue ?? "");
        return { headerPattern: new RegExp(`^${escapedLabel}$`) };
      }
    }
  }

  // No specific header detection - let tblparse use default logic
  return {};
}

/**
 * Calculate header index within data array
 */
function calculateHeaderIndex(
  structure: ReturnType<typeof analyzeBlockStructure>,
  block: TableBlock
): number {
  if (!structure.headerRow) {
    // No header detected - assume first data row is header
    return structure.titleRow ? 1 : 0;
  }

  // Calculate offset from block start
  return structure.headerRow.row - block.startRow;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect column mapping from header row in 2D data array
 *
 * @param table - Detected table with data
 * @param valueFilter - Function to filter column values (e.g., year range check)
 * @param startCol - Start column index (0-based, default: 1 to skip label column)
 * @returns Map of filtered values to column indices (0-based)
 */
export function detectColumnMapping<T>(
  table: DetectedTable,
  valueFilter: (value: string) => T | null,
  startCol: number = 1
): Map<T, number> {
  const columnMap = new Map<T, number>();
  const headerRow = table.data[table.headerIndex];

  if (!headerRow) {
    return columnMap;
  }

  for (let col = startCol; col < headerRow.length; col++) {
    const value = headerRow[col];
    if (value !== undefined && value !== "") {
      const filtered = valueFilter(value);
      if (filtered !== null) {
        columnMap.set(filtered, col);
      }
    }
  }

  return columnMap;
}

/**
 * Get cell value from 2D data array
 *
 * @param table - Detected table with data
 * @param col - Column index (0-based)
 * @param rowIndex - Row index within data array (0-based)
 * @returns Cell value or undefined
 */
export function getCellValue(
  table: DetectedTable,
  col: number,
  rowIndex: number
): string | undefined {
  const row = table.data[rowIndex];
  if (!row) return undefined;
  const value = row[col];
  return value !== "" ? value : undefined;
}

/**
 * Get data rows from table (excludes title and header)
 *
 * @param table - Detected table
 * @returns Data rows as 2D string array
 */
export function getDataRows(table: DetectedTable): string[][] {
  return table.data.slice(table.dataStartIndex);
}

/**
 * Get header row from table
 *
 * @param table - Detected table
 * @returns Header row as string array
 */
export function getHeaderRow(table: DetectedTable): string[] {
  return table.data[table.headerIndex] ?? [];
}
