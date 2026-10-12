/**
 * Verified Official US State & National Senior Services
 * All numbers and department names are verified official government / 501(c)(3) entities.
 * (No invented names or numbers)
 */

export interface SeniorServiceInfo {
  id: string;
  nameTe: string;
  nameEn: string;
  phone: string;
  emoji: string;
  category: 'emergency' | 'senior' | 'community' | 'crisis' | 'poison' | 'protection' | 'healthcare';
  badgeTe: string;
  hoursTe: string;
  descriptionTe: string;
  buttonLabelTe: string;
  verifiedOfficial: boolean;
}

export interface StateSeniorResources {
  stateNameEn: string;
  stateNameTe: string;
  stateCode: string;
  services: SeniorServiceInfo[];
}

/**
 * Verified National US Senior Citizen Services:
 * - Eldercare Locator — 1-800-677-1116 (US Administration on Aging)
 * - Friendship Line for Seniors — 1-800-971-0016 (Institute on Aging 24/7 senior crisis/warmline)
 * - 211 — Local Community & Senior Services
 * - National Center on Elder Abuse (NCEA) — 1-855-500-3537 (Senior Protection)
 * - 988 — Suicide & Crisis Lifeline (Mental health & crisis support)
 */
export const US_PRIMARY_HELPLINES: SeniorServiceInfo[] = [
  {
    id: 'us-eldercare',
    nameTe: 'Eldercare Locator — వృద్ధుల సంక్షేమ సేవలు',
    nameEn: 'Eldercare Locator (US Administration on Aging)',
    phone: '1-800-677-1116',
    emoji: '👴',
    category: 'senior',
    badgeTe: 'US ఫెడరల్ ప్రభుత్వ సేవ',
    hoursTe: 'సోమ - శుక్ర: 9:00 AM - 8:00 PM (ET)',
    descriptionTe: 'వృద్ధులకు ఇంటి వద్ద సంరక్షణ, భోజనం (Meals on Wheels), రవాణా, గృహ సహాయం & స్థానిక ఏరియా ఏజెన్సీ ఆన్ ఏజింగ్ (AAA) సమాచారం.',
    buttonLabelTe: '1-800-677-1116 కి కాల్ చేయండి',
    verifiedOfficial: true,
  },
  {
    id: 'us-friendship',
    nameTe: 'Friendship Line — వృద్ధుల స్నేహ & ఆసరా హెల్ప్‌లైన్',
    nameEn: 'Institute on Aging - Friendship Line for Older Adults',
    phone: '1-800-971-0016',
    emoji: '❤️',
    category: 'crisis',
    badgeTe: 'వృద్ధుల ఆసరా • 24/7 ఉచిత సేవ',
    hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
    descriptionTe: '60 ఏళ్లు పైబడిన వృద్ధుల కోసం ప్రత్యేకమైన 24/7 దేశవ్యాప్త ఉచిత కౌన్సిలింగ్, ఒంటరితన నివారణ మరియు ఆత్మీయ సంభాషణ హెల్ప్‌లైన్.',
    buttonLabelTe: '1-800-971-0016 కి కాల్ చేయండి',
    verifiedOfficial: true,
  },
  {
    id: 'us-211',
    nameTe: '211 — స్థానిక సమాజ & వృద్ధుల వనరులు',
    nameEn: '211 — Local Community & Senior Services',
    phone: '211',
    emoji: '🤝',
    category: 'community',
    badgeTe: 'స్థానిక కమ్యూనిటీ • 24/7 సేవ',
    hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
    descriptionTe: 'మీ స్థానిక కౌంటీ/నగరంలో ఆహార సహాయం (Food Pantries), అద్దె/కరెంట్ బిల్లుల సహాయం, నివాసం మరియు వృద్ధుల స్థానిక సేవల కోసం 3-అంకెల ఉచిత నంబర్.',
    buttonLabelTe: '211 కి కాల్ చేయండి',
    verifiedOfficial: true,
  },
  {
    id: 'us-ncea',
    nameTe: 'Elder Abuse Resource Line — వృద్ధుల రక్షణ హెల్ప్‌లైన్',
    nameEn: 'National Center on Elder Abuse (NCEA) / Eldercare Line',
    phone: '1-855-500-3537',
    emoji: '🛡️',
    category: 'protection',
    badgeTe: 'వృద్ధుల రక్షణ & న్యాయం',
    hoursTe: 'సోమ - శుక్ర కార్యాలయ వేళలు',
    descriptionTe: 'వృద్ధులపై వేధింపులు, మోసాలు, ఆర్థిక దోపిడీ లేదా నిర్లక్ష్యం జరిగినప్పుడు రక్షణ మరియు చట్టపరమైన మార్గదర్శకత్వం.',
    buttonLabelTe: '1-855-500-3537 కి కాల్ చేయండి',
    verifiedOfficial: true,
  },
  {
    id: 'us-988',
    nameTe: '988 — సంక్షోభ ఆసరా & మానసిక సాంత్వన',
    nameEn: '988 — Suicide & Crisis Lifeline',
    phone: '988',
    emoji: '🧠',
    category: 'crisis',
    badgeTe: 'మానసిక ఆసరా • 24/7 ఉచిత సేవ',
    hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
    descriptionTe: 'ఒంటరితనం, మానసిక భయం, ఆందోళన లేదా తీవ్ర భావోద్వేగ ఒత్తిడి ఉన్నప్పుడు మాట్లాడటానికి 24/7 గోప్యమైన సహాయం.',
    buttonLabelTe: '988 కి కాల్ చేయండి',
    verifiedOfficial: true,
  },
];

