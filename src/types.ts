export type ExpenseCategory = 'food' | 'travel' | 'home' | 'drinks' | 'entertainment' | 'other';

export type SplitType = 'equally' | 'exact' | 'percentage' | 'shares';

export interface CuteAvatar {
  characterName: string;
  category: 'pikmin' | 'pokemon';
  spriteUrl: string;
  bgGradient: string;
  emoji: string;
}

export interface Member {
  id: string;
  name: string;
  isCurrentUser: boolean;
  avatarUrl?: string;
  avatarBg?: string;
  avatarEmoji?: string;
  characterName?: string;
  initials?: string;
  email?: string;
  paymentHandle?: string; // e.g. sarah.j@example.com or @sarah-j
}

export interface ExpenseSplit {
  memberId: string;
  amount: number; // in group currency
  originalAmount?: number; // in original currency if converted
  percentage?: number;
  shares?: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number; // Stored in group default currency
  currency: string; // Group currency symbol/code
  originalAmount?: number; // Amount entered in original currency (e.g. 50 in GBP)
  originalCurrency?: string; // Currency code entered (e.g. 'GBP')
  exchangeRate?: number; // Rate used for conversion (e.g. 1.28)
  paidByMemberId: string;
  category: ExpenseCategory;
  date: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  notes?: string;
}

export interface SettlementRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  date: string;
  note?: string;
  paymentMethod?: string;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  expenses: Expense[];
  settlements: SettlementRecord[];
  createdAt: string;
  updatedAt: string;
  myETransferEmail?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface MemberBalance {
  member: Member;
  netBalance: number; // positive = owed to them (gets), negative = they owe
  totalPaid: number;
  totalShare: number;
}

export interface SimplifiedDebt {
  id: string;
  fromMember: Member;
  toMember: Member;
  amount: number;
  currency: string;
  reason?: string;
  isSettled?: boolean;
}
