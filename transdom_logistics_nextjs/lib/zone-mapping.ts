/**
 * Country to Zone Mapping for Transdom Express Rates
 * Maps full country names to their corresponding shipping zones
 * Based on TRANSDOM EXPRESS RATE JAN 26.csv
 *
 * 8 Zones (matching exact database format):
 * 1. UK_IRELAND
 * 2. WEST_CENTRAAFRICA
 * 3. USA_CANADA
 * 4. EUROPE
 * 5. EAST_SOUTHAFRICA
 * 6. MIDDLEEAST
 * 7. ASIA
 * 8. SOUTHAMERICA
 */

export const COUNTRY_TO_ZONE: Record<string, string> = {
  // UK_IRELAND Zone
  "United Kingdom": "UK_IRELAND",
  England: "UK_IRELAND",
  Scotland: "UK_IRELAND",
  Wales: "UK_IRELAND",
  "Northern Ireland": "UK_IRELAND",
  Ireland: "UK_IRELAND",
  "Republic of Ireland": "UK_IRELAND",

  // WEST_CENTRAAFRICA Zone
  Nigeria: "WEST_CENTRAAFRICA",
  Ghana: "WEST_CENTRAAFRICA",
  Senegal: "WEST_CENTRAAFRICA",
  "Ivory Coast": "WEST_CENTRAAFRICA",
  "Cote d'Ivoire": "WEST_CENTRAAFRICA",
  Cameroon: "WEST_CENTRAAFRICA",
  Benin: "WEST_CENTRAAFRICA",
  Togo: "WEST_CENTRAAFRICA",
  Mali: "WEST_CENTRAAFRICA",
  "Burkina Faso": "WEST_CENTRAAFRICA",
  Niger: "WEST_CENTRAAFRICA",
  Chad: "WEST_CENTRAAFRICA",
  "Central African Republic": "WEST_CENTRAAFRICA",
  Congo: "WEST_CENTRAAFRICA",
  "Democratic Republic of Congo": "WEST_CENTRAAFRICA",
  Gabon: "WEST_CENTRAAFRICA",
  "Equatorial Guinea": "WEST_CENTRAAFRICA",
  "Sierra Leone": "WEST_CENTRAAFRICA",
  Liberia: "WEST_CENTRAAFRICA",
  Guinea: "WEST_CENTRAAFRICA",
  "Guinea-Bissau": "WEST_CENTRAAFRICA",
  Gambia: "WEST_CENTRAAFRICA",

  // USA_CANADA Zone
  "United States": "USA_CANADA",
  USA: "USA_CANADA",
  "United States of America": "USA_CANADA",
  Canada: "USA_CANADA",

  // EUROPE Zone
  France: "EUROPE",
  Germany: "EUROPE",
  Spain: "EUROPE",
  Italy: "EUROPE",
  Netherlands: "EUROPE",
  Belgium: "EUROPE",
  Switzerland: "EUROPE",
  Austria: "EUROPE",
  Portugal: "EUROPE",
  Greece: "EUROPE",
  Poland: "EUROPE",
  Sweden: "EUROPE",
  Norway: "EUROPE",
  Denmark: "EUROPE",
  Finland: "EUROPE",
  "Czech Republic": "EUROPE",
  Hungary: "EUROPE",
  Romania: "EUROPE",
  Slovakia: "EUROPE",
  Bulgaria: "EUROPE",
  Croatia: "EUROPE",
  Slovenia: "EUROPE",
  Luxembourg: "EUROPE",
  Malta: "EUROPE",
  Cyprus: "EUROPE",
  Estonia: "EUROPE",
  Latvia: "EUROPE",
  Lithuania: "EUROPE",
  Iceland: "EUROPE",
  Albania: "EUROPE",
  Serbia: "EUROPE",
  Montenegro: "EUROPE",
  "North Macedonia": "EUROPE",
  "Bosnia and Herzegovina": "EUROPE",
  Kosovo: "EUROPE",
  Moldova: "EUROPE",
  Ukraine: "EUROPE",
  Belarus: "EUROPE",

  // EAST_SOUTHAFRICA Zone
  Kenya: "EAST_SOUTHAFRICA",
  Tanzania: "EAST_SOUTHAFRICA",
  Uganda: "EAST_SOUTHAFRICA",
  Rwanda: "EAST_SOUTHAFRICA",
  Burundi: "EAST_SOUTHAFRICA",
  Ethiopia: "EAST_SOUTHAFRICA",
  Somalia: "EAST_SOUTHAFRICA",
  Djibouti: "EAST_SOUTHAFRICA",
  Eritrea: "EAST_SOUTHAFRICA",
  "South Sudan": "EAST_SOUTHAFRICA",
  "South Africa": "EAST_SOUTHAFRICA",
  Zambia: "EAST_SOUTHAFRICA",
  Zimbabwe: "EAST_SOUTHAFRICA",
  Botswana: "EAST_SOUTHAFRICA",
  Namibia: "EAST_SOUTHAFRICA",
  Mozambique: "EAST_SOUTHAFRICA",
  Malawi: "EAST_SOUTHAFRICA",
  Madagascar: "EAST_SOUTHAFRICA",
  Mauritius: "EAST_SOUTHAFRICA",
  Seychelles: "EAST_SOUTHAFRICA",
  Comoros: "EAST_SOUTHAFRICA",
  Lesotho: "EAST_SOUTHAFRICA",
  Eswatini: "EAST_SOUTHAFRICA",
  Swaziland: "EAST_SOUTHAFRICA",
  Angola: "EAST_SOUTHAFRICA",

  // MIDDLEEAST Zone
  "Saudi Arabia": "MIDDLEEAST",
  "United Arab Emirates": "MIDDLEEAST",
  UAE: "MIDDLEEAST",
  Dubai: "MIDDLEEAST",
  Qatar: "MIDDLEEAST",
  Kuwait: "MIDDLEEAST",
  Bahrain: "MIDDLEEAST",
  Oman: "MIDDLEEAST",
  Jordan: "MIDDLEEAST",
  Lebanon: "MIDDLEEAST",
  Syria: "MIDDLEEAST",
  Iraq: "MIDDLEEAST",
  Yemen: "MIDDLEEAST",
  Israel: "MIDDLEEAST",
  Palestine: "MIDDLEEAST",
  Turkey: "MIDDLEEAST",
  Iran: "MIDDLEEAST",
  Egypt: "MIDDLEEAST",
  Libya: "MIDDLEEAST",
  Tunisia: "MIDDLEEAST",
  Algeria: "MIDDLEEAST",
  Morocco: "MIDDLEEAST",

  // ASIA Zone
  China: "ASIA",
  Japan: "ASIA",
  "South Korea": "ASIA",
  India: "ASIA",
  Pakistan: "ASIA",
  Bangladesh: "ASIA",
  "Sri Lanka": "ASIA",
  Nepal: "ASIA",
  Bhutan: "ASIA",
  Maldives: "ASIA",
  Afghanistan: "ASIA",
  Thailand: "ASIA",
  Vietnam: "ASIA",
  Malaysia: "ASIA",
  Singapore: "ASIA",
  Indonesia: "ASIA",
  Philippines: "ASIA",
  Myanmar: "ASIA",
  Cambodia: "ASIA",
  Laos: "ASIA",
  Brunei: "ASIA",
  Mongolia: "ASIA",
  Taiwan: "ASIA",
  "Hong Kong": "ASIA",
  Macau: "ASIA",
  "North Korea": "ASIA",
  "Timor-Leste": "ASIA",
  "Papua New Guinea": "ASIA",
  Australia: "ASIA",
  "New Zealand": "ASIA",
  Fiji: "ASIA",

  // SOUTHAMERICA Zone
  Brazil: "SOUTHAMERICA",
  Argentina: "SOUTHAMERICA",
  Chile: "SOUTHAMERICA",
  Colombia: "SOUTHAMERICA",
  Peru: "SOUTHAMERICA",
  Venezuela: "SOUTHAMERICA",
  Ecuador: "SOUTHAMERICA",
  Bolivia: "SOUTHAMERICA",
  Paraguay: "SOUTHAMERICA",
  Uruguay: "SOUTHAMERICA",
  Guyana: "SOUTHAMERICA",
  Suriname: "SOUTHAMERICA",
  "French Guiana": "SOUTHAMERICA",
  Mexico: "SOUTHAMERICA",
  Guatemala: "SOUTHAMERICA",
  Honduras: "SOUTHAMERICA",
  "El Salvador": "SOUTHAMERICA",
  Nicaragua: "SOUTHAMERICA",
  "Costa Rica": "SOUTHAMERICA",
  Panama: "SOUTHAMERICA",
  Belize: "SOUTHAMERICA",
  Cuba: "SOUTHAMERICA",
  Jamaica: "SOUTHAMERICA",
  Haiti: "SOUTHAMERICA",
  "Dominican Republic": "SOUTHAMERICA",
  "Trinidad and Tobago": "SOUTHAMERICA",
  Barbados: "SOUTHAMERICA",
  Bahamas: "SOUTHAMERICA",
  Grenada: "SOUTHAMERICA",
  "Saint Lucia": "SOUTHAMERICA",
  "Saint Vincent and the Grenadines": "SOUTHAMERICA",
  "Antigua and Barbuda": "SOUTHAMERICA",
  Dominica: "SOUTHAMERICA",
  "Saint Kitts and Nevis": "SOUTHAMERICA",
};

