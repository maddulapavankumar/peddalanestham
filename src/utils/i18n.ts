import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAudioLanguage, speakInLanguage, playTapSound } from './audio';

export type Language = 'te' | 'en' | 'hi' | 'ta';

export interface LanguageInfo {
  code: Language;
  name: string;        // In its native script
  englishName: string; // English script name
  nativeWithEnglish: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'te', name: 'తెలుగు', englishName: 'Telugu', nativeWithEnglish: 'తెలుగు (Telugu)' },
  { code: 'en', name: 'English', englishName: 'English', nativeWithEnglish: 'English' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', nativeWithEnglish: 'हिन्दी (Hindi)' },
  { code: 'ta', name: 'தமிழ்', englishName: 'Tamil', nativeWithEnglish: 'தமிழ் (Tamil)' },
];

export const translations = {
  te: {
    // App identity & Top Header
    appName: 'పెద్దల నేస్తం',
    appTagline: 'అవసరమైనప్పుడు… మీకు ఒక నేస్తం ❤️',
    languageBtn: '🌐 భాష / Language',
    selectLanguageTitle: 'మీ భాషను ఎంచుకోండి',
    selectLanguageSubtitle: 'మీకు అనుకూలమైన భాషను ఎంపిక చేసుకోండి',
    close: 'మూసివేయి',
    selected: 'ఎంపికైంది',
    android: 'ఆండ్రాయిడ్',
    battery: 'బ్యాటరీ',
    morning: 'ఉదయం',
    evening: 'సాయంత్రం',
    voiceOn: 'వాయిస్ ON',
    voiceOff: 'వాయిస్ OFF',
    voiceOnTitle: 'వాయిస్ ఆఫ్ చేయండి (Voice OFF)',
    voiceOffTitle: 'వాయిస్ ఆన్ చేయండి (Voice ON)',
    voiceOnAria: 'వాయిస్ ఆన్ ఉంది. ఆఫ్ చేయడానికి తాకండి',
    voiceOffAria: 'వాయిస్ ఆఫ్ ఉంది. ఆన్ చేయడానికి తాకండి',
    fontNormal: 'సాధారణ',
    fontLarge: 'పెద్దవి',
    fontToggleTitle: 'అక్షరాల పరిమాణం మార్చండి',
    quickSos: 'SOS',
    driverMode: 'డ్రైవర్ మోడ్',
    driverModeShort: 'డ్రైవర్',
    home: 'హోమ్',

    // Bottom Navigation
    navHome: 'హోమ్',
    navPhone: 'ఫోన్',
    navSos: 'SOS సహాయం',
    navAria: 'ఆండ్రాయిడ్ నావిగేషన్',

    // Voice Announcements
    voiceWelcome: 'నమస్కారం! పెద్దల నేస్తం. మీకు అందుబాటులో ఉన్న ఆరు ముఖ్య సేవలు: ఒకటి, కుటుంబ సభ్యులు. రెండు, హాస్పిటల్ మరియు అంబులెన్స్. మూడు, ఎస్.ఓ.ఎస్ అత్యవసర సహాయం. నాలుగు, నా లొకేషన్. ఐదు, ఓలా ఆటో. ఆరు, వృద్ధుల హెల్ప్‌లైన్ 14567. కింద ఉన్న పెద్ద బటన్లలో మీకు కావలసిన దానిపై తాకండి.',
    voiceSwitchedLanguage: 'తెలుగు భాష ఎంచుకోబడింది. పెద్దల నేస్తం మీకు స్వాగతం.',
    voiceNavHome: 'ముఖ్య పేజీ',
    voiceNavPhone: 'ఫోన్ పేజీ',
    voiceNavSos: 'అత్యవసర సహాయం పేజీ',
    voiceDriverPortal: 'ఆటో డ్రైవర్ మోడ్',

    // Home Screen Cards
    homeCardFamilyTitle: 'కుటుంబ సభ్యులు',
    homeCardFamilySub: 'పిల్లలు, బంధువులకు ఒకే నొక్కుతో కాల్ & వాట్సాప్',
    homeCardHospitalTitleIndia: 'హాస్పిటల్ & అంబులెన్స్',
    homeCardHospitalTitleUsa: 'హాస్పిటల్ & 911 అంబులెన్స్',
    homeCardHospitalSubIndia: 'సమీప ఆసుపత్రులు, డాక్టర్లు & 108 అత్యవసర అంబులెన్స్',
    homeCardHospitalSubUsa: 'సమీప ఆసుపత్రులు, డాక్టర్లు & 911 అత్యవసర అంబులెన్స్',
    homeCardSosTitle: 'SOS',
    homeCardSosSubIndia: 'ఎమర్జెన్సీ సైరన్, పోలీస్ 100 & కుటుంబానికి అత్యవసర సందేశం',
    homeCardSosSubUsa: 'ఎమర్జెన్సీ సైరన్, 911 & కుటుంబానికి అత్యవసర సందేశం',
    homeCardLocationTitle: 'నా లొకేషన్',
    homeCardLocationSub: 'మీరు ఎక్కడున్నారో చిరునామా చూడండి & షేర్ చేయండి',
    homeCardAutoTitleIndia: 'Ola Auto (ఓలా ఆటో)',
    homeCardAutoTitleUsa: 'Uber Ride (యూబర్ రైడ్)',
    homeCardAutoSubIndia: 'లైవ్ GPS పికప్‌తో ఓలా ఆటో తక్షణ బుకింగ్',
    homeCardAutoSubUsa: 'లైవ్ GPS పికప్‌తో యూబర్ క్యాబ్ తక్షణ బుకింగ్',
    homeCardHelplineTitleIndia: 'వృద్ధుల హెల్ప్లైన్',
    homeCardHelplineTitleUsa: 'సీనియర్ కేర్ హెల్ప్లైన్ (USA)',
    homeCardHelplineSubIndia: '14567 జాతీయ ఉచిత సహాయం, సలహాలు & రక్షణ',
    homeCardHelplineSubUsa: 'Eldercare 1-800-677-1116 ఉచిత సహాయం & సలహాలు',
    homeCardHospitalTitle: 'హాస్పిటల్ & అంబులెన్స్',
    homeCardHospitalSub: 'సమీప ఆసుపత్రులు, డాక్టర్లు & అత్యవసర అంబులెన్స్',
    homeCardHelplineTitle: 'వృద్ధుల హెల్ప్లైన్',
    homeCardHelplineSub: '14567 జాతీయ ఉచిత సహాయం, సలహాలు & రక్షణ',
    homeCardHelpTitle: 'నాకు సహాయం కావాలి',
    homeCardHelpSub: 'ఆటో, ఆసుపత్రి, మందులు, భోజనం మరియు ఇతర పనులకు ఆసరా',

    // Country Selector
    countrySelectLabel: 'దేశం ఎంచుకోండి:',
    countryIndia: 'భారతదేశం 🇮🇳',
    countryUsa: 'అమెరికా (USA) 🇺🇸',

    // Hospital & Health Card Screen
    tabHospitals: '🏥 ఆసుపత్రులు',
    tabAmbulance: '🚑 అంబులెన్స్',
    tabHealthCard: '❤️ ఆరోగ్య కార్డు',
    hospitalSearchPlaceholder: 'ఆసుపత్రి లేదా డాక్టర్ పేరు వెతకండి...',
    filterAll: 'అన్నీ',
    filter24Hours: '24 గంటలు',
    filterGovt: 'ప్రభుత్వ',
    filterPrivate: 'ప్రైవేట్',
    filterClinics: 'క్లినిక్స్',
    callHospital: 'కాల్ చేయండి',
    getDirections: 'దారి చూడండి',
    ambulance108Title: '108 ఉచిత అత్యవసర అంబులెన్స్',
    ambulance911Title: '911 అత్యవసర అంబులెన్స్ (USA)',
    ambulance108Subtitle: '24/7 రాష్ట్ర ప్రభుత్వ ఉచిత అత్యవసర సర్వీస్',
    ambulance911Subtitle: '24/7 US అత్యవసర సర్వీస్ (Emergency Paramedics)',
    callAmbulance: 'అంబులెన్స్‌కు కాల్ చేయండి',

    // Health Card Section
    healthCardTitle: 'నా అత్యవసర ఆరోగ్య కార్డు',
    healthCardSubtitle: 'డాక్టర్లు, అంబులెన్స్ సిబ్బంది కోసం మీ ఆరోగ్య సమాచారం',
    fieldPatientName: 'పూర్తి పేరు',
    fieldAge: 'వయస్సు',
    fieldBloodGroup: 'రక్త వర్గం (Blood Group)',
    fieldMedicines: 'రోజువారీ మందులు',
    fieldConditions: 'ఆరోగ్య సమస్యలు (BP / షుగర్ / గుండె)',
    fieldDoctorName: 'ఫ్యామిలీ డాక్టర్ పేరు',
    fieldDoctorPhone: 'డాక్టర్ ఫోన్ నంబర్',
    btnEditCard: 'కార్డు వివరాలు మార్చండి (Edit)',
    btnSaveCard: 'వివరాలు భద్రపరచండి (Save)',
    btnCancelCard: 'రద్దు చేయండి (Cancel)',
    btnCallDoctor: 'డాక్టర్‌కు కాల్ చేయండి',
    msgCardSaved: 'ఆరోగ్య కార్డు వివరాలు భద్రపరచబడ్డాయి!',

    // SOS Screen
    sosMainTitle: 'అత్యవసర సహాయం (Emergency SOS)',
    sosMainSubtitle: 'ఆపదలో ఉన్నప్పుడు వెంటనే రక్షణ పొందండి',
    sosSirenStart: '🚨 ఎమర్జెన్సీ సైరన్ మోగించండి (Siren ON)',
    sosSirenStop: '🛑 సైరన్ ఆపండి (Siren OFF)',
    sosCallPoliceIndia: '📞 పోలీస్ 100 అత్యవసర కాల్',
    sosCallPoliceUsa: '📞 911 పోలీస్ అత్యవసర కాల్',
    sosSendSms: '📩 కుటుంబానికి లొకేషన్‌తో అత్యవసర SMS',
    sosSmsTemplate: 'అత్యవసరం! నాకు సహాయం కావాలి. నా ప్రస్తుత లొకేషన్:',
    sosSmsSent: 'కుటుంబ సభ్యులకు లొకేషన్ వివరాలు పంపబడ్డాయి!',

    // Location Screen
    locTitle: 'నా లొకేషన్ (My GPS Location)',
    locFetching: 'స్థానాన్ని గుర్తిస్తున్నాం...',
    locRefresh: '🔄 తాజా లొకేషన్ పొందండి (Refresh GPS)',
    locShareWhatsApp: '🟢 వాట్సాప్‌లో లొకేషన్ షేర్ చేయండి',
    locCopy: '📋 చిరునామా కాపీ చేయండి',
    locCopied: 'చిరునామా కాపీ చేయబడింది!',
    locAccuracy: 'జీపీఎస్ ఖచ్చితత్వం',
    locLastUpdated: 'చివరిగా నవీకరించబడింది',
    locMapTitle: 'లైవ్ మ్యాప్ వీక్షణ',

    // Auto Screen
    autoTitle: 'ఆటో & క్యాబ్ బుకింగ్',
    autoSubIndia: 'సమీప ఆటోలు & క్యాబ్‌లు',
    autoSubUsa: 'యూబర్ రైడ్ బుకింగ్',
    autoPickupLoc: 'మీ ప్రస్తుత పికప్ లొకేషన్:',
    autoBookOla: 'ఓలా ఆటో బుక్ చేయండి',
    autoBookUber: 'యూబర్ క్యాబ్ బుక్ చేయండి',
    autoCallDriver: 'డ్రైవర్‌కు కాల్ చేయండి',

    // Phone & Contacts Screen
    phoneTitle: 'ఫోన్ & డయలర్',
    phoneSub: 'సులభంగా నంబర్ డయల్ చేసి కాల్ చేయండి',
    phoneEnterNumber: 'ఫోన్ నంబర్ నమోదు చేయండి',
    phoneCallNow: 'కాల్ చేయండి',
    phoneClear: 'తుడిపివేయండి',

    // Family Screen
    familyTitle: 'కుటుంబ సభ్యుల నంబర్లు',
    familySub: 'పిల్లలు మరియు ఆప్తులకు తక్షణ కాల్',
    familyAddBtn: '➕ కొత్త కుటుంబ సభ్యుడిని చేర్చండి',
    familyCallBtn: 'కాల్',
    familyWhatsAppBtn: 'వాట్సాప్',

    // Helpline Screen
    helplineMainTitle: 'ముఖ్యమైన హెల్ప్‌లైన్లు',
    helplineMainSub: 'వృద్ధుల కోసం ఉచిత ప్రభుత్వ సహాయక నంబర్లు',
    elderHelpIndiaName: 'వృద్ధుల జాతీయ హెల్ప్‌లైన్ (Elder Line)',
    elderHelpUsaName: 'Eldercare Locator (USA)',
    tollFreeText: 'ఉచిత కాల్ (24/7 టోల్-ఫ్రీ)',
    // Common actions & buttons
    btnBack: 'వెనుకకు',
    btnSave: 'భద్రపరచండి',
    btnCancel: 'రద్దు చేయండి',
    btnDelete: 'తొలగించు',
    btnEdit: 'సవరించు',
    btnCall: 'కాల్ చేయండి',
    btnClear: 'తుడిపివేయండి',
    btnShare: 'షేర్ చేయండి',
    btnCopy: 'కాపీ చేయండి',
    btnRefresh: 'రీఫ్రెష్ చేయండి',
    statusLoading: 'గుర్తిస్తున్నాం...',
    statusCopied: 'కాపీ చేయబడింది!',

    // Auto / Ride screen extra
    autoDestPrompt: '📍 ఎక్కడికి వెళ్లాలి అండి? (Destination):',
    autoDestPlaceholder: 'ఉదా: గాంధీ హాస్పిటల్, గుడికి, బస్టాండ్...',
    autoCityLabel: 'నగరం:',
    autoRefreshGps: 'జీపీఎస్ స్థానాన్ని రీఫ్రెష్ చేయండి',
    autoGpsReady: 'లైవ్ జీపీఎస్ సిద్ధంగా ఉంది',
    autoReturnInstruction: 'అండి, పెద్దల నేస్తానికి మళ్లీ వెళ్లాలంటే, కింద Tabs బటన్ను నొక్కి ‘పెద్దల నేస్తం’ ట్యాబ్ను నొక్కండి.',
    autoBookOlaApp: 'ఓలా యాప్‌లో ఆటో బుక్ చేయండి',
    autoBookUberApp: 'యూబర్ యాప్‌లో క్యాబ్ బుక్ చేయండి',
    autoLiveAutos: 'లైవ్ ఆటోలు & క్యాబ్‌లు',

    // Family screen extra
    familyInputName: 'పూర్తి పేరు',
    familyInputPhone: 'ఫోన్ నంబర్',
    familyInputRelation: 'సంబంధం (బంధుత్వం)',
    familyChooseRelation: 'సంబంధం ఎంచుకోండి',
    familyNoContactsNotice: 'ఇంకా ఎవరి నంబర్లు చేర్చలేదు. పైనున్న బటన్ తాకి పిల్లల లేదా బంధువుల నంబర్ చేర్చండి.',
    familyContactSaved: 'కుటుంబ సభ్యుడి వివరాలు భద్రపరచబడ్డాయి!',
    familyDeleteConfirm: 'ఈ నంబర్‌ను తొలగించాలా?',

    // Location screen extra
    locHomeCardTitle: 'నా స్వగృహం (Home Address)',
    locHomeSetCurrent: 'ప్రస్తుత స్థానాన్ని ఇల్లుగా సెట్ చేయండి',
    locHomeNavigateBtn: 'ఇంటికి దారి చూపించు (Navigate Home)',
    locCoordsLabel: 'అక్షాంశం & రేఖాంశం (GPS Coords)',
    locAddressTitle: 'ప్రస్తుత పూర్తి చిరునామా',
    locWhatsAppShareText: 'వాట్సాప్‌లో లొకేషన్ పంపండి',

    // SOS screen extra
    sosAlertActive: '🚨 సైరన్ మోగుతోంది! (Siren ON)',
    sosCallPoliceButtonIndia: '📞 పోలీస్ 100 అత్యవసర కాల్',
    sosCallPoliceButtonUsa: '📞 911 పోలీస్ అత్యవసర కాల్',
    sosCallAmbulanceIndia: '🚑 108 అంబులెన్స్ కాల్',
    sosCallAmbulanceUsa: '🚑 911 అంబులెన్స్ కాల్',
    sosFamilyContactsTitle: 'కుటుంబ సభ్యుల అత్యవసర నంబర్లు',

    // Helpline screen extra
    helplineSeniorCentersTitle: 'సమీప వృద్ధాశ్రమాలు & డే కేర్ కేంద్రాలు',
    helplineFreeTag: 'ఉచిత సేవ (Toll-Free)',

    // Medical / Hospital extra
    medCardHeading: 'నా ఆరోగ్య కార్డు (Medical Card)',
    medCardEditBtn: 'సవరించు',
    medCardSaveBtn: 'భద్రపరచండి',
  },

  en: {
    // App identity & Top Header
    appName: "Elder's Friend",
    appTagline: 'A companion for you when in need ❤️',
    languageBtn: '🌐 Language / భాష',
    selectLanguageTitle: 'Select Your Language',
    selectLanguageSubtitle: 'Choose the language you are comfortable with',
    close: 'Close',
    selected: 'Selected',
    android: 'Android',
    battery: 'Battery',
    morning: 'Morning',
    evening: 'Evening',
    voiceOn: 'Voice ON',
    voiceOff: 'Voice OFF',
    voiceOnTitle: 'Turn Voice OFF',
    voiceOffTitle: 'Turn Voice ON',
    voiceOnAria: 'Voice is ON. Tap to turn OFF',
    voiceOffAria: 'Voice is OFF. Tap to turn ON',
    fontNormal: 'Normal',
    fontLarge: 'Large Text',
    fontToggleTitle: 'Toggle text size',
    quickSos: 'SOS',
    driverMode: 'Driver Mode',
    driverModeShort: 'Driver',
    home: 'Home',

    // Bottom Navigation
    navHome: 'Home',
    navPhone: 'Phone',
    navSos: 'SOS Help',
    navAria: 'Android Navigation',

    // Voice Announcements
    voiceWelcome: "Welcome to Elder's Friend! Six key services are available for you: One, Family Members. Two, Hospital and Ambulance. Three, SOS Emergency Help. Four, My Location. Five, Auto and Cab Booking. Six, Senior Helpline. Tap any big button below.",
    voiceSwitchedLanguage: "English language selected. Welcome to Elder's Friend.",
    voiceNavHome: 'Home Screen',
    voiceNavPhone: 'Phone Dialer Screen',
    voiceNavSos: 'Emergency SOS Screen',
    voiceDriverPortal: 'Auto Driver Mode',

    // Home Screen Cards
    homeCardFamilyTitle: 'Family Members',
    homeCardFamilySub: 'One-tap Call & WhatsApp to children and relatives',
    homeCardHospitalTitleIndia: 'Hospital & Ambulance',
    homeCardHospitalTitleUsa: 'Hospital & 911 Ambulance',
    homeCardHospitalSubIndia: 'Nearby hospitals, doctors & 108 emergency ambulance',
    homeCardHospitalSubUsa: 'Nearby hospitals, doctors & 911 emergency ambulance',
    homeCardSosTitle: 'SOS',
    homeCardSosSubIndia: 'Emergency Siren, Police 100 & Emergency SMS to Family',
    homeCardSosSubUsa: 'Emergency Siren, 911 & Emergency SMS to Family',
    homeCardLocationTitle: 'My Location',
    homeCardLocationSub: 'Check and share your current address & live GPS',
    homeCardAutoTitleIndia: 'Ola Auto',
    homeCardAutoTitleUsa: 'Uber Ride',
    homeCardAutoSubIndia: 'Instant auto booking with live GPS pickup',
    homeCardAutoSubUsa: 'Instant Uber booking with live GPS pickup',
    homeCardHelplineTitleIndia: 'Senior Helpline',
    homeCardHelplineTitleUsa: 'Senior Care Helpline (USA)',
    homeCardHelplineSubIndia: '14567 National Toll-free Help, Guidance & Protection',
    homeCardHelplineSubUsa: 'Eldercare 1-800-677-1116 Free Help & Support',
    homeCardHospitalTitle: 'Hospital & Ambulance',
    homeCardHospitalSub: 'Nearby hospitals, doctors & emergency ambulance',
    homeCardHelplineTitle: 'Senior Helpline',
    homeCardHelplineSub: 'Toll-free emergency help, guidance & senior protection',
    homeCardHelpTitle: 'I Need Help',
    homeCardHelpSub: 'Rides, hospital visit, medicines, meals & family care',

    // Country Selector
    countrySelectLabel: 'Select Country:',
    countryIndia: 'India 🇮🇳',
    countryUsa: 'USA 🇺🇸',

    // Hospital & Health Card Screen
    tabHospitals: '🏥 Hospitals',
    tabAmbulance: '🚑 Ambulance',
    tabHealthCard: '❤️ Health Card',
    hospitalSearchPlaceholder: 'Search hospital or doctor name...',
    filterAll: 'All',
    filter24Hours: '24 Hours',
    filterGovt: 'Government',
    filterPrivate: 'Private',
    filterClinics: 'Clinics',
    callHospital: 'Call Hospital',
    getDirections: 'Get Directions',
    ambulance108Title: '108 Free Emergency Ambulance',
    ambulance911Title: '911 Emergency Ambulance (USA)',
    ambulance108Subtitle: '24/7 State Government Free Emergency Service',
    ambulance911Subtitle: '24/7 US Emergency Paramedic Service',
    callAmbulance: 'Call Ambulance',

    // Health Card Section
    healthCardTitle: 'My Emergency Health Card',
    healthCardSubtitle: 'Your medical details for doctors & ambulance paramedics',
    fieldPatientName: 'Full Name',
    fieldAge: 'Age',
    fieldBloodGroup: 'Blood Group',
    fieldMedicines: 'Daily Medicines',
    fieldConditions: 'Health Conditions (BP, Diabetes, Heart, etc.)',
    fieldDoctorName: 'Family Doctor Name',
    fieldDoctorPhone: 'Doctor Phone Number',
    btnEditCard: 'Edit Health Card',
    btnSaveCard: 'Save Medical Details',
    btnCancelCard: 'Cancel',
    btnCallDoctor: 'Call Doctor',
    msgCardSaved: 'Health card details saved successfully!',

    // SOS Screen
    sosMainTitle: 'Emergency Help (SOS)',
    sosMainSubtitle: 'Get immediate help and alert family during an emergency',
    sosSirenStart: '🚨 Sound Emergency Siren (ON)',
    sosSirenStop: '🛑 Stop Siren (OFF)',
    sosCallPoliceIndia: '📞 Call Police 100',
    sosCallPoliceUsa: '📞 Call 911 Emergency',
    sosSendSms: '📩 Send Emergency SMS with Location',
    sosSmsTemplate: 'EMERGENCY! I need immediate help. My current location is:',
    sosSmsSent: 'Emergency location details sent to family members!',

    // Location Screen
    locTitle: 'My Location (Live GPS)',
    locFetching: 'Detecting live GPS location...',
    locRefresh: '🔄 Refresh GPS Location',
    locShareWhatsApp: '🟢 Share Location on WhatsApp',
    locCopy: '📋 Copy Address',
    locCopied: 'Address copied to clipboard!',
    locAccuracy: 'GPS Accuracy',
    locLastUpdated: 'Last Updated',
    locMapTitle: 'Live Map View',

    // Auto Screen
    autoTitle: 'Auto & Cab Booking',
    autoSubIndia: 'Nearby Autos & Cabs',
    autoSubUsa: 'Uber Ride Booking',
    autoPickupLoc: 'Your Current Pickup Location:',
    autoBookOla: 'Book Ola Auto',
    autoBookUber: 'Book Uber Cab',
    autoCallDriver: 'Call Driver',

    // Phone & Contacts Screen
    phoneTitle: 'Phone & Contacts',
    phoneSub: 'Easily dial numbers and call family',
    phoneEnterNumber: 'Enter phone number',
    phoneCallNow: 'Call Now',
    phoneClear: 'Clear',

    // Family Screen
    familyTitle: 'Family Contacts',
    familySub: 'Quick call & WhatsApp to loved ones',
    familyAddBtn: '➕ Add New Family Member',
    familyCallBtn: 'Call',
    familyWhatsAppBtn: 'WhatsApp',

    // Helpline Screen
    helplineMainTitle: 'Important Helplines',
    helplineMainSub: 'Toll-free emergency numbers for senior citizens',
    elderHelpIndiaName: 'National Elder Line (14567)',
    elderHelpUsaName: 'Eldercare Locator (USA)',
    tollFreeText: 'Free Call (24/7 Toll-Free)',
    // Common actions & buttons
    btnBack: 'Back',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    btnDelete: 'Delete',
    btnEdit: 'Edit',
    btnCall: 'Call Now',
    btnClear: 'Clear',
    btnShare: 'Share',
    btnCopy: 'Copy',
    btnRefresh: 'Refresh',
    statusLoading: 'Detecting...',
    statusCopied: 'Copied to clipboard!',

    // Auto / Ride screen extra
    autoDestPrompt: '📍 Where do you want to go? (Destination):',
    autoDestPlaceholder: 'e.g., Hospital, Temple, Bus Stand...',
    autoCityLabel: 'City:',
    autoRefreshGps: 'Refresh GPS Location',
    autoGpsReady: 'Live GPS is ready',
    autoReturnInstruction: "To return to Elder's Friend, tap the Tabs button at bottom and select 'Elder's Friend'.",
    autoBookOlaApp: 'Book Auto in Ola App',
    autoBookUberApp: 'Book Cab in Uber App',
    autoLiveAutos: 'Live Autos & Cabs',

    // Family screen extra
    familyInputName: 'Full Name',
    familyInputPhone: 'Phone Number',
    familyInputRelation: 'Relationship',
    familyChooseRelation: 'Select Relationship',
    familyNoContactsNotice: 'No family numbers added yet. Tap the button above to add contacts.',
    familyContactSaved: 'Contact saved successfully!',
    familyDeleteConfirm: 'Are you sure you want to remove this contact?',

    // Location screen extra
    locHomeCardTitle: 'My Home Address',
    locHomeSetCurrent: 'Set Current Location as Home',
    locHomeNavigateBtn: 'Navigate to Home',
    locCoordsLabel: 'Latitude & Longitude (GPS)',
    locAddressTitle: 'Current Full Address',
    locWhatsAppShareText: 'Send Location on WhatsApp',

    // SOS screen extra
    sosAlertActive: '🚨 Siren is Active! (Siren ON)',
    sosCallPoliceButtonIndia: '📞 Call Police 100 Emergency',
    sosCallPoliceButtonUsa: '📞 Call 911 Police Emergency',
    sosCallAmbulanceIndia: '🚑 Call 108 Ambulance',
    sosCallAmbulanceUsa: '🚑 Call 911 Ambulance',
    sosFamilyContactsTitle: 'Family Emergency Contacts',

    // Helpline screen extra
    helplineSeniorCentersTitle: 'Nearby Senior Homes & Care Centers',
    helplineFreeTag: 'Free Service (Toll-Free)',

    // Medical / Hospital extra
    medCardHeading: 'My Health Card (Medical Card)',
    medCardEditBtn: 'Edit',
    medCardSaveBtn: 'Save',
  },

  hi: {
    // App identity & Top Header
    appName: 'बुजुर्गों का साथी',
    appTagline: 'ज़रूरत के समय… आपका सच्चा साथी ❤️',
    languageBtn: '🌐 भाषा / Language',
    selectLanguageTitle: 'अपनी भाषा चुनें',
    selectLanguageSubtitle: 'अपनी पसंदीदा भाषा का चयन करें',
    close: 'बंद करें',
    selected: 'चुना हुआ',
    android: 'एंड्रॉइड',
    battery: 'बैटरी',
    morning: 'सुबह',
    evening: 'शाम',
    voiceOn: 'आवाज ON',
    voiceOff: 'आवाज OFF',
    voiceOnTitle: 'आवाज बंद करें (Voice OFF)',
    voiceOffTitle: 'आवाज चालू करें (Voice ON)',
    voiceOnAria: 'आवाज चालू है। बंद करने के लिए टैप करें',
    voiceOffAria: 'आवाज बंद है। चालू करने के लिए टैप करें',
    fontNormal: 'सामान्य',
    fontLarge: 'बड़ा टेक्स्ट',
    fontToggleTitle: 'अक्षरों का आकार बदलें',
    quickSos: 'SOS',
    driverMode: 'ड्राइवर मोड',
    driverModeShort: 'ड्राइवर',
    home: 'होम',

    // Bottom Navigation
    navHome: 'होम',
    navPhone: 'फोन',
    navSos: 'SOS सहायता',
    navAria: 'एंड्रॉइड नेविगेशन',

    // Voice Announcements
    voiceWelcome: 'नमस्ते! बुजुर्गों का साथी में आपका स्वागत है। आपके लिए छह मुख्य सेवाएं उपलब्ध हैं: एक, परिवार के सदस्य। दो, अस्पताल और एम्बुलेंस। तीन, एसओएस आपातकालीन सहायता। चार, मेरा स्थान। पांच, ऑटो और कैब। छह, बुजुर्ग हेल्पलाइन 14567। नीचे दिए गए किसी भी बड़े बटन को दबाएं।',
    voiceSwitchedLanguage: 'हिन्दी भाषा चुनी गई। बुजुर्गों का साथी में आपका स्वागत है।',
    voiceNavHome: 'मुख्य पृष्ठ',
    voiceNavPhone: 'फोन डायलर',
    voiceNavSos: 'आपातकालीन सहायता पृष्ठ',
    voiceDriverPortal: 'ऑटो ड्राइवर मोड',

    // Home Screen Cards
    homeCardFamilyTitle: 'परिवार के सदस्य',
    homeCardFamilySub: 'बच्चों और रिश्तेदारों को एक टैप में कॉल और व्हाट्सएप',
    homeCardHospitalTitleIndia: 'अस्पताल और एम्बुलेंस',
    homeCardHospitalTitleUsa: 'अस्पताल और 911 एम्बुलेंस',
    homeCardHospitalSubIndia: 'नजदीकी अस्पताल, डॉक्टर और 108 आपातकालीन एम्बुलेंस',
    homeCardHospitalSubUsa: 'नजदीकी अस्पताल, डॉक्टर और 911 आपातकालीन एम्बुलेंस',
    homeCardSosTitle: 'SOS',
    homeCardSosSubIndia: 'इमरजेंसी सायरन, पुलिस 100 और परिवार को आपातकालीन संदेश',
    homeCardSosSubUsa: 'इमरजेंसी सायरन, 911 और परिवार को आपातकालीन संदेश',
    homeCardLocationTitle: 'मेरा स्थान',
    homeCardLocationSub: 'देखें और शेयर करें कि आप इस समय कहाँ हैं',
    homeCardAutoTitleIndia: 'ओला ऑटो (Ola Auto)',
    homeCardAutoTitleUsa: 'उबर राइड (Uber Ride)',
    homeCardAutoSubIndia: 'लाइव जीपीएस पिकअप के साथ तुरंत ऑटो बुकिंग',
    homeCardAutoSubUsa: 'लाइव जीपीएस पिकअप के साथ तुरंत उबर कैब बुकिंग',
    homeCardHelplineTitleIndia: 'बुजुर्ग हेल्पलाइन',
    homeCardHelplineTitleUsa: 'सीनियर केयर हेल्पलाइन (USA)',
    homeCardHelplineSubIndia: '14567 राष्ट्रीय टोल-फ्री मदद, सलाह और सुरक्षा',
    homeCardHelplineSubUsa: 'Eldercare 1-800-677-1116 मुफ्त मदद और सलाह',
    homeCardHospitalTitle: 'अस्पताल और एम्बुलेंस',
    homeCardHospitalSub: 'निकटतम अस्पताल, डॉक्टर और आपातकालीन एम्बुलेंस',
    homeCardHelplineTitle: 'वृद्ध हेल्पलाइन',
    homeCardHelplineSub: 'टोल-फ्री आपातकालीन सहायता, मार्गदर्शन व सुरक्षा',
    homeCardHelpTitle: 'मुझे सहायता चाहिए',
    homeCardHelpSub: 'यात्रा, अस्पताल, दवाइयां, भोजन और पारिवारिक देखभाल',

    // Country Selector
    countrySelectLabel: 'देश चुनें:',
    countryIndia: 'भारत 🇮🇳',
    countryUsa: 'अमेरिका (USA) 🇺🇸',

    // Hospital & Health Card Screen
    tabHospitals: '🏥 अस्पताल',
    tabAmbulance: '🚑 एम्बुलेंस',
    tabHealthCard: '❤️ स्वास्थ्य कार्ड',
    hospitalSearchPlaceholder: 'अस्पताल या डॉक्टर का नाम खोजें...',
    filterAll: 'सभी',
    filter24Hours: '24 घंटे',
    filterGovt: 'सरकारी',
    filterPrivate: 'निजी',
    filterClinics: 'क्लिनिक',
    callHospital: 'कॉल करें',
    getDirections: 'रास्ता देखें',
    ambulance108Title: '108 मुफ्त आपातकालीन एम्बुलेंस',
    ambulance911Title: '911 आपातकालीन एम्बुलेंस (USA)',
    ambulance108Subtitle: '24/7 राज्य सरकार की मुफ्त आपातकालीन सेवा',
    ambulance911Subtitle: '24/7 अमेरिकी आपातकालीन सेवा',
    callAmbulance: 'एम्बुलेंस को कॉल करें',

    // Health Card Section
    healthCardTitle: 'मेरा आपातकालीन स्वास्थ्य कार्ड',
    healthCardSubtitle: 'डॉक्टरों और एम्बुलेंस कर्मचारियों के लिए आपकी स्वास्थ्य जानकारी',
    fieldPatientName: 'पूरा नाम',
    fieldAge: 'उम्र',
    fieldBloodGroup: 'रक्त समूह (Blood Group)',
    fieldMedicines: 'दैनिक दवाएं',
    fieldConditions: 'स्वास्थ्य समस्याएं (BP / शुगर / हृदय रोग)',
    fieldDoctorName: 'फैमिली डॉक्टर का नाम',
    fieldDoctorPhone: 'डॉक्टर का फोन नंबर',
    btnEditCard: 'कार्ड विवरण बदलें (Edit)',
    btnSaveCard: 'विवरण सुरक्षित करें (Save)',
    btnCancelCard: 'रद्द करें (Cancel)',
    btnCallDoctor: 'डॉक्टर को कॉल करें',
    msgCardSaved: 'स्वास्थ्य कार्ड विवरण सुरक्षित कर लिया गया है!',

    // SOS Screen
    sosMainTitle: 'आपातकालीन सहायता (Emergency SOS)',
    sosMainSubtitle: 'संकट के समय तुरंत सुरक्षा और परिवार को सूचित करें',
    sosSirenStart: '🚨 आपातकालीन सायरन बजाएं (Siren ON)',
    sosSirenStop: '🛑 सायरन बंद करें (Siren OFF)',
    sosCallPoliceIndia: '📞 पुलिस 100 आपातकालीन कॉल',
    sosCallPoliceUsa: '📞 911 पुलिस आपातकालीन कॉल',
    sosSendSms: '📩 स्थान के साथ परिवार को आपातकालीन SMS',
    sosSmsTemplate: 'आपातकाल! मुझे तुरंत सहायता की आवश्यकता है। मेरा वर्तमान स्थान:',
    sosSmsSent: 'परिवार के सदस्यों को आपातकालीन स्थान विवरण भेज दिया गया!',

    // Location Screen
    locTitle: 'मेरा स्थान (Live GPS)',
    locFetching: 'लाइव जीपीएस स्थान का पता लगा रहे हैं...',
    locRefresh: '🔄 स्थान रीफ्रेश करें (Refresh GPS)',
    locShareWhatsApp: '🟢 व्हाट्सएप पर स्थान शेयर करें',
    locCopy: '📋 पता कॉपी करें',
    locCopied: 'पता कॉपी हो गया!',
    locAccuracy: 'जीपीएस सटीकता',
    locLastUpdated: 'अंतिम अपडेट',
    locMapTitle: 'लाइव मैप दृश्य',

    // Auto Screen
    autoTitle: 'ऑटो और कैब बुकिंग',
    autoSubIndia: 'नजदीकी ऑटो और कैब',
    autoSubUsa: 'उबर राइड बुकिंग',
    autoPickupLoc: 'आपका वर्तमान पिकअप स्थान:',
    autoBookOla: 'ओला ऑटो बुक करें',
    autoBookUber: 'उबर कैब बुक करें',
    autoCallDriver: 'ड्राइवर को कॉल करें',

    // Phone & Contacts Screen
    phoneTitle: 'फोन और डायलर',
    phoneSub: 'आसानी से नंबर डायल करें और कॉल करें',
    phoneEnterNumber: 'फोन नंबर दर्ज करें',
    phoneCallNow: 'कॉल करें',
    phoneClear: 'हटाएं',

    // Family Screen
    familyTitle: 'परिवार के संपर्क',
    familySub: 'बच्चों और परिजनों को तुरंत कॉल व व्हाट्सएप',
    familyAddBtn: '➕ नया परिवार सदस्य जोड़ें',
    familyCallBtn: 'कॉल',
    familyWhatsAppBtn: 'व्हाट्सएप',

    // Helpline Screen
    helplineMainTitle: 'महत्वपूर्ण हेल्पलाइनें',
    helplineMainSub: 'वरिष्ठ नागरिकों के लिए टोल-फ्री सहायता नंबर',
    elderHelpIndiaName: 'राष्ट्रीय बुजुर्ग हेल्पलाइन (14567)',
    elderHelpUsaName: 'एल्डरकेयर लोकेटर (USA)',
    tollFreeText: 'मुफ्त कॉल (24/7 टोल-फ्री)',
    // Common actions & buttons
    btnBack: 'पीछे',
    btnSave: 'सुरक्षित करें',
    btnCancel: 'रद्द करें',
    btnDelete: 'हटाएं',
    btnEdit: 'बदलें',
    btnCall: 'कॉल करें',
    btnClear: 'हटाएं',
    btnShare: 'शेयर करें',
    btnCopy: 'कॉपी करें',
    btnRefresh: 'रीफ्रेश करें',
    statusLoading: 'पता लगा रहे हैं...',
    statusCopied: 'कॉपी हो गया!',

    // Auto / Ride screen extra
    autoDestPrompt: '📍 आपको कहाँ जाना है? (मंजिल / Destination):',
    autoDestPlaceholder: 'उदा: अस्पताल, मंदिर, बस स्टैंड...',
    autoCityLabel: 'शहर:',
    autoRefreshGps: 'जीपीएस स्थान रीफ्रेश करें',
    autoGpsReady: 'लाइव जीपीएस तैयार है',
    autoReturnInstruction: "राइड बुकिंग के बाद वापस आने के लिए नीचे Tabs दबाएं और 'बुजुर्गों का साथी' चुनें।",
    autoBookOlaApp: 'ओला ऐप में ऑटो बुक करें',
    autoBookUberApp: 'उबर ऐप में कैब बुक करें',
    autoLiveAutos: 'लाइव ऑटो और कैब',

    // Family screen extra
    familyInputName: 'पूरा नाम',
    familyInputPhone: 'फोन नंबर',
    familyInputRelation: 'रिश्ता (संबद्धता)',
    familyChooseRelation: 'रिश्ता चुनें',
    familyNoContactsNotice: 'अभी तक कोई नंबर नहीं जोड़ा गया है। ऊपर दिए गए बटन को दबाकर परिजनों का नंबर जोड़ें।',
    familyContactSaved: 'संपर्क विवरण सुरक्षित कर लिया गया है!',
    familyDeleteConfirm: 'क्या आप इस नंबर को हटाना चाहते हैं?',

    // Location screen extra
    locHomeCardTitle: 'मेरे घर का पता (Home Address)',
    locHomeSetCurrent: 'वर्तमान स्थान को घर के रूप में सेट करें',
    locHomeNavigateBtn: 'घर का रास्ता दिखाएं (Navigate Home)',
    locCoordsLabel: 'अक्षांश और देशांतर (GPS Coords)',
    locAddressTitle: 'वर्तमान पूरा पता',
    locWhatsAppShareText: 'व्हाट्सएप पर स्थान भेजें',

    // SOS screen extra
    sosAlertActive: '🚨 सायरन बज रहा है! (Siren ON)',
    sosCallPoliceButtonIndia: '📞 पुलिस 100 आपातकालीन कॉल',
    sosCallPoliceButtonUsa: '📞 911 पुलिस आपातकालीन कॉल',
    sosCallAmbulanceIndia: '🚑 108 एम्बुलेंस कॉल',
    sosCallAmbulanceUsa: '🚑 911 एम्बुलेंस कॉल',
    sosFamilyContactsTitle: 'परिवार के आपातकालीन नंबर',

    // Helpline screen extra
    helplineSeniorCentersTitle: 'नजदीकी वृद्धाश्रम और देखभाल केंद्र',
    helplineFreeTag: 'मुफ्त सेवा (Toll-Free)',

    // Medical / Hospital extra
    medCardHeading: 'मेरा स्वास्थ्य कार्ड (Medical Card)',
    medCardEditBtn: 'बदलें',
    medCardSaveBtn: 'सुरक्षित करें',
  },

  ta: {
    // App identity & Top Header
    appName: 'முதியோர் தோழன்',
    appTagline: 'தேவைப்படும் போது… உங்களுக்கு ஒரு தோழன் ❤️',
    languageBtn: '🌐 மொழி / Language',
    selectLanguageTitle: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    selectLanguageSubtitle: 'உங்களுக்கு வசதியான மொழியைத் தேர்வு செய்யவும்',
    close: 'மூடு',
    selected: 'தேர்ந்தெடுக்கப்பட்டது',
    android: 'ஆண்ட்ராய்டு',
    battery: 'பேட்டரி',
    morning: 'காலை',
    evening: 'மாலை',
    voiceOn: 'குரல் ON',
    voiceOff: 'குரல் OFF',
    voiceOnTitle: 'குரலை அணைக்கவும் (Voice OFF)',
    voiceOffTitle: 'குரலை இயக்கவும் (Voice ON)',
    voiceOnAria: 'குரல் இயக்கத்தில் உள்ளது. அணைக்க தட்டவும்',
    voiceOffAria: 'குரல் அணைக்கப்பட்டுள்ளது. இயக்க தட்டவும்',
    fontNormal: 'இயல்பு',
    fontLarge: 'பெரிய எழுத்து',
    fontToggleTitle: 'எழுத்து அளவை மாற்றவும்',
    quickSos: 'SOS',
    driverMode: 'டிரைவர் மோட்',
    driverModeShort: 'டிரைவர்',
    home: 'முகப்பு',

    // Bottom Navigation
    navHome: 'முகப்பு',
    navPhone: 'தொலைபேசி',
    navSos: 'SOS உதவி',
    navAria: 'ஆண்ட்ராய்டு வழிசெலுத்தல்',

    // Voice Announcements
    voiceWelcome: 'வணக்கம்! முதியோர் தோழனுக்கு நல்வரவு. உங்களுக்கு ஆறு முக்கிய சேவைகள் தயாராக உள்ளன: ஒன்று, குடும்ப உறுப்பினர்கள். இரண்டு, மருத்துவமனை மற்றும் ஆம்புலன்ஸ். மூன்று, எஸ்ஓஎஸ் அவசர உதவி. நான்கு, என் இருப்பிடம். ஐந்து, ஆட்டோ முன்பதிவு. ஆறு, முதியோர் உதவி எண் 14567. கீழே உள்ள பெரிய பொத்தான்களில் ஒன்றைத் தட்டவும்.',
    voiceSwitchedLanguage: 'தமிழ் மொழி தேர்ந்தெடுக்கப்பட்டது. முதியோர் தோழனுக்கு நல்வரவு.',
    voiceNavHome: 'முகப்புப் பக்கம்',
    voiceNavPhone: 'தொலைபேசி அழைப்புப் பக்கம்',
    voiceNavSos: 'அவசர உதவிப் பக்கம்',
    voiceDriverPortal: 'ஆட்டோ டிரைவர் பயன்முறை',

    // Home Screen Cards
    homeCardFamilyTitle: 'குடும்ப உறுப்பினர்கள்',
    homeCardFamilySub: 'பிள்ளைகள் மற்றும் உறவினர்களுக்கு ஒரே தட்டலில் அழைப்பு & வாட்ஸ்அப்',
    homeCardHospitalTitleIndia: 'மருத்துவமனை & ஆம்புலன்ஸ்',
    homeCardHospitalTitleUsa: 'மருத்துவமனை & 911 ஆம்புலன்ஸ்',
    homeCardHospitalSubIndia: 'அருகிலுள்ள மருத்துவமனைகள், மருத்துவர்கள் & 108 அவசர ஆம்புலன்ஸ்',
    homeCardHospitalSubUsa: 'அருகிலுள்ள மருத்துவமனைகள், மருத்துவர்கள் & 911 அவசர ஆம்புலன்ஸ்',
    homeCardSosTitle: 'SOS',
    homeCardSosSubIndia: 'அவசர சைரன், காவல்துறை 100 & குடும்பத்திற்கு அவசர செய்தி',
    homeCardSosSubUsa: 'அவசர சைரன், 911 & குடும்பத்திற்கு அவசர செய்தி',
    homeCardLocationTitle: 'என் இருப்பிடம்',
    homeCardLocationSub: 'நீங்கள் எங்கிருக்கிறீர்கள் என்பதைப் பார்த்து பகிரவும்',
    homeCardAutoTitleIndia: 'ஓலா ஆட்டோ (Ola Auto)',
    homeCardAutoTitleUsa: 'ஊபர் ரைடு (Uber Ride)',
    homeCardAutoSubIndia: 'நேரடி ஜிபிஎஸ் மூலம் உடனடி ஆட்டோ முன்பதிவு',
    homeCardAutoSubUsa: 'நேரடி ஜிபிஎஸ் மூலம் உடனடி ஊபர் கேப் முன்பதிவு',
    homeCardHelplineTitleIndia: 'முதியோர் உதவி எண்',
    homeCardHelplineTitleUsa: 'முதியோர் பராமரிப்பு (USA)',
    homeCardHelplineSubIndia: '14567 தேசிய கட்டணமில்லா உதவி, வழிகாட்டுதல் & பாதுகாப்பு',
    homeCardHelplineSubUsa: 'Eldercare 1-800-677-1116 இலவச உதவி & ஆலோசனை',
    homeCardHospitalTitle: 'மருத்துவமனை & ஆம்புலன்ஸ்',
    homeCardHospitalSub: 'அருகிலுள்ள மருத்துவமனைகள் & அவசர ஆம்புலன்ஸ்',
    homeCardHelplineTitle: 'முதியோர் உதவி எண்',
    homeCardHelplineSub: 'இலவச உதவி, ஆலோசனை & முதியோர் பாதுகாப்பு',
    homeCardHelpTitle: 'எனக்கு உதவி தேவை',
    homeCardHelpSub: 'ஆட்டோ, மருத்துவமனை, மருந்துகள், உணவு & பராமரிப்பு',

    // Country Selector
    countrySelectLabel: 'நாட்டைத் தேர்ந்தெடுக்கவும்:',
    countryIndia: 'இந்தியா 🇮🇳',
    countryUsa: 'அமெரிக்கா (USA) 🇺🇸',

    // Hospital & Health Card Screen
    tabHospitals: '🏥 மருத்துவமனைகள்',
    tabAmbulance: '🚑 ஆம்புலன்ஸ்',
    tabHealthCard: '❤️ சுகாதார அட்டை',
    hospitalSearchPlaceholder: 'மருத்துவமனை அல்லது மருத்துவர் பெயரைத் தேடவும்...',
    filterAll: 'அனைத்தும்',
    filter24Hours: '24 மணிநேரம்',
    filterGovt: 'அரசு',
    filterPrivate: 'தனியார்',
    filterClinics: 'கிளினிக்குகள்',
    callHospital: 'அழைக்கவும்',
    getDirections: 'வழித்தடம்',
    ambulance108Title: '108 இலவச அவசர ஆம்புலன்ஸ்',
    ambulance911Title: '911 அவசர ஆம்புலன்ஸ் (USA)',
    ambulance108Subtitle: '24/7 மாநில அரசு இலவச அவசர சேவை',
    ambulance911Subtitle: '24/7 அமெரிக்க அவசர மருத்துவ சேவை',
    callAmbulance: 'ஆம்புலன்ஸை அழைக்கவும்',

    // Health Card Section
    healthCardTitle: 'என் அவசர சுகாதார அட்டை',
    healthCardSubtitle: 'மருத்துவர்கள் மற்றும் முதலுதவியாளர்களுக்கான மருத்துவ விவரங்கள்',
    fieldPatientName: 'முழு பெயர்',
    fieldAge: 'வயது',
    fieldBloodGroup: 'இரத்த வகை (Blood Group)',
    fieldMedicines: 'தினசரி மருந்துகள்',
    fieldConditions: 'சுகாதார நிலைகள் (BP / சர்க்கரை / இதய நோய்)',
    fieldDoctorName: 'குடும்ப மருத்துவர் பெயர்',
    fieldDoctorPhone: 'மருத்துவர் தொலைபேசி எண்',
    btnEditCard: 'அட்டை விவரங்களை மாற்று (Edit)',
    btnSaveCard: 'விவரங்களைச் சேமிக்கவும் (Save)',
    btnCancelCard: 'ரத்து செய் (Cancel)',
    btnCallDoctor: 'மருத்துவரை அழைக்கவும்',
    msgCardSaved: 'சுகாதார அட்டை விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!',

    // SOS Screen
    sosMainTitle: 'அவசர உதவி (Emergency SOS)',
    sosMainSubtitle: 'ஆபத்தில் இருக்கும்போது உடனடி பாதுகாப்பைப் பெறுங்கள்',
    sosSirenStart: '🚨 அவசர சைரன் ஒலிக்கவும் (Siren ON)',
    sosSirenStop: '🛑 சைரனை நிறுத்து (Siren OFF)',
    sosCallPoliceIndia: '📞 காவல்துறை 100 அவசர அழைப்பு',
    sosCallPoliceUsa: '📞 911 காவல்துறை அவசர அழைப்பு',
    sosSendSms: '📩 இருப்பிடத்துடன் குடும்பத்திற்கு அவசர SMS',
    sosSmsTemplate: 'அவசரம்! எனக்கு உடனடியாக உதவி தேவை. என் தற்போதைய இருப்பிடம்:',
    sosSmsSent: 'குடும்ப உறுப்பினர்களுக்கு அவசர இருப்பிட விவரங்கள் அனுப்பப்பட்டன!',

    // Location Screen
    locTitle: 'என் இருப்பிடம் (Live GPS)',
    locFetching: 'நேரடி ஜிபிஎஸ் இருப்பிடத்தைக் கண்டறிகிறது...',
    locRefresh: '🔄 இருப்பிடத்தைப் புதுப்பிக்கவும் (Refresh GPS)',
    locShareWhatsApp: '🟢 வாட்ஸ்அப்பில் இருப்பிடத்தைப் பகிரவும்',
    locCopy: '📋 முகவரியை நகலெடு',
    locCopied: 'முகவரி நகலெடுக்கப்பட்டது!',
    locAccuracy: 'ஜிபிஎஸ் துல்லியம்',
    locLastUpdated: 'கடைசியாக புதுப்பிக்கப்பட்டது',
    locMapTitle: 'நேரடி வரைபடம்',

    // Auto Screen
    autoTitle: 'ஆட்டோ & கேப் முன்பதிவு',
    autoSubIndia: 'அருகிலுள்ள ஆட்டோக்கள் & கேப்கள்',
    autoSubUsa: 'ஊபர் ரைடு முன்பதிவு',
    autoPickupLoc: 'உங்கள் தற்போதைய பிக்கப் இருப்பிடம்:',
    autoBookOla: 'ஓலா ஆட்டோ பதிவு செய்',
    autoBookUber: 'ஊபர் கேப் பதிவு செய்',
    autoCallDriver: 'டிரைவரை அழைக்கவும்',

    // Phone & Contacts Screen
    phoneTitle: 'தொலைபேசி & டயலர்',
    phoneSub: 'எண்களை எளிதாக டயல் செய்து அழைக்கவும்',
    phoneEnterNumber: 'தொலைபேசி எண்ணை உள்ளிடவும்',
    phoneCallNow: 'அழைக்கவும்',
    phoneClear: 'அழி',

    // Family Screen
    familyTitle: 'குடும்ப தொடர்புகள்',
    familySub: 'பிள்ளைகள் மற்றும் உறவினர்களுக்கு உடனடி அழைப்பு',
    familyAddBtn: '➕ புதிய குடும்ப உறுப்பினரைச் சேர்க்கவும்',
    familyCallBtn: 'அழை',
    familyWhatsAppBtn: 'வாட்ஸ்அப்',

    // Helpline Screen
    helplineMainTitle: 'முக்கிய அவசர உதவி எண்கள்',
    helplineMainSub: 'முதியோர்களுக்கான இலவச கட்டணமில்லா உதவி எண்கள்',
    elderHelpIndiaName: 'தேசிய முதியோர் உதவி எண் (14567)',
    elderHelpUsaName: 'எல்டர்கேர் லொக்கேட்டர் (USA)',
    tollFreeText: 'இலவச அழைப்பு (24/7 Toll-Free)',
    // Common actions & buttons
    btnBack: 'பின்செல்',
    btnSave: 'சேமிக்கவும்',
    btnCancel: 'ரத்து செய்',
    btnDelete: 'நீக்கு',
    btnEdit: 'மாற்று',
    btnCall: 'அழைக்கவும்',
    btnClear: 'அழி',
    btnShare: 'பகிர்',
    btnCopy: 'நகலெடு',
    btnRefresh: 'புதுப்பி',
    statusLoading: 'கண்டறிகிறது...',
    statusCopied: 'நகலெடுக்கப்பட்டது!',

    // Auto / Ride screen extra
    autoDestPrompt: '📍 எங்கு செல்ல வேண்டும்? (இலக்கு / Destination):',
    autoDestPlaceholder: 'உதா: மருத்துவமனை, கோயில், பேருந்து நிலையம்...',
    autoCityLabel: 'நகரம்:',
    autoRefreshGps: 'ஜிபிஎஸ் இருப்பிடத்தைப் புதுப்பி',
    autoGpsReady: 'நேரடி ஜிபிஎஸ் தயார்',
    autoReturnInstruction: "முன்பதிவுக்குப் பின் திரும்ப வர கீழே உள்ள Tabs அழுத்தி 'முதியோர் தோழன்' தேர்ந்தெடுக்கவும்.",
    autoBookOlaApp: 'ஓலா செயலியில் ஆட்டோ பதிவு செய்',
    autoBookUberApp: 'ஊபர் செயலியில் கேப் பதிவு செய்',
    autoLiveAutos: 'நேரடி ஆட்டோக்கள் & கேப்கள்',

    // Family screen extra
    familyInputName: 'முழு பெயர்',
    familyInputPhone: 'தொலைபேசி எண்',
    familyInputRelation: 'உறவுமுறை',
    familyChooseRelation: 'உறவுமுறையைத் தேர்ந்தெடுக்கவும்',
    familyNoContactsNotice: 'இன்னும் எண்களைச் சேர்க்கவில்லை. மேலே உள்ள பொத்தானை அழுத்தி உறவினர்களைச் சேர்க்கவும்.',
    familyContactSaved: 'தொடர்பு வெற்றிகரமாக சேமிக்கப்பட்டது!',
    familyDeleteConfirm: 'இந்த எண்ணை நீக்க விரும்புகிறீர்களா?',

    // Location screen extra
    locHomeCardTitle: 'என் வீட்டு முகவரி (Home Address)',
    locHomeSetCurrent: 'தற்போதைய இடத்தை வீடாக அமைக்கவும்',
    locHomeNavigateBtn: 'வீட்டிற்கு வழிசெலுத்து (Navigate Home)',
    locCoordsLabel: 'அட்சரேகை & தீர்க்கரேகை (GPS Coords)',
    locAddressTitle: 'தற்போதைய முழு முகவரி',
    locWhatsAppShareText: 'வாட்ஸ்அப்பில் இருப்பிடத்தை அனுப்பு',

    // SOS screen extra
    sosAlertActive: '🚨 சைரன் ஒலிக்கிறது! (Siren ON)',
    sosCallPoliceButtonIndia: '📞 காவல்துறை 100 அவசர அழைப்பு',
    sosCallPoliceButtonUsa: '📞 911 காவல்துறை அவசர அழைப்பு',
    sosCallAmbulanceIndia: '🚑 108 ஆம்புலன்ஸ் அழைப்பு',
    sosCallAmbulanceUsa: '🚑 911 ஆம்புலன்ஸ் அழைப்பு',
    sosFamilyContactsTitle: 'குடும்ப அவசர எண்கள்',

    // Helpline screen extra
    helplineSeniorCentersTitle: 'அருகிலுள்ள முதியோர் இல்லங்கள் & பராமரிப்பு மையங்கள்',
    helplineFreeTag: 'இலவச சேவை (Toll-Free)',

    // Medical / Hospital extra
    medCardHeading: 'என் சுகாதார அட்டை (Medical Card)',
    medCardEditBtn: 'மாற்று',
    medCardSaveBtn: 'சேமிக்கவும்',
  },
} as const;

