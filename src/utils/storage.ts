import { FamilyContact, UserMedicalProfile } from '../types';

const CONTACTS_KEY = 'peddala_nestham_contacts';
const PROFILE_KEY = 'peddala_nestham_profile';
const AUTO_DRIVER_KEY = 'peddala_nestham_auto_driver';

export const DEFAULT_CONTACTS: FamilyContact[] = [
  {
    id: '1',
    name: 'రాజేష్ (కొడుకు)',
    relation: 'కొడుకు',
    phone: '+919876543210',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: '2',
    name: 'సుజాత (కూతురు)',
    relation: 'కూతురు',
    phone: '+919848012345',
    avatarColor: 'bg-rose-600',
  },
  {
    id: '3',
    name: 'రాహుల్ (మనవడు)',
    relation: 'మనవడు',
    phone: '+919988776655',
    avatarColor: 'bg-blue-600',
  },
  {
    id: '4',
    name: 'కృష్ణారావు గారు (పొరుగువారు)',
    relation: 'పొరుగువారు',
    phone: '+919440011223',
    avatarColor: 'bg-amber-600',
  },
];

export const DEFAULT_PROFILE: UserMedicalProfile = {
  name: 'రామకృష్ణారావు',
  age: '72',
  bloodGroup: 'B+ పాజిటివ్',
  medicines: 'బీపీ టాబ్లెట్ (ఉదయం), షుగర్ మందు (రాత్రి)',
  conditions: 'రక్తపోటు (BP), కొలెస్ట్రాల్',
  doctorName: 'డా. శ్రీనివాస్ (జనరల్ ఫిజీషియన్)',
  doctorPhone: '9849012345',
};

export const DEFAULT_AUTO_DRIVER = {
  name: 'రాము (మన వీధి ఆటో)',
  phone: '9848099887',
};

export function getStoredContacts(): FamilyContact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (raw) {
      const parsed: FamilyContact[] = JSON.parse(raw);
      // Ensure only user-added members are shown by filtering out any legacy default sample contacts
      const filtered = parsed.filter(
        (c) =>
          !['1', '2', '3', '4'].includes(c.id) &&
          !c.name.includes('రాజేష్ (కొడుకు)') &&
          !c.name.includes('సుజాత (కూతురు)') &&
          !c.name.includes('రాహుల్ (మనవడు)') &&
          !c.name.includes('కృష్ణారావు')
      );
      return filtered.map((c) => {
        const digits = c.phone.replace(/[^0-9]/g, '');
        const last10 = digits.slice(-10);
        const completePhone = `+91${last10}`;
        return { ...c, phone: completePhone };
      });
    }
  } catch {
    // fallback
  }
  // Return empty list so only members that have actually been added by the user are shown
  return [];
}

export function saveStoredContacts(contacts: FamilyContact[]) {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch {
    // ignore
  }
}

export function getStoredProfile(): UserMedicalProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_PROFILE;
}

export function saveStoredProfile(profile: UserMedicalProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function getStoredAutoDriver(): { name: string; phone: string } {
  try {
    const raw = localStorage.getItem(AUTO_DRIVER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_AUTO_DRIVER;
}

export function saveStoredAutoDriver(driver: { name: string; phone: string }) {
  try {
    localStorage.setItem(AUTO_DRIVER_KEY, JSON.stringify(driver));
  } catch {
    // ignore
  }
}
