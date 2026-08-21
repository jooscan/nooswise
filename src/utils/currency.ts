export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // How many units of this currency equal 1 USD
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0 },
  CAD: { code: 'CAD', symbol: '$', name: 'Canadian Dollar', rateToUSD: 1.36 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 0.78 },
  AUD: { code: 'AUD', symbol: '$', name: 'Australian Dollar', rateToUSD: 1.52 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 153.5 },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', rateToUSD: 0.89 },
  NZD: { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', rateToUSD: 1.65 },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', rateToUSD: 18.2 },
  SGD: { code: 'SGD', symbol: '$', name: 'Singapore Dollar', rateToUSD: 1.34 },
  HKD: { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar', rateToUSD: 7.82 },
};

/**
 * Normalizes input currency code/symbol to a standard code like 'USD', 'CAD', 'GBP', 'EUR'
 */
export function normalizeCurrencyCode(raw: string = 'CAD'): string {
  const upper = raw.toUpperCase().trim();
  if (SUPPORTED_CURRENCIES[upper]) return upper;
  if (upper === '$') return 'USD';
  if (upper === '€') return 'EUR';
  if (upper === '£') return 'GBP';
  if (upper === '¥') return 'JPY';
  return 'CAD';
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
  const info = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.USD;
  const isNegative = amount < -0.009;
  const abs = Math.abs(amount);

  const formattedNum = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${info.symbol}${formattedNum}`;
}
