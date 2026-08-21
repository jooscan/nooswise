import { Group, Member, MemberBalance, SimplifiedDebt } from '../types';
import { formatMoney } from './currency';

export function calculateMemberBalances(group: Group): MemberBalance[] {
  const { members, expenses, settlements = [] } = group;
  
  const balanceMap = new Map<string, { totalPaid: number; totalShare: number }>();
  
  members.forEach((m) => {
    balanceMap.set(m.id, { totalPaid: 0, totalShare: 0 });
  });

  // Calculate expenses
  expenses.forEach((expense) => {
    // Payer paid the full amount
    const payerStats = balanceMap.get(expense.paidByMemberId);
    if (payerStats) {
      payerStats.totalPaid += expense.amount;
    }

    // Each member owes their split share
    if (expense.splits && expense.splits.length > 0) {
      expense.splits.forEach((split) => {
        const debtorStats = balanceMap.get(split.memberId);
        if (debtorStats) {
          debtorStats.totalShare += split.amount;
        }
      });
    } else {
      // Fallback equal split among all members
      const share = expense.amount / Math.max(members.length, 1);
      members.forEach((m) => {
        const stats = balanceMap.get(m.id);
        if (stats) {
          stats.totalShare += share;
        }
      });
    }
  });

  // Factor in direct settlements already made
  settlements.forEach((settlement) => {
    const fromStats = balanceMap.get(settlement.fromMemberId);
    const toStats = balanceMap.get(settlement.toMemberId);
    
    // The person who sent money reduced what they owe
    if (fromStats) {
      fromStats.totalPaid += settlement.amount;
    }
    if (toStats) {
      toStats.totalShare += settlement.amount;
    }
  });

  return members.map((m) => {
    const stats = balanceMap.get(m.id) || { totalPaid: 0, totalShare: 0 };
    const netBalance = Math.round((stats.totalPaid - stats.totalShare) * 100) / 100;
    return {
      member: m,
      netBalance,
      totalPaid: Math.round(stats.totalPaid * 100) / 100,
      totalShare: Math.round(stats.totalShare * 100) / 100,
    };
  });
}

/**
 * Debt Simplification algorithm
 * Minimizes total number of transactions between members
 */
export function calculateSimplifiedDebts(group: Group): SimplifiedDebt[] {
  const balances = calculateMemberBalances(group);
  const memberMap = new Map<string, Member>(group.members.map((m) => [m.id, m]));

  // Separate debtors (< -0.01) and creditors (> 0.01)
  const debtors: { memberId: string; amount: number }[] = [];
  const creditors: { memberId: string; amount: number }[] = [];

  balances.forEach((b) => {
    if (b.netBalance < -0.009) {
      debtors.push({ memberId: b.member.id, amount: -b.netBalance });
    } else if (b.netBalance > 0.009) {
      creditors.push({ memberId: b.member.id, amount: b.netBalance });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: SimplifiedDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(settleAmount * 100) / 100;

    if (roundedAmount > 0.01) {
      const fromMember = memberMap.get(debtor.memberId);
      const toMember = memberMap.get(creditor.memberId);

      if (fromMember && toMember) {
        // Find most relevant expense context if applicable
        const relevantExpense = group.expenses.find(
          (e) => e.paidByMemberId === creditor.memberId
        );
        const reason = relevantExpense ? `For "${relevantExpense.title}"` : 'Group balance';

        debts.push({
          id: `debt-${debtor.memberId}-${creditor.memberId}-${debts.length}`,
          fromMember,
          toMember,
          amount: roundedAmount,
          currency: group.currency || 'CAD',
          reason,
        });
      }
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount <= 0.009) dIdx++;
    if (creditor.amount <= 0.009) cIdx++;
  }

  return debts;
}

export function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return formatMoney(amount, currency);
}

export interface PaymentTransferSummary {
  id: string;
  fromMemberName: string;
  toMemberName: string;
  fromMember?: Member;
  toMember?: Member;
  amount: number;
  currency: string;
  isRecordedSettlement: boolean;
  date?: string;
}

/**
 * Returns the list of payment transfers (who paid x to who).
 * If settlements were recorded, uses them. Otherwise computes the simplified transfers that resolve all debts.
 */
export function getPaymentSummaryTransfers(group: Group): PaymentTransferSummary[] {
  const memberMap = new Map<string, Member>(group.members.map((m) => [m.id, m]));
  const currency = group.currency || 'CAD';

  // 1. If recorded settlements exist, map them
  if (group.settlements && group.settlements.length > 0) {
    return group.settlements.map((s) => {
      const from = memberMap.get(s.fromMemberId);
      const to = memberMap.get(s.toMemberId);
      return {
        id: s.id,
        fromMemberName: from?.name || 'Friend',
        toMemberName: to?.name || 'Friend',
        fromMember: from,
        toMember: to,
        amount: s.amount,
        currency,
        isRecordedSettlement: true,
        date: s.date,
      };
    });
  }

  // 2. Otherwise calculate based on raw expenses (without settlements)
  const rawGroupWithoutSettlements: Group = {
    ...group,
    settlements: [],
  };
  const calculatedDebts = calculateSimplifiedDebts(rawGroupWithoutSettlements);

  return calculatedDebts.map((d) => ({
    id: d.id,
    fromMemberName: d.fromMember.name,
    toMemberName: d.toMember.name,
    fromMember: d.fromMember,
    toMember: d.toMember,
    amount: d.amount,
    currency: d.currency || currency,
    isRecordedSettlement: false,
  }));
}
