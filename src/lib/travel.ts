// SK 2026 — Stravné (diéty) pri tuzemskej pracovnej ceste
// Zdroj: Opatrenie MPSVR SR č. 309/2024 Z. z. — od 1.1.2026 (predpoklad)
export const DIETY_SK_2026 = {
  // Tuzemsko (€/deň)
  domestic: {
    band_5_12h: 8.30,    // 5 – 12 hod
    band_12_18h: 12.30,  // 12 – 18 hod
    band_18plus: 19.00,  // nad 18 hod / celý deň
  },
  // Vreckové v zahraničí (40% diéty)
  pocket_money_pct: 0.40,
};

// Najpoužívanejšie krajiny — diéta v EUR/deň (Opatrenie MF SR č. 401/2012 Z.z. + úpravy)
export const DIETY_FOREIGN_2026: Record<string, number> = {
  AT: 45, DE: 45, CZ: 40, HU: 40, PL: 39, IT: 45, FR: 45, ES: 40, GB: 50, IE: 45,
  NL: 50, BE: 45, CH: 60, DK: 60, SE: 55, NO: 65, US: 55, CA: 50,
};

export const SAZBA_KM_2026 = 0.265; // €/km náhrada za používanie súkromného vozidla (auto)
export const SAZBA_MOTO_2026 = 0.075; // €/km motocykel

export type TravelInput = {
  domestic: boolean;
  country?: string;        // ISO 3166-1 alpha-2 (when domestic=false)
  hoursTotal: number;      // total hours of business trip
  daysFull?: number;       // count of FULL travel days (24h) when trip > 1 day
  distanceKm?: number;     // own car
  fuelPrice?: number;      // diesel/petrol price per liter
  vehicleConsumption?: number;  // L/100km
  meals?: { breakfast: number; lunch: number; dinner: number };  // count of provided meals (each subtracts %)
  advanceAmount?: number;  // already paid advance
};

export type TravelResult = {
  diety: number;
  diety_breakdown: string;
  km_compensation: number;
  fuel_compensation: number;
  total_expenses: number;
  advance: number;
  to_pay: number;
};

export function calcTravel(t: TravelInput): TravelResult {
  let diety = 0;
  let breakdown = '';

  // Round to hours
  const h = Math.max(0, t.hoursTotal || 0);

  if (t.domestic) {
    const d = DIETY_SK_2026.domestic;
    if (h <= 5) { diety = 0; breakdown = 'Pod 5 hod — žiadne diéty'; }
    else if (h <= 12) { diety = d.band_5_12h; breakdown = `5–12 hod: ${d.band_5_12h.toFixed(2)} €`; }
    else if (h <= 18) { diety = d.band_12_18h; breakdown = `12–18 hod: ${d.band_12_18h.toFixed(2)} €`; }
    else {
      const fullDays = Math.floor(h / 24);
      const remaining = h - fullDays * 24;
      diety = fullDays * d.band_18plus;
      breakdown = `${fullDays}× plný deň: ${(fullDays * d.band_18plus).toFixed(2)} €`;
      if (remaining > 12) { diety += d.band_12_18h; breakdown += ` + zvyšok 12–18h: ${d.band_12_18h.toFixed(2)} €`; }
      else if (remaining > 5) { diety += d.band_5_12h; breakdown += ` + zvyšok 5–12h: ${d.band_5_12h.toFixed(2)} €`; }
    }
  } else {
    const rate = DIETY_FOREIGN_2026[t.country || ''] || 45;
    const fullDays = Math.max(1, Math.floor(h / 24));
    diety = fullDays * rate;
    breakdown = `${fullDays}× ${t.country || '??'}: ${rate.toFixed(2)} €/deň`;
    // Pocket money 40%
    const pocket = +(diety * DIETY_SK_2026.pocket_money_pct).toFixed(2);
    diety += pocket;
    breakdown += ` + vreckové 40 %: ${pocket.toFixed(2)} €`;
  }

  // Meals subtract — breakfast 25%, lunch 40%, dinner 35%
  if (t.meals) {
    const baseRate = t.domestic ? DIETY_SK_2026.domestic.band_18plus : (DIETY_FOREIGN_2026[t.country || ''] || 45);
    const subtract = (t.meals.breakfast || 0) * baseRate * 0.25 + (t.meals.lunch || 0) * baseRate * 0.40 + (t.meals.dinner || 0) * baseRate * 0.35;
    if (subtract > 0) {
      diety = Math.max(0, diety - subtract);
      breakdown += ` − stravovanie ${subtract.toFixed(2)} €`;
    }
  }

  // Km compensation (own car)
  const km = +(t.distanceKm || 0);
  const km_compensation = +(km * SAZBA_KM_2026).toFixed(2);

  // Fuel compensation (formula: km × L/100km × price)
  const fuel_compensation = +(km * (+(t.vehicleConsumption || 0) / 100) * +(t.fuelPrice || 0)).toFixed(2);

  const total_expenses = +(diety + km_compensation + fuel_compensation).toFixed(2);
  const advance = +(t.advanceAmount || 0);
  const to_pay = +(total_expenses - advance).toFixed(2);

  return { diety: +diety.toFixed(2), diety_breakdown: breakdown, km_compensation, fuel_compensation, total_expenses, advance, to_pay };
}
