// mobile/src/services/search211.ts
// Live service search via Serper (Google Search API).
// Queries 211.org, findhelp.org, and local city directories for verified social services.
// Results are injected into Gemma's prompt as real-time context.

const SERPER_URL = 'https://google.serper.dev/search';

// Trusted social service domains — results from these are higher-signal
const TRUSTED_SOURCES = [
  '211.org', 'findhelp.org', 'auntbertha.com',
  '211la.org', '311.nyc.gov', 'lahsa.org',
  'sfhsh.org', 'miamidade.gov', 'denvergov.org',
];

const DOMAIN_QUERIES: Record<string, string> = {
  medical:     'medical respite homeless shelter hospital social work',
  exposure:    'emergency shelter warming center homeless tonight',
  documents:   'ID replacement legal aid documents homeless',
  enforcement: 'legal aid civil rights police homeless displacement advocacy',
};

const GENERIC_QUERY = 'emergency homeless services shelter';

export interface LiveService {
  title: string;
  snippet: string;
  link: string;
  trusted: boolean;
}

export async function searchLocalServices(
  cityName: string,
  stateName: string,
  riskDomains: string[],
  serperApiKey: string,
): Promise<LiveService[]> {
  if (!serperApiKey.trim()) return [];

  const domainQuery = riskDomains.length > 0
    ? riskDomains.map(d => DOMAIN_QUERIES[d] ?? GENERIC_QUERY).join(' ')
    : GENERIC_QUERY;

  const query = `"${cityName}" ${stateName} ${domainQuery}`;

  let resp: Response;
  try {
    resp = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 8 }),
    });
  } catch {
    return []; // network error — continue without live results
  }

  if (!resp.ok) return [];

  try {
    const data = await resp.json();
    const organic: Array<{ title: string; snippet: string; link: string }> =
      data.organic ?? [];

    return organic.slice(0, 6).map(r => ({
      title:   r.title   ?? '',
      snippet: r.snippet ?? '',
      link:    r.link    ?? '',
      trusted: TRUSTED_SOURCES.some(domain => r.link?.includes(domain)),
    }));
  } catch {
    return [];
  }
}

// Format live results for Gemma prompt injection
export function formatForPrompt(services: LiveService[]): string {
  if (services.length === 0) return '';

  const trusted   = services.filter(s => s.trusted);
  const untrusted = services.filter(s => !s.trusted);

  const lines: string[] = ['LIVE LOCAL SERVICES (found via real-time search — use these in your plan):'];

  for (const s of trusted) {
    lines.push(`★ ${s.title}`);
    lines.push(`  ${s.snippet}`);
  }
  for (const s of untrusted) {
    lines.push(`• ${s.title}`);
    lines.push(`  ${s.snippet}`);
  }

  lines.push('');
  lines.push('Prioritize ★ verified results (211.org, findhelp.org, city agencies) in your top_actions.');

  return lines.join('\n');
}
