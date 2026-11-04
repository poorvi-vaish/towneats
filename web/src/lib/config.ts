// Single source of truth for business configuration.

export const BUSINESS = {
  townName: process.env.NEXT_PUBLIC_TOWN_NAME ?? "Your Town",
  cityName: process.env.NEXT_PUBLIC_CITY_NAME ?? "The City",
  deliveryFeePaise: Number(process.env.DELIVERY_FEE_PAISE ?? 5000),
  // Serviced delivery areas — checkout rejects anything not in this list.
  servicedAreas: (
    process.env.SERVICED_AREAS ??
    "Main Bazaar,Station Area,Gandhi Nagar,Shastri Park,College Road,Old Town"
  ).split(",").map((s) => s.trim()),
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "9000000000",
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "919000000000",
};

export function formatINR(paise: number): string {
  return `₹${(paise / 100).toFixed(paise % 100 === 0 ? 0 : 2)}`;
}
