import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  getDocFromServer,
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { RealDriver, RealRideRequest } from '../types';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the provisioned firestoreDatabaseId (MANDATORY)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, verifying connectivity...');
    }
    return false;
  }
}

// Quick Google Auth Login for Drivers/Users
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Google Sign-in Error:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/* =========================================================
   DRIVER OPERATIONS
   ========================================================= */

const DRIVERS_PATH = 'drivers';

export async function registerOrUpdateDriver(driverData: Omit<RealDriver, 'rating' | 'createdAt' | 'updatedAt'> & { rating?: number }): Promise<RealDriver> {
  const path = `${DRIVERS_PATH}/${driverData.id}`;
  const now = new Date().toISOString();
  
  const payload: RealDriver = {
    id: driverData.id,
    name: driverData.name.trim(),
    phone: driverData.phone.trim(),
    autoNumber: driverData.autoNumber.trim().toUpperCase(),
    currentLocation: driverData.currentLocation.trim(),
    lat: typeof driverData.lat === 'number' ? driverData.lat : null,
    lng: typeof driverData.lng === 'number' ? driverData.lng : null,
    city: driverData.city?.trim() || '',
    isOnline: driverData.isOnline ?? true,
    rating: driverData.rating || 4.8,
    userId: driverData.userId || auth.currentUser?.uid || driverData.id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, DRIVERS_PATH, driverData.id), payload, { merge: true });
    // Also save in localStorage for fast offline retrieval on same device
    localStorage.setItem('peddala_nestham_real_driver_id', driverData.id);
    localStorage.setItem('peddala_nestham_real_driver_profile', JSON.stringify(payload));
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getDriverProfile(driverId: string): Promise<RealDriver | null> {
  const path = `${DRIVERS_PATH}/${driverId}`;
  try {
    const snap = await getDoc(doc(db, DRIVERS_PATH, driverId));
    if (snap.exists()) {
      return snap.data() as RealDriver;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function setDriverOnlineStatus(
  driverId: string, 
  isOnline: boolean, 
  currentLocation?: string,
  coords?: { lat: number; lng: number } | null
): Promise<void> {
  const path = `${DRIVERS_PATH}/${driverId}`;
  const updates: Record<string, any> = {
    isOnline,
    updatedAt: new Date().toISOString(),
  };
  if (currentLocation) {
    updates.currentLocation = currentLocation;
  }
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    updates.lat = coords.lat;
    updates.lng = coords.lng;
  }

  try {
    await updateDoc(doc(db, DRIVERS_PATH, driverId), updates);
    // Update local cache
    const cached = localStorage.getItem('peddala_nestham_real_driver_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        parsed.isOnline = isOnline;
        if (currentLocation) parsed.currentLocation = currentLocation;
        if (coords) {
          parsed.lat = coords.lat;
          parsed.lng = coords.lng;
        }
        localStorage.setItem('peddala_nestham_real_driver_profile', JSON.stringify(parsed));
      } catch (e) {
        // ignore
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToOnlineDrivers(callback: (drivers: RealDriver[]) => void): Unsubscribe {
  const path = DRIVERS_PATH;
  return onSnapshot(
    collection(db, DRIVERS_PATH),
    (snapshot) => {
      const drivers: RealDriver[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as RealDriver;
        if (data.isOnline) {
          drivers.push({ ...data, id: docSnap.id });
        }
      });
      callback(drivers);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/* =========================================================
   REAL-TIME RIDE REQUEST OPERATIONS
   ========================================================= */

const REQUESTS_PATH = 'rideRequests';

export async function createRealRideRequest(params: {
  passengerName: string;
  passengerPhone?: string;
  pickupLocation: string;
  destination: string;
  targetDriverId?: string;
  rideOtp?: string;
}): Promise<RealRideRequest> {
  const requestId = `req_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const path = `${REQUESTS_PATH}/${requestId}`;
  const now = new Date().toISOString();
  const otp = params.rideOtp || Math.floor(1000 + Math.random() * 9000).toString();

  const payload: RealRideRequest = {
    id: requestId,
    passengerName: params.passengerName.trim(),
    passengerPhone: params.passengerPhone?.trim() || '',
    pickupLocation: params.pickupLocation.trim(),
    destination: params.destination.trim(),
    status: 'pending',
    targetDriverId: params.targetDriverId || '',
    rideOtp: otp,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, REQUESTS_PATH, requestId), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToRideRequest(requestId: string, callback: (req: RealRideRequest | null) => void): Unsubscribe {
  const path = `${REQUESTS_PATH}/${requestId}`;
  return onSnapshot(
    doc(db, REQUESTS_PATH, requestId),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as RealRideRequest);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToPendingRideRequests(callback: (requests: RealRideRequest[]) => void): Unsubscribe {
  const path = REQUESTS_PATH;
  return onSnapshot(
    collection(db, REQUESTS_PATH),
    (snapshot) => {
      const requests: RealRideRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as RealRideRequest;
        // Show pending requests
        if (data.status === 'pending') {
          requests.push({ ...data, id: docSnap.id });
        }
      });
      // Sort newest first
      requests.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      callback(requests);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function acceptRideRequest(requestId: string, driver: RealDriver): Promise<void> {
  const path = `${REQUESTS_PATH}/${requestId}`;
  const updates = {
    status: 'accepted',
    acceptedDriverId: driver.id,
    driverName: driver.name,
    driverPhone: driver.phone,
    autoNumber: driver.autoNumber,
    driverLocation: driver.currentLocation,
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, REQUESTS_PATH, requestId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function rejectRideRequest(requestId: string): Promise<void> {
  const path = `${REQUESTS_PATH}/${requestId}`;
  try {
    await updateDoc(doc(db, REQUESTS_PATH, requestId), {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelRideRequest(requestId: string): Promise<void> {
  const path = `${REQUESTS_PATH}/${requestId}`;
  try {
    await updateDoc(doc(db, REQUESTS_PATH, requestId), {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeRideRequest(requestId: string): Promise<void> {
  const path = `${REQUESTS_PATH}/${requestId}`;
  try {
    await updateDoc(doc(db, REQUESTS_PATH, requestId), {
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
