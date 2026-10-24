export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", currency: "INR", currencySymbol: "₹", flag: "🇮🇳" }
];

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
};

export const getCountryCurrency = (code: string): { currency: string; symbol: string } => {
  const country = getCountryByCode(code);
  return {
    currency: country?.currency || "INR",
    symbol: country?.currencySymbol || "₹"
  };
};

export const formatCurrency = (amount: number | string, countryCode: string): string => {
  const { symbol } = getCountryCurrency(countryCode);
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${symbol}${numAmount.toLocaleString()}`;
};
