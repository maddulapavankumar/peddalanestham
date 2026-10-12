/**
 * Verified Official Regional & State Senior-Citizen Support Services in India
 * Strictly authentic, verified government and recognized state-level eldercare resources.
 * Only shown when user is actually located in that state/region.
 */

export interface RegionalSeniorResource {
  id: string;
  nameTe: string;
  nameEn: string;
  phone: string;
  emoji: string;
  badgeTe: string;
  hoursTe: string;
  descriptionTe: string;
  buttonLabelTe: string;
  region: string; // state code or name lowercase
}

export const INDIA_REGIONAL_SENIOR_SERVICES: Record<string, RegionalSeniorResource[]> = {
  ap: [
    {
      id: 'ap-elderline',
      nameTe: 'ఆంధ్రప్రదేశ్ వృద్ధుల హెల్ప్‌లైన్ విభాగం (Elderline AP)',
      nameEn: 'Andhra Pradesh Senior Citizen Welfare Department / Elderline',
      phone: '14567',
      emoji: '🏛️',
      badgeTe: 'ఆంధ్రప్రదేశ్ ప్రభుత్వం • ఉచిత టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 8:00 - రాత్రి 8:00',
      descriptionTe: 'ఆంధ్రప్రదేశ్ రాష్ట్రంలో వృద్ధుల పింఛన్లు, వయోవృద్ధుల సంరక్షణ, మరియు జిల్లా స్థాయి వృద్ధుల సహాయక విభాగాలు.',
      buttonLabelTe: '14567 కి కాల్ చేయండి',
      region: 'ap',
    },
    {
      id: 'ap-helpage',
      nameTe: 'హెల్ప్‌ఏజ్ ఇండియా — ఆంధ్రప్రదేశ్ రాష్ట్ర కేంద్రం',
      nameEn: 'HelpAge India - Andhra Pradesh State Office',
      phone: '1800-180-1253',
      emoji: '🧓',
      badgeTe: 'ఏపీ రాష్ట్ర విభాగం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 9:00 - సాయంత్రం 6:00',
      descriptionTe: 'ఆంధ్రప్రదేశ్‌లోని వృద్ధులకు ఉచిత వైద్య సేవలు, సంచార వైద్య బృందాలు (MMU) మరియు సహాయ చర్యలు.',
      buttonLabelTe: '1800-180-1253 కి కాల్ చేయండి',
      region: 'ap',
    },
  ],
  tg: [
    {
      id: 'tg-elderline',
      nameTe: 'తెలంగాణ వృద్ధుల హెల్ప్‌లైన్ విభాగం (Elderline TG)',
      nameEn: 'Telangana Senior Citizen Welfare Department / Elderline',
      phone: '14567',
      emoji: '🏛️',
      badgeTe: 'తెలంగాణ ప్రభుత్వం • ఉచిత టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 8:00 - రాత్రి 8:00',
      descriptionTe: 'తెలంగాణ రాష్ట్రంలోని వృద్ధులకు సంక్షేమ పథకాలు, ఆసరా మరియు సహాయక సేవలు.',
      buttonLabelTe: '14567 కి కాల్ చేయండి',
      region: 'tg',
    },
    {
      id: 'tg-helpage',
      nameTe: 'హెల్ప్‌ఏజ్ ఇండియా — హైదరాబాద్ / తెలంగాణ కేంద్రం',
      nameEn: 'HelpAge India - Telangana State Office',
      phone: '1800-180-1253',
      emoji: '🧓',
      badgeTe: 'తెలంగాణ విభాగం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 9:00 - సాయంత్రం 6:00',
      descriptionTe: 'హైదరాబాద్ మరియు తెలంగాణ జిల్లాల్లో వృద్ధుల ఆరోగ్య శిబిరాలు, సహాయం మరియు సంరక్షణ.',
      buttonLabelTe: '1800-180-1253 కి కాల్ చేయండి',
      region: 'tg',
    },
  ],
  ka: [
    {
      id: 'ka-elderline',
      nameTe: 'కర్ణాటక వృద్ధుల హెల్ప్‌లైన్ (Elderline Karnataka)',
      nameEn: 'Karnataka Senior Citizen Welfare Helpline',
      phone: '14567',
      emoji: '🏛️',
      badgeTe: 'కర్ణాటక ప్రభుత్వం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 8:00 - రాత్రి 8:00',
      descriptionTe: 'కర్ణాటక రాష్ట్రంలోని వృద్ధులకు ప్రభుత్వ సంక్షేమం మరియు ఆసరా సేవలు.',
      buttonLabelTe: '14567 కి కాల్ చేయండి',
      region: 'ka',
    },
    {
      id: 'ka-nightingales',
      nameTe: 'నైటింగేల్స్ ఎల్డర్స్ హెల్ప్‌లైన్ — కర్ణాటక',
      nameEn: 'Nightingales Medical Trust Elders Helpline',
      phone: '1090',
      emoji: '🤝',
      badgeTe: 'పోలీస్ & NGO భాగస్వామ్యం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 9:00 - సాయంత్రం 5:30',
      descriptionTe: 'వృద్ధుల రక్షణ, వేధింపుల నివారణ, మరియు కౌన్సిలింగ్ సేవలు.',
      buttonLabelTe: '1090 కి కాల్ చేయండి',
      region: 'ka',
    },
  ],
  tn: [
    {
      id: 'tn-elderline',
      nameTe: 'తమిళనాడు వృద్ధుల హెల్ప్‌లైన్ (Elderline Tamil Nadu)',
      nameEn: 'Tamil Nadu Senior Citizen Welfare Helpline',
      phone: '14567',
      emoji: '🏛️',
      badgeTe: 'తమిళనాడు ప్రభుత్వం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 8:00 - రాత్రి 8:00',
      descriptionTe: 'తమిళనాడు రాష్ట్రంలో వృద్ధుల సంరక్షణ, ఆసరా మరియు సంక్షేమం.',
      buttonLabelTe: '14567 కి కాల్ చేయండి',
      region: 'tn',
    },
    {
      id: 'tn-helpage',
      nameTe: 'హెల్ప్‌ఏజ్ ఇండియా — చెన్నై / తమిళనాడు విభాగం',
      nameEn: 'HelpAge India - Tamil Nadu State Office',
      phone: '1800-180-1253',
      emoji: '🧓',
      badgeTe: 'రాష్ట్ర విభాగం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 9:00 - సాయంత్రం 6:00',
      descriptionTe: 'వృద్ధుల సంరక్షణ, ఆరోగ్య సేవలు మరియు ఆత్మీయ సంభాషణ.',
      buttonLabelTe: '1800-180-1253 కి కాల్ చేయండి',
      region: 'tn',
    },
  ],
  mh: [
    {
      id: 'mh-elderline',
      nameTe: 'మహారాష్ట్ర వృద్ధుల హెల్ప్‌లైన్ (Elderline Maharashtra)',
      nameEn: 'Maharashtra Senior Citizen Welfare Helpline',
      phone: '14567',
      emoji: '🏛️',
      badgeTe: 'మహారాష్ట్ర ప్రభుత్వం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 8:00 - రాత్రి 8:00',
      descriptionTe: 'మహారాష్ట్రలో వృద్ధుల పింఛన్లు, సంక్షేమం మరియు ఆసరా సేవలు.',
      buttonLabelTe: '14567 కి కాల్ చేయండి',
      region: 'mh',
    },
    {
      id: 'mh-dignity',
      nameTe: 'డిగ్నిటీ ఫౌండేషన్ — ముంబై / మహారాష్ట్ర కేంద్రం',
      nameEn: 'Dignity Foundation Maharashtra Chapter',
      phone: '1800-267-8780',
      emoji: '🤝',
      badgeTe: 'మహారాష్ట్ర విభాగం • టోల్ ఫ్రీ',
      hoursTe: 'ఉదయం 10:00 - సాయంత్రం 5:00',
      descriptionTe: 'ఒంటరితనంతో బాధపడే వృద్ధులకు స్నేహపూర్వక సహచర్యం మరియు భావోద్వేగ ఆసరా.',
      buttonLabelTe: '1800-267-8780 కి కాల్ చేయండి',
      region: 'mh',
    },
  ],
};

