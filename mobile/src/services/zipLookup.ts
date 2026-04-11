// mobile/src/services/zipLookup.ts
// Maps zip codes to city IDs. Unknown zips trigger a Serper 211 search
// and results are cached in AsyncStorage for offline reuse.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Built-in ZIP → city ID map ──────────────────────────────────────────────
// Covers core zip codes for the 6 supported cities.
const ZIP_CITY_MAP: Record<string, string> = {
  // Colorado — Denver
  '80202': 'denver', '80203': 'denver', '80204': 'denver', '80205': 'denver',
  '80206': 'denver', '80207': 'denver', '80209': 'denver', '80210': 'denver',
  '80211': 'denver', '80212': 'denver', '80214': 'denver', '80215': 'denver',
  '80219': 'denver', '80220': 'denver', '80221': 'denver', '80223': 'denver',
  '80224': 'denver', '80226': 'denver', '80227': 'denver', '80228': 'denver',
  '80229': 'denver', '80230': 'denver', '80231': 'denver', '80232': 'denver',
  '80233': 'denver', '80234': 'denver', '80235': 'denver', '80236': 'denver',
  '80237': 'denver', '80238': 'denver', '80239': 'denver', '80246': 'denver',
  '80249': 'denver', '80260': 'denver', '80264': 'denver', '80290': 'denver',
  '80294': 'denver', '80401': 'denver', '80403': 'denver',

  // California — San Francisco
  '94102': 'san_francisco', '94103': 'san_francisco', '94105': 'san_francisco',
  '94107': 'san_francisco', '94109': 'san_francisco', '94110': 'san_francisco',
  '94112': 'san_francisco', '94114': 'san_francisco', '94117': 'san_francisco',
  '94118': 'san_francisco', '94121': 'san_francisco', '94122': 'san_francisco',
  '94123': 'san_francisco', '94124': 'san_francisco', '94133': 'san_francisco',
  '94134': 'san_francisco',

  // California — Los Angeles
  '90007': 'los_angeles', '90010': 'los_angeles', '90011': 'los_angeles',
  '90012': 'los_angeles', '90015': 'los_angeles', '90017': 'los_angeles',
  '90019': 'los_angeles', '90021': 'los_angeles', '90026': 'los_angeles',
  '90028': 'los_angeles', '90029': 'los_angeles', '90031': 'los_angeles',
  '90033': 'los_angeles', '90037': 'los_angeles', '90038': 'los_angeles',
  '90057': 'los_angeles', '90068': 'los_angeles', '90210': 'los_angeles',
  '90291': 'los_angeles', '90401': 'los_angeles',

  // New York — NYC
  '10001': 'new_york', '10002': 'new_york', '10003': 'new_york',
  '10007': 'new_york', '10009': 'new_york', '10010': 'new_york',
  '10013': 'new_york', '10014': 'new_york', '10019': 'new_york',
  '10025': 'new_york', '10027': 'new_york', '10030': 'new_york',
  '10031': 'new_york', '10036': 'new_york', '10037': 'new_york',
  '10039': 'new_york', '10040': 'new_york', '10451': 'new_york',
  '10452': 'new_york', '10453': 'new_york', '10454': 'new_york',
  '10455': 'new_york', '10456': 'new_york', '10457': 'new_york',
  '10458': 'new_york', '10459': 'new_york', '10460': 'new_york',

  // Florida — Miami
  '33101': 'miami', '33125': 'miami', '33127': 'miami', '33128': 'miami',
  '33129': 'miami', '33130': 'miami', '33131': 'miami', '33132': 'miami',
  '33133': 'miami', '33135': 'miami', '33136': 'miami', '33137': 'miami',
  '33138': 'miami', '33139': 'miami', '33142': 'miami', '33144': 'miami',
  '33145': 'miami', '33150': 'miami', '33167': 'miami', '33169': 'miami',

  // Texas — Dallas
  '75201': 'dallas', '75202': 'dallas', '75203': 'dallas', '75204': 'dallas',
  '75205': 'dallas', '75206': 'dallas', '75207': 'dallas', '75208': 'dallas',
  '75210': 'dallas', '75212': 'dallas', '75214': 'dallas', '75215': 'dallas',
  '75216': 'dallas', '75217': 'dallas', '75220': 'dallas', '75223': 'dallas',
  '75224': 'dallas', '75226': 'dallas', '75227': 'dallas', '75228': 'dallas',
};

const CACHE_PREFIX_CITY = 'zip_city_';
const CACHE_PREFIX_RESOURCES = 'zip_resources_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ZipResource {
  name: string;
  phone: string;
  address: string;
  services: string[];
  source: 'builtin' | 'live' | 'cached';
}

export interface ZipLookupResult {
  cityId: string | null;
  cityName: string | null;
  resources: ZipResource[];
  isKnownCity: boolean;
  fromCache: boolean;
}