/**
 * Zone display names that match the CSV column headers
 */
export const ZONE_DISPLAY_NAMES: Record<string, string> = {
  UK_IRELAND: "UK/Ireland",
  WEST_CENTRAAFRICA: "West/Centra Africa",
  USA_CANADA: "USA/Canada",
  EUROPE: "Europe",
  EAST_SOUTHAFRICA: "East/South Africa",
  MIDDLEEAST: "Middle East",
  ASIA: "Asia",
  SOUTHAMERICA: "South America",
};

/**
 * Get zone for a country name
 * Case-insensitive lookup
 */
export function getZoneForCountry(country: string): string | null {
  // Normalize the country name
  const normalizedCountry = country.trim();

  // Try exact match first
  if (COUNTRY_TO_ZONE[normalizedCountry]) {
    return COUNTRY_TO_ZONE[normalizedCountry];
  }

  // Try case-insensitive match
  const lowerCountry = normalizedCountry.toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_TO_ZONE)) {
    if (key.toLowerCase() === lowerCountry) {
      return value;
    }
  }

  return null;
}

/**
 * Get all countries in a zone
 */
export function getCountriesInZone(zone: string): string[] {
  return Object.entries(COUNTRY_TO_ZONE)
    .filter(([_, zoneValue]) => zoneValue === zone)
    .map(([country, _]) => country);
}

/**
 * Get all available zones
 */
export function getAllZones(): string[] {
  return Array.from(new Set(Object.values(COUNTRY_TO_ZONE)));
}

/**
 * Get display name for a zone (e.g., UK_IRELAND -> "UK/Ireland")
 * @param zone - The zone identifier
 * @returns Human-readable zone name
 */
export function getZoneDisplayName(zone: string): string {
  return ZONE_DISPLAY_NAMES[zone] || zone;
}
