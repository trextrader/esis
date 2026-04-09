// mobile/src/engine/housing_track.ts
// TypeScript port of app/services/housing_track_service.py — multi-city aware
import { PersonProfile, HousingTrack } from './types';
import { getCityById, getCityTrack, DEFAULT_CITY_ID } from '../data/cities';

const TRACKS: Record<string, {
  name: string;
  programs: string[];
  timeline: string;
  actions: string[];
}> = {
  medical_respite: {
    name: 'Medical Respite — Immediate Safe Housing',
    programs: [
      'Colorado Medical Respite Program (CMRP) — non-congregate medical recovery housing',
      'Stout Street Health Center respite referral',
      'UCHealth social work emergency respite request',
      'Denver Health Community Health Services respite voucher',
    ],
    timeline: 'Same day — medical necessity overrides waitlists',
    actions: [
      'Request a MEDICAL RESPITE VOUCHER from ER social worker before discharge',
      'If already outside: call 303-293-2220 (Stout Street) and state life-threatening condition',
      'Document condition in writing — this triggers a protected pathway under ADA',
      "If denied: call 211 and say 'medical respite placement needed — life-threatening condition'",
    ],
  },
  family_protection: {
    name: 'Family / Child Protection Track',
    programs: [
      'Family Homelessness Prevention and Rapid Re-Housing (CO DHHS)',
      'Safe Families for Children emergency placement',
      'Catholic Charities Family Services',
      'Salvation Army Family Shelter — priority intake',
      'Section 8 Family Unification Program (FUP) — HUD priority',
    ],
    timeline: '24–72 hours — child welfare laws trigger mandatory placement',
    actions: [
      "Call 211 and explicitly say 'I have minor children and need emergency family shelter'",
      'Request Family Unification Program (FUP) voucher via local housing authority',
      'If children at risk of separation: call Denver Human Services 720-944-3666',
      'Document that you have custody — this accelerates placement',
    ],
  },
  disability_housing: {
    name: 'Disability Housing Track',
    programs: [
      'HUD Section 811 Supportive Housing for Persons with Disabilities',
      'SSI/SSDI Outreach, Access, and Recovery (SOAR) program',
      'Disability-specific rapid rehousing through Denver Human Services',
      'Colorado Division of Vocational Rehabilitation (DVR) housing support',
      'ADA reasonable accommodation — existing programs must accommodate disability',
    ],
    timeline: 'SOAR application: 60–90 days. Section 811: 3–6 months with active application',
    actions: [
      'Start SOAR (SSI/SSDI) application immediately — retroactive payments from application date',
      'Request disability accommodation in writing from any housing program you apply to',
      'Contact Colorado Legal Services (303-837-1321) for benefits application support',
      'Document disability with any available medical records — ER records count',
      'Apply for HUD Section 811 through Colorado Division of Housing',
    ],
  },
  treatment_recovery: {
    name: 'Treatment & Recovery Track',
    programs: [
      'Stout Street Health Center — integrated substance use + housing',
      'Step Denver — residential recovery + transitional housing + job training',
      'Sober living homes network (Oxford Houses Colorado)',
      'ACHC SUD Detox — acute stabilization before housing placement',
      'Colorado Recovery — peer-supported recovery housing',
      'Medicaid SUD coverage — Colorado covers all levels of care',
    ],
    timeline: 'Detox: 3–7 days. Residential treatment: 30–90 days. Sober living: 6–12 months',
    actions: [
      'Call Denver CARES (720-944-3700) for same-day substance use crisis stabilization',
      'Request Colorado Medicaid enrollment — covers full SUD treatment at no cost',
      'After stabilization: contact Stout Street (303-293-2220) for integrated housing + treatment',
      'Oxford House application (oxfordhouses.org) — peer-run sober living, low cost',
      "Recovery housing is NOT the same as shelter — ask specifically for 'recovery housing placement'",
    ],
  },
  chronic_priority: {
    name: 'Chronic Homelessness Priority — Permanent Supportive Housing',
    programs: [
      'HUD Permanent Supportive Housing (PSH) — highest federal priority',
      "Pathways to Home (Denver) — Housing First model, no sobriety requirement",
      'Colorado Rental Assistance Program emergency voucher',
      "Denver's Road Home — coordinated entry with chronic homeless priority",
      'HUD Section 8 / Housing Choice Voucher — priority waitlist for chronically homeless',
    ],
    timeline: 'Coordinated entry: 1–4 weeks. PSH placement: 30–90 days from active application',
    actions: [
      "Request Coordinated Entry assessment at any shelter or via 211 — do this TODAY",
      "State chronic homelessness explicitly: '12+ consecutive months or 4+ episodes totaling 12 months'",
      'Apply for HUD PSH directly at hud.gov — chronic status means priority queue',
      'Pathways to Home (720-932-3023) — Housing First, no requirements, permanent placement',
      'Request a VI-SPDAT (vulnerability assessment) — your score determines placement priority',
    ],
  },
  senior_services: {
    name: 'Senior Services Track (50+)',
    programs: [
      'HUD Section 202 — Supportive Housing for the Elderly',
      'Denver Regional Council of Governments Area Agency on Aging',
      'Colorado State Veterans Home (if veteran)',
      'STRIDE Community Health elder care services',
      'Seniors\' Resource Center emergency housing placement',
    ],
    timeline: 'Section 202: 60–180 days. Emergency elder placement: 24–72 hours',
    actions: [
      'Call Denver Area Agency on Aging: 303-480-6700 — elder emergency housing is separate queue',
      'Request Section 202 application through Denver Housing Authority',
      'If veteran: contact Denver VA (303-399-8020) for VASH voucher — elder veterans have priority',
      'STRIDE Community Health (303-344-9355) for elder health + housing coordination',
    ],
  },
  working_stability: {
    name: 'Working / Employment Stability Track',
    programs: [
      'Rapid Re-Housing (RRH) — deposit + first month + case management',
      'Colorado Homeless Contribution Tax Credit program (employer partnerships)',
      'Employee Assistance Programs (EAP) — many employers offer emergency housing aid',
      'Temporary Rental Assistance through 211',
      'Colorado Works (TANF) emergency assistance',
    ],
    timeline: 'RRH placement: 1–3 weeks. Deposit assistance: 3–5 business days',
    actions: [
      'Request Rapid Re-Housing referral via 211 — employment income speeds qualification',
      'Ask your employer HR about Employee Assistance Program (EAP) emergency housing support',
      'Apply for Colorado Works (TANF) emergency cash assistance: colorado.gov/peak',
      'Document income with pay stubs — this accelerates RRH and rental assistance approvals',
      'Target rooms for rent / shared housing over shelter — your income qualifies you',
    ],
  },
  professional_reentry: {
    name: 'Professional Re-Entry Track',
    programs: [
      'Non-congregate Rapid Re-Housing — private unit, no shelter',
      'Colorado Workforce Centers — resume, job placement, emergency assistance',
      'Community resource matching — ESIS community ping to local neighborhood networks',
      'Tech/professional skills matching via LinkedIn Local and Nextdoor',
      'Colorado Assistive Technology Program (CATP) — refurbished tech grants',
    ],
    timeline: 'Community ping: immediate. RRH referral: 1–2 weeks. Equipment: 1–14 days',
    actions: [
      'ESIS community ping — broadcast your skills and needs to local neighborhood networks',
      'Request non-congregate placement — your profile qualifies for private room placement',
      'Contact Colorado Workforce Center (303-595-8600) for rapid job placement + emergency support',
      'Apply for Colorado Assistive Technology Program grant for laptop/equipment',
      "LinkedIn: mark profile as 'Open to Opportunities' — many employers have emergency hire programs",
    ],
  },
  general: {
    name: 'General Support Track',
    programs: [
      '211 Colorado — coordinated resource referral',
      'Local shelter coordinated entry',
      "Denver's Road Home — case management",
    ],
    timeline: 'Standard coordinated entry: 2–4 weeks',
    actions: [
      'Call 211 for immediate resource referral and coordinated entry assessment',
      'Request a Vulnerability Index (VI-SPDAT) assessment at any shelter',
      'Document your situation in writing — start building your case file today',
    ],
  },
};

