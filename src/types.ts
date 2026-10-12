export type ScreenType = 
  | 'home'
  | 'auto'
  | 'hospital'
  | 'ambulance'
  | 'phone'
  | 'sos'
  | 'location'
  | 'family'
  | 'help'
  | 'driver'
  | 'helpline';

export interface RealDriver {
  id: string;
  name: string;
  phone: string;
  autoNumber: string;
  currentLocation: string;
  lat?: number | null;
  lng?: number | null;
  city?: string;
  isOnline: boolean;
  rating: number;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RealRideRequest {
  id: string;
  passengerName: string;
  passengerPhone?: string;
  pickupLocation: string;
  destination: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  targetDriverId?: string;
  acceptedDriverId?: string;
  driverName?: string;
  driverPhone?: string;
  autoNumber?: string;
  driverLocation?: string;
  rideOtp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  avatarColor: string;
}

export interface UserMedicalProfile {
  name: string;
  age: string;
  bloodGroup: string;
  medicines: string;
  conditions: string;
  doctorName: string;
  doctorPhone: string;
}

export interface LocationState {
  lat: number | null;
  lng: number | null;
  address: string;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface NearbyAutoDriver {
  id: string;
  driverName: string;
  phone: string;
  autoNumber: string;
  distance: string;
  distanceKm?: number;
  estimatedMinutes: number;
  standName: string;
  rating: string;
  isAvailable: boolean;
  notes?: string;
  lat?: number | null;
  lng?: number | null;
  isUnion?: boolean;
}

export interface NearbyHospital {
  id: string;
  name: string;
  nameEn: string;
  distance: string;
  estimatedTime: string;
  address: string;
  phone: string;
  emergencyPhone?: string;
  type: 'government' | 'private' | 'clinic';
  categoryLabel: string;
  timing: string;
  is24Hours: boolean;
  services: string[];
}

