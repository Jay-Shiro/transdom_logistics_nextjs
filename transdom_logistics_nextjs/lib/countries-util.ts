/**
 * Comprehensive Country List for Transdom Express
 * All countries mapped to 8 shipping zones based on TRANSDOM_EXPRESS_RATE_JAN_26.xlsx
 *
 * Zones:
 * 1. UK_IRELAND
 * 2. WEST_CENTRAL_AFRICA
 * 3. USA_CANADA
 * 4. EUROPE
 * 5. EAST_SOUTH_AFRICA
 * 6. MIDDLEEAST
 * 7. ASIA
 * 8. SOUTH_AMERICA
 */

export interface Country {
  value: string;
  label: string;
  zone: string;
}

export const COUNTRIES: Country[] = [
  // UK_IRELAND Zone
  { value: "United Kingdom", label: "United Kingdom", zone: "UK_IRELAND" },
  { value: "England", label: "England", zone: "UK_IRELAND" },
  { value: "Scotland", label: "Scotland", zone: "UK_IRELAND" },
  { value: "Wales", label: "Wales", zone: "UK_IRELAND" },
  { value: "Northern Ireland", label: "Northern Ireland", zone: "UK_IRELAND" },
  { value: "Ireland", label: "Ireland", zone: "UK_IRELAND" },
  {
    value: "Republic of Ireland",
    label: "Republic of Ireland",
    zone: "UK_IRELAND",
  },

  // WEST_CENTRAL_AFRICA Zone
  { value: "Nigeria", label: "Nigeria", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Ghana", label: "Ghana", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Senegal", label: "Senegal", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Ivory Coast", label: "Ivory Coast", zone: "WEST_CENTRAL_AFRICA" },
  {
    value: "Cote d'Ivoire",
    label: "Côte d'Ivoire",
    zone: "WEST_CENTRAL_AFRICA",
  },
  { value: "Cameroon", label: "Cameroon", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Benin", label: "Benin", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Togo", label: "Togo", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Mali", label: "Mali", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Burkina Faso", label: "Burkina Faso", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Niger", label: "Niger", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Chad", label: "Chad", zone: "WEST_CENTRAL_AFRICA" },
  {
    value: "Central African Republic",
    label: "Central African Republic",
    zone: "WEST_CENTRAL_AFRICA",
  },
  { value: "Congo", label: "Congo", zone: "WEST_CENTRAL_AFRICA" },
  {
    value: "Democratic Republic of Congo",
    label: "Democratic Republic of Congo",
    zone: "WEST_CENTRAL_AFRICA",
  },
  { value: "Gabon", label: "Gabon", zone: "WEST_CENTRAL_AFRICA" },
  {
    value: "Equatorial Guinea",
    label: "Equatorial Guinea",
    zone: "WEST_CENTRAL_AFRICA",
  },
  { value: "Sierra Leone", label: "Sierra Leone", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Liberia", label: "Liberia", zone: "WEST_CENTRAL_AFRICA" },
  { value: "Guinea", label: "Guinea", zone: "WEST_CENTRAL_AFRICA" },
  {
    value: "Guinea-Bissau",
    label: "Guinea-Bissau",
    zone: "WEST_CENTRAL_AFRICA",
  },
  { value: "Gambia", label: "Gambia", zone: "WEST_CENTRAL_AFRICA" },

  // USA_CANADA Zone
  { value: "United States", label: "United States", zone: "USA_CANADA" },
  { value: "USA", label: "USA", zone: "USA_CANADA" },
  {
    value: "United States of America",
    label: "United States of America",
    zone: "USA_CANADA",
  },
  { value: "Canada", label: "Canada", zone: "USA_CANADA" },

  // EUROPE Zone
  { value: "France", label: "France", zone: "EUROPE" },
  { value: "Germany", label: "Germany", zone: "EUROPE" },
  { value: "Spain", label: "Spain", zone: "EUROPE" },
  { value: "Italy", label: "Italy", zone: "EUROPE" },
  { value: "Netherlands", label: "Netherlands", zone: "EUROPE" },
  { value: "Belgium", label: "Belgium", zone: "EUROPE" },
  { value: "Switzerland", label: "Switzerland", zone: "EUROPE" },
  { value: "Austria", label: "Austria", zone: "EUROPE" },
  { value: "Portugal", label: "Portugal", zone: "EUROPE" },
  { value: "Greece", label: "Greece", zone: "EUROPE" },
  { value: "Poland", label: "Poland", zone: "EUROPE" },
  { value: "Sweden", label: "Sweden", zone: "EUROPE" },
  { value: "Norway", label: "Norway", zone: "EUROPE" },
  { value: "Denmark", label: "Denmark", zone: "EUROPE" },
  { value: "Finland", label: "Finland", zone: "EUROPE" },
  { value: "Czech Republic", label: "Czech Republic", zone: "EUROPE" },
  { value: "Hungary", label: "Hungary", zone: "EUROPE" },
  { value: "Romania", label: "Romania", zone: "EUROPE" },
  { value: "Slovakia", label: "Slovakia", zone: "EUROPE" },
  { value: "Bulgaria", label: "Bulgaria", zone: "EUROPE" },
  { value: "Croatia", label: "Croatia", zone: "EUROPE" },
  { value: "Slovenia", label: "Slovenia", zone: "EUROPE" },
  { value: "Luxembourg", label: "Luxembourg", zone: "EUROPE" },
  { value: "Malta", label: "Malta", zone: "EUROPE" },
  { value: "Cyprus", label: "Cyprus", zone: "EUROPE" },
  { value: "Estonia", label: "Estonia", zone: "EUROPE" },
  { value: "Latvia", label: "Latvia", zone: "EUROPE" },
  { value: "Lithuania", label: "Lithuania", zone: "EUROPE" },
  { value: "Iceland", label: "Iceland", zone: "EUROPE" },
  { value: "Albania", label: "Albania", zone: "EUROPE" },
  { value: "Serbia", label: "Serbia", zone: "EUROPE" },
  { value: "Montenegro", label: "Montenegro", zone: "EUROPE" },
  { value: "North Macedonia", label: "North Macedonia", zone: "EUROPE" },
  {
    value: "Bosnia and Herzegovina",
    label: "Bosnia and Herzegovina",
    zone: "EUROPE",
  },
  { value: "Kosovo", label: "Kosovo", zone: "EUROPE" },
  { value: "Moldova", label: "Moldova", zone: "EUROPE" },
  { value: "Ukraine", label: "Ukraine", zone: "EUROPE" },
  { value: "Belarus", label: "Belarus", zone: "EUROPE" },

  // EAST_SOUTH_AFRICA Zone
  { value: "Kenya", label: "Kenya", zone: "EAST_SOUTH_AFRICA" },
  { value: "Tanzania", label: "Tanzania", zone: "EAST_SOUTH_AFRICA" },
  { value: "Uganda", label: "Uganda", zone: "EAST_SOUTH_AFRICA" },
  { value: "Rwanda", label: "Rwanda", zone: "EAST_SOUTH_AFRICA" },
  { value: "Burundi", label: "Burundi", zone: "EAST_SOUTH_AFRICA" },
  { value: "Ethiopia", label: "Ethiopia", zone: "EAST_SOUTH_AFRICA" },
  { value: "Somalia", label: "Somalia", zone: "EAST_SOUTH_AFRICA" },
  { value: "Djibouti", label: "Djibouti", zone: "EAST_SOUTH_AFRICA" },
  { value: "Eritrea", label: "Eritrea", zone: "EAST_SOUTH_AFRICA" },
  { value: "South Sudan", label: "South Sudan", zone: "EAST_SOUTH_AFRICA" },
  { value: "South Africa", label: "South Africa", zone: "EAST_SOUTH_AFRICA" },
  { value: "Zambia", label: "Zambia", zone: "EAST_SOUTH_AFRICA" },
  { value: "Zimbabwe", label: "Zimbabwe", zone: "EAST_SOUTH_AFRICA" },
  { value: "Botswana", label: "Botswana", zone: "EAST_SOUTH_AFRICA" },
  { value: "Namibia", label: "Namibia", zone: "EAST_SOUTH_AFRICA" },
  { value: "Mozambique", label: "Mozambique", zone: "EAST_SOUTH_AFRICA" },
  { value: "Malawi", label: "Malawi", zone: "EAST_SOUTH_AFRICA" },
  { value: "Madagascar", label: "Madagascar", zone: "EAST_SOUTH_AFRICA" },
  { value: "Mauritius", label: "Mauritius", zone: "EAST_SOUTH_AFRICA" },
  { value: "Seychelles", label: "Seychelles", zone: "EAST_SOUTH_AFRICA" },
  { value: "Comoros", label: "Comoros", zone: "EAST_SOUTH_AFRICA" },
  { value: "Lesotho", label: "Lesotho", zone: "EAST_SOUTH_AFRICA" },
  { value: "Eswatini", label: "Eswatini", zone: "EAST_SOUTH_AFRICA" },
  { value: "Swaziland", label: "Swaziland", zone: "EAST_SOUTH_AFRICA" },
  { value: "Angola", label: "Angola", zone: "EAST_SOUTH_AFRICA" },

  // MIDDLEEAST Zone
  { value: "Saudi Arabia", label: "Saudi Arabia", zone: "MIDDLEEAST" },
  {
    value: "United Arab Emirates",
    label: "United Arab Emirates",
    zone: "MIDDLEEAST",
  },
  { value: "UAE", label: "UAE", zone: "MIDDLEEAST" },
  { value: "Dubai", label: "Dubai", zone: "MIDDLEEAST" },
  { value: "Qatar", label: "Qatar", zone: "MIDDLEEAST" },
  { value: "Kuwait", label: "Kuwait", zone: "MIDDLEEAST" },
  { value: "Bahrain", label: "Bahrain", zone: "MIDDLEEAST" },
  { value: "Oman", label: "Oman", zone: "MIDDLEEAST" },
  { value: "Jordan", label: "Jordan", zone: "MIDDLEEAST" },
  { value: "Lebanon", label: "Lebanon", zone: "MIDDLEEAST" },
  { value: "Syria", label: "Syria", zone: "MIDDLEEAST" },
  { value: "Iraq", label: "Iraq", zone: "MIDDLEEAST" },
  { value: "Yemen", label: "Yemen", zone: "MIDDLEEAST" },
  { value: "Israel", label: "Israel", zone: "MIDDLEEAST" },
  { value: "Palestine", label: "Palestine", zone: "MIDDLEEAST" },
  { value: "Turkey", label: "Turkey", zone: "MIDDLEEAST" },
  { value: "Iran", label: "Iran", zone: "MIDDLEEAST" },
  { value: "Egypt", label: "Egypt", zone: "MIDDLEEAST" },
  { value: "Libya", label: "Libya", zone: "MIDDLEEAST" },
  { value: "Tunisia", label: "Tunisia", zone: "MIDDLEEAST" },
  { value: "Algeria", label: "Algeria", zone: "MIDDLEEAST" },
  { value: "Morocco", label: "Morocco", zone: "MIDDLEEAST" },

  // ASIA Zone
  { value: "China", label: "China", zone: "ASIA" },
  { value: "Japan", label: "Japan", zone: "ASIA" },
  { value: "South Korea", label: "South Korea", zone: "ASIA" },
  { value: "India", label: "India", zone: "ASIA" },
  { value: "Pakistan", label: "Pakistan", zone: "ASIA" },
  { value: "Bangladesh", label: "Bangladesh", zone: "ASIA" },
  { value: "Sri Lanka", label: "Sri Lanka", zone: "ASIA" },
  { value: "Nepal", label: "Nepal", zone: "ASIA" },
  { value: "Bhutan", label: "Bhutan", zone: "ASIA" },
  { value: "Maldives", label: "Maldives", zone: "ASIA" },
  { value: "Afghanistan", label: "Afghanistan", zone: "ASIA" },
  { value: "Thailand", label: "Thailand", zone: "ASIA" },
  { value: "Vietnam", label: "Vietnam", zone: "ASIA" },
  { value: "Malaysia", label: "Malaysia", zone: "ASIA" },
  { value: "Singapore", label: "Singapore", zone: "ASIA" },
  { value: "Indonesia", label: "Indonesia", zone: "ASIA" },
  { value: "Philippines", label: "Philippines", zone: "ASIA" },
  { value: "Myanmar", label: "Myanmar", zone: "ASIA" },
  { value: "Cambodia", label: "Cambodia", zone: "ASIA" },
  { value: "Laos", label: "Laos", zone: "ASIA" },
  { value: "Brunei", label: "Brunei", zone: "ASIA" },
  { value: "Mongolia", label: "Mongolia", zone: "ASIA" },
  { value: "Taiwan", label: "Taiwan", zone: "ASIA" },
  { value: "Hong Kong", label: "Hong Kong", zone: "ASIA" },
  { value: "Macau", label: "Macau", zone: "ASIA" },
  { value: "North Korea", label: "North Korea", zone: "ASIA" },
  { value: "Timor-Leste", label: "Timor-Leste", zone: "ASIA" },
  { value: "Papua New Guinea", label: "Papua New Guinea", zone: "ASIA" },
  { value: "Australia", label: "Australia", zone: "ASIA" },
  { value: "New Zealand", label: "New Zealand", zone: "ASIA" },
  { value: "Fiji", label: "Fiji", zone: "ASIA" },

  // SOUTH_AMERICA Zone
  { value: "Brazil", label: "Brazil", zone: "SOUTH_AMERICA" },
  { value: "Argentina", label: "Argentina", zone: "SOUTH_AMERICA" },
  { value: "Chile", label: "Chile", zone: "SOUTH_AMERICA" },
  { value: "Colombia", label: "Colombia", zone: "SOUTH_AMERICA" },
  { value: "Peru", label: "Peru", zone: "SOUTH_AMERICA" },
  { value: "Venezuela", label: "Venezuela", zone: "SOUTH_AMERICA" },
  { value: "Ecuador", label: "Ecuador", zone: "SOUTH_AMERICA" },
  { value: "Bolivia", label: "Bolivia", zone: "SOUTH_AMERICA" },
  { value: "Paraguay", label: "Paraguay", zone: "SOUTH_AMERICA" },
  { value: "Uruguay", label: "Uruguay", zone: "SOUTH_AMERICA" },
  { value: "Guyana", label: "Guyana", zone: "SOUTH_AMERICA" },
  { value: "Suriname", label: "Suriname", zone: "SOUTH_AMERICA" },
  { value: "French Guiana", label: "French Guiana", zone: "SOUTH_AMERICA" },
  { value: "Mexico", label: "Mexico", zone: "SOUTH_AMERICA" },
  { value: "Guatemala", label: "Guatemala", zone: "SOUTH_AMERICA" },
  { value: "Honduras", label: "Honduras", zone: "SOUTH_AMERICA" },
  { value: "El Salvador", label: "El Salvador", zone: "SOUTH_AMERICA" },
  { value: "Nicaragua", label: "Nicaragua", zone: "SOUTH_AMERICA" },
  { value: "Costa Rica", label: "Costa Rica", zone: "SOUTH_AMERICA" },
  { value: "Panama", label: "Panama", zone: "SOUTH_AMERICA" },
  { value: "Belize", label: "Belize", zone: "SOUTH_AMERICA" },
  { value: "Cuba", label: "Cuba", zone: "SOUTH_AMERICA" },
  { value: "Jamaica", label: "Jamaica", zone: "SOUTH_AMERICA" },
  { value: "Haiti", label: "Haiti", zone: "SOUTH_AMERICA" },
  {
    value: "Dominican Republic",
    label: "Dominican Republic",
    zone: "SOUTH_AMERICA",
  },
  {
    value: "Trinidad and Tobago",
    label: "Trinidad and Tobago",
    zone: "SOUTH_AMERICA",
  },
  { value: "Barbados", label: "Barbados", zone: "SOUTH_AMERICA" },
  { value: "Bahamas", label: "Bahamas", zone: "SOUTH_AMERICA" },
  { value: "Grenada", label: "Grenada", zone: "SOUTH_AMERICA" },
  { value: "Saint Lucia", label: "Saint Lucia", zone: "SOUTH_AMERICA" },
  {
    value: "Saint Vincent and the Grenadines",
    label: "Saint Vincent and the Grenadines",
    zone: "SOUTH_AMERICA",
  },
  {
    value: "Antigua and Barbuda",
    label: "Antigua and Barbuda",
    zone: "SOUTH_AMERICA",
  },
  { value: "Dominica", label: "Dominica", zone: "SOUTH_AMERICA" },
  {
    value: "Saint Kitts and Nevis",
    label: "Saint Kitts and Nevis",
    zone: "SOUTH_AMERICA",
  },
];

/**
 * Get zone for a country name
 * Case-insensitive lookup with fallback
 */
export function getZoneForCountry(country: string): string | null {
  // Normalize the country name
  const normalizedCountry = country.trim();

  // Try exact match first
  const exactMatch = COUNTRIES.find((c) => c.value === normalizedCountry);
  if (exactMatch) {
    return exactMatch.zone;
  }

  // Try case-insensitive match
  const lowerCountry = normalizedCountry.toLowerCase();
  const caseInsensitiveMatch = COUNTRIES.find(
    (c) => c.value.toLowerCase() === lowerCountry,
  );

  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch.zone;
  }

  return null;
}

/**
 * Get all countries in a zone
 */
export function getCountriesInZone(zone: string): Country[] {
  return COUNTRIES.filter((country) => country.zone === zone);
}

/**
 * Get all available zones
 */
export function getAllZones(): string[] {
  return Array.from(new Set(COUNTRIES.map((c) => c.zone)));
}

/**
 * Get countries grouped by zone
 */
export function getCountriesByZone(): Record<string, Country[]> {
  return COUNTRIES.reduce(
    (acc, country) => {
      if (!acc[country.zone]) {
        acc[country.zone] = [];
      }
      acc[country.zone].push(country);
      return acc;
    },
    {} as Record<string, Country[]>,
  );
}

/**
 * Get formatted zone name for display
 */
export function getZoneDisplayName(zone: string): string {
  const zoneNames: Record<string, string> = {
    UK_IRELAND: "UK/Ireland",
    WEST_CENTRAL_AFRICA: "West/Central Africa",
    USA_CANADA: "USA/Canada",
    EUROPE: "Europe",
    EAST_SOUTH_AFRICA: "East/South Africa",
    MIDDLEEAST: "Middle East",
    ASIA: "Asia",
    SOUTH_AMERICA: "South America",
  };

  return zoneNames[zone] || zone;
}
