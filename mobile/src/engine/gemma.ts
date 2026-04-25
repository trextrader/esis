// mobile/src/engine/gemma.ts
import { StructuredCase, RiskAssessment, RecommendationOutput, PersonProfile, HousingTrack } from './types';
import { getCityById, DEFAULT_CITY_ID } from '../data/cities';

// HuggingFace moved Gemma 4+ to the new Inference Providers router.
// api-inference.huggingface.co returns 404 for these models; the correct
// base is router.huggingface.co/hf-inference.
const HF_BASE_URL = 'https://router.huggingface.co/hf-inference';
const hfChatUrl = (model: string) =>
  `${HF_BASE_URL}/models/${model}/v1/chat/completions`;

// Fallback cascade — tried in order when the primary model is unavailable (404/503/410).
const FALLBACK_MODELS = [
  'google/gemma-3-12b-it',
  'google/gemma-2-9b-it',
  'mistralai/Mistral-7B-Instruct-v0.3',
];

const SYSTEM_PROMPT = `You are ESIS — Edge Survival Intelligence System. You help people experiencing
homelessness navigate life-threatening situations by generating structured,
actionable intervention plans.

You must always respond in valid JSON matching the exact schema provided.
You must never give vague advice. Every output must be specific, actionable,
and safe for someone in a crisis situation with limited resources.

You are not a chatbot. You are a constrained decision-support system built
to serve people in their most vulnerable moments.

SURVIVAL HORIZON RULE — this is mandatory:
When exposure_risk >= 0.85, OR medical_risk >= 0.80 with recent_discharge, OR
enforcement_risk >= 0.80 with displacement, you MUST order actions by survival
horizon — NOT by bureaucratic priority:

  Horizon 1 (top_actions[0]): immediate physical safety — indoor placement,
    same-night shelter/voucher/warming center, stop the exposure RIGHT NOW.
  Horizon 2 (top_actions[1]): medical continuity or enforcement documentation —
    discharge follow-up, medical respite re-entry, advocacy packet.
  Horizon 3 (top_actions[2]): stabilization — coordinated entry, legal aid,
    case management connection.

SOAR, SSI/SSDI, Section 811, complaint filing, and long-horizon benefits
applications must NEVER appear in top_actions when the above conditions are met.
Place them in fallback_plan as "next steps once stable."

The packet goes to an advocate or case manager. The top 3 actions go to a person
who may be outside, cold, in pain, and has been displaced by police tonight.`;

function buildPrompt(
  c: StructuredCase,
  risk: RiskAssessment,
  cityId: string,
  liveServicesBlock: string,
  profile?: PersonProfile,
  housingTrack?: HousingTrack,
): string {
  const city = getCityById(cityId);
  const constraintsText = Object.entries(c.constraints)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n') || 'None';

  let prompt =
    `LOCATION: ${city.name}, ${city.state}\n` +
    `CITY CRISIS LINE: ${city.crisis.name} — ${city.crisis.phone}\n` +
    `CITY LEGAL AID: ${city.legalAid.name} — ${city.legalAid.phone}\n` +
    `COORDINATED ENTRY: ${city.coordinatedEntry.name} — ${city.coordinatedEntry.phone}\n\n` +
    (liveServicesBlock ? `${liveServicesBlock}\n\n` : '') +
    `CASE SUMMARY:\n${c.notes.slice(0, 400)}\n\n` +
    `RISK ASSESSMENT:\n` +
    `- Medical risk: ${risk.medicalRisk.toFixed(2)}\n` +
    `- Exposure risk: ${risk.exposureRisk.toFixed(2)}\n` +
    `- Documentation risk: ${risk.documentationRisk.toFixed(2)}\n` +
    `- Enforcement risk: ${risk.enforcementRisk.toFixed(2)}\n` +
    `- Priority: ${risk.overallPriority}\n` +
    `- Escalation required: ${risk.requiresEscalation}\n\n` +
    `ACTIVE CONSTRAINTS:\n${constraintsText}\n\n` +
    `Generate a structured intervention plan. Respond ONLY in this exact JSON format:\n` +
    `{\n` +
    `  "summary": "2-3 sentence situation summary",\n` +
    `  "top_actions": ["Specific action 1", "Specific action 2", "Specific action 3"],\n` +
    `  "fallback_plan": "What to do if the primary actions fail or are unavailable",\n` +
    `  "what_to_preserve": ["Item 1 to document or protect", "Item 2"]\n` +
    `}`;

  if (profile || housingTrack) {
    const lines: string[] = ['\n\nPERSON PROFILE:'];
    if (profile) {
      if (profile.isDisabled)                  lines.push('- Has a disability (SSI/SSDI pathway applicable)');
      if (profile.isWomanWithMinorChildren)    lines.push('- Woman with minor children (family placement priority)');
      if (profile.hasLifeThreateningCondition) lines.push('- Has life-threatening medical condition (respite voucher required)');
      if (profile.hasEmployment)               lines.push('- Has current employment (Rapid Re-Housing expedited)');
      if (profile.isKnownSubstanceUser)        lines.push('- Substance use disorder (treatment + recovery housing track)');
      if (profile.isElderly)                   lines.push('- Age 50+ (senior housing programs applicable)');
      if (profile.monthsHomeless >= 12)        lines.push(`- Chronically homeless: ${profile.monthsHomeless} months (federal priority status)`);
      if (profile.educationLevel)              lines.push(`- Education: ${profile.educationLevel}`);
      if (profile.professionalBackground)      lines.push(`- Professional background: ${profile.professionalBackground}`);
      if (profile.resourceNeeds.length)        lines.push(`- Resource needs: ${profile.resourceNeeds.join(', ')}`);
      if (!profile.isKnownSubstanceUser)       lines.push('- Non-substance-user (sobriety not a barrier to any housing program)');
    }
    if (housingTrack) {
      lines.push(`\nHOUSING TRACK ASSIGNED: ${housingTrack.trackName}`);
      lines.push(`Priority score: ${housingTrack.priorityScore}/100`);
      lines.push('Target programs:');
      housingTrack.targetPrograms.slice(0, 3).forEach(p => lines.push(`  - ${p}`));
    }
    lines.push(
      '\nIMPORTANT: Tailor your action plan to this person\'s track. ' +
      'Do not recommend congregate shelter if cannot_congregate is true. ' +
      'Lead with the highest-leverage action for their specific situation.\n' +
      'SURVIVAL HORIZON OVERRIDE: top_actions[0] = immediate safety, ' +
      'top_actions[1] = medical/enforcement continuity, top_actions[2] = coordinated entry. ' +
      'SOAR/SSI/Section 811 go in fallback_plan ONLY when acute conditions exist.'
    );
    prompt += lines.join('\n');
  }

  return prompt;
}