/**
 * Nationwide verified senior resources (applicable to all US locations)
 */
export const US_NATIONAL_ADDITIONAL_RESOURCES: SeniorServiceInfo[] = [
  {
    id: 'us-medicare',
    nameTe: 'Medicare Official — మెడికేర్ అధికారిక హెల్ప్‌లైన్',
    nameEn: 'Medicare Official Customer Service (CMS)',
    phone: '1-800-633-4227',
    emoji: '🏥',
    category: 'healthcare',
    badgeTe: 'ఫెడరల్ హెల్త్ ఇన్సూరెన్స్ • 24/7',
    hoursTe: '24 గంటలు, వారంలో 7 రోజులు',
    descriptionTe: '65 ఏళ్లు పైబడిన వృద్ధుల అధికారిక ఆరోగ్య బీమా సహాయం. డాక్టర్ బిల్లులు, మందుల కవరేజ్ మరియు హాస్పిటల్ సమాచారం.',
    buttonLabelTe: '1-800-633-4227 కి కాల్ చేయండి',
    verifiedOfficial: true,
  },
  {
    id: 'us-ssa',
    nameTe: 'Social Security Administration — వృద్ధుల పెన్షన్ & రిటైర్‌మెంట్',
    nameEn: 'Social Security Administration (SSA)',
    phone: '1-800-772-1213',
    emoji: '🏛️',
    category: 'senior',
    badgeTe: 'ఫెడరల్ రిటైర్‌మెంట్ & SSI',
    hoursTe: 'సోమ - శుక్ర: 8:00 AM - 7:00 PM (స్థానిక సమయం)',
    descriptionTe: 'వృద్ధుల రిటైర్‌మెంట్ పెన్షన్, మనుగడ ప్రయోజనాలు, సప్లిమెంటల్ సెక్యూరిటీ ఇన్‌కమ్ (SSI) మరియు మెడికేర్ నమోదు వివరాలు.',
    buttonLabelTe: '1-800-772-1213 కి కాల్ చేయండి',
    verifiedOfficial: true,
  },
];

/**
 * Verified State-Specific Senior Resources for Major US States
 */
