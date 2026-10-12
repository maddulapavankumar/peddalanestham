import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ExternalLink, Navigation, LocateFixed } from 'lucide-react';
import { playTapSound } from '../utils/audio';
import { useLanguage } from '../utils/i18n';

interface RealLocationMapProps {
  lat: number;
  lng: number;
  accuracy?: number | null;
  address?: string;
  isLargeFont?: boolean;
}

export const RealLocationMap: React.FC<RealLocationMapProps> = ({
  lat,
  lng,
  accuracy,
  address,
  isLargeFont = false,
}) => {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const youAreHereText = language === 'en' ? 'You are here' : language === 'hi' ? 'आप यहाँ हैं' : language === 'ta' ? 'நீங்கள் இங்கே உள்ளீர்கள்' : 'మీరు ఇక్కడ ఉన్నారు';
  const realGpsHeading = language === 'en' ? '📍 Your Real GPS Location' : language === 'hi' ? '📍 आपका वास्तविक GPS स्थान' : language === 'ta' ? '📍 உங்கள் உண்மையான GPS இருப்பிடம்' : '📍 మీ నిజమైన GPS స్థానం';
  const locDetectedText = language === 'en' ? 'Location detected' : language === 'hi' ? 'स्थान पहचान लिया गया' : language === 'ta' ? 'இருப்பிடம் கண்டறியப்பட்டது' : 'లొకేషన్ గుర్తించబడింది';
  const coordsLabel = language === 'en' ? 'Coordinates:' : language === 'hi' ? 'निर्देशांक:' : language === 'ta' ? 'ஆயத்தொலைவுகள்:' : 'కోఆర్డినేట్స్:';
  const getAccuracyText = (acc: number) => {
    if (language === 'en') return `Accuracy: ~${Math.round(acc)} meters`;
    if (language === 'hi') return `सटीकता: ~${Math.round(acc)} मीटर`;
    if (language === 'ta') return `துல்லியம்: ~${Math.round(acc)} மீட்டர்கள்`;
    return `ఖచ్చితత్వం: ~${Math.round(acc)} మీటర్లు`;
  };

  const recenterTitle = language === 'en' ? 'Re-center to Me' : language === 'hi' ? 'मेरे स्थान पर आएं' : language === 'ta' ? 'எனது இருப்பிடத்திற்கு வாருங்கள்' : 'నా స్థానానికి రండి';
  const realGpsPill = language === 'en' ? 'Real GPS Location' : language === 'hi' ? 'वास्तविक GPS स्थान' : language === 'ta' ? 'உண்மையான GPS இடம்' : 'నిజమైన GPS స్థానం';
  const openMapsText = language === 'en' ? 'Open Google Maps' : language === 'hi' ? 'Google Maps खोलें' : language === 'ta' ? 'Google Maps ஐ திறக்கவும்' : 'Google Maps తెరవండి';
  const directionsText = language === 'en' ? 'Directions / Navigation' : language === 'hi' ? 'दिशाएं (Directions)' : language === 'ta' ? 'வழிகாட்டுதல் (Directions)' : 'దిశలు / నావిగేషన్';

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom high-visibility senior marker for user's real GPS position
      const userIcon = L.divIcon({
        className: 'custom-real-location-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
            <div style="position:relative; width:44px; height:44px; background:#dc2626; border:3px solid #ffffff; border-radius:50%; box-shadow:0 10px 15px -3px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:22px; color:#ffffff;">
              📍
              <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(220,38,38,0.4); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
            </div>
            <div style="background:#1e3a8a; color:#ffffff; font-weight:800; font-size:11px; padding:3px 8px; border-radius:9999px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.3); margin-top:2px; white-space:nowrap; border:1px solid #93c5fd; font-family:inherit;">
              ${youAreHereText}
            </div>
          </div>
        `,
        iconSize: [44, 60],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
      markerRef.current = marker;

      // Accuracy circle if accuracy is known
      if (accuracy && accuracy > 0 && accuracy < 5000) {
        const circle = L.circle([lat, lng], {
          radius: accuracy,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1.5,
        }).addTo(map);
        circleRef.current = circle;
      }

      // Initial Popup with real address
      const popupHtml = `
        <div style="font-family:inherit; padding:4px; max-width:240px;">
          <div style="color:#1e3a8a; font-weight:800; font-size:13px; display:flex; align-items:center; gap:4px;">
            <span>${realGpsHeading}</span>
          </div>
          <p style="margin:4px 0 2px; font-size:12px; font-weight:700; color:#1c1917; line-height:1.4;">
            ${address || locDetectedText}
          </p>
          <div style="margin-top:4px; font-size:11px; color:#44403c; font-weight:600;">
            ${coordsLabel} ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
          ${accuracy ? `<div style="font-size:10px; color:#047857; font-weight:700; margin-top:2px;">${getAccuracyText(accuracy)}</div>` : ''}
        </div>
      `;
      marker.bindPopup(popupHtml);

      mapInstanceRef.current = map;

      // Handle map resizing correctly inside containers
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  // Update map and marker when real GPS coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.setView([lat, lng], 16);
    marker.setLatLng([lat, lng]);

    // Update accuracy circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      if (accuracy && accuracy > 0 && accuracy < 5000) {
        circleRef.current.setRadius(accuracy);
      }
    } else if (accuracy && accuracy > 0 && accuracy < 5000) {
      circleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);
    }

    const popupHtml = `
      <div style="font-family:inherit; padding:4px; max-width:240px;">
        <div style="color:#1e3a8a; font-weight:800; font-size:13px; display:flex; align-items:center; gap:4px;">
          <span>${realGpsHeading}</span>
        </div>
        <p style="margin:4px 0 2px; font-size:12px; font-weight:700; color:#1c1917; line-height:1.4;">
          ${address || locDetectedText}
        </p>
        <div style="margin-top:4px; font-size:11px; color:#44403c; font-weight:600;">
          ${coordsLabel} ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
        ${accuracy ? `<div style="font-size:10px; color:#047857; font-weight:700; margin-top:2px;">${getAccuracyText(accuracy)}</div>` : ''}
      </div>
    `;
    marker.setPopupContent(popupHtml);
  }, [lat, lng, accuracy, address, language]);

  // Re-center map back to user's real GPS position
  const handleRecenter = () => {
    playTapSound();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }
  };

  return (
    <div className="relative w-full h-64 sm:h-84 rounded-2xl overflow-hidden border-2 border-stone-300 shadow-inner bg-stone-100">
      {/* Leaflet Map Div */}
      <div
        id="real-location-leaflet-map"
        ref={mapContainerRef}
        className="w-full h-full z-0"
        style={{ minHeight: '16rem' }}
      />

      {/* Floating Re-center Pill Button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={handleRecenter}
          className="bg-white/95 hover:bg-white active:scale-95 text-blue-900 px-3 py-2 rounded-xl shadow-md border border-blue-200 flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer"
          title={recenterTitle}
        >
          <LocateFixed className="w-4 h-4 text-blue-700" />
          <span>{recenterTitle}</span>
        </button>
      </div>

      {/* Floating Status Pill */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-stone-200 flex items-center gap-1.5 text-xs font-black text-stone-900 pointer-events-none">
        <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
        <span>{realGpsPill}</span>
      </div>

      {/* Quick Map Action Overlay Buttons */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 flex-wrap justify-end">
        <a
          id="btn-open-google-maps-overlay"
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => playTapSound()}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-black px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 border border-blue-400 transition-all cursor-pointer"
        >
          <span>{openMapsText}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a
          id="btn-open-directions-overlay"
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => playTapSound()}
          className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs sm:text-sm font-black px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 border border-emerald-500 transition-all cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{directionsText}</span>
        </a>
      </div>
    </div>
  );
};