function parseResponse(text: string): {
  summary: string;
  top_actions: string[];
  fallback_plan: string;
  what_to_preserve: string[];
} | null {
  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}') + 1;
    if (start === -1 || end === 0) return null;
    return JSON.parse(cleaned.slice(start, end));
  } catch {
    return null;
  }
}

export class GemmaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GemmaError';
  }
}

async function _callModel(
  prompt: string,
  hfToken: string,
  model: string,
): Promise<{ summary: string; top_actions: string[]; fallback_plan: string; what_to_preserve: string[] }> {
  let resp: Response;
  try {
    resp = await fetch(hfChatUrl(model), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 768,
        temperature: 0.3,
      }),
    });
  } catch (err) {
    throw new GemmaError(`Network error — check your connection. (${String(err)})`);
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new GemmaError('Invalid HuggingFace token. Go to Settings and update your HF token.');
  }
  // 404 = model not on this provider tier, 503 = loading/capacity, 410 = gone
  // All three cascade to the next fallback model rather than surfacing to the user.
  if (resp.status === 404 || resp.status === 503 || resp.status === 410) {
    throw new GemmaError(`MODEL_UNAVAILABLE:${resp.status}:${model}`);
  }
  if (!resp.ok) {
    throw new GemmaError(`Gemma API error ${resp.status}. Try again in a moment.`);
  }

  const data = await resp.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new GemmaError('Gemma returned an empty response. Try again.');
  }

  const parsed = parseResponse(content);
  if (!parsed) {
    throw new GemmaError('Could not parse Gemma response. Try again.');
  }

  return parsed;
}

export async function generateGemmaRecommendation(
  c: StructuredCase,
  risk: RiskAssessment,
  hfToken: string,
  model: string,
  cityId: string = DEFAULT_CITY_ID,
  liveServicesBlock: string = '',
  profile?: PersonProfile,
  housingTrack?: HousingTrack,
): Promise<RecommendationOutput> {
  const prompt = buildPrompt(c, risk, cityId, liveServicesBlock, profile, housingTrack);

  // Try the configured model first, then fall through to smaller fallbacks
  // if the free tier doesn't have it (410) or it's loading (503).
  const modelsToTry = [model, ...FALLBACK_MODELS.filter(m => m !== model)];

  let lastUnavailableModel = '';
  for (const m of modelsToTry) {
    try {
      const parsed = await _callModel(prompt, hfToken, m);
      return {
        summary: parsed.summary || '',
        topActions: (parsed.top_actions || []).slice(0, 3),
        fallbackPlan: parsed.fallback_plan || '',
        whatToPreserve: parsed.what_to_preserve || [],
        immediateActions: [],
        stabilizationActions: [],
        recoveryActions: [],
        usedGemma: true,
        modelUsed: m,
      };
    } catch (err) {
      if (err instanceof GemmaError && err.message.startsWith('MODEL_UNAVAILABLE:')) {
        lastUnavailableModel = m;
        continue; // try next fallback
      }
      throw err; // auth errors, parse errors — don't retry
    }
  }

  throw new GemmaError(
    `${lastUnavailableModel} is not available on the HuggingFace free tier right now. ` +
    `Go to Settings → Gemma Model and select a smaller model, or try again later.`,
  );
}