export const US_STATE_RESOURCES: Record<string, StateSeniorResources> = {
  CA: {
    stateNameEn: 'California',
    stateNameTe: 'కాలిఫోర్నియా',
    stateCode: 'CA',
    services: [
      {
        id: 'ca-aging',
        nameTe: 'కాలిఫోర్నియా డిపార్ట్‌మెంట్ ఆఫ్ ఏజింగ్ (CDA)',
        nameEn: 'California Department of Aging Information Line',
        phone: '1-800-510-2020',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'రాష్ట్ర ప్రభుత్వం • ఏరియా ఏజెన్సీ ఆన్ ఏజింగ్',
        hoursTe: 'కాలిఫోర్నియా స్థానిక సేవలు',
        descriptionTe: 'మీ కాలిఫోర్నియా కౌంటీలోని స్థానిక ఏరియా ఏజెన్సీ ఆన్ ఏజింగ్ (AAA) తో నేరుగా అనుసంధానించే అధికారిక నంబర్.',
        buttonLabelTe: '1-800-510-2020 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
      {
        id: 'ca-aps',
        nameTe: 'కాలిఫోర్నియా అడల్ట్ ప్రొటెక్టివ్ సర్వీసెస్ (APS)',
        nameEn: 'California Adult Protective Services Statewide Line',
        phone: '1-833-401-0832',
        emoji: '🛡️',
        category: 'protection',
        badgeTe: 'వృద్ధుల భద్రత & రక్షణ • 24/7',
        hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
        descriptionTe: 'వృద్ధులపై వేధింపులు, మోసాలు, లేదా నిస్సహాయ స్థితి నుండి రక్షణ కోసం కాలిఫోర్నియా రాష్ట్ర హెల్ప్‌లైన్.',
        buttonLabelTe: '1-833-401-0832 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  TX: {
    stateNameEn: 'Texas',
    stateNameTe: 'టెక్సాస్',
    stateCode: 'TX',
    services: [
      {
        id: 'tx-aging',
        nameTe: 'టెక్సాస్ ఏరియా ఏజెన్సీస్ ఆన్ ఏజింగ్ (HHS Aging Line)',
        nameEn: 'Texas Area Agencies on Aging (HHS Access & Eligibility)',
        phone: '1-800-252-9240',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'టెక్సాస్ రాష్ట్ర ప్రభుత్వం',
        hoursTe: 'సోమ - శుక్ర: 8:00 AM - 5:00 PM (CT)',
        descriptionTe: 'టెక్సాస్ వృద్ధులకు ఇంటి వద్ద సహాయం, భోజనం, రవాణా మరియు సంరక్షణ సేవల సమాచారం.',
        buttonLabelTe: '1-800-252-9240 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
      {
        id: 'tx-aps',
        nameTe: 'టెక్సాస్ అడల్ట్ ప్రొటెక్టివ్ సర్వీసెస్ (APS Abuse Hotline)',
        nameEn: 'Texas Adult Protective Services Hotline',
        phone: '1-800-252-5400',
        emoji: '🛡️',
        category: 'protection',
        badgeTe: 'వృద్ధుల రక్షణ • 24/7 టోల్ ఫ్రీ',
        hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
        descriptionTe: 'వృద్ధులకు వేధింపులు, నిర్లక్ష్యం లేదా ఆర్ధిక దోపిడీ నుండి తక్షణ రాష్ట్ర రక్షణ హెల్ప్‌లైన్.',
        buttonLabelTe: '1-800-252-5400 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  NY: {
    stateNameEn: 'New York',
    stateNameTe: 'న్యూయార్క్',
    stateCode: 'NY',
    services: [
      {
        id: 'ny-connects',
        nameTe: 'న్యూయార్క్ కనెక్ట్స్ (NY Connects - Aging & Disability)',
        nameEn: 'NY Connects (New York State Office for the Aging)',
        phone: '1-800-342-9871',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'NY రాష్ట్ర ప్రభుత్వం',
        hoursTe: 'సోమ - శుక్ర: 8:30 AM - 4:30 PM (ET)',
        descriptionTe: 'న్యూయార్క్ రాష్ట్రంలోని వృద్ధులకు సంరక్షణ, గృహ సహాయం మరియు ప్రయోజనాల మార్గదర్శనం.',
        buttonLabelTe: '1-800-342-9871 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
      {
        id: 'ny-aps',
        nameTe: 'న్యూయార్క్ అడల్ట్ ప్రొటెక్టివ్ సర్వీసెస్ (APS)',
        nameEn: 'New York Adult Protective Services Helpline',
        phone: '1-844-697-3505',
        emoji: '🛡️',
        category: 'protection',
        badgeTe: 'వృద్ధుల భద్రత & రక్షణ',
        hoursTe: 'వృద్ధుల సంరక్షణ & రక్షణ',
        descriptionTe: 'న్యూయార్క్‌లో నిస్సహాయ స్థితిలో ఉన్న లేదా వేధింపులకు గురవుతున్న వృద్ధులకు అధికారిక సహాయం.',
        buttonLabelTe: '1-844-697-3505 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  FL: {
    stateNameEn: 'Florida',
    stateNameTe: 'ఫ్లోరిడా',
    stateCode: 'FL',
    services: [
      {
        id: 'fl-elder',
        nameTe: 'ఫ్లోరిడా ఎల్డర్ హెల్ప్‌లైన్ (Department of Elder Affairs)',
        nameEn: 'Florida Elder Helpline (Dept of Elder Affairs)',
        phone: '1-800-963-5337',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'ఫ్లోరిడా రాష్ట్ర ప్రభుత్వం',
        hoursTe: 'సోమ - శుక్ర: 8:00 AM - 5:00 PM (ET)',
        descriptionTe: 'ఫ్లోరిడాలోని వృద్ధులకు ఆహార సహాయం, ఆరోగ్య సేవలు మరియు స్థానిక వృద్ధుల కేంద్రాల సమాచారం.',
        buttonLabelTe: '1-800-963-5337 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
      {
        id: 'fl-abuse',
        nameTe: 'ఫ్లోరిడా అబ్యూస్ హాట్‌లైన్ (Elder Protection)',
        nameEn: 'Florida Abuse Hotline (DCF)',
        phone: '1-800-962-2873',
        emoji: '🛡️',
        category: 'protection',
        badgeTe: 'వృద్ధుల రక్షణ • 24/7',
        hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
        descriptionTe: 'ఫ్లోరిడాలో వృద్ధుల భద్రత, వేధింపుల నిరోధం మరియు సహాయం కోసం 24 గంటల హెల్ప్‌లైన్.',
        buttonLabelTe: '1-800-962-2873 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  IL: {
    stateNameEn: 'Illinois',
    stateNameTe: 'ఇల్లినాయిస్',
    stateCode: 'IL',
    services: [
      {
        id: 'il-aging',
        nameTe: 'ఇల్లినాయిస్ డిపార్ట్‌మెంట్ ఆన్ ఏజింగ్ హెల్ప్‌లైన్',
        nameEn: 'Illinois Department on Aging Senior HelpLine',
        phone: '1-800-252-8966',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'ఇల్లినాయిస్ రాష్ట్ర సేవ',
        hoursTe: 'సోమ - శుక్ర: 8:30 AM - 5:00 PM (CT)',
        descriptionTe: 'ఇల్లినాయిస్‌లో వృద్ధుల సేవలు, సంరక్షణ కార్యక్రమాలు మరియు స్థానిక సమాచారం.',
        buttonLabelTe: '1-800-252-8966 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
      {
        id: 'il-aps',
        nameTe: 'ఇల్లినాయిస్ అడల్ట్ ప్రొటెక్టివ్ సర్వీసెస్ (APS)',
        nameEn: 'Illinois Adult Protective Services 24/7 Hotline',
        phone: '1-866-800-1409',
        emoji: '🛡️',
        category: 'protection',
        badgeTe: 'వృద్ధుల రక్షణ • 24/7',
        hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
        descriptionTe: 'ఇల్లినాయిస్‌లో వృద్ధుల వేధింపులు మరియు రక్షణ సంబంధిత అత్యవసర సహాయం.',
        buttonLabelTe: '1-866-800-1409 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  NJ: {
    stateNameEn: 'New Jersey',
    stateNameTe: 'న్యూజెర్సీ',
    stateCode: 'NJ',
    services: [
      {
        id: 'nj-adrc',
        nameTe: 'న్యూజెర్సీ ఏజింగ్ & డిసేబిలిటీ రిసోర్స్ కనెక్షన్ (ADRC)',
        nameEn: 'NJ Aging & Disability Resource Connection',
        phone: '1-877-222-3737',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'NJ రాష్ట్ర సేవ',
        hoursTe: 'సోమ - శుక్ర: 8:30 AM - 4:30 PM (ET)',
        descriptionTe: 'న్యూజెర్సీలో వృద్ధుల సంక్షేమ సేవలు, గృహ భోజనం మరియు స్థానిక కౌంటీ వనరులు.',
        buttonLabelTe: '1-877-222-3737 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  WA: {
    stateNameEn: 'Washington',
    stateNameTe: 'వాషింగ్టన్ స్టేట్',
    stateCode: 'WA',
    services: [
      {
        id: 'wa-aging',
        nameTe: 'వాషింగ్టన్ ఏజింగ్ & లాంగ్-టర్మ్ సపోర్ట్ అడ్మినిస్ట్రేషన్',
        nameEn: 'Washington Aging and Long-Term Support (ALTSA)',
        phone: '1-800-422-3263',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'వాషింగ్టన్ రాష్ట్ర సేవ',
        hoursTe: 'స్థానిక వ్యాపార వేళలు (PT)',
        descriptionTe: 'వాషింగ్టన్ రాష్ట్రంలో వృద్ధులకు సంరక్షణ, గృహ సహాయం మరియు కౌంటీ ఏరియా ఏజెన్సీ సేవలు.',
        buttonLabelTe: '1-800-422-3263 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  GA: {
    stateNameEn: 'Georgia',
    stateNameTe: 'జార్జియా',
    stateCode: 'GA',
    services: [
      {
        id: 'ga-aging',
        nameTe: 'జార్జియా డివిజన్ ఆఫ్ ఏజింగ్ సర్వీసెస్ (DAS)',
        nameEn: 'Georgia Division of Aging Services',
        phone: '1-866-552-4464',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'జార్జియా రాష్ట్ర సేవ',
        hoursTe: 'సోమ - శుక్ర: 8:00 AM - 5:00 PM (ET)',
        descriptionTe: 'జార్జియాలో వృద్ధులకు సహాయం, భోజనం మరియు సమాజ ఆధారిత సంరక్షణ సేవలు.',
        buttonLabelTe: '1-866-552-4464 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  PA: {
    stateNameEn: 'Pennsylvania',
    stateNameTe: 'పెన్సిల్వేనియా',
    stateCode: 'PA',
    services: [
      {
        id: 'pa-aging',
        nameTe: 'పెన్సిల్వేనియా డిపార్ట్‌మెంట్ ఆఫ్ ఏజింగ్',
        nameEn: 'PA Department of Aging',
        phone: '1-717-783-1550',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'పెన్సిల్వేనియా రాష్ట్ర సేవ',
        hoursTe: 'సోమ - శుక్ర: 8:00 AM - 5:00 PM (ET)',
        descriptionTe: 'పెన్సిల్వేనియాలో వృద్ధుల సంక్షేమ కార్యక్రమాలు మరియు కౌంటీ సేవల వివరాలు.',
        buttonLabelTe: '1-717-783-1550 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
      {
        id: 'pa-aps',
        nameTe: 'పెన్సిల్వేనియా ఎల్డర్ ప్రొటెక్టివ్ సర్వీసెస్ (APS)',
        nameEn: 'PA Elder Abuse / Protective Services Hotline',
        phone: '1-800-490-8505',
        emoji: '🛡️',
        category: 'protection',
        badgeTe: 'వృద్ధుల రక్షణ • 24/7',
        hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
        descriptionTe: 'పెన్సిల్వేనియాలో వృద్ధుల భద్రత మరియు అత్యవసర రక్షణ హాట్‌లైన్.',
        buttonLabelTe: '1-800-490-8505 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
  VA: {
    stateNameEn: 'Virginia',
    stateNameTe: 'వర్జీనియా',
    stateCode: 'VA',
    services: [
      {
        id: 'va-aging',
        nameTe: 'వర్జీనియా డివిజన్ ఫర్ ది ఏజింగ్ (DARS)',
        nameEn: 'Virginia Division for Aging and Rehabilitative Services',
        phone: '1-800-552-3402',
        emoji: '🏛️',
        category: 'senior',
        badgeTe: 'వర్జీనియా రాష్ట్ర సేవ',
        hoursTe: 'సోమ - శుక్ర: 8:00 AM - 5:00 PM (ET)',
        descriptionTe: 'వర్జీనియాలో వృద్ధుల సంరక్షణ, కమ్యూనిటీ వనరులు మరియు ఏరియా ఏజెన్సీల సమాచారం.',
        buttonLabelTe: '1-800-552-3402 కి కాల్ చేయండి',
        verifiedOfficial: true,
      },
    ],
  },
};

/**
 * Match a US State code from geocoded address / state name / ISO code
 */
export function resolveUSStateCode(
  stateName?: string,
  isoCode?: string
): StateSeniorResources | null {
  if (isoCode && isoCode.startsWith('US-')) {
    const code = isoCode.replace('US-', '').toUpperCase();
    if (US_STATE_RESOURCES[code]) {
      return US_STATE_RESOURCES[code];
    }
  }

  if (!stateName) return null;
  const cleanState = stateName.trim().toLowerCase();

  const nameMap: Record<string, string> = {
    california: 'CA',
    కాలిఫోర్నియా: 'CA',
    texas: 'TX',
    టెక్సాస్: 'TX',
    'new york': 'NY',
    న్యూయార్క్: 'NY',
    florida: 'FL',
    ఫ్లోరిడా: 'FL',
    illinois: 'IL',
    ఇల్లినాయిస్: 'IL',
    'new jersey': 'NJ',
    న్యూజెర్సీ: 'NJ',
    washington: 'WA',
    వాషింగ్టన్: 'WA',
    georgia: 'GA',
    జార్జియా: 'GA',
    pennsylvania: 'PA',
    పెన్సిల్వేనియా: 'PA',
    virginia: 'VA',
    వర్జీనియా: 'VA',
  };

  for (const [key, code] of Object.entries(nameMap)) {
    if (cleanState.includes(key)) {
      return US_STATE_RESOURCES[code] || null;
    }
  }

  return null;
}

/**
 * Determines whether the coordinates or location string indicate the USA
 */
export function isLocationInUSA(
  lat: number | null | undefined,
  lng: number | null | undefined,
  address?: string,
  countryCode?: string
): boolean {
  if (countryCode) {
    const cc = countryCode.trim().toLowerCase();
    if (cc === 'us' || cc === 'usa' || cc === 'united states') return true;
    if (cc === 'in' || cc === 'ind' || cc === 'india') return false;
  }

  if (address) {
    const addrLower = address.toLowerCase();
    if (
      addrLower.includes('united states') ||
      addrLower.includes('usa') ||
      addrLower.includes('అమెరికా') ||
      addrLower.includes('యునైటెడ్ స్టేట్స్')
    ) {
      return true;
    }
    if (
      addrLower.includes('india') ||
      addrLower.includes('భారత') ||
      addrLower.includes('తెలంగాణ') ||
      addrLower.includes('ఆంధ్ర')
    ) {
      return false;
    }
  }

  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    // Check continental US, Alaska, Hawaii, Puerto Rico bounding boxes
    // Continental US: lat 24 to 50, lng -126 to -66
    // Alaska: lat 51 to 72, lng -180 to -129
    // Hawaii: lat 18 to 29, lng -179 to -154
    // Puerto Rico: lat 17 to 19, lng -68 to -65
    const isUSLat = lat >= 17.5 && lat <= 72.0;
    const isUSLng = lng >= -180.0 && lng <= -64.0;
    if (isUSLat && isUSLng) {
      return true;
    }
  }

  // Fallback to client browser timezone if GPS is pending or not yet resolved
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('America/') || tz.startsWith('US/')) {
      return true;
    }
  } catch {
    // Ignore
  }

  return false;
}