export type TranslationKey = keyof typeof translations.te;

export function getInitialLanguage(): Language {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('peddala_language');
    if (saved === 'te' || saved === 'en' || saved === 'hi' || saved === 'ta') {
      return saved;
    }
  }
  return 'te';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  speakAppText: (textOrKey: string | TranslationKey, customText?: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'te',
  setLanguage: () => {},
  t: (key: TranslationKey) => translations.te[key] || '',
  speakAppText: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    setAudioLanguage(language);
  }, [language]);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('peddala_language', newLang);
      }
    } catch {
      // ignore
    }
    setAudioLanguage(newLang);

    // Provide pleasant feedback sound & spoken feedback in the newly chosen language
    playTapSound();
    const switchMessage = translations[newLang].voiceSwitchedLanguage;
    speakInLanguage(switchMessage, newLang);
  };

  const t = (key: TranslationKey): string => {
    const langDict = translations[language] || translations.te;
    return (langDict as any)[key] || (translations.te as any)[key] || '';
  };

  const speakAppText = (textOrKey: string | TranslationKey, customText?: string) => {
    if (customText) {
      speakInLanguage(customText, language);
      return;
    }
    const langDict = translations[language] || translations.te;
    const spoken = (langDict as any)[textOrKey] || textOrKey;
    speakInLanguage(spoken, language);
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t, speakAppText } },
    children
  );
};

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext);
}