const EDU_LABELS: Record<string, string> = {
  none: 'No formal education',
  hs: 'High school diploma / GED',
  trade: 'Trade / vocational certification',
  associates: "Associate's degree",
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  phd: 'Ph.D. / Doctoral degree',
  professional: 'Professional degree (JD, MD, etc.)',
};

export function assignHousingTrack(profile: PersonProfile, cityId: string = DEFAULT_CITY_ID): HousingTrack {
  let score = 0;
  const rationale: string[] = [];
  let selectedTrack = 'general';

  if (profile.hasLifeThreateningCondition) {
    score += 30;
    rationale.push('Life-threatening medical condition — medical respite voucher pathway');
    selectedTrack = 'medical_respite';
  }

  if (profile.isWomanWithMinorChildren) {
    score += 25;
    rationale.push('Woman with minor children — child welfare laws mandate priority placement');
    if (score < 30) selectedTrack = 'family_protection';
  }

  if (profile.isDisabled) {
    score += 20;
    rationale.push('Disability — Section 811, SOAR/SSI pathway, ADA accommodation rights');
    if (selectedTrack === 'general') selectedTrack = 'disability_housing';
  }

  const chronic = profile.monthsHomeless >= 12;
  if (chronic) {
    score += 20;
    const yrs = Math.floor(profile.monthsHomeless / 12);
    const mo  = profile.monthsHomeless % 12;
    const dur = `${yrs}yr` + (mo ? ` ${mo}mo` : '');
    rationale.push(`Chronically homeless (${dur}) — federal priority for Permanent Supportive Housing`);
    if (selectedTrack === 'general' || selectedTrack === 'working_stability') {
      selectedTrack = 'chronic_priority';
    }
  }

  if (profile.isElderly) {
    score += 15;
    rationale.push('Age 50+ — Section 202 senior housing, Area Agency on Aging priority');
    if (selectedTrack === 'general') selectedTrack = 'senior_services';
  }

  if (profile.isKnownSubstanceUser) {
    score += 10;
    rationale.push('Substance use — integrated treatment + recovery housing track');
    if (selectedTrack === 'general') selectedTrack = 'treatment_recovery';
  }

  if (profile.hasEmployment) {
    score += 10;
    rationale.push('Active employment — Rapid Re-Housing with income verification expedited');
    if (selectedTrack === 'general') selectedTrack = 'working_stability';
  }

  const edu = profile.educationLevel.toLowerCase();
  if (['phd', 'masters', 'professional'].includes(edu)) {
    score += 5;
    rationale.push(`Advanced education (${EDU_LABELS[edu] ?? edu}) — professional re-entry track + community ping`);
    if (selectedTrack === 'general' || selectedTrack === 'working_stability') {
      selectedTrack = 'professional_reentry';
    }
  } else if (['bachelors', 'associates', 'trade'].includes(edu)) {
    score += 3;
    rationale.push(`Educated (${EDU_LABELS[edu] ?? edu}) — employment-linked RRH expedited`);
  }

  score = Math.min(score, 100);

  const tdef = TRACKS[selectedTrack];
  const cityTrack = getCityTrack(cityId, selectedTrack);
  const city = getCityById(cityId);

  let communityPingMessage = '';
  if (profile.consentCommunityPing) {
    communityPingMessage = generateCommunityPing(profile, selectedTrack, city.name);
  }

  return {
    trackId: selectedTrack,
    trackName: tdef.name,
    priorityScore: score,
    rationale,
    immediateActions: cityTrack.actions,
    targetPrograms: cityTrack.programs,
    estimatedTimeline: tdef.timeline,
    communityPingMessage,
  };
}

