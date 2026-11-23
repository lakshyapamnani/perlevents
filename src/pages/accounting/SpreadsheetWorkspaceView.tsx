import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileSpreadsheet,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  RotateCw,
  Search,
  CheckCircle2,
  ChevronDown,
  X,
  PlusCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  SpreadsheetWorkbook,
  SpreadsheetSheet,
  SpreadsheetCellData,
} from '../../types/accounting';
import { initialDefaultWorkbook } from '../../services/seedData';

// Helper: Convert column index (0-based) to letter (0 -> 'A', 25 -> 'Z', 26 -> 'AA')
function colIndexToLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Helper: Convert letter to column index ('A' -> 0, 'Z' -> 25)
function letterToColIndex(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col - 1;
}

// Helper: Parse cell coordinate like "B4" into { col: 1, row: 3 }
function parseCellCoord(coord: string): { col: number; row: number; colLetter: string } | null {
  const match = coord.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  const colLetter = match[1].toUpperCase();
  const rowNum = parseInt(match[2], 10) - 1;
  return { col: letterToColIndex(colLetter), row: rowNum, colLetter };
}

// Helper: Expand range like "A1:A5" into array of cell coordinates ["A1", "A2", "A3", "A4", "A5"]
function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr];
  const start = parseCellCoord(parts[0]);
  const end = parseCellCoord(parts[1]);
  if (!start || !end) return [rangeStr];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const coords: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      coords.push(`${colIndexToLetter(c)}${r + 1}`);
    }
  }
  return coords;
}