export function translate(key: TranslationKey, lang?: Language): string {
  const target = lang || getInitialLanguage();
  return (translations[target] as any)?.[key] || translations.te[key] || '';
}

export function getRelationPresets(lang: Language): string[] {
  switch (lang) {
    case 'en':
      return [
        'Son',
        'Daughter',
        'Grandson',
        'Granddaughter',
        'Wife',
        'Husband',
        'Daughter-in-law',
        'Son-in-law',
        'Brother',
        'Sister',
        'Friend',
        'Neighbor',
        'Caretaker',
        'Other'
      ];
    case 'hi':
      return [
        'बेटा (Son)',
        'बेटी (Daughter)',
        'पोता / नाती (Grandson)',
        'पोती / नातिन (Granddaughter)',
        'पत्नी (Wife)',
        'पति (Husband)',
        'बहू (Daughter-in-law)',
        'दामाद (Son-in-law)',
        'भाई (Brother)',
        'बहन (Sister)',
        'मित्र (Friend)',
        'पड़ोसी (Neighbor)',
        'केयरटेकर (Caretaker)',
        'अन्य (Other)'
      ];
    case 'ta':
      return [
        'மகன் (Son)',
        'மகள் (Daughter)',
        'பேரன் (Grandson)',
        'பேத்தி (Granddaughter)',
        'மனைவி (Wife)',
        'கணவர் (Husband)',
        'மருமகள் (Daughter-in-law)',
        'மருமகன் (Son-in-law)',
        'சகோதரன் (Brother)',
        'சகோதரி (Sister)',
        'நண்பர் (Friend)',
        'அயலவர் (Neighbor)',
        'பராமரிப்பாளர் (Caretaker)',
        'மற்றவை (Other)'
      ];
    case 'te':
    default:
      return [
        'కొడుకు (Son)',
        'కూతురు (Daughter)',
        'మనవడు (Grandson)',
        'మనవరాలు (Granddaughter)',
        'భార్య (Wife)',
        'భర్త (Husband)',
        'కోడలు (Daughter-in-law)',
        'అల్లుడు (Son-in-law)',
        'సోదరుడు (Brother)',
        'సోదరి (Sister)',
        'మిత్రులు (Friend)',
        'పొరుగువారు (Neighbor)',
        'కేర్ టేకర్ (Caretaker)',
        'ఇతరులు (Other)'
      ];
  }
}
