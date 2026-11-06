// Single source of truth for business configuration.

export const BUSINESS = {
  townName: process.env.NEXT_PUBLIC_TOWN_NAME ?? "Hardoi",
  cityName: process.env.NEXT_PUBLIC_CITY_NAME ?? "The City",
  // Fee breakdown shown at checkout. Total = convenience + tax.
  convenienceFeePaise: Number(process.env.CONVENIENCE_FEE_PAISE ?? 2000),
  taxPaise: Number(process.env.TAX_PAISE ?? 1200),
  get deliveryFeePaise() {
    return this.convenienceFeePaise + this.taxPaise;
  },
  minOrderPaise: Number(process.env.MIN_ORDER_PAISE ?? 14900),
  // Serviced delivery areas — checkout rejects anything not in this list.
  servicedAreas: (
    process.env.SERVICED_AREAS ??
    "Main Bazaar,Station Area,Gandhi Nagar,Shastri Park,College Road,Old Town"
  ).split(",").map((s) => s.trim()),
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "8299308486",
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "918299308486",
};

export function formatINR(paise: number): string {
  return `₹${(paise / 100).toFixed(paise % 100 === 0 ? 0 : 2)}`;
}