// ── Lookup a zip code ────────────────────────────────────────────────────────
export async function lookupZip(
  zip: string,
  serperApiKey?: string,
): Promise<ZipLookupResult> {
  const trimmed = zip.trim().slice(0, 5);

  // 1. Check built-in map
  const builtInCity = ZIP_CITY_MAP[trimmed];
  if (builtInCity) {
    return {
      cityId: builtInCity,
      cityName: cityIdToName(builtInCity),
      resources: [],
      isKnownCity: true,
      fromCache: false,
    };
  }

  // 2. Check AsyncStorage cache
  const cachedCity = await AsyncStorage.getItem(CACHE_PREFIX_CITY + trimmed);
  const cachedTs = await AsyncStorage.getItem(CACHE_PREFIX_CITY + trimmed + '_ts');
  const cacheValid = cachedTs && Date.now() - parseInt(cachedTs) < CACHE_TTL_MS;

  if (cachedCity && cacheValid) {
    const rawResources = await AsyncStorage.getItem(CACHE_PREFIX_RESOURCES + trimmed);
    const resources: ZipResource[] = rawResources
      ? (JSON.parse(rawResources) as ZipResource[]).map(r => ({ ...r, source: 'cached' }))
      : [];
    return {
      cityId: cachedCity === '__unknown__' ? null : cachedCity,
      cityName: cachedCity === '__unknown__' ? null : cityIdToName(cachedCity),
      resources,
      isKnownCity: false,
      fromCache: true,
    };
  }

  // 3. Live Serper search for unknown zip
  if (serperApiKey) {
    const liveResources = await fetchResourcesForZip(trimmed, serperApiKey);
    await cacheZipData(trimmed, '__unknown__', liveResources);
    return {
      cityId: null,
      cityName: null,
      resources: liveResources,
      isKnownCity: false,
      fromCache: false,
    };
  }

  // 4. Nothing found
  return {
    cityId: null,
    cityName: null,
    resources: [],
    isKnownCity: false,
    fromCache: false,
  };
}

// ── Persist zip data to AsyncStorage ────────────────────────────────────────
export async function cacheZipData(
  zip: string,
  cityId: string,
  resources: ZipResource[],
): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX_CITY + zip, cityId);
  await AsyncStorage.setItem(CACHE_PREFIX_CITY + zip + '_ts', String(Date.now()));
  await AsyncStorage.setItem(CACHE_PREFIX_RESOURCES + zip, JSON.stringify(resources));
}

// ── Clear cached data for a zip ──────────────────────────────────────────────
export async function clearZipCache(zip: string): Promise<void> {
  await AsyncStorage.multiRemove([
    CACHE_PREFIX_CITY + zip,
    CACHE_PREFIX_CITY + zip + '_ts',
    CACHE_PREFIX_RESOURCES + zip,
  ]);
}

// ── Fetch live 211 resources via Serper ──────────────────────────────────────
async function fetchResourcesForZip(
  zip: string,
  apiKey: string,
): Promise<ZipResource[]> {
  try {
    const query = `211 homeless shelter housing resources ${zip}`;
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'us', num: 8 }),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results: ZipResource[] = [];

    for (const item of data.organic ?? []) {
      if (!item.title || !item.snippet) continue;
      const phone = extractPhone(item.snippet + ' ' + (item.title ?? ''));
      results.push({
        name: item.title,
        phone: phone ?? '211',
        address: item.link ?? '',
        services: inferServices(item.snippet),
        source: 'live',
      });
      if (results.length >= 6) break;
    }

    // Always add 211 as fallback
    results.push({
      name: '211 Helpline — Local Resources',
      phone: '211',
      address: `Serving zip ${zip}`,
      services: ['crisis_line', 'housing_referral', 'food', 'utilities'],
      source: 'live',
    });

    return results;
  } catch {
    return [
      {
        name: '211 Helpline — Local Resources',
        phone: '211',
        address: `Serving zip ${zip}`,
        services: ['crisis_line', 'housing_referral', 'food', 'utilities'],
        source: 'live',
      },
    ];
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function cityIdToName(id: string): string {
  const names: Record<string, string> = {
    denver: 'Denver, CO',
    san_francisco: 'San Francisco, CA',
    los_angeles: 'Los Angeles, CA',
    new_york: 'New York City, NY',
    miami: 'Miami, FL',
    dallas: 'Dallas, TX',
  };
  return names[id] ?? id;
}

function extractPhone(text: string): string | null {
  const m = text.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  return m ? m[0] : null;
}

function inferServices(text: string): string[] {
  const lower = text.toLowerCase();
  const services: string[] = [];
  if (lower.includes('shelter') || lower.includes('housing')) services.push('emergency_shelter');
  if (lower.includes('food') || lower.includes('meal')) services.push('meals');
  if (lower.includes('mental health') || lower.includes('crisis')) services.push('mental_health');
  if (lower.includes('medical') || lower.includes('health')) services.push('medical');
  if (lower.includes('legal')) services.push('legal_aid');
  if (lower.includes('job') || lower.includes('employ')) services.push('employment');
  if (services.length === 0) services.push('general_services');
  return services;
}