function generateCommunityPing(profile: PersonProfile, trackId: string, cityName: string): string {
  const parts: string[] = [];

  if (profile.monthsHomeless >= 12) {
    const yrs = Math.floor(profile.monthsHomeless / 12);
    parts.push(`homeless for ${yrs}+ year${yrs > 1 ? 's' : ''}`);
  } else if (profile.monthsHomeless > 0) {
    parts.push(`homeless for ${profile.monthsHomeless} month${profile.monthsHomeless > 1 ? 's' : ''}`);
  }

  if (profile.educationLevel && EDU_LABELS[profile.educationLevel]) {
    parts.push(EDU_LABELS[profile.educationLevel]);
  }
  if (profile.professionalBackground) parts.push(profile.professionalBackground);

  const resourceLabels: Record<string, string> = {
    laptop: 'a laptop/PC to be able to work',
    phone: 'a mobile phone',
    phone_service: 'mobile phone service',
    clothing: 'clothing',
    food: 'food assistance',
    sleeping_bag: 'a sleeping bag',
    tent: 'a tent',
    disability_application: 'disability application assistance',
  };
  const needs = profile.resourceNeeds
    .filter(r => resourceLabels[r])
    .map(r => resourceLabels[r]);

  const contactParts: string[] = [];
  if (profile.contactEmail) contactParts.push(`Email: ${profile.contactEmail}`);
  if (profile.contactPhone) contactParts.push(`Phone/SMS: ${profile.contactPhone}`);
  if (profile.contactApps.length) contactParts.push(`Apps: ${profile.contactApps.join(', ')}`);

  const profileStr = parts.length ? parts.join(', ') : 'community member in need';
  const needsStr   = needs.length  ? needs.join('; ')  : 'general support';
  const contactStr = contactParts.length ? contactParts.join(' | ') : 'Contact via ESIS referral';

  return (
    `ESIS COMMUNITY PING — ${cityName} Neighbor Needs Help\n\n` +
    `A ${profileStr} is located in your neighborhood (${cityName}) and is asking for community support.\n\n` +
    `They need: ${needsStr}\n\n` +
    `About them: Non-drug user, capable, has been failed by the current system — ` +
    `not a danger to anyone. They deserve stability and a path back.\n\n` +
    `If you can help, reach out: ${contactStr}\n\n` +
    `The community complains about homelessness — here is a chance to be part of the ` +
    `solution. One act of kindness can break the cycle.\n\nPowered by ESIS`
  );
}
