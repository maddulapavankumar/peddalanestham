import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { NearbyAutoDriver } from '../types';
import { useLanguage } from '../utils/i18n';

interface NearbyAutosMapProps {
  passengerLat: number | null;
  passengerLng: number | null;
  passengerAddress?: string;
  drivers: NearbyAutoDriver[];
  selectedDriverId?: string | null;
  onSelectDriver: (driver: NearbyAutoDriver) => void;
  onBookDriver: (driver: NearbyAutoDriver) => void;
}

export const NearbyAutosMap: React.FC<NearbyAutosMapProps> = ({
  passengerLat,
  passengerLng,
  passengerAddress,
  drivers,
  selectedDriverId,
  onSelectDriver,
  onBookDriver,
}) => {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const hasPassengerLocation = passengerLat !== null && passengerLng !== null;
  const firstDriverWithCoords = drivers.find(d => typeof d.lat === 'number' && typeof d.lng === 'number');

  const centerLat = passengerLat ?? firstDriverWithCoords?.lat ?? null;
  const centerLng = passengerLng ?? firstDriverWithCoords?.lng ?? null;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || centerLat === null || centerLng === null) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat !== null && centerLng !== null]);

  // Update center when passenger location changes
  useEffect(() => {
    if (mapInstanceRef.current && centerLat !== null && centerLng !== null) {
      mapInstanceRef.current.setView([centerLat, centerLng], 15);
    }
  }, [centerLat, centerLng]);

  // Update Markers whenever drivers or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup || centerLat === null || centerLng === null) return;

    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    const youBadge = language === 'en' ? 'You' : language === 'hi' ? 'आप (You)' : language === 'ta' ? 'நீங்கள் (You)' : 'మీరు (You)';
    const yourLocationHeading = language === 'en' ? '📍 Your Current Location' : language === 'hi' ? '📍 आपका वर्तमान स्थान' : language === 'ta' ? '📍 உங்கள் தற்போதைய இடம்' : '📍 మీ ప్రస్తుత ప్రదేశం';
    const locDetectedText = language === 'en' ? 'Location detected' : language === 'hi' ? 'स्थान पहचान लिया गया' : language === 'ta' ? 'இருப்பிடம் கண்டறியப்பட்டது' : 'లొకేషన్ గుర్తించబడింది';
    const liveText = language === 'en' ? '🟢 Live' : language === 'hi' ? '🟢 लाइव' : language === 'ta' ? '🟢 நேரலை' : '🟢 లైవ్';
    const liveDriverBadge = language === 'en' ? '🟢 Live Driver' : language === 'hi' ? '🟢 लाइव ऑटो ड्राइवर' : language === 'ta' ? '🟢 நேரலை ஆட்டோ ஓட்டுநர்' : '🟢 లైవ్ ఆటో డ్రైవర్';
    const distancePrefix = language === 'en' ? '📍 Distance:' : language === 'hi' ? '📍 दूरी:' : language === 'ta' ? '📍 தூரம்:' : '📍 దూరం:';
    const liveGpsLocation = language === 'en' ? 'Live GPS Location' : language === 'hi' ? 'लाइव GPS स्थान' : language === 'ta' ? 'நேரலை GPS இருப்பிடம்' : 'లైవ్ GPS లొకేషన్';
    const bookAutoBtn = language === 'en' ? '🛺 Book Auto' : language === 'hi' ? '🛺 ऑटो बुक करें' : language === 'ta' ? '🛺 ஆட்டோ முன்பதிவு செய்க' : '🛺 ఆటో బుక్ చేయండి';

    // 1. Add Passenger Marker if passenger has real location
    if (hasPassengerLocation) {
      const passengerIcon = L.divIcon({
        className: 'custom-passenger-marker',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="w-10 h-10 bg-blue-600 border-3 border-white rounded-full shadow-lg flex items-center justify-center text-white font-bold text-base ring-4 ring-blue-400/40 animate-pulse">
              📍
            </div>
            <span class="bg-blue-900 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-md mt-1 whitespace-nowrap border border-blue-300">
              ${youBadge}
            </span>
          </div>
        `,
        iconSize: [40, 56],
        iconAnchor: [20, 48],
      });

      const pMarker = L.marker([passengerLat, passengerLng], { icon: passengerIcon })
        .bindPopup(`
          <div style="font-family: inherit; padding: 4px;">
            <b style="color: #1e3a8a; font-size: 14px;">${yourLocationHeading}</b>
            <p style="margin: 4px 0 0; font-size: 12px; color: #44403c;">${passengerAddress || locDetectedText}</p>
          </div>
        `);
      markersGroup.addLayer(pMarker);
      bounds.extend([passengerLat, passengerLng]);
    }

    // 2. Add Driver Markers
    drivers.forEach((driver, idx) => {
      // If driver has lat/lng, use it; otherwise offset slightly around center
      const dLat = driver.lat ?? (centerLat + (idx % 2 === 0 ? 0.003 : -0.003) * (idx + 1));
      const dLng = driver.lng ?? (centerLng + (idx % 2 === 0 ? -0.003 : 0.003) * (idx + 1));
      bounds.extend([dLat, dLng]);

      const isSelected = selectedDriverId === driver.id;

      const driverIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-115' : 'hover:scale-110'}">
            <div class="w-12 h-12 bg-amber-400 border-3 border-emerald-600 ring-4 ring-emerald-400/80 shadow-emerald-500/50 ${isSelected ? 'ring-4 ring-blue-600' : ''} rounded-2xl shadow-xl flex items-center justify-center text-stone-950 font-black text-2xl relative">
              🛺
              <span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-ping"></span>
              <span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-600 border-2 border-white rounded-full"></span>
            </div>
            <div class="bg-stone-900 text-emerald-300 font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-md mt-1 whitespace-nowrap border border-emerald-600">
              ${driver.autoNumber}
            </div>
            <div class="bg-emerald-700 text-white font-bold text-[9px] px-1.5 py-0.2 rounded shadow -mt-0.5">
              ${liveText} • ${driver.distance}
            </div>
          </div>
        `,
        iconSize: [48, 68],
        iconAnchor: [24, 60],
      });

      const dMarker = L.marker([dLat, dLng], { icon: driverIcon });

      dMarker.on('click', () => {
        onSelectDriver(driver);
      });

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = "inherit";
      popupContent.style.padding = '6px';
      popupContent.innerHTML = `
        <div style="min-width: 175px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
            <span style="background: #dcfce7; color: #14532d; font-weight: 900; font-family: monospace; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #10b981;">
              ${driver.autoNumber}
            </span>
            <span style="background: #dcfce7; color: #14532d; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">
              ${liveDriverBadge}
            </span>
          </div>
          <h4 style="margin: 0; font-size: 15px; font-weight: 900; color: #0c0a09;">${driver.driverName}</h4>
          <p style="margin: 3px 0 0; font-size: 12px; font-weight: 700; color: #047857;">
            ${distancePrefix} ${driver.distance}
          </p>
          <p style="margin: 2px 0 8px; font-size: 11px; color: #78716c; font-weight: 700;">
            ${driver.standName || liveGpsLocation}
          </p>
          <button id="map-book-btn-${driver.id}" style="width: 100%; background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 900; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            ${bookAutoBtn}
          </button>
        </div>
      `;

      const bookBtn = popupContent.querySelector(`#map-book-btn-${driver.id}`);
      if (bookBtn) {
        bookBtn.addEventListener('click', () => {
          onBookDriver(driver);
        });
      }

      dMarker.bindPopup(popupContent);
      markersGroup.addLayer(dMarker);
    });

    // If there are multiple markers, adjust bounds so all are visible
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [drivers, selectedDriverId, centerLat, centerLng, passengerLat, passengerLng, hasPassengerLocation, passengerAddress, language]);

  const realDriversCount = drivers.length;

  if (centerLat === null || centerLng === null) {
    const noGpsTitle = language === 'en' ? 'GPS location unavailable (GPS required for live map)' : language === 'hi' ? 'GPS स्थान अनुपलब्ध (लाइव मैप के लिए GPS आवश्यक है)' : language === 'ta' ? 'GPS இருப்பிடம் கிடைக்கவில்லை (நேரலை வரைபடத்திற்கு GPS தேவை)' : 'GPS location unavailable (మ్యాప్ కోసం జీపీఎస్ అవసరం)';
    const noGpsDesc = language === 'en' ? 'Nearby autos and live map will appear here as soon as your device acquires real GPS location.' : language === 'hi' ? 'जैसे ही आपका फोन वास्तविक जीपीएस स्थान प्राप्त करेगा, निकटतम ऑटो और लाइव मैप यहां दिखाई देंगे।' : language === 'ta' ? 'உங்கள் தொலைபேசி உண்மையான ஜிபிஎஸ் இருப்பிடத்தைக் கண்டறிந்தவுடன் அருகிலுள்ள ஆட்டோக்கள் மற்றும் நேரலை வரைபடம் இங்கே தோன்றும்.' : 'మీ ఫోన్ నిజమైన GPS స్థానాన్ని గుర్తించిన వెంటనే సమీప ఆటోలు మరియు లైవ్ మ్యాప్ ఇక్కడ కనిపిస్తాయి. తప్పుడు లేదా ఫిక్స్‌డ్ లొకేషన్లు ఉపయోగించబడవు.';

    return (
      <div className="w-full h-56 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-black text-xl">
          📍
        </div>
        <span className="bg-amber-200 text-amber-950 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300">
          GPS location unavailable
        </span>
        <h4 className="font-black text-stone-900 text-base">
          {noGpsTitle}
        </h4>
        <p className="text-xs font-bold text-stone-600 max-w-sm">
          {noGpsDesc}
        </p>
      </div>
    );
  }

  const youLegend = language === 'en' ? 'You' : language === 'hi' ? 'आप' : language === 'ta' ? 'நீங்கள்' : 'మీరు';
  const liveDriversLegend = language === 'en' ? 'Live Auto Drivers' : language === 'hi' ? 'लाइव ऑटो ड्राइवर' : language === 'ta' ? 'நேரலை ஆட்டோ ஓட்டுநர்கள்' : 'లైవ్ ఆటో డ్రైవర్లు';

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border-3 border-amber-400 shadow-md bg-stone-100">
      <div 
        id="nearby-autos-leaflet-map" 
        ref={mapContainerRef} 
        className="w-full h-72 sm:h-80 z-0"
      />
      {/* Map Legend Overlay */}
      <div className="absolute top-2 right-2 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-stone-300 shadow-sm text-xs font-bold text-stone-800 flex items-center gap-3 pointer-events-none flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full inline-block"></span>
          {youLegend}
        </span>
        {realDriversCount > 0 && (
          <span className="flex items-center gap-1 text-emerald-800 font-black">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full inline-block animate-pulse"></span>
            {liveDriversLegend} ({realDriversCount})
          </span>
        )}
      </div>
    </div>
  );
};