export const SpreadsheetWorkspaceView: React.FC = () => {
  const { spreadsheets, saveSpreadsheetWorkbook } = useData();

  // Load workbook from state or fallback to default
  const defaultWb = useMemo(() => {
    const list = Object.values(spreadsheets || {});
    return list.length > 0 ? list[0] : initialDefaultWorkbook;
  }, [spreadsheets]);

  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook>(defaultWb);
  const [activeSheetId, setActiveSheetId] = useState<string>(
    defaultWb.activeSheetId || defaultWb.sheets[0]?.id || 'sheet_overview'
  );

  // Undo / Redo history
  const [history, setHistory] = useState<SpreadsheetWorkbook[]>([defaultWb]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Cell Selection & Editing
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isSaved, setIsSaved] = useState(true);

  // Search & Help
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);

  // Sync if spreadsheets change from remote
  useEffect(() => {
    const list = Object.values(spreadsheets || {});
    if (list.length > 0 && list[0].id === workbook.id && list[0].updatedAt !== workbook.updatedAt) {
      setWorkbook(list[0]);
      if (list[0].sheets.some((s) => s.id === activeSheetId)) {
        // activeSheetId is valid
      } else {
        setActiveSheetId(list[0].sheets[0]?.id || 'sheet_overview');
      }
    }
  }, [spreadsheets]);

  // Current active sheet
  const activeSheet: SpreadsheetSheet = useMemo(() => {
    return (
      workbook.sheets.find((s) => s.id === activeSheetId) ||
      workbook.sheets[0] || {
        id: 'default',
        name: 'Sheet 1',
        rowCount: 40,
        colCount: 15,
        cells: {},
      }
    );
  }, [workbook, activeSheetId]);

  // Safe formula computation engine
  const evaluateCell = useCallback(
    (cellKey: string, cells: Record<string, SpreadsheetCellData>, visited: Set<string> = new Set()): string | number => {
      const cell = cells[cellKey];
      if (!cell) return '';

      const raw = cell.formula !== undefined ? cell.formula : cell.value;
      if (raw === undefined || raw === null) return '';

      const rawStr = String(raw).trim();
      if (!rawStr.startsWith('=')) {
        return raw;
      }

      // Check circular reference
      if (visited.has(cellKey)) {
        return '#CIRCULAR!';
      }
      visited.add(cellKey);

      const expr = rawStr.substring(1).trim();

      try {
        // 1. Function: SUM(range or list)
        const sumMatch = expr.match(/^SUM\(([^)]+)\)$/i);
        if (sumMatch) {
          const args = sumMatch[1].split(',');
          let total = 0;
          args.forEach((arg) => {
            const trimmed = arg.trim();
            if (trimmed.includes(':')) {
              expandRange(trimmed).forEach((cKey) => {
                const val = parseFloat(String(evaluateCell(cKey, cells, new Set(visited))));
                if (!isNaN(val)) total += val;
              });
            } else {
              const val = parseFloat(String(evaluateCell(trimmed, cells, new Set(visited))));
              if (!isNaN(val)) total += val;
            }
          });
          return Math.round(total * 100) / 100;
        }

        // 2. Function: AVERAGE(range)
        const avgMatch = expr.match(/^AVERAGE\(([^)]+)\)$/i);
        if (avgMatch) {
          const coords = expandRange(avgMatch[1].trim());
          let sum = 0;
          let count = 0;
          coords.forEach((cKey) => {
            const val = parseFloat(String(evaluateCell(cKey, cells, new Set(visited))));
            if (!isNaN(val)) {
              sum += val;
              count++;
            }
          });
          return count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
        }

        // 3. Function: MIN(range) & MAX(range)
        const minMatch = expr.match(/^MIN\(([^)]+)\)$/i);
        if (minMatch) {
          const coords = expandRange(minMatch[1].trim());
          const vals: number[] = [];
          coords.forEach((cKey) => {
            const val = parseFloat(String(evaluateCell(cKey, cells, new Set(visited))));
            if (!isNaN(val)) vals.push(val);
          });
          return vals.length > 0 ? Math.min(...vals) : 0;
        }

        const maxMatch = expr.match(/^MAX\(([^)]+)\)$/i);
        if (maxMatch) {
          const coords = expandRange(maxMatch[1].trim());
          const vals: number[] = [];
          coords.forEach((cKey) => {
            const val = parseFloat(String(evaluateCell(cKey, cells, new Set(visited))));
            if (!isNaN(val)) vals.push(val);
          });
          return vals.length > 0 ? Math.max(...vals) : 0;
        }

        // 4. Function: COUNT(range) & COUNTA(range)
        const countMatch = expr.match(/^COUNT\(([^)]+)\)$/i);
        if (countMatch) {
          const coords = expandRange(countMatch[1].trim());
          let count = 0;
          coords.forEach((cKey) => {
            const val = parseFloat(String(evaluateCell(cKey, cells, new Set(visited))));
            if (!isNaN(val)) count++;
          });
          return count;
        }

        const countaMatch = expr.match(/^COUNTA\(([^)]+)\)$/i);
        if (countaMatch) {
          const coords = expandRange(countaMatch[1].trim());
          let count = 0;
          coords.forEach((cKey) => {
            const val = evaluateCell(cKey, cells, new Set(visited));
            if (val !== '' && val !== null && val !== undefined) count++;
          });
          return count;
        }

        // 5. Function: IF(condition, trueVal, falseVal)
        const ifMatch = expr.match(/^IF\(([^,]+),([^,]+),([^)]+)\)$/i);
        if (ifMatch) {
          const cond = ifMatch[1].trim();
          const trueVal = ifMatch[2].trim().replace(/^["']|["']$/g, '');
          const falseVal = ifMatch[3].trim().replace(/^["']|["']$/g, '');

          // evaluate simple comparison in condition: e.g. A1>10, B2="Yes"
          const compMatch = cond.match(/^([A-Za-z0-9]+)\s*(>=|<=|>|<|==|=|!=)\s*([A-Za-z0-9"']+)$/);
          if (compMatch) {
            const leftVal = evaluateCell(compMatch[1], cells, new Set(visited));
            const op = compMatch[2];
            const rightRaw = compMatch[3].replace(/^["']|["']$/g, '');
            const leftNum = parseFloat(String(leftVal));
            const rightNum = parseFloat(rightRaw);

            let passed = false;
            if (!isNaN(leftNum) && !isNaN(rightNum)) {
              if (op === '>') passed = leftNum > rightNum;
              else if (op === '<') passed = leftNum < rightNum;
              else if (op === '>=') passed = leftNum >= rightNum;
              else if (op === '<=') passed = leftNum <= rightNum;
              else if (op === '=' || op === '==') passed = leftNum === rightNum;
              else if (op === '!=') passed = leftNum !== rightNum;
            } else {
              passed = String(leftVal) === rightRaw;
            }
            return passed ? trueVal : falseVal;
          }
          return falseVal;
        }

        // 6. Function: ROUND(val, decimals)
        const roundMatch = expr.match(/^ROUND\(([^,]+),([^)]+)\)$/i);
        if (roundMatch) {
          const val = parseFloat(String(evaluateCell(roundMatch[1].trim(), cells, new Set(visited))));
          const dec = parseInt(roundMatch[2].trim(), 10) || 0;
          return !isNaN(val) ? val.toFixed(dec) : 0;
        }

        // 7. Basic Arithmetic with cell references: e.g. B4-B5 or A1+B1 or A1*1.18
        // Replace cell references with evaluated numeric values
        const sanitized = expr.replace(/[A-Za-z]+[0-9]+/g, (matchCoord) => {
          const res = evaluateCell(matchCoord.toUpperCase(), cells, new Set(visited));
          const num = parseFloat(String(res));
          return isNaN(num) ? '0' : String(num);
        });

        // Only allow safe arithmetic characters: digits, ., +, -, *, /, (, ), spaces
        if (/^[\d.\s+\-*/()]+$/.test(sanitized)) {
          // Safe mathematical expression evaluation
          const safeEval = new Function(`return (${sanitized});`);
          const result = safeEval();
          return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
        }

        return '#VALUE!';
      } catch (err) {
        return '#ERROR!';
      }
    },
    []
  );

  // Sync formula bar when selected cell changes
  useEffect(() => {
    const cell = activeSheet.cells[selectedCell];
    if (cell) {
      setFormulaBarValue(cell.formula !== undefined ? cell.formula : String(cell.value ?? ''));
    } else {
      setFormulaBarValue('');
    }
  }, [selectedCell, activeSheet]);

  // Push new state to history & save
  const commitWorkbookState = (newWb: SpreadsheetWorkbook) => {
    const updated: SpreadsheetWorkbook = {
      ...newWb,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Accountant',
    };
    setWorkbook(updated);
    saveSpreadsheetWorkbook(updated);
    setIsSaved(true);

    // History stack (truncate future redo)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updated);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setWorkbook(prev);
      saveSpreadsheetWorkbook(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setWorkbook(next);
      saveSpreadsheetWorkbook(next);
    }
  };

  // Update cell value/formula
  const updateCellValue = (cellKey: string, inputVal: string) => {
    const isFormula = inputVal.trim().startsWith('=');
    const existing = activeSheet.cells[cellKey] || { value: '' };

    const newCellData: SpreadsheetCellData = {
      ...existing,
      formula: isFormula ? inputVal.trim() : undefined,
      value: isFormula ? '' : inputVal,
    };

    const newSheets = workbook.sheets.map((s) => {
      if (s.id !== activeSheet.id) return s;
      const updatedCells = { ...s.cells, [cellKey]: newCellData };
      return { ...s, cells: updatedCells };
    });

    commitWorkbookState({ ...workbook, sheets: newSheets });
  };

  // Apply styling to selected cell
  const toggleStyle = (styleKey: 'bold' | 'italic') => {
    const existing = activeSheet.cells[selectedCell] || { value: '' };
    const newCellData: SpreadsheetCellData = {
      ...existing,
      [styleKey]: !existing[styleKey],
    };

    const newSheets = workbook.sheets.map((s) => {
      if (s.id !== activeSheet.id) return s;
      return { ...s, cells: { ...s.cells, [selectedCell]: newCellData } };
    });

    commitWorkbookState({ ...workbook, sheets: newSheets });
  };

  const setAlignment = (align: 'left' | 'center' | 'right') => {
    const existing = activeSheet.cells[selectedCell] || { value: '' };
    const newCellData: SpreadsheetCellData = { ...existing, align };

    const newSheets = workbook.sheets.map((s) => {
      if (s.id !== activeSheet.id) return s;
      return { ...s, cells: { ...s.cells, [selectedCell]: newCellData } };
    });

    commitWorkbookState({ ...workbook, sheets: newSheets });
  };

  // Add Row
  const handleAddRow = () => {
    const newSheets = workbook.sheets.map((s) => {
      if (s.id !== activeSheet.id) return s;
      return { ...s, rowCount: s.rowCount + 5 };
    });
    commitWorkbookState({ ...workbook, sheets: newSheets });
  };

  // Add Column
  const handleAddColumn = () => {
    const newSheets = workbook.sheets.map((s) => {
      if (s.id !== activeSheet.id) return s;
      return { ...s, colCount: s.colCount + 2 };
    });
    commitWorkbookState({ ...workbook, sheets: newSheets });
  };

  // Add Worksheet
  const handleAddSheet = () => {
    const sheetNum = workbook.sheets.length + 1;
    const newSheet: SpreadsheetSheet = {
      id: `sheet_custom_${Date.now()}`,
      name: `Sheet ${sheetNum}`,
      rowCount: 40,
      colCount: 12,
      cells: {},
    };
    const newSheets = [...workbook.sheets, newSheet];
    setActiveSheetId(newSheet.id);
    commitWorkbookState({ ...workbook, activeSheetId: newSheet.id, sheets: newSheets });
  };

  // Export current worksheet to CSV
  const handleExportCSV = () => {
    const rows: string[][] = [];
    for (let r = 0; r < activeSheet.rowCount; r++) {
      const rowVals: string[] = [];
      let hasData = false;
      for (let c = 0; c < activeSheet.colCount; c++) {
        const coord = `${colIndexToLetter(c)}${r + 1}`;
        const val = evaluateCell(coord, activeSheet.cells);
        const strVal = String(val ?? '');
        if (strVal !== '') hasData = true;
        rowVals.push(`"${strVal.replace(/"/g, '""')}"`);
      }
      if (hasData || r < 10) {
        rows.push(rowVals);
      }
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeSheet.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV into active sheet
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const newCells: Record<string, SpreadsheetCellData> = { ...activeSheet.cells };

      lines.forEach((line, rIdx) => {
        const cols = line.split(',');
        cols.forEach((val, cIdx) => {
          const clean = val.replace(/^"|"$/g, '').trim();
          if (clean) {
            const coord = `${colIndexToLetter(cIdx)}${rIdx + 1}`;
            newCells[coord] = { value: clean };
          }
        });
      });

      const newSheets = workbook.sheets.map((s) => {
        if (s.id !== activeSheet.id) return s;
        return {
          ...s,
          rowCount: Math.max(s.rowCount, lines.length + 5),
          cells: newCells,
        };
      });

      commitWorkbookState({ ...workbook, sheets: newSheets });
    };
    reader.readAsText(file);
  };

  // Keyboard navigation on grid
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditingInline) return;

    const coord = parseCellCoord(selectedCell);
    if (!coord) return;

    if (e.key === 'ArrowUp' && coord.row > 0) {
      e.preventDefault();
      setSelectedCell(`${colIndexToLetter(coord.col)}${coord.row}`);
    } else if (e.key === 'ArrowDown' && coord.row < activeSheet.rowCount - 1) {
      e.preventDefault();
      setSelectedCell(`${colIndexToLetter(coord.col)}${coord.row + 2}`);
    } else if (e.key === 'ArrowLeft' && coord.col > 0) {
      e.preventDefault();
      setSelectedCell(`${colIndexToLetter(coord.col - 1)}${coord.row + 1}`);
    } else if (e.key === 'ArrowRight' && coord.col < activeSheet.colCount - 1) {
      e.preventDefault();
      setSelectedCell(`${colIndexToLetter(coord.col + 1)}${coord.row + 1}`);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingInline(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              {workbook.title}
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                Live RTDB Sync
              </span>
            </h2>
            <p className="text-xs text-stone-600">
              Worksheet: <strong>{activeSheet.name}</strong> · Auto-calculating formula engine
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-600 disabled:opacity-30"
            title="Undo"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-600 disabled:opacity-30"
            title="Redo"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Formatting */}
          <button
            onClick={() => toggleStyle('bold')}
            className={`p-1.5 rounded text-stone-700 ${
              activeSheet.cells[selectedCell]?.bold ? 'bg-stone-200 font-bold' : 'hover:bg-stone-100'
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleStyle('italic')}
            className={`p-1.5 rounded text-stone-700 ${
              activeSheet.cells[selectedCell]?.italic ? 'bg-stone-200 italic' : 'hover:bg-stone-100'
            }`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Alignment */}
          <button
            onClick={() => setAlignment('left')}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-700"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAlignment('center')}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-700"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAlignment('right')}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-700"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Grid Modifiers */}
          <button
            onClick={handleAddRow}
            className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
          >
            + Rows
          </button>
          <button
            onClick={handleAddColumn}
            className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
          >
            + Cols
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* CSV Import / Export */}
          <label className="p-1.5 rounded hover:bg-stone-100 text-stone-700 cursor-pointer" title="Import CSV">
            <Upload className="h-4 w-4" />
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button
            onClick={handleExportCSV}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-700"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowFormulaHelp(!showFormulaHelp)}
            className="p-1.5 rounded hover:bg-stone-100 text-emerald-700"
            title="Formulas Guide"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="bg-white p-2 rounded-xl border border-stone-200/80 shadow-sm flex items-center gap-2">
        <div className="w-16 px-2.5 py-1 rounded bg-stone-100 text-center font-mono font-bold text-xs text-stone-800 border border-stone-300">
          {selectedCell}
        </div>
        <div className="text-xs font-mono font-bold text-stone-400 select-none">fx</div>
        <input
          type="text"
          value={formulaBarValue}
          onChange={(e) => {
            setFormulaBarValue(e.target.value);
            updateCellValue(selectedCell, e.target.value);
          }}
          placeholder="Enter text, numbers, or formula (e.g. =SUM(A1:A10), =B4-B5)"
          className="flex-1 text-xs font-mono bg-stone-50 border border-stone-300 rounded px-2.5 py-1 text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
        />
      </div>

      {/* Formula Help Dropdown */}
      {showFormulaHelp && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center justify-between font-bold">
            <span>Supported Excel Formulas</span>
            <button onClick={() => setShowFormulaHelp(false)} className="text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div>
              <code className="font-bold text-emerald-900">=SUM(A1:A10)</code>
              <p className="text-emerald-800">Sum of cell range</p>
            </div>
            <div>
              <code className="font-bold text-emerald-900">=AVERAGE(B2:B8)</code>
              <p className="text-emerald-800">Arithmetic average</p>
            </div>
            <div>
              <code className="font-bold text-emerald-900">=MIN(C1:C20) / MAX</code>
              <p className="text-emerald-800">Lowest and highest value</p>
            </div>
            <div>
              <code className="font-bold text-emerald-900">=COUNT(A1:A50)</code>
              <p className="text-emerald-800">Count numeric values</p>
            </div>
            <div>
              <code className="font-bold text-emerald-900">=IF(B4&gt;1000, "High", "Low")</code>
              <p className="text-emerald-800">Conditional logic</p>
            </div>
            <div>
              <code className="font-bold text-emerald-900">=ROUND(A1, 2)</code>
              <p className="text-emerald-800">Round to decimal places</p>
            </div>
            <div>
              <code className="font-bold text-emerald-900">=B4 - B5</code>
              <p className="text-emerald-800">Direct cell subtraction</p>
            </div>
            <div>
              <code className="font-bold text-emerald-900">=C1 * 1.18</code>
              <p className="text-emerald-800">Arithmetic with GST multiplier</p>
            </div>
          </div>
        </div>
      )}

      {/* SPREADSHEET GRID */}
      <div
        className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-x-auto max-h-[550px] overflow-y-auto focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="border-collapse table-fixed select-none text-xs w-full min-w-[800px]">
          {/* Header Letters (A, B, C...) */}
          <thead>
            <tr className="bg-stone-100 text-stone-600 font-bold sticky top-0 z-20 border-b border-stone-300">
              <th className="w-12 p-1.5 text-center bg-stone-200/80 border-r border-stone-300 font-mono text-[11px] sticky left-0 z-30">
                #
              </th>
              {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => (
                <th
                  key={cIdx}
                  className="min-w-[110px] p-1.5 text-center border-r border-stone-300 font-mono text-[11px]"
                >
                  {colIndexToLetter(cIdx)}
                </th>
              ))}
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody>
            {Array.from({ length: activeSheet.rowCount }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              return (
                <tr key={rowNum} className="border-b border-stone-200 hover:bg-stone-50/40">
                  {/* Row Number */}
                  <td className="w-12 p-1 text-center bg-stone-100 border-r border-stone-300 font-mono text-stone-500 font-semibold sticky left-0 z-10 text-[11px]">
                    {rowNum}
                  </td>

                  {/* Columns */}
                  {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
                    const coord = `${colIndexToLetter(cIdx)}${rowNum}`;
                    const cellData = activeSheet.cells[coord];
                    const isSelected = selectedCell === coord;
                    const computedValue = evaluateCell(coord, activeSheet.cells);

                    return (
                      <td
                        key={coord}
                        onClick={() => {
                          setSelectedCell(coord);
                          setIsEditingInline(false);
                        }}
                        onDoubleClick={() => {
                          setSelectedCell(coord);
                          setIsEditingInline(true);
                        }}
                        style={{
                          backgroundColor: cellData?.bg || undefined,
                          color: cellData?.color || undefined,
                          textAlign: cellData?.align || (typeof computedValue === 'number' ? 'right' : 'left'),
                          fontWeight: cellData?.bold ? 'bold' : 'normal',
                          fontStyle: cellData?.italic ? 'italic' : 'normal',
                        }}
                        className={`p-1.5 border-r border-stone-200 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap transition-colors relative ${
                          isSelected
                            ? 'ring-2 ring-emerald-600 ring-inset bg-emerald-50/30 z-10'
                            : ''
                        }`}
                      >
                        {isEditingInline && isSelected ? (
                          <input
                            type="text"
                            autoFocus
                            value={formulaBarValue}
                            onChange={(e) => {
                              setFormulaBarValue(e.target.value);
                              updateCellValue(coord, e.target.value);
                            }}
                            onBlur={() => setIsEditingInline(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setIsEditingInline(false);
                              }
                            }}
                            className="w-full h-full bg-transparent border-0 outline-none p-0 text-xs font-mono"
                          />
                        ) : (
                          <span>
                            {cellData?.type === 'currency' && typeof computedValue === 'number'
                              ? `₹${computedValue.toLocaleString('en-IN')}`
                              : String(computedValue ?? '')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Multi-Worksheet Tabs Strip (Excel style at bottom) */}
      <div className="bg-white p-2 rounded-xl border border-stone-200/80 shadow-sm flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {workbook.sheets.map((sheet) => (
            <button
              key={sheet.id}
              onClick={() => {
                setActiveSheetId(sheet.id);
                setSelectedCell('A1');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeSheetId === sheet.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {sheet.name}
            </button>
          ))}

          <button
            onClick={handleAddSheet}
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-emerald-700 transition-colors"
            title="Add Worksheet"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] text-stone-600 flex items-center gap-1.5 font-medium pr-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Realtime Cloud Database Active</span>
        </div>
      </div>
    </div>
  );
};
