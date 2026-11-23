import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calculator,
  X,
  RotateCcw,
  Percent,
  TrendingUp,
  Handshake,
  Truck,
  Copy,
  Check,
  History,
  Delete,
  Keyboard,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface FinancialCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CalculatorMode = 'standard' | 'gst' | 'margin' | 'partner' | 'vendor';

export const FinancialCalculatorModal: React.FC<FinancialCalculatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mode, setMode] = useState<CalculatorMode>('standard');
  const [copied, setCopied] = useState(false);

  // Standard Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState(0);
  const [calcHistory, setCalcHistory] = useState<string[]>([]);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState<number | null>(null);

  // Synchronous State Refs for Keyboard & Numpad Event Listeners
  const calcDisplayRef = useRef(calcDisplay);
  calcDisplayRef.current = calcDisplay;

  const prevValueRef = useRef(prevValue);
  prevValueRef.current = prevValue;

  const pendingOpRef = useRef(pendingOp);
  pendingOpRef.current = pendingOp;

  const waitingForOperandRef = useRef(waitingForOperand);
  waitingForOperandRef.current = waitingForOperand;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // GST Calculator State
  const [gstAmount, setGstAmount] = useState<number>(50000);
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstType, setGstType] = useState<'exclusive' | 'inclusive'>('exclusive');

  // Profit Margin State
  const [costPrice, setCostPrice] = useState<number>(100000);
  const [sellingPrice, setSellingPrice] = useState<number>(150000);

  // Partner Share State
  const [banquetProfit, setBanquetProfit] = useState<number>(300000);
  const [partnerSharePercent, setPartnerSharePercent] = useState<number>(35);
  const [partnerDeductions, setPartnerDeductions] = useState<number>(15000);

  // Vendor Balance State
  const [vendorAgreedAmount, setVendorAgreedAmount] = useState<number>(75000);
  const [vendorPaidAmount, setVendorPaidAmount] = useState<number>(35000);
  const [vendorDiscount, setVendorDiscount] = useState<number>(5000);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Standard Calculator Handlers with refs for safe zero-latency keyboard entry
  const handleDigit = useCallback((digit: string) => {
    if (waitingForOperandRef.current) {
      setCalcDisplay(digit);
      setWaitingForOperand(false);
      waitingForOperandRef.current = false;
    } else {
      setCalcDisplay((prev) => (prev === '0' ? digit : prev + digit));
    }
  }, []);

  const handleDecimal = useCallback(() => {
    if (waitingForOperandRef.current) {
      setCalcDisplay('0.');
      setWaitingForOperand(false);
      waitingForOperandRef.current = false;
      return;
    }
    setCalcDisplay((prev) => {
      if (!prev.includes('.')) {
        return prev + '.';
      }
      return prev;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    if (waitingForOperandRef.current) return;
    setCalcDisplay((prev) => {
      if (prev.length <= 1 || prev === '0') return '0';
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    setCalcDisplay('0');
    setPendingOp(null);
    setPrevValue(null);
    setWaitingForOperand(false);
    pendingOpRef.current = null;
    prevValueRef.current = null;
    waitingForOperandRef.current = false;
  }, []);

  const handleOperation = useCallback((op: string) => {
    const current = parseFloat(calcDisplayRef.current);
    const prev = prevValueRef.current;
    const pending = pendingOpRef.current;
    const waiting = waitingForOperandRef.current;

    if (prev !== null && pending && !waiting) {
      let result = 0;
      switch (pending) {
        case '+':
          result = prev + current;
          break;
        case '-':
          result = prev - current;
          break;
        case '×':
          result = prev * current;
          break;
        case '÷':
          result = current !== 0 ? prev / current : 0;
          break;
        default:
          result = current;
      }
      const rounded = Math.round(result * 10000) / 10000;
      setCalcDisplay(String(rounded));
      setPrevValue(rounded);
      prevValueRef.current = rounded;
      setCalcHistory((h) => [`${prev} ${pending} ${current} = ${rounded}`, ...h.slice(0, 10)]);
    } else {
      setPrevValue(current);
      prevValueRef.current = current;
    }

    setPendingOp(op);
    pendingOpRef.current = op;
    setWaitingForOperand(true);
    waitingForOperandRef.current = true;
  }, []);

  const handleEquals = useCallback(() => {
    const current = parseFloat(calcDisplayRef.current);
    const prev = prevValueRef.current;
    const pending = pendingOpRef.current;

    if (prev !== null && pending) {
      let result = 0;
      switch (pending) {
        case '+':
          result = prev + current;
          break;
        case '-':
          result = prev - current;
          break;
        case '×':
          result = prev * current;
          break;
        case '÷':
          result = current !== 0 ? prev / current : 0;
          break;
        default:
          result = current;
      }
      const rounded = Math.round(result * 10000) / 10000;
      setCalcDisplay(String(rounded));
      setCalcHistory((h) => [`${prev} ${pending} ${current} = ${rounded}`, ...h.slice(0, 10)]);
      setPrevValue(null);
      prevValueRef.current = null;
      setPendingOp(null);
      pendingOpRef.current = null;
      setWaitingForOperand(true);
      waitingForOperandRef.current = true;
    }
  }, []);

  // Keyboard & Numpad Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an interactive form input/textarea is currently focused in other modes
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');

      if (isInputFocused) return;

      // Close modal on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // If user presses a numpad or calculator key while in another mode, auto-switch to standard
      if (modeRef.current !== 'standard') {
        const isCalculatorKey =
          (e.key >= '0' && e.key <= '9') ||
          ['+', '-', '*', '/', 'Enter', '=', '.', 'Backspace', 'Delete'].includes(e.key) ||
          (e.code && e.code.startsWith('Numpad'));
        if (isCalculatorKey) {
          setMode('standard');
          modeRef.current = 'standard';
        } else {
          return;
        }
      }

      // 1. Digits (0-9) from keyboard row or Numpad
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
        return;
      }

      // Specific Numpad key code fallback
      if (e.code && e.code.startsWith('Numpad')) {
        const numpadNum = e.code.replace('Numpad', '');
        if (!isNaN(Number(numpadNum)) && numpadNum.length === 1) {
          e.preventDefault();
          handleDigit(numpadNum);
          return;
        }
      }

      // 2. Decimal Point (. or ,)
      if (e.key === '.' || e.key === ',' || e.code === 'NumpadDecimal') {
        e.preventDefault();
        handleDecimal();
        return;
      }

      // 3. Operators (+, -, *, /)
      if (e.key === '+' || e.code === 'NumpadAdd') {
        e.preventDefault();
        handleOperation('+');
        return;
      }
      if (e.key === '-' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        handleOperation('-');
        return;
      }
      if (e.key === '*' || e.key === 'x' || e.key === 'X' || e.code === 'NumpadMultiply') {
        e.preventDefault();
        handleOperation('×');
        return;
      }
      if (e.key === '/' || e.code === 'NumpadDivide') {
        e.preventDefault();
        handleOperation('÷');
        return;
      }

      // 4. Equals / Enter
      if (e.key === 'Enter' || e.key === '=' || e.code === 'NumpadEnter') {
        e.preventDefault();
        handleEquals();
        return;
      }

      // 5. Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      // 6. Clear (Delete or c / C)
      if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClear();
        return;
      }

      // 7. Percentage (%)
      if (e.key === '%') {
        e.preventDefault();
        setCalcDisplay((prev) => String(parseFloat(prev) / 100));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handleDigit, handleDecimal, handleBackspace, handleClear, handleOperation, handleEquals]);

  if (!isOpen) return null;

  // GST Calculations
  const calculatedGst = () => {
    if (gstType === 'exclusive') {
      const tax = (gstAmount * gstRate) / 100;
      const total = gstAmount + tax;
      const cgst = tax / 2;
      const sgst = tax / 2;
      return { base: gstAmount, tax, total, cgst, sgst };
    } else {
      const base = (gstAmount * 100) / (100 + gstRate);
      const tax = gstAmount - base;
      const cgst = tax / 2;
      const sgst = tax / 2;
      return { base, tax, total: gstAmount, cgst, sgst };
    }
  };

  // Profit Margin Calculations
  const calculatedMargin = () => {
    const profit = sellingPrice - costPrice;
    const grossMarginPct = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    const markupPct = costPrice > 0 ? (profit / costPrice) * 100 : 0;
    return { profit, grossMarginPct, markupPct };
  };

  // Partner Calculations
  const calculatedPartner = () => {
    const rawShare = (banquetProfit * partnerSharePercent) / 100;
    const netShare = Math.max(0, rawShare - partnerDeductions);
    return { rawShare, netShare };
  };

  // Vendor Balance Calculations
  const calculatedVendor = () => {
    const balance = Math.max(0, vendorAgreedAmount - vendorPaidAmount - vendorDiscount);
    return { balance };
  };

  const gstResult = calculatedGst();
  const marginResult = calculatedMargin();
  const partnerResult = calculatedPartner();
  const vendorResult = calculatedVendor();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Pearl Experiences Financial Calculator
              </h3>
              <p className="text-[11px] text-stone-500">
                GST, Profit Margins, Partner Shares & Standard Calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-950/40 p-1 text-xs overflow-x-auto">
          {[
            { id: 'standard', label: 'Standard', icon: <Calculator className="w-3.5 h-3.5" /> },
            { id: 'gst', label: 'GST Calculator', icon: <Percent className="w-3.5 h-3.5" /> },
            { id: 'margin', label: 'Profit Margin', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'partner', label: 'Partner Share', icon: <Handshake className="w-3.5 h-3.5" /> },
            { id: 'vendor', label: 'Vendor Balance', icon: <Truck className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id as CalculatorMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                mode === tab.id
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* 1. STANDARD CALCULATOR */}
          {mode === 'standard' && (
            <div className="space-y-3">
              {/* Keyboard Numpad Active Notice */}
              <div className="flex items-center justify-between text-[11px] px-1 text-stone-500">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
                  Numpad &amp; Keyboard Enabled
                </span>
                <span className="text-[10px] text-stone-400 font-mono">0-9, + - * /, Enter (=), ⌫</span>
              </div>

              {/* Display */}
              <div className="p-4 rounded-xl bg-stone-950 text-right text-white font-mono space-y-1 shadow-inner">
                <div className="text-[11px] text-stone-400 h-4">
                  {prevValue !== null && pendingOp ? `${prevValue} ${pendingOp}` : ''}
                </div>
                <div className="text-2xl font-bold tracking-tight truncate">{calcDisplay}</div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                <button onClick={handleClear} className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200">
                  C
                </button>
                <button onClick={handleBackspace} className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 flex items-center justify-center" title="Backspace (⌫)">
                  <Delete className="w-4 h-4" />
                </button>
                <button onClick={() => setCalcDisplay(String(parseFloat(calcDisplay) / 100))} className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200">
                  %
                </button>
                <button onClick={() => handleOperation('÷')} className="p-3 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900">
                  ÷
                </button>

                <button onClick={() => handleDigit('7')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  7
                </button>
                <button onClick={() => handleDigit('8')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  8
                </button>
                <button onClick={() => handleDigit('9')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  9
                </button>
                <button onClick={() => handleOperation('×')} className="p-3 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900">
                  ×
                </button>

                <button onClick={() => handleDigit('4')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  4
                </button>
                <button onClick={() => handleDigit('5')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  5
                </button>
                <button onClick={() => handleDigit('6')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  6
                </button>
                <button onClick={() => handleOperation('-')} className="p-3 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900">
                  -
                </button>

                <button onClick={() => handleDigit('1')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  1
                </button>
                <button onClick={() => handleDigit('2')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  2
                </button>
                <button onClick={() => handleDigit('3')} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  3
                </button>
                <button onClick={() => handleOperation('+')} className="p-3 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900">
                  +
                </button>

                <button onClick={() => handleDigit('0')} className="p-3 col-span-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  0
                </button>
                <button onClick={handleDecimal} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100">
                  .
                </button>
                <button onClick={handleEquals} className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                  =
                </button>
              </div>

              {/* History */}
              {calcHistory.length > 0 && (
                <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div className="text-[10px] font-semibold uppercase text-stone-500 mb-1 flex items-center gap-1">
                    <History className="w-3 h-3" /> Recent Calculations
                  </div>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto text-xs font-mono text-stone-600 dark:text-stone-400">
                    {calcHistory.map((h, i) => (
                      <div key={i} className="truncate">
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. GST CALCULATOR */}
          {mode === 'gst' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block font-semibold text-stone-700 dark:text-stone-300">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={gstAmount}
                  onChange={(e) => setGstAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    GST Rate
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[5, 12, 18, 28].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setGstRate(r)}
                        className={`py-1.5 rounded-lg font-bold transition-colors ${
                          gstRate === r
                            ? 'bg-emerald-800 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Calculation Type
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setGstType('exclusive')}
                      className={`py-1.5 px-2 rounded-lg font-medium text-[11px] transition-colors ${
                        gstType === 'exclusive'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      Exclusive (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGstType('inclusive')}
                      className={`py-1.5 px-2 rounded-lg font-medium text-[11px] transition-colors ${
                        gstType === 'inclusive'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      Inclusive (-)
                    </button>
                  </div>
                </div>
              </div>

              {/* Result Summary */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 font-mono">
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>Net Base Amount:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(gstResult.base)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>CGST ({gstRate / 2}%):</span>
                  <span>{formatCurrency(gstResult.cgst)}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>SGST ({gstRate / 2}%):</span>
                  <span>{formatCurrency(gstResult.sgst)}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-200 dark:border-stone-800">
                  <span>Total GST ({gstRate}%):</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(gstResult.tax)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-900 dark:text-stone-100 font-bold text-sm pt-1 border-t border-stone-200 dark:border-stone-800">
                  <span>Gross Total Amount:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(gstResult.total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. PROFIT MARGIN */}
          {mode === 'margin' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Selling / Quoted Price (₹)
                  </label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 font-mono">
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>Gross Profit Amount:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatCurrency(marginResult.profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>Profit Margin %:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {marginResult.grossMarginPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>Markup % on Cost:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {marginResult.markupPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. PARTNER SHARE */}
          {mode === 'partner' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block font-semibold text-stone-700 dark:text-stone-300">
                  Banquet Net Operating Profit (₹)
                </label>
                <input
                  type="number"
                  value={banquetProfit}
                  onChange={(e) => setBanquetProfit(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Partner Profit Share (%)
                  </label>
                  <input
                    type="number"
                    value={partnerSharePercent}
                    onChange={(e) => setPartnerSharePercent(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Deductions / Fixed Charge (₹)
                  </label>
                  <input
                    type="number"
                    value={partnerDeductions}
                    onChange={(e) => setPartnerDeductions(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 font-mono">
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>Gross Share ({partnerSharePercent}%):</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(partnerResult.rawShare)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>Deductions / Retainage:</span>
                  <span className="text-red-600">
                    - {formatCurrency(partnerDeductions)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-900 dark:text-stone-100 font-bold text-sm pt-2 border-t border-stone-200 dark:border-stone-800">
                  <span>Net Entitled Distribution:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(partnerResult.netShare)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 5. VENDOR BALANCE */}
          {mode === 'vendor' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Agreed Bill (₹)
                  </label>
                  <input
                    type="number"
                    value={vendorAgreedAmount}
                    onChange={(e) => setVendorAgreedAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Paid to Date (₹)
                  </label>
                  <input
                    type="number"
                    value={vendorPaidAmount}
                    onChange={(e) => setVendorPaidAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={vendorDiscount}
                    onChange={(e) => setVendorDiscount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-sm font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 font-mono">
                <div className="flex justify-between items-center text-stone-900 dark:text-stone-100 font-bold text-sm">
                  <span>Remaining Pending Due:</span>
                  <span className="text-amber-700 dark:text-amber-400">
                    {formatCurrency(vendorResult.balance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-950">
          <button
            onClick={() => {
              if (mode === 'standard') copyToClipboard(calcDisplay);
              else if (mode === 'gst') copyToClipboard(String(gstResult.total));
              else if (mode === 'margin') copyToClipboard(String(marginResult.profit));
              else if (mode === 'partner') copyToClipboard(String(partnerResult.netShare));
              else if (mode === 'vendor') copyToClipboard(String(vendorResult.balance));
            }}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Result'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
