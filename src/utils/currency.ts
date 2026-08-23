export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // Estimated baseline rate to 1 USD
  flag?: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  CAD: { code: 'CAD', symbol: '$', name: 'Canadian Dollar', rateToUSD: 1.36, flag: '🇨🇦' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0, flag: '🇺🇸' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUSD: 83.5, flag: '🇮🇳' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 0.92, flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 0.78, flag: '🇬🇧' },
  AUD: { code: 'AUD', symbol: '$', name: 'Australian Dollar', rateToUSD: 1.52, flag: '🇦🇺' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 153.5, flag: '🇯🇵' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rateToUSD: 0.89, flag: '🇨🇭' },
  NZD: { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', rateToUSD: 1.65, flag: '🇳🇿' },
  SGD: { code: 'SGD', symbol: '$', name: 'Singapore Dollar', rateToUSD: 1.34, flag: '🇸🇬' },
  HKD: { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar', rateToUSD: 7.82, flag: '🇭🇰' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateToUSD: 3.67, flag: '🇦🇪' },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', rateToUSD: 3.75, flag: '🇸🇦' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', rateToUSD: 18.2, flag: '🇲🇽' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateToUSD: 5.45, flag: '🇧🇷' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', rateToUSD: 18.1, flag: '🇿🇦' },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', rateToUSD: 1370.0, flag: '🇰🇷' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 7.25, flag: '🇨🇳' },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', rateToUSD: 10.6, flag: '🇸🇪' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', rateToUSD: 10.7, flag: '🇳🇴' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', rateToUSD: 6.87, flag: '🇩🇰' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', rateToUSD: 36.5, flag: '🇹🇭' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rateToUSD: 16200.0, flag: '🇮🇩' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rateToUSD: 4.71, flag: '🇲🇾' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rateToUSD: 58.5, flag: '🇵🇭' },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', rateToUSD: 25400.0, flag: '🇻🇳' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rateToUSD: 32.8, flag: '🇹🇷' },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', rateToUSD: 3.72, flag: '🇮🇱' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', rateToUSD: 3.98, flag: '🇵🇱' },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', rateToUSD: 23.2, flag: '🇨🇿' },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', rateToUSD: 365.0, flag: '🇭🇺' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', rateToUSD: 48.2, flag: '🇪🇬' },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', rateToUSD: 4100.0, flag: '🇨🇴' },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', rateToUSD: 935.0, flag: '🇨🇱' },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', rateToUSD: 910.0, flag: '🇦🇷' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', rateToUSD: 278.0, flag: '🇵🇰' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rateToUSD: 117.5, flag: '🇧🇩' },
  LKR: { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', rateToUSD: 304.0, flag: '🇱🇰' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateToUSD: 1490.0, flag: '🇳🇬' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rateToUSD: 129.0, flag: '🇰🇪' },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', rateToUSD: 32.4, flag: '🇹🇼' },
};

export const POPULAR_CURRENCIES: string[] = ['CAD', 'USD', 'INR', 'EUR', 'GBP', 'AUD', 'JPY'];

/**
 * Normalizes input currency code/symbol to a standard code like 'USD', 'CAD', 'GBP', 'EUR', 'INR'
 */
export function normalizeCurrencyCode(raw: string = 'CAD'): string {
  if (!raw) return 'CAD';
  const upper = raw.toUpperCase().trim();
  if (SUPPORTED_CURRENCIES[upper]) return upper;
  if (upper === '$') return 'CAD';
  if (upper === '₹' || upper === 'RS' || upper === 'RUPEE' || upper === 'RUPEES') return 'INR';
  if (upper === '€') return 'EUR';
  if (upper === '£') return 'GBP';
  if (upper === '¥') return 'JPY';
  if (upper === '₩') return 'KRW';
  if (upper === '₪') return 'ILS';
  if (upper === '₺') return 'TRY';
  if (upper === '฿') return 'THB';
  if (upper === '₫') return 'VND';
  if (upper === '₱') return 'PHP';
  
  // Return the uppercase code directly if valid 3+ chars
  if (upper.length >= 2 && upper.length <= 5) return upper;
  return 'CAD';
}

/**
 * Get currency symbol for any code
 */
export function getCurrencySymbol(raw: string = 'CAD'): string {
  const code = normalizeCurrencyCode(raw);
  if (SUPPORTED_CURRENCIES[code]) {
    return SUPPORTED_CURRENCIES[code].symbol;
  }
  // Default symbol fallback if custom code
  return `${code} `;
}

/**
 * Calculates conversion from fromCurrency to toCurrency
 */
export function convertCurrency(
  amount: number,
  fromRaw: string,
  toRaw: string
): { convertedAmount: number; exchangeRate: number } {
  const fromCode = normalizeCurrencyCode(fromRaw);
  const toCode = normalizeCurrencyCode(toRaw);

  if (fromCode === toCode) {
    return { convertedAmount: amount, exchangeRate: 1.0 };
  }

  const fromRateToUSD = SUPPORTED_CURRENCIES[fromCode]?.rateToUSD || 1.0;
  const toRateToUSD = SUPPORTED_CURRENCIES[toCode]?.rateToUSD || 1.0;

  // 1 unit of fromCode in USD = (1 / fromRateToUSD)
  // in toCode = (1 / fromRateToUSD) * toRateToUSD
  const exchangeRate = toRateToUSD / fromRateToUSD;
  const convertedAmount = Math.round(amount * exchangeRate * 100) / 100;

  return { convertedAmount, exchangeRate };
}

/**
 * Clean currency formatting
 */
export function formatMoney(amount: number, rawCurrency: string = 'CAD'): string {
  const code = normalizeCurrencyCode(rawCurrency);
  const info = SUPPORTED_CURRENCIES[code];
  const symbol = info?.symbol || `${code} `;
  const isNegative = amount < -0.009;
  const abs = Math.abs(amount);

  const formattedNum = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${symbol}${formattedNum}`;
}