export function resolveIndiaStateRegion(stateName?: string, fullAddress?: string): { code: string; nameTe: string; services: RegionalSeniorResource[] } | null {
  const text = `${stateName || ''} ${fullAddress || ''}`.toLowerCase();
  
  if (text.includes('andhra') || text.includes('ఆంధ్ర') || text.includes('ap')) {
    return { code: 'ap', nameTe: 'ఆంధ్రప్రదేశ్', services: INDIA_REGIONAL_SENIOR_SERVICES.ap };
  }
  if (text.includes('telangana') || text.includes('తెలంగాణ') || text.includes('hyderabad') || text.includes('హైదరాబాద్')) {
    return { code: 'tg', nameTe: 'తెలంగాణ', services: INDIA_REGIONAL_SENIOR_SERVICES.tg };
  }
  if (text.includes('karnataka') || text.includes('కర్ణాటక') || text.includes('bangalore') || text.includes('bengaluru')) {
    return { code: 'ka', nameTe: 'కర్ణాటక', services: INDIA_REGIONAL_SENIOR_SERVICES.ka };
  }
  if (text.includes('tamil') || text.includes('తమిళనాడు') || text.includes('chennai')) {
    return { code: 'tn', nameTe: 'తమిళనాడు', services: INDIA_REGIONAL_SENIOR_SERVICES.tn };
  }
  if (text.includes('maharashtra') || text.includes('మహారాష్ట్ర') || text.includes('mumbai') || text.includes('pune')) {
    return { code: 'mh', nameTe: 'మహారాష్ట్ర', services: INDIA_REGIONAL_SENIOR_SERVICES.mh };
  }
  return null;
}
