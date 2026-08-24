import React, { useState, useEffect, useRef } from 'react';
import { Expense, ExpenseCategory, Group, Member, SplitType } from '../types';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { SUPPORTED_CURRENCIES, convertCurrency, formatMoney, getCurrencySymbol } from '../utils/currency';
import { CurrencyPicker } from './CurrencyPicker';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import {
  X,
  ArrowRight,
  Plus,
  Check,
  Percent,
  RefreshCw,
  CheckSquare,
  Square,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onSaveExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense?: (id: string) => void;
  editingExpense?: Expense | null;
  /**
   * Adds someone mid-expense. Resolves with the created member so the caller can select
   * the id the server assigned — the modal must not invent one.
   */
  onAddMember?: (name: string) => Promise<Member | null>;
}

const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'food', label: 'Food & Dining' },
  { id: 'drinks', label: 'Drinks & Nightlife' },
  { id: 'travel', label: 'Travel & Transport' },
  { id: 'home', label: 'Stay & Accommodation' },
  { id: 'entertainment', label: 'Fun & Activities' },
  { id: 'other', label: 'Other & General' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  group,
  onSaveExpense,
  onDeleteExpense,
  editingExpense,
  onAddMember,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const members = group?.members || [];
  const currentMember = members.find((m) => m.isCurrentUser) || members[0];
  const defaultPayerId = currentMember?.id || (members[0] ? members[0].id : '');

  const [amountStr, setAmountStr] = useState('');
  const [inputCurrency, setInputCurrency] = useState(group?.currency || 'CAD');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidByMemberId, setPaidByMemberId] = useState<string>(defaultPayerId);
  const [splitType, setSplitType] = useState<SplitType>('equally');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => members.map((m) => m.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({});
  const [newPersonName, setNewPersonName] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state whenever modal opens or editing expense / group changes
  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      setErrorMsg('');
      setNewPersonName('');

      if (editingExpense) {
        setAmountStr(
          (editingExpense.originalAmount || editingExpense.amount || '').toString()
        );
        setInputCurrency(
          editingExpense.originalCurrency ||
            editingExpense.currency ||
            group?.currency ||
            'CAD'
        );
        setTitle(editingExpense.title || '');
        setCategory(editingExpense.category || 'food');
        setPaidByMemberId(editingExpense.paidByMemberId || defaultPayerId);
        setSplitType(editingExpense.splitType || 'equally');
        setSelectedMemberIds(
          editingExpense.splits?.length > 0
            ? editingExpense.splits.map((s) => s.memberId)
            : members.map((m) => m.id)
        );
        setNotes(editingExpense.notes || '');

        if (editingExpense.splitType === 'exact' && editingExpense.splits) {
          const exactMap: Record<string, string> = {};
          editingExpense.splits.forEach((s) => {
            exactMap[s.memberId] = s.amount.toString();
          });
          setCustomAmounts(exactMap);
          setCustomPercentages({});
        } else if (editingExpense.splitType === 'percentage' && editingExpense.splits) {
          const pctMap: Record<string, string> = {};
          editingExpense.splits.forEach((s) => {
            pctMap[s.memberId] = (
              s.percentage ??
              Math.round((s.amount / (editingExpense.amount || 1)) * 100)
            ).toString();
          });
          setCustomPercentages(pctMap);
          setCustomAmounts({});
        } else {
          setCustomAmounts({});
          setCustomPercentages({});
        }
      } else {
        // Fresh Add Expense
        setAmountStr('');
        setInputCurrency(group?.currency || 'CAD');
        setTitle('');
        setCategory('food');
        setPaidByMemberId(defaultPayerId);
        setSplitType('equally');
        setSelectedMemberIds(members.map((m) => m.id));
        setCustomAmounts({});
        setCustomPercentages({});
        setNotes('');
      }

      // Auto-focus title on modal open
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, editingExpense, group?.id, defaultPayerId]);

  // Currency Conversion Calculation
  const numericAmount = parseFloat(amountStr) || 0;
  const targetGroupCurrency = group?.currency || 'CAD';
  const isForeignCurrency = inputCurrency !== targetGroupCurrency;
  const conversion = convertCurrency(numericAmount, inputCurrency, targetGroupCurrency);
  const groupBaseAmount = isForeignCurrency ? conversion.convertedAmount : numericAmount;

  // Split calculation per person (Equally)
  const participantsCount = selectedMemberIds.length;
  const perPersonAmount = participantsCount > 0 ? groupBaseAmount / participantsCount : 0;

  // Exact split calculation sum
  const customSum = selectedMemberIds.reduce((sum, mId) => {
    return sum + (parseFloat(customAmounts[mId] || '0') || 0);
  }, 0);
  const customDiff = Math.round((groupBaseAmount - customSum) * 100) / 100;
  const isCustomBalanced = Math.abs(customDiff) < 0.01;

  // Percentage split calculation sum
  const customPercentSum = selectedMemberIds.reduce((sum, mId) => {
    return sum + (parseFloat(customPercentages[mId] || '0') || 0);
  }, 0);
  const customPercentDiff = Math.round((100 - customPercentSum) * 10) / 10;
  const isPercentageBalanced = Math.abs(customPercentDiff) < 0.05;

  const handleSwitchSplitType = (newType: SplitType) => {
    setSplitType(newType);
    setErrorMsg('');

    if (newType === 'percentage') {
      const count = selectedMemberIds.length;
      if (count > 0) {
        const hasExisting = selectedMemberIds.some((id) => Boolean(customPercentages[id]));
        if (!hasExisting) {
          const evenPct = Math.floor(1000 / count) / 10;
          const newMap: Record<string, string> = {};
          let currentSum = 0;
          selectedMemberIds.forEach((id, idx) => {
            if (idx === selectedMemberIds.length - 1) {
              newMap[id] = (Math.round((100 - currentSum) * 10) / 10).toString();
            } else {
              newMap[id] = evenPct.toString();
              currentSum += evenPct;
            }
          });
          setCustomPercentages(newMap);
        }
      }
    } else if (newType === 'exact') {
      const count = selectedMemberIds.length;
      if (count > 0 && groupBaseAmount > 0) {
        const hasExisting = selectedMemberIds.some((id) => Boolean(customAmounts[id]));
        if (!hasExisting) {
          const evenAmount = Math.floor((groupBaseAmount / count) * 100) / 100;
          const newMap: Record<string, string> = {};
          let currentSum = 0;
          selectedMemberIds.forEach((id, idx) => {
            if (idx === selectedMemberIds.length - 1) {
              newMap[id] = (Math.round((groupBaseAmount - currentSum) * 100) / 100).toFixed(2);
            } else {
              newMap[id] = evenAmount.toFixed(2);
              currentSum += evenAmount;
            }
          });
          setCustomAmounts(newMap);
        }
      }
    }
  };

  const handleToggleMember = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length === 1) {
        setErrorMsg('At least one friend must be included in the split.');
        return;
      }
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
    setErrorMsg('');
  };

  const handleSelectAll = () => {
    setSelectedMemberIds(members.map((m) => m.id));
    setErrorMsg('');
  };

  const [isAddingPerson, setIsAddingPerson] = useState(false);

  /**
   * The member id has to come from the server. This used to mint `m-${Date.now()}`
   * locally and immediately tick it in the split, which meant the expense referenced a
   * member that did not exist and the save was rejected.
   */
  const handleAddPerson = async () => {
    const cleanName = newPersonName.trim();
    if (!cleanName || !onAddMember) return;

    setIsAddingPerson(true);
    try {
      const created = await onAddMember(cleanName);
      if (!created) {
        setErrorMsg("Couldn't add that person. Please try again.");
        return;
      }
      setSelectedMemberIds((prev) => [...prev, created.id]);
      setNewPersonName('');
      setErrorMsg('');
    } finally {
      setIsAddingPerson(false);
    }
  };

  const executeSave = () => {
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter what this was for (e.g. Uber, Dinner).');
      titleInputRef.current?.focus();
      return;
    }
    if (selectedMemberIds.length === 0) {
      setErrorMsg('Select at least one friend to split with.');
      return;
    }

    let splits: { memberId: string; amount: number; percentage?: number }[] = [];

    if (splitType === 'exact') {
      if (!isCustomBalanced) {
        setErrorMsg(
          `Exact shares sum to ${formatMoney(customSum, group?.currency || 'CAD')}. ${
            customDiff > 0
              ? `${formatMoney(customDiff, group?.currency || 'CAD')} remaining to assign.`
              : `${formatMoney(Math.abs(customDiff), group?.currency || 'CAD')} over total amount.`
          }`
        );
        return;
      }
      splits = selectedMemberIds.map((mId) => ({
        memberId: mId,
        amount: parseFloat(customAmounts[mId] || '0') || 0,
      }));
    } else if (splitType === 'percentage') {
      if (!isPercentageBalanced) {
        setErrorMsg(
          `Percentages sum to ${customPercentSum.toFixed(1)}%. ${
            customPercentDiff > 0
              ? `${customPercentDiff.toFixed(1)}% remaining to assign.`
              : `${Math.abs(customPercentDiff).toFixed(1)}% over 100%.`
          }`
        );
        return;
      }

      let remainingDollars = Math.round(groupBaseAmount * 100) / 100;
      splits = selectedMemberIds.map((mId, idx) => {
        const pct = parseFloat(customPercentages[mId] || '0') || 0;
        if (idx === selectedMemberIds.length - 1) {
          return {
            memberId: mId,
            amount: Math.max(0, remainingDollars),
            percentage: pct,
          };
        }
        const shareDollars = Math.round(((groupBaseAmount * pct) / 100) * 100) / 100;
        remainingDollars = Math.round((remainingDollars - shareDollars) * 100) / 100;
        return {
          memberId: mId,
          amount: shareDollars,
          percentage: pct,
        };
      });
    } else {
      // Split equally among selected members
      const share = Math.round((groupBaseAmount / selectedMemberIds.length) * 100) / 100;
      let remaining = Math.round(groupBaseAmount * 100) / 100;

      splits = selectedMemberIds.map((mId, idx) => {
        if (idx === selectedMemberIds.length - 1) {
          return { memberId: mId, amount: remaining };
        }
        remaining = Math.round((remaining - share) * 100) / 100;
        return { memberId: mId, amount: share };
      });
    }

    onSaveExpense({
      title: title.trim(),
      amount: groupBaseAmount,
      currency: group?.currency || 'CAD',
      originalAmount: isForeignCurrency ? numericAmount : undefined,
      originalCurrency: isForeignCurrency ? inputCurrency : undefined,
      exchangeRate: isForeignCurrency ? conversion.exchangeRate : undefined,
      paidByMemberId,
      category,
      date: editingExpense ? editingExpense.date : 'Today',
      splitType,
      splits,
      notes: notes.trim(),
    });

    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave();
  };

  // Keyboard shortcut listener: Cmd/Ctrl + Enter to save, Escape to cancel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        executeSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    numericAmount,
    title,
    selectedMemberIds,
    splitType,
    customAmounts,
    customPercentages,
    isCustomBalanced,
    isPercentageBalanced,
    groupBaseAmount,
    paidByMemberId,
    category,
    notes,
    inputCurrency,
    isForeignCurrency,
    conversion,
  ]);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto relative transition-colors text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="font-serif-display text-2xl md:text-3xl text-slate-900 dark:text-slate-100">
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Split transparently with friends in seconds.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* 1. What was it & Amount Card */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3.5 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Description */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  What was it?
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  required
                  placeholder="e.g. Dinner, Uber, Groceries"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              {/* Amount & Currency */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  How much?
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-serif-display text-base text-slate-400 dark:text-slate-500">
                      {getCurrencySymbol(inputCurrency)}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amountStr}
                      onChange={(e) => {
                        setAmountStr(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-serif-display text-lg pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  <CurrencyPicker
                    value={inputCurrency}
                    onChange={(newCurr) => setInputCurrency(newCurr)}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Foreign currency notice */}
            {isForeignCurrency && numericAmount > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  <span>Converts to group currency:</span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {formatMoney(conversion.convertedAmount, group.currency || 'CAD')}
                  </strong>
                </span>
                <span className="text-[10px] text-slate-400">
                  (1 {inputCurrency} ≈ {conversion.exchangeRate.toFixed(3)} {group.currency || 'CAD'})
                </span>
              </div>
            )}

            {/* Category & Who Paid Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-slate-200 dark:border-slate-700">
              {/* Category Dropdown */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Who Paid Dropdown */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Who paid?
                </label>
                <select
                  value={paidByMemberId}
                  onChange={(e) => setPaidByMemberId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.isCurrentUser ? `${m.name} (You)` : m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Split Between & Inline Friend Typing */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Split between
                </label>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {participantsCount} friend{participantsCount === 1 ? '' : 's'}
                </span>
                {splitType === 'equally' && numericAmount > 0 && participantsCount > 0 && (
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    ({formatMoney(perPersonAmount, group?.currency || 'CAD')} each)
                  </span>
                )}
              </div>

              {/* Toggle Split Mode: Equally | % Split | Exact ($) */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleSwitchSplitType('equally')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    splitType === 'equally'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Equally
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSplitType('percentage')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    splitType === 'percentage'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  <span>%</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSplitType('exact')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    splitType === 'exact'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Exact
                </button>
              </div>
            </div>

            {/* Smart exact split status inline */}
            {splitType === 'exact' && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Total allocated: <strong>{formatMoney(customSum, group?.currency || 'CAD')}</strong> / {formatMoney(groupBaseAmount, group?.currency || 'CAD')}
                </span>
                {isCustomBalanced ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Balanced ✓</span>
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {customDiff > 0
                      ? `${formatMoney(customDiff, group?.currency || 'CAD')} remaining`
                      : `${formatMoney(Math.abs(customDiff), group?.currency || 'CAD')} over`}
                  </span>
                )}
              </div>
            )}

            {/* Smart percentage split status inline */}
            {splitType === 'percentage' && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Total allocated: <strong>{customPercentSum.toFixed(1)}%</strong> / 100%
                </span>
                {isPercentageBalanced ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Balanced 100% ✓</span>
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {customPercentDiff > 0
                      ? `${customPercentDiff.toFixed(1)}% remaining`
                      : `${Math.abs(customPercentDiff).toFixed(1)}% over`}
                  </span>
                )}
              </div>
            )}

            {/* Friends Checkbox Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const currentPct = parseFloat(customPercentages[m.id] || '0') || 0;
                const calculatedPctDollars = (groupBaseAmount * currentPct) / 100;

                return (
                  <div
                    key={m.id}
                    className={`p-2 rounded-xl flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        : 'bg-transparent border-dashed border-slate-200 dark:border-slate-700/60 opacity-40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleMember(m.id)}
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer min-w-0 pr-2"
                    >
                      <div className="text-slate-600 dark:text-slate-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <CuteAvatarBadge member={m} size="xs" showEmoji={false} />
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {m.isCurrentUser ? `${m.name} (You)` : m.name}
                      </span>
                    </button>

                    {/* Exact amount input */}
                    {isSelected && splitType === 'exact' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={customAmounts[m.id] || ''}
                          onChange={(e) =>
                            setCustomAmounts({
                              ...customAmounts,
                              [m.id]: e.target.value,
                            })
                          }
                          className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-semibold px-2 py-0.5 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}

                    {/* Percentage input */}
                    {isSelected && splitType === 'percentage' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {groupBaseAmount > 0 && (
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {formatMoney(calculatedPctDollars, group?.currency || 'CAD')}
                          </span>
                        )}
                        <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-1.5 py-0.5">
                          <input
                            type="number"
                            step="0.5"
                            placeholder="0"
                            value={customPercentages[m.id] || ''}
                            onChange={(e) =>
                              setCustomPercentages({
                                ...customPercentages,
                                [m.id]: e.target.value,
                              })
                            }
                            className="w-10 bg-transparent text-xs font-semibold text-right focus:outline-none text-slate-900 dark:text-slate-100"
                          />
                          <span className="text-[10px] font-semibold text-slate-400">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Type Name & Press Enter Blank Field */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
              <input
                type="text"
                placeholder={
                  isAddingPerson ? 'Adding…' : 'Type name & press Enter to add to split...'
                }
                value={newPersonName}
                disabled={isAddingPerson}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddPerson();
                  }
                }}
                className="flex-1 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium px-2 py-1 cursor-pointer shrink-0"
              >
                Select all
              </button>
            </div>
          </div>

          {/* Footer Save / Cancel with Error message ALIGNED right next to the button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div>
              {editingExpense && onDeleteExpense && (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteExpense(editingExpense.id);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-full transition-colors cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-3.5 py-2 rounded-full transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center justify-end gap-3 flex-1">
              {/* Aligned Error Message Right Next to Button */}
              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-right-2 text-right">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-xs truncate">{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-2 transition-colors cursor-pointer shrink-0"
              >
                Cancel
              </button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs sm:text-sm px-6 py-3 rounded-full hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center gap-2 shadow-md cursor-pointer group shrink-0"
              >
                <span>{editingExpense ? 'Update Expense' : 'Add Expense'}</span>
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-white/20 dark:bg-slate-900/20 text-[10px] font-mono text-white/90 dark:text-slate-900/90">
                  ⌘↵
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
