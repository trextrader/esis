// mobile/src/data/cities.ts
// City-specific resource data for housing track and recommendation engines.
// Track structure is universal; programs, actions, and contact numbers are city-specific.

export interface CityConfig {
  id: string;
  name: string;
  state: string;
  center: { lat: number; lng: number };
  crisis: { name: string; phone: string };
  legalAid: { name: string; phone: string };
  coordinatedEntry: { name: string; phone: string };
  fallbackLine: string;   // what to say in fallback plan for this city
  tracks: Record<string, { programs: string[]; actions: string[] }>;
}

export const CITIES: CityConfig[] = [
  // ── DENVER, CO ────────────────────────────────────────────────────────────
  {
    id: 'denver',
    name: 'Denver',
    state: 'CO',
    center: { lat: 39.7392, lng: -104.9903 },
    crisis: { name: 'Colorado Crisis Services', phone: '844-493-8255' },
    legalAid: { name: 'Colorado Legal Services', phone: '303-837-1321' },
    coordinatedEntry: { name: "Denver's Road Home", phone: '720-932-3023' },
    fallbackLine: 'Colorado Crisis Services (844-493-8255) or go to the nearest ER.',
    tracks: {
      medical_respite: {
        programs: [
          'Colorado Medical Respite Program (CMRP) — non-congregate medical recovery housing',
          'Stout Street Health Center respite referral — 303-293-2220',
          'UCHealth social work emergency respite request',
          'Denver Health Community Health Services respite voucher',
        ],
        actions: [
          "Request a MEDICAL RESPITE VOUCHER from ER social worker — say 'I need non-congregate medical respite, I have a life-threatening condition'",
          "If already outside: call Stout Street Health Center (303-293-2220) and state your condition",
          "Call 211 and say 'medical respite placement needed — life-threatening condition'",
          "If denied: contact Colorado Legal Services (303-837-1321) — denial is a violation of ADA",
        ],
      },
      family_protection: {
        programs: [
          'Family Homelessness Prevention and Rapid Re-Housing (CO DHHS)',
          'Salvation Army Family Shelter Denver — priority intake',
          'Catholic Charities Family Services Denver',
          'Section 8 Family Unification Program (FUP) — Denver Housing Authority',
        ],
        actions: [
          "Call 211 and say 'I have minor children and need emergency family shelter tonight'",
          'Denver Human Services child welfare line: 720-944-3666',
          "Request Family Unification Program (FUP) voucher — Denver Housing Authority: 720-932-3000",
        ],
      },
      disability_housing: {
        programs: [
          'HUD Section 811 Supportive Housing for Persons with Disabilities',
          'SOAR (SSI/SSDI Outreach, Access, and Recovery) — 303-894-2000',
          'Disability Rights Colorado — 303-722-0300',
          'Colorado Division of Vocational Rehabilitation — 303-318-8000',
        ],
        actions: [
          'Start SOAR application immediately — retroactive payments from filing date — 303-894-2000',
          'Contact Colorado Legal Services (303-837-1321) for benefits application support',
          "Request disability accommodation in writing from every housing program you apply to",
        ],
      },
      treatment_recovery: {
        programs: [
          'Stout Street Health Center — integrated substance use + housing (303-293-2220)',
          'Step Denver — residential recovery + job training',
          'Oxford Houses Colorado — peer-run sober living (oxfordhouses.org)',
          'Denver CARES — same-day crisis stabilization (720-944-3700)',
        ],
        actions: [
          'Call Denver CARES (720-944-3700) for same-day substance use crisis stabilization',
          'Request Colorado Medicaid enrollment — covers full SUD treatment at no cost',
          "After stabilization: Stout Street Health Center (303-293-2220) — integrated housing + treatment",
        ],
      },
      chronic_priority: {
        programs: [
          'HUD Permanent Supportive Housing (PSH) — highest federal priority',
          "Pathways to Home Denver — Housing First, no requirements (720-932-3023)",
          "Denver's Road Home coordinated entry — 720-932-3023",
          'Colorado Rental Assistance Program emergency voucher',
        ],
        actions: [
          "Coordinated Entry assessment via 211 or any shelter — say '12+ months homeless, I need PSH priority'",
          'Pathways to Home (720-932-3023) — Housing First, no sobriety requirement, permanent placement',
          'Request VI-SPDAT vulnerability assessment — your score determines placement priority',
        ],
      },
      senior_services: {
        programs: [
          'HUD Section 202 Supportive Housing for the Elderly — Denver Housing Authority',
          'Denver Area Agency on Aging — 303-480-6700',
          'STRIDE Community Health elder care services — 303-344-9355',
          "Seniors' Resource Center emergency placement",
        ],
        actions: [
          'Denver Area Agency on Aging: 303-480-6700 — elder emergency housing is a separate queue',
          'STRIDE Community Health (303-344-9355) — elder health + housing coordination',
        ],
      },
      working_stability: {
        programs: [
          'Rapid Re-Housing (RRH) via 211 — deposit + first month + case management',
          'Colorado Works (TANF) emergency assistance — colorado.gov/peak',
          'Employee Assistance Programs (EAP) — ask your HR department',
        ],
        actions: [
          'Request Rapid Re-Housing referral via 211 — employment income speeds qualification',
          'Colorado Works (TANF) emergency cash: colorado.gov/peak',
          'Document income with pay stubs — accelerates RRH and rental assistance approvals',
        ],
      },
      general: {
        programs: [
          '211 Colorado — coordinated resource referral',
          "Denver's Road Home — case management (720-932-3023)",
          'Denver Rescue Mission — 303-294-0157',
        ],
        actions: [
          "Call 211 for immediate resource referral and coordinated entry",
          "Denver's Road Home: 720-932-3023 — case management and housing navigation",
        ],
      },
    },
  },

  // ── SAN FRANCISCO, CA ─────────────────────────────────────────────────────
  {
    id: 'san_francisco',
    name: 'San Francisco',
    state: 'CA',
    center: { lat: 37.7749, lng: -122.4194 },
    crisis: { name: 'SF Crisis Line', phone: '415-781-0500' },
    legalAid: { name: 'Bay Area Legal Aid', phone: '415-982-1300' },
    coordinatedEntry: { name: 'SF Dept of Homelessness (HSH)', phone: '415-355-7400' },
    fallbackLine: 'SF Crisis Line (415-781-0500) or Zuckerberg SF General ER.',
    tracks: {
      medical_respite: {
        programs: [
          'SF DPH Medical Respite Program — referral via HSH (415-355-7400)',
          'Zuckerberg SF General Hospital social work department — 415-206-8000',
          'UCSF Benioff Homelessness & Housing Initiative',
          'St. Mary\'s Medical Center social work — 415-750-5790',
        ],
        actions: [
          "At any SF ER, ask for the social worker and say 'I need medical respite housing — I am homeless with a life-threatening condition'",
          "Call HSH at 415-355-7400 for medical respite referral",
          "Bay Area Legal Aid (415-982-1300) if you are denied — legal right under ADA",
        ],
      },
      family_protection: {
        programs: [
          'HSH Family Shelter Coordinated Entry — 415-355-7400',
          'Hamilton Family Center — 415-409-4280',
          'SF Family Resource Centers — 311',
          'CalWORKs Emergency Housing — 415-557-5000',
        ],
        actions: [
          "Call 211 SF and say 'I have minor children and need emergency family shelter tonight'",
          'Hamilton Family Center: 415-409-4280 — family emergency housing',
          'CalWORKs emergency housing assistance: 415-557-5000',
        ],
      },
      disability_housing: {
        programs: [
          'HUD Section 811 Supportive Housing for Persons with Disabilities',
          'SOAR (SSI/SSDI) via SF DPH — 415-355-7400',
          'Disability Rights Advocates — 510-665-8644',
          'SF DAAS (Dept of Aging and Adult Services) — 415-355-6700',
        ],
        actions: [
          'Start SOAR application immediately via SF DPH — 415-355-7400',
          'Disability Rights Advocates (510-665-8644) for benefits denial or accommodation refusal',
          "Request disability accommodation in writing — every SF shelter and housing program must comply",
        ],
      },
      treatment_recovery: {
        programs: [
          'SF DPH Substance Use Services — 415-355-7400',
          'Glide Memorial Church — 415-674-6000',
          'Positive Directions / Haight Ashbury Free Clinics — 415-746-1960',
          'Swords to Plowshares (veterans) — 415-252-4788',
        ],
        actions: [
          'SF DPH Substance Use Services intake: 415-355-7400 — same-day crisis stabilization',
          'Medi-Cal enrollment covers full SUD treatment — apply at benefitscal.com',
          'Glide Memorial (415-674-6000) — meals, recovery support, housing navigation',
        ],
      },
      chronic_priority: {
        programs: [
          'SF HSH Coordinated Entry (PATH to PSH) — 415-355-7400',
          'SF Navigation Centers — intake via HSH',
          'Swords to Plowshares (veteran PSH) — 415-252-4788',
          'Mission Housing Development — 415-282-7892',
        ],
        actions: [
          'HSH Coordinated Entry: 415-355-7400 — request VI-SPDAT vulnerability assessment immediately',
          "State chronic homelessness explicitly: '12+ months homeless' triggers federal PSH priority",
          'SF Navigation Center placement via HSH — no sobriety requirement, immediate intake',
        ],
      },
      senior_services: {
        programs: [
          'HUD Section 202 — SF Housing Authority waitlist',
          'SF DAAS (Dept of Aging and Adult Services) — 415-355-6700',
          'Self-Help for the Elderly — 415-982-9171',
          'On Lok Lifeways elder housing — 415-292-8888',
        ],
        actions: [
          'SF DAAS: 415-355-6700 — elder emergency housing is a separate queue from general homeless services',
          'Self-Help for the Elderly (415-982-9171) — case management and housing navigation',
        ],
      },
      working_stability: {
        programs: [
          'SF Rapid Rehousing — via HSH 415-355-7400',
          'Workforce Development (OEWD) — 415-401-4848',
          'CalWORKs emergency cash assistance — 415-557-5000',
        ],
        actions: [
          'Request Rapid Re-Housing via HSH (415-355-7400) — employment income accelerates placement',
          'SF OEWD Workforce Development: 415-401-4848 — rapid job placement + emergency support',
          'CalWORKs emergency cash: 415-557-5000',
        ],
      },
      general: {
        programs: [
          '211 SF Bay — coordinated resource referral',
          'SF HSH Access Point — 415-355-7400',
          'St. Anthony Foundation — 415-241-2600',
        ],
        actions: [
          '211 SF or HSH at 415-355-7400 for coordinated entry and resource referral',
          'St. Anthony Foundation (415-241-2600) — meals, legal aid, housing navigation',
        ],
      },
    },
  },

  // ── LOS ANGELES, CA ───────────────────────────────────────────────────────
  {
    id: 'los_angeles',
    name: 'Los Angeles',
    state: 'CA',
    center: { lat: 34.0522, lng: -118.2437 },
    crisis: { name: 'Didi Hirsch Crisis Line', phone: '800-854-7771' },
    legalAid: { name: 'Neighborhood Legal Services', phone: '800-433-6251' },
    coordinatedEntry: { name: 'LAHSA (LA Homeless Services Authority)', phone: '211' },
    fallbackLine: 'Didi Hirsch Crisis Line (800-854-7771) or any LA County ER.',
    tracks: {
      medical_respite: {
        programs: [
          'LAHSA Medical Respite Care — referral via 211',
          'JWCH Institute Mobile Health Unit — 213-342-0100',
          'LAC+USC Medical Center social work — 323-409-1000',
          'Venice Family Clinic medical respite — 310-392-8636',
        ],
        actions: [
          "At any LA County ER, ask for the social worker and say 'I need medical respite — I am homeless with a life-threatening condition'",
          "Call 211 and ask for LAHSA Medical Respite referral",
          "JWCH Institute mobile health: 213-342-0100 — comes to you",
        ],
      },
      family_protection: {
        programs: [
          'LAHSA Family Emergency Shelter — 211',
          'Union Rescue Mission Family Center — 213-347-6300',
          'PATH (People Assisting The Homeless) family services — 213-644-2200',
          'CalWORKs Emergency Housing — 866-613-3777',
        ],
        actions: [
          "Call 211 and say 'I have minor children and need emergency family shelter tonight'",
          'PATH family services: 213-644-2200',
          'CalWORKs emergency housing: 866-613-3777',
        ],
      },
      disability_housing: {
        programs: [
          'HUD Section 811 via HACLA (Housing Authority of City of LA)',
          'SOAR via LAHSA — apply through 211',
          'Disability Rights Legal Center — 213-736-1031',
          'LA County DPSS disability benefits — 866-613-3777',
        ],
        actions: [
          'SOAR application via LAHSA — call 211 and ask for disability housing services',
          'Disability Rights Legal Center: 213-736-1031 — SSI/SSDI appeals and ADA accommodations',
          "Request disability accommodation in writing from every program — they must comply under ADA",
        ],
      },
      treatment_recovery: {
        programs: [
          'LAHSA SUD Services — 211',
          'Volunteers of America LA — 213-389-1500',
          'Midnight Mission recovery program — 213-624-9258',
          'Didi Hirsch Mental Health + SUD treatment — 800-854-7771',
        ],
        actions: [
          'Didi Hirsch (800-854-7771) — same-day mental health and SUD crisis stabilization',
          'Medi-Cal covers full SUD treatment — apply at benefitscal.com',
          'Midnight Mission (213-624-9258) — residential recovery + job training + housing',
        ],
      },
      chronic_priority: {
        programs: [
          'LAHSA Coordinated Entry System — 211',
          'PATH (People Assisting The Homeless) — 213-644-2200',
          'St. Joseph Center — 310-399-5184',
          'Skid Row Housing Trust — 213-623-4045',
        ],
        actions: [
          "Call 211 and request LAHSA Coordinated Entry — say '12+ months homeless, I need PSH referral'",
          'PATH Outreach: 213-644-2200 — Housing First, no requirements',
          'Skid Row Housing Trust (213-623-4045) — permanent supportive housing on Skid Row',
        ],
      },
      senior_services: {
        programs: [
          'HUD Section 202 via HACLA',
          'LA County Area Agency on Aging — 800-510-2020',
          'Little Tokyo Service Center elder housing — 213-473-3030',
          'WISE & Healthy Aging — 310-394-9871',
        ],
        actions: [
          'LA County Area Agency on Aging: 800-510-2020 — elder emergency housing separate queue',
          'WISE & Healthy Aging (310-394-9871) — elder housing navigation and placement',
        ],
      },
      working_stability: {
        programs: [
          'LAHSA Rapid Rehousing — via 211',
          'LA County Workforce Development — 888-852-2700',
          'California EDD emergency services — 833-978-2511',
        ],
        actions: [
          'LAHSA Rapid Re-Housing via 211 — employment income accelerates placement',
          'LA County Workforce Development (888-852-2700) — job placement + emergency support',
          'California EDD (833-978-2511) for emergency unemployment or benefits',
        ],
      },
      general: {
        programs: [
          '211 LA County — coordinated resource referral',
          'LAHSA Access Centers — 211',
          'Union Rescue Mission — 213-347-6300',
        ],
        actions: [
          '211 LA County for coordinated entry and resource referral',
          'Union Rescue Mission (213-347-6300) — shelter, meals, case management',
        ],
      },
    },
  },

  // ── NEW YORK CITY, NY ─────────────────────────────────────────────────────
  {
    id: 'new_york',
    name: 'New York City',
    state: 'NY',
    center: { lat: 40.7128, lng: -74.0060 },
    crisis: { name: 'NYC Well', phone: '888-692-9355' },
    legalAid: { name: 'Legal Aid Society', phone: '212-577-3300' },
    coordinatedEntry: { name: 'NYC DHS (311)', phone: '311' },
    fallbackLine: 'NYC Well (888-692-9355) or Bellevue Hospital ER.',
    tracks: {
      medical_respite: {
        programs: [
          'NYC Health + Hospitals Safe Haven (medical shelter) — 311',
          'Bellevue Hospital Center social work — 212-562-4141',
          'Coalition for the Homeless medical support — 212-776-2000',
          'NYC DHS medical shelter referral — 311',
        ],
        actions: [
          "At any NYC public hospital ER, ask for the social worker — say 'I am homeless with a life-threatening condition and need medical shelter placement'",
          "Call 311 and request NYC DHS medical shelter — you have a legal RIGHT to shelter in NYC",
          "Coalition for the Homeless: 212-776-2000 — medical support and shelter navigation",
        ],
      },
      family_protection: {
        programs: [
          'NYC DHS Family Intake — PATH Center, 151 E 151st St, Bronx — 311',
          'Volunteers of America NY family services — 718-828-6000',
          'Safe Horizon shelter — 800-621-4673',
          'Administration for Children Services (ACS) — 800-342-3720',
        ],
        actions: [
          "Call 311 or go to the PATH Center (151 E 151st St, Bronx) — NYC has a legal right to shelter for families with children",
          'ACS Family Services: 800-342-3720 — child welfare emergency placement',
          'Safe Horizon: 800-621-4673 — emergency shelter for families',
        ],
      },
      disability_housing: {
        programs: [
          'HUD Section 811 via NYC HPD',
          'SOAR via NYC Human Resources Administration — 718-557-1399',
          'Disability Rights New York — 518-432-7861',
          'NYC HRA Benefits Access Center — 718-557-1399',
        ],
        actions: [
          'NYC HRA Benefits: 718-557-1399 — SSI/SSDI application with SOAR-trained staff',
          'Disability Rights New York (518-432-7861) — benefits appeals and ADA accommodations',
          "Legal Aid Society (212-577-3300) — free SSI/SSDI legal representation",
        ],
      },
      treatment_recovery: {
        programs: [
          'NYC DHS substance use shelters — 311',
          'Samaritan Village SUD treatment — 888-725-8491',
          'Phoenix House NYC — 212-595-5810',
          'BronxWorks recovery housing — 718-731-3114',
        ],
        actions: [
          'NYC Well: 888-692-9355 — 24/7 mental health and SUD crisis line, connects to same-day services',
          'Medicaid (free in NYC) covers full SUD treatment — enroll via 311 or nycaben.com',
          'Samaritan Village (888-725-8491) — residential SUD treatment + transitional housing',
        ],
      },
      chronic_priority: {
        programs: [
          'NYC DHS Coordinated Assessment — 311',
          'Breaking Ground Housing — 212-389-9300',
          'NYC HPD Section 8 priority waitlist for chronically homeless',
          'Common Ground (via Breaking Ground) — 212-389-9300',
        ],
        actions: [
          "NYC has a legal right to shelter — call 311 or go to the nearest intake center immediately",
          "Breaking Ground (212-389-9300) — permanent supportive housing, no requirements, Housing First",
          "Request VI-SPDAT vulnerability assessment at any shelter — your score determines PSH priority",
        ],
      },
      senior_services: {
        programs: [
          'HUD Section 202 via NYC HPD',
          'NYC Department for the Aging — 212-244-6469',
          'JASA (Jewish Association Serving the Aging) — 212-273-5200',
          'Carter Burden Network elder services — 212-758-3800',
        ],
        actions: [
          'NYC Department for the Aging: 212-244-6469 — elder emergency housing separate queue',
          'JASA (212-273-5200) — elder housing placement and case management citywide',
        ],
      },
      working_stability: {
        programs: [
          'NYC DHS Rapid Rehousing — 311',
          'NYC Workforce1 Career Centers — 311',
          'NYC HRA Cash Assistance emergency — 718-557-1399',
        ],
        actions: [
          'NYC Workforce1 Career Centers via 311 — rapid job placement + emergency rental assistance',
          'NYC HRA Cash Assistance: 718-557-1399 — emergency cash for housing',
          'Request Rapid Re-Housing via 311 — employment income accelerates placement',
        ],
      },
      general: {
        programs: [
          '311 NYC — coordinated resource referral',
          'Coalition for the Homeless — 212-776-2000',
          'Bowery Mission — 212-226-6214',
        ],
        actions: [
          "Call 311 — NYC has a legal RIGHT to shelter, they must place you tonight",
          'Coalition for the Homeless (212-776-2000) — advocacy, meals, housing navigation',
        ],
      },
    },
  },

  // ── MIAMI, FL ─────────────────────────────────────────────────────────────
  {
    id: 'miami',
    name: 'Miami',
    state: 'FL',
    center: { lat: 25.7617, lng: -80.1918 },
    crisis: { name: 'Miami Crisis Line', phone: '305-358-4357' },
    legalAid: { name: 'Legal Services of Greater Miami', phone: '305-576-0080' },
    coordinatedEntry: { name: 'Miami-Dade Homeless Trust', phone: '305-375-1490' },
    fallbackLine: 'Miami Crisis Line (305-358-HELP) or Jackson Memorial Hospital ER.',
    tracks: {
      medical_respite: {
        programs: [
          'Jackson Memorial Hospital social work — 305-585-1111',
          'Camillus House health services — 305-374-1065',
          'Care Resource health center — 305-576-1234',
          'Miami-Dade Homeless Trust medical referral — 305-375-1490',
        ],
        actions: [
          "At Jackson Memorial or any Miami-Dade public hospital, ask for social work — say 'I am homeless with a life-threatening condition, I need medical shelter'",
          "Miami-Dade Homeless Trust: 305-375-1490 — medical respite referral",
          "Camillus House health clinic (305-374-1065) — walk-in health services for people experiencing homelessness",
        ],
      },
      family_protection: {
        programs: [
          'Miami-Dade Homeless Trust family shelter — 305-375-1490',
          'Lotus House Women\'s Shelter — 305-438-7575',
          'Florida DCF emergency placement — 800-962-2873',
          'Salvation Army Miami family services — 305-545-4902',
        ],
        actions: [
          "Miami-Dade Homeless Trust: 305-375-1490 — family emergency shelter placement",
          'Florida DCF: 800-962-2873 — if children are at risk, triggers mandatory placement',
          'Lotus House (305-438-7575) — women and children emergency shelter',
        ],
      },
      disability_housing: {
        programs: [
          'HUD Section 811 via Miami-Dade Public Housing',
          'SOAR via Camillus House — 305-374-1065',
          'Disability Rights Florida — 800-342-0823',
          'Florida Division of Vocational Rehabilitation — 800-451-4327',
        ],
        actions: [
          'SOAR via Camillus House (305-374-1065) — SSI/SSDI application with expert support',
          'Disability Rights Florida (800-342-0823) — benefits appeals and ADA accommodations',
          'Florida DVR (800-451-4327) — vocational rehab + housing support',
        ],
      },
      treatment_recovery: {
        programs: [
          'Miami-Dade County SUD Helpline — 305-371-2586',
          'Camillus House recovery program — 305-374-1065',
          'Chapman Partnership SUD services — 305-438-7575',
          'Jackson Behavioral Health Hospital — 305-355-7000',
        ],
        actions: [
          'Miami-Dade SUD Helpline: 305-371-2586 — same-day crisis stabilization',
          'Florida Medicaid covers SUD treatment — apply at myflorida.com/accessflorida',
          'Camillus House (305-374-1065) — integrated SUD treatment + housing track',
        ],
      },
      chronic_priority: {
        programs: [
          'Miami-Dade Homeless Trust Coordinated Entry — 305-375-1490',
          'Camillus House — 305-374-1065',
          'Chapman Partnership — 305-438-7575',
          'Miami-Dade Public Housing permanent supportive housing',
        ],
        actions: [
          "Miami-Dade Homeless Trust: 305-375-1490 — coordinated entry and VI-SPDAT vulnerability assessment",
          "State '12+ months homeless' to access federal PSH priority",
          'Chapman Partnership (305-438-7575) — 24/7 access, comprehensive services, housing placement',
        ],
      },
      senior_services: {
        programs: [
          'HUD Section 202 via Miami-Dade Public Housing',
          'Miami-Dade Elder Services — 305-375-3578',
          'Little Havana Activities & Nutrition Centers — 305-858-4002',
          'Elderplace of Florida — 305-835-1890',
        ],
        actions: [
          'Miami-Dade Elder Services: 305-375-3578 — elder emergency housing and placement',
          'Little Havana Activities & Nutrition (305-858-4002) — elder case management and housing navigation',
        ],
      },
      working_stability: {
        programs: [
          'Miami-Dade Homeless Trust Rapid Rehousing — 305-375-1490',
          'CareerSource South Florida — 305-594-7615',
          'Florida Access emergency cash — myflorida.com/accessflorida',
        ],
        actions: [
          'Miami-Dade Homeless Trust Rapid Re-Housing: 305-375-1490 — employment income accelerates placement',
          'CareerSource South Florida (305-594-7615) — rapid job placement + emergency assistance',
          'Florida emergency cash assistance at myflorida.com/accessflorida',
        ],
      },
      general: {
        programs: [
          '211 Miami-Dade — coordinated resource referral',
          'Miami-Dade Homeless Trust — 305-375-1490',
          'Camillus House — 305-374-1065',
        ],
        actions: [
          '211 Miami-Dade for immediate resource referral and coordinated entry',
          'Miami-Dade Homeless Trust: 305-375-1490 — housing navigation and emergency placement',
        ],
      },
    },
  },

  // ── DALLAS, TX ────────────────────────────────────────────────────────────
  {
    id: 'dallas',
    name: 'Dallas',
    state: 'TX',
    center: { lat: 32.7767, lng: -96.7970 },
    crisis: { name: 'Metrocare Crisis Line', phone: '866-260-8000' },
    legalAid: { name: 'Legal Aid of NorthWest Texas', phone: '888-529-5277' },
    coordinatedEntry: { name: 'Metro Dallas Homeless Alliance (MDHA)', phone: '214-943-4522' },
    fallbackLine: 'Metrocare crisis line (866-260-8000) or Parkland Hospital ER.',
    tracks: {
      medical_respite: {
        programs: [
          'Parkland Hospital social work — 214-590-8000',
          'Metrocare Health Services — 214-743-1200',
          'Stewpot health services — 214-746-2785',
          'CitySquare Health Center — 214-823-8710',
        ],
        actions: [
          "At Parkland Hospital ER, ask for social work — say 'I am homeless with a life-threatening condition and need medical shelter'",
          "MDHA medical referral: 214-943-4522",
          "CitySquare Health Center (214-823-8710) — walk-in health services for people experiencing homelessness",
        ],
      },
      family_protection: {
        programs: [
          'MDHA Family Shelter — 214-943-4522',
          'Austin Street Center family services — 214-421-1380',
          'Family Gateway — 214-823-8933',
          'Texas DFPS emergency placement — 800-252-5400',
        ],
        actions: [
          "MDHA: 214-943-4522 — family emergency shelter placement",
          'Family Gateway (214-823-8933) — family homelessness prevention and shelter',
          'Texas DFPS: 800-252-5400 — if children are at risk',
        ],
      },
      disability_housing: {
        programs: [
          'HUD Section 811 via Dallas Housing Authority',
          'SOAR via MDHA — 214-943-4522',
          'Disability Rights Texas — 800-252-9108',
          'Texas VR (Vocational Rehabilitation) — 800-628-5115',
        ],
        actions: [
          'SOAR application via MDHA (214-943-4522) — SSI/SSDI with expert support',
          'Disability Rights Texas (800-252-9108) — benefits appeals and ADA housing accommodations',
          'Texas VR (800-628-5115) — vocational rehab and housing support for people with disabilities',
        ],
      },
      treatment_recovery: {
        programs: [
          'Metrocare SUD crisis stabilization — 214-743-1200',
          'Nexus Recovery Center — 214-321-0156',
          'Salvation Army Adult Rehab Dallas — 214-424-7000',
          'The Bridge Dallas SUD services — 214-670-8686',
        ],
        actions: [
          'Metrocare crisis line: 866-260-8000 — same-day mental health and SUD stabilization',
          'Texas Medicaid covers SUD treatment — apply at yourtexasbenefits.com',
          'Nexus Recovery Center (214-321-0156) — women and families SUD treatment + housing',
        ],
      },
      chronic_priority: {
        programs: [
          'MDHA Coordinated Entry — 214-943-4522',
          'The Stewpot — 214-746-2785',
          'Austin Street Center — 214-421-1380',
          'CitySquare — 214-823-8710',
        ],
        actions: [
          "MDHA Coordinated Entry: 214-943-4522 — VI-SPDAT vulnerability assessment, state '12+ months homeless'",
          'CitySquare (214-823-8710) — Housing First, comprehensive services, permanent placement',
          'The Stewpot (214-746-2785) — day services, case management, housing navigation',
        ],
      },
      senior_services: {
        programs: [
          'HUD Section 202 via Dallas Housing Authority',
          'Dallas Area Agency on Aging — 214-871-5065',
          'Senior Source Dallas — 214-823-5700',
          'AARP Texas Foundation elder housing — 866-227-7443',
        ],
        actions: [
          'Dallas Area Agency on Aging: 214-871-5065 — elder emergency housing separate queue',
          'Senior Source (214-823-5700) — elder case management and housing navigation',
        ],
      },
      working_stability: {
        programs: [
          'MDHA Rapid Rehousing — 214-943-4522',
          'Workforce Solutions Greater Dallas — 214-290-1000',
          'Texas Works emergency cash — yourtexasbenefits.com',
        ],
        actions: [
          'MDHA Rapid Re-Housing: 214-943-4522 — employment income accelerates placement',
          'Workforce Solutions Greater Dallas (214-290-1000) — job placement + emergency rental assistance',
          'Texas Works emergency cash at yourtexasbenefits.com',
        ],
      },
      general: {
        programs: [
          '211 Texas — coordinated resource referral',
          'MDHA — 214-943-4522',
          'The Bridge Dallas — 214-670-8686',
        ],
        actions: [
          '211 Texas for immediate resource referral and coordinated entry',
          'MDHA: 214-943-4522 — housing navigation, coordinated entry, emergency placement',
          'The Bridge Dallas (214-670-8686) — 24/7 drop-in day services',
        ],
      },
    },
  },
];

export const DEFAULT_CITY_ID = 'denver';

export function getCityById(id: string): CityConfig {
  return CITIES.find(c => c.id === id) ?? CITIES[0];
}

export function getCityTrack(
  cityId: string,
  trackId: string,
): { programs: string[]; actions: string[] } {
  const city = getCityById(cityId);
  return city.tracks[trackId] ?? city.tracks.general;
}
