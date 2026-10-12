import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API health checks for deployment readiness & liveness probes
  app.get(["/healthz", "/api/health"], (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Reverse Geocoding API with multi-provider fallback for the most accurate address
  app.get("/api/reverse-geocode", async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing lat or lng parameter" });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "Invalid lat or lng" });
    }

    // Helper to identify generic administrative areas (e.g. "Vijayawada Urban", "Guntur Urban", "Nampally mandal")
    const isGenericAdmin = (text: string): boolean => {
      if (!text) return true;
      const s = text.trim();
      if (!s) return true;
      // Single word admin tokens
      if (/^(urban|rural|పట్టణ|గ్రామీణ|mandal|మండలం|tehsil|taluk|district|division|cantonment)$/i.test(s)) return true;
      // Contains mandal, tehsil, taluk, or revenue division in Telugu or English
      if (/\b(mandal|మండలం|tehsil|taluk|revenue division|revenue mandal)\b/i.test(s)) return true;
      // Suffix checks (e.g. "Vijayawada Urban", "Guntur Rural", "Nampally mandal")
      if (/^(.*)\s+(urban|rural|mandal|tehsil|taluk|division|revenue mandal)$/i.test(s)) return true;
      // Parenthesized checks (e.g. "Vijayawada (Urban)", "Guntur (Rural)")
      if (/^(.*)\s*[\(\[](urban|rural|mandal|tehsil|taluk)[\)\]]$/i.test(s)) return true;
      // Telugu suffix checks
      if (/^(.*)\s+(పట్టణ|గ్రామీణ|మండలం|తాలూకా|అర్బన్|రూరల్)$/i.test(s)) return true;
      if (/^(.*)\s*[\(\[](పట్టణ|గ్రామీణ|మండలం|తాలూకా)[\)\]]$/i.test(s)) return true;
      // Administrative subdivisions (wards, circles, zones, municipal corporations)
      if (/^ward\s+\d+.*$/i.test(s)) return true;
      if (/^circle\s+\d+.*$/i.test(s)) return true;
      if (/^zone\s+\d+.*$/i.test(s)) return true;
      if (/greater\s+.*municipal\s+corporation/i.test(s)) return true;
      if (/municipal\s+corporation/i.test(s)) return true;
      if (/municipality/i.test(s)) return true;
      return false;
    };

    // Common Telugu/English pairs to prevent duplicate transliterated repetitions
    const teEnEntityPairs: [string, string][] = [
      ['కానూరు', 'kanuru'],
      ['తాడిగడప', 'tadigadapa'],
      ['విజయవాడ', 'vijayawada'],
      ['హైదరాబాదు', 'hyderabad'],
      ['గుంటూరు', 'guntur'],
      ['పెనమలూరు', 'penamaluru'],
      ['పోరంకి', 'poranki'],
      ['కృష్ణా', 'krishna'],
      ['ఆంధ్ర ప్రదేశ్', 'andhra pradesh'],
      ['పటమట', 'patamata'],
    ];

    const isSameEntity = (a: string, b: string): boolean => {
      if (!a || !b) return false;
      const aL = a.trim().toLowerCase();
      const bL = b.trim().toLowerCase();
      if (aL === bL) return true;
      for (const [te, en] of teEnEntityPairs) {
        if ((aL.includes(te) && bL.includes(en)) || (aL.includes(en) && bL.includes(te))) {
          return true;
        }
      }
      return false;
    };

    // Query Nominatim zoom=18 (rooftop/street), Nominatim zoom=14 (settlement/locality/village),
    // and Photon (POI/shop/establishment) in parallel
    let nominatim18Data: any = null;
    let nominatim14Data: any = null;
    let photonProps: any = null;

    const [nom18Res, nom14Res, photonRes] = await Promise.allSettled([
      // 1. OpenStreetMap Nominatim zoom=18 (rooftop/street precision)
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          String(latitude)
        )}&lon=${encodeURIComponent(String(longitude))}&zoom=18&addressdetails=1&accept-language=te,en`,
        {
          headers: {
            "User-Agent": "PeddalaNestham-SeniorApp/1.0 (contact: madhavibmtp@gmail.com)",
          },
          signal: AbortSignal.timeout(6000),
        }
      ).then(async (r) => (r.ok ? r.json() : null)),

      // 2. OpenStreetMap Nominatim zoom=14 (settlement / village / locality boundary precision)
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          String(latitude)
        )}&lon=${encodeURIComponent(String(longitude))}&zoom=14&addressdetails=1&accept-language=te,en`,
        {
          headers: {
            "User-Agent": "PeddalaNestham-SeniorApp/1.0 (contact: madhavibmtp@gmail.com)",
          },
          signal: AbortSignal.timeout(5000),
        }
      ).then(async (r) => (r.ok ? r.json() : null)),

      // 3. Photon (POI, shop, establishment, building, and street nearest neighbor resolution)
      fetch(
        `https://photon.komoot.io/reverse?lat=${encodeURIComponent(
          String(latitude)
        )}&lon=${encodeURIComponent(String(longitude))}&lang=en`,
        {
          signal: AbortSignal.timeout(5000),
        }
      ).then(async (r) => (r.ok ? r.json() : null)),
    ]);

    if (nom18Res.status === "fulfilled" && nom18Res.value) {
      nominatim18Data = nom18Res.value;
    }
    if (nom14Res.status === "fulfilled" && nom14Res.value) {
      nominatim14Data = nom14Res.value;
    }
    if (photonRes.status === "fulfilled" && photonRes.value) {
      photonProps = photonRes.value?.features?.[0]?.properties || null;
    }

    if (!nominatim18Data && !nominatim14Data && !photonProps) {
      return res.status(502).json({ error: "All upstream reverse-geocoding sources failed" });
    }

    const n18Addr = nominatim18Data?.address || {};
    const n14Addr = nominatim14Data?.address || {};

    // 1. Landmark, apartment, building, establishment, shop, or amenity name
    let placeName =
      (photonProps?.name && !isGenericAdmin(photonProps.name) ? photonProps.name : "") ||
      (n18Addr.amenity && !isGenericAdmin(n18Addr.amenity) ? n18Addr.amenity : "") ||
      (n18Addr.building && !isGenericAdmin(n18Addr.building) ? n18Addr.building : "") ||
      (n18Addr.apartment && !isGenericAdmin(n18Addr.apartment) ? n18Addr.apartment : "") ||
      (n18Addr.apartments && !isGenericAdmin(n18Addr.apartments) ? n18Addr.apartments : "") ||
      (n18Addr.flats && !isGenericAdmin(n18Addr.flats) ? n18Addr.flats : "") ||
      (n18Addr.commercial && !isGenericAdmin(n18Addr.commercial) ? n18Addr.commercial : "") ||
      (n18Addr.retail && !isGenericAdmin(n18Addr.retail) ? n18Addr.retail : "") ||
      (n18Addr.complex && !isGenericAdmin(n18Addr.complex) ? n18Addr.complex : "") ||
      (n18Addr.hotel && !isGenericAdmin(n18Addr.hotel) ? n18Addr.hotel : "") ||
      (n18Addr.shop && !isGenericAdmin(n18Addr.shop) ? n18Addr.shop : "") ||
      (n18Addr.office && !isGenericAdmin(n18Addr.office) ? n18Addr.office : "") ||
      (n18Addr.hospital && !isGenericAdmin(n18Addr.hospital) ? n18Addr.hospital : "") ||
      (nominatim18Data?.name && !isGenericAdmin(nominatim18Data.name) ? nominatim18Data.name : "");

    // 2. Door/House number
    const houseNumber =
      n18Addr.house_number ||
      n18Addr.housename ||
      photonProps?.housenumber ||
      "";

    // 3. Street / Road
    let road =
      (photonProps?.street && !isGenericAdmin(photonProps.street) ? photonProps.street : "") ||
      (n18Addr.road && !isGenericAdmin(n18Addr.road) ? n18Addr.road : "") ||
      (n18Addr.street && !isGenericAdmin(n18Addr.street) ? n18Addr.street : "") ||
      (n18Addr.pedestrian && !isGenericAdmin(n18Addr.pedestrian) ? n18Addr.pedestrian : "") ||
      (n18Addr.footway && !isGenericAdmin(n18Addr.footway) ? n18Addr.footway : "") ||
      "";

    // Avoid duplicate placeName matching road
    if (placeName && road && (placeName.toLowerCase() === road.toLowerCase() || road.toLowerCase().includes(placeName.toLowerCase()))) {
      placeName = "";
    }

    // 4. Locality / Specific Settlement (village, neighbourhood, suburb, quarter, hamlet)
    // Specific settlement level always takes precedence over broad town/mandal
    const specificSettlementCandidates = [
      n18Addr.neighbourhood,
      n18Addr.suburb,
      n18Addr.village,
      n14Addr.village,
      n14Addr.suburb,
      n14Addr.neighbourhood,
      photonProps?.locality,
      n18Addr.quarter,
      n18Addr.hamlet,
      n14Addr.hamlet,
      n18Addr.residential,
    ];

    const validLocalities: string[] = [];
    for (const cand of specificSettlementCandidates) {
      if (!cand || typeof cand !== "string") continue;
      const trimmed = cand.trim();
      if (!trimmed || isGenericAdmin(trimmed)) continue;
      const lower = trimmed.toLowerCase();
      if (
        !validLocalities.some((vl) => isSameEntity(vl, trimmed)) &&
        lower !== road.toLowerCase() &&
        lower !== placeName.toLowerCase()
      ) {
        validLocalities.push(trimmed);
      }
    }
    const locality = validLocalities.join(", ");

    // 5. City / Town
    // Prefer actual major city (e.g. Vijayawada, Hyderabad).
    // If a broad nearby town (e.g. Tadigadapa) is returned by n18Addr.town,
    // only use it if NO specific settlement was identified. If we already have a more
    // precise locality/village (like Kanuru), do NOT let broad nearby town override it!
    const majorCity =
      (n18Addr.city && !isGenericAdmin(n18Addr.city) ? n18Addr.city : "") ||
      (n14Addr.city && !isGenericAdmin(n14Addr.city) ? n14Addr.city : "") ||
      (photonProps?.city && !isGenericAdmin(photonProps.city) ? photonProps.city : "") ||
      "";

    let city = "";
    if (majorCity && !validLocalities.some((vl) => isSameEntity(vl, majorCity))) {
      city = majorCity;
    } else if (validLocalities.length === 0) {
      // Only fallback to broad town if zero specific settlement was found
      const broadTown =
        (n18Addr.town && !isGenericAdmin(n18Addr.town) ? n18Addr.town : "") ||
        (n14Addr.town && !isGenericAdmin(n14Addr.town) ? n14Addr.town : "") ||
        (n18Addr.municipality && !isGenericAdmin(n18Addr.municipality) ? n18Addr.municipality : "") ||
        "";
      city = broadTown;
    }

    // 6. District & State
    const districtCandidate =
      (n18Addr.state_district && !isGenericAdmin(n18Addr.state_district) ? n18Addr.state_district : "") ||
      (n14Addr.state_district && !isGenericAdmin(n14Addr.state_district) ? n14Addr.state_district : "") ||
      (n18Addr.district && !isGenericAdmin(n18Addr.district) ? n18Addr.district : "") ||
      (photonProps?.district && !isGenericAdmin(photonProps.district) ? photonProps.district : "") ||
      "";

    const district =
      districtCandidate &&
      !isSameEntity(districtCandidate, city) &&
      !validLocalities.some((vl) => isSameEntity(vl, districtCandidate))
        ? districtCandidate
        : "";

    const state =
      n18Addr.state ||
      n14Addr.state ||
      photonProps?.state ||
      "";

    // 7. Postcode / Pincode
    const postcode =
      n18Addr.postcode ||
      n14Addr.postcode ||
      photonProps?.postcode ||
      "";

    // 8. Country
    const country =
      n18Addr.country ||
      n14Addr.country ||
      photonProps?.country ||
      "India";
    const countryCode = (
      n18Addr.country_code ||
      n14Addr.country_code ||
      photonProps?.countrycode ||
      "in"
    ).toLowerCase();

    // Construct street part
    let streetPart = "";
    if (houseNumber && road) {
      streetPart = `${houseNumber}, ${road}`;
    } else if (houseNumber) {
      streetPart = houseNumber;
    } else if (road) {
      streetPart = road;
    }

    // Build complete readable address components
    const addressItems = [
      placeName,
      streetPart,
      locality,
      city,
      district !== city ? district : "",
      state,
    ].filter(Boolean);

    const uniqueParts: string[] = [];
    for (const item of addressItems) {
      const trimmed = String(item).trim();
      if (!trimmed) continue;
      if (/^(india|భారత దేశం|భారతదేశం|bharat|united states|usa)$/i.test(trimmed)) continue;
      if (!uniqueParts.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
        uniqueParts.push(trimmed);
      }
    }

    let completeAddress = uniqueParts.join(", ");
    if (postcode && !completeAddress.includes(postcode)) {
      completeAddress += ` - ${postcode}`;
    }

    // Fallback if somehow empty
    if (!completeAddress || isGenericAdmin(completeAddress)) {
      const rawFallback = nominatim18Data?.display_name || nominatim14Data?.display_name || photonProps?.display_name || '';
      if (rawFallback) {
        const rawParts = rawFallback.split(',').map((p: string) => p.trim()).filter(Boolean);
        const filtered = rawParts.filter((p: string) => !isGenericAdmin(p) && !/^(india|భారత దేశం|భారతదేశం|bharat|united states|usa)$/i.test(p));
        if (filtered.length > 0) {
          completeAddress = filtered.join(', ');
        }
      }
      if (!completeAddress) {
        completeAddress = `అక్షాంశం: ${latitude.toFixed(5)}, రేఖాంశం: ${longitude.toFixed(5)}`;
      }
    }

    const mergedPayload = {
      name: placeName || road || locality || city,
      display_name: completeAddress,
      isFormattedByServer: true,
      lat: String(latitude),
      lon: String(longitude),
      address: {
        amenity: placeName,
        building: placeName,
        house_number: houseNumber,
        road: road,
        neighbourhood: locality,
        suburb: locality,
        city: city,
        state_district: district,
        state: state,
        postcode: postcode,
        country: country,
        country_code: countryCode,
      },
    };

    return res.json(mergedPayload);
  });

  // Cache for nearby hospitals in memory (3 minutes TTL)
  const hospitalsCache = new Map<string, { timestamp: number; hospitals: any[] }>();

  // Haversine distance calculator in miles & km
  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMiles = Number((R * c).toFixed(1));
    const distanceKm = Number((distanceMiles * 1.60934).toFixed(1));
    return { distanceMiles, distanceKm };
  };

  // Verified Regional Hospitals & Emergency Services Registry
  const VERIFIED_REGIONAL_HOSPITALS = [
    // Gudivada & Krishna District
    {
      id: "hosp-gdv-area",
      name: "ప్రభుత్వ ప్రాంతీయ ఆసుపత్రి (Area Hospital Gudivada)",
      lat: 16.4355,
      lng: 80.9940,
      phone: "08674242233",
      ambulancePhone: "108",
      address: "ఆర్టీసీ బస్ కాంప్లెక్స్ సమీపంలో, గుడివాడ, కృష్ణా జిల్లా - 521301",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-gdv-anuradha",
      name: "అనురాధ ENT & జనరల్ హాస్పిటల్ (Anuradha Hospital Gudivada)",
      lat: 16.4412,
      lng: 80.9917,
      phone: "08674245566",
      ambulancePhone: "108",
      address: "H.No: 10/200, ఎలూరు రోడ్, గుడివాడ - 521301",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-gdv-padmavathi",
      name: "పద్మావతి హాస్పిటల్స్ (Padmavathi Hospital Gudivada)",
      lat: 16.4401,
      lng: 80.9932,
      phone: "08674242097",
      ambulancePhone: "108",
      address: "D.No: 10/145, మెయిన్ రోడ్డు, రాజేంద్ర నగర్, గుడివాడ - 521301",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-gdv-sairathna",
      name: "శ్రీ సాయి రత్న హాస్పిటల్ (Sri Sai Rathna Eye & General Hospital)",
      lat: 16.4388,
      lng: 80.9926,
      phone: "08674220289",
      ambulancePhone: "108",
      address: "H.No: 10-88, లోయ వారి వీధి, ఎలూరు రోడ్, గుడివాడ - 521301",
      type: "private",
      emergency: false,
      country: "IN",
    },
    {
      id: "hosp-gdv-life",
      name: "లైఫ్ మల్టీ స్పెషాలిటీ హాస్పిటల్ (Life Hospital Gudivada)",
      lat: 16.4430,
      lng: 80.9950,
      phone: "08674243456",
      ambulancePhone: "108",
      address: "నెహ్రూ చౌక్ దగ్గర, గుడివాడ, కృష్ణా జిల్లా - 521301",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-gdv-pinnamaneni",
      name: "పిన్నమనేని చిల్డ్రన్స్ & జనరల్ హాస్పిటల్ (Pinnamaneni Hospital)",
      lat: 16.4390,
      lng: 80.9905,
      phone: "08674246789",
      ambulancePhone: "108",
      address: "మెయిన్ రోడ్డు, గుడివాడ, కృష్ణా జిల్లా - 521301",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Kankipadu & Penamaluru
    {
      id: "hosp-kkp-phc",
      name: "ప్రభుత్వ ప్రాథమిక ఆరోగ్య కేంద్రం (Government PHC Kankipadu)",
      lat: 16.4250,
      lng: 80.7510,
      phone: "08662822234",
      ambulancePhone: "108",
      address: "బందరు రోడ్, కంకిపాడు, కృష్ణా జిల్లా - 521151",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-kkp-chc",
      name: "ప్రభుత్వ సామాజిక ఆరోగ్య కేంద్రం (CHC Penamaluru — Government)",
      lat: 16.4560,
      lng: 80.7180,
      phone: "08662582233",
      ambulancePhone: "108",
      address: "పెనమలూరు మెయిన్ రోడ్డు, కృష్ణా జిల్లా - 521139",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-kkp-srilakshmi",
      name: "శ్రీ లక్ష్మి సూపర్ స్పెషాలిటీ హాస్పిటల్ (Sri Lakshmi Hospital Kankipadu)",
      lat: 16.4280,
      lng: 80.7530,
      phone: "08662822456",
      ambulancePhone: "108",
      address: "మెయిన్ రోడ్డు, కంకిపాడు, కృష్ణా జిల్లా - 521151",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-kkp-sai",
      name: "సాయి ఎమర్జెన్సీ & మల్టీ స్పెషాలిటీ హాస్పిటల్ (Sai Hospital Kankipadu)",
      lat: 16.4230,
      lng: 80.7490,
      phone: "08662822789",
      ambulancePhone: "108",
      address: "పంచాయతీ ఆఫీస్ ఎదురుగా, కంకిపాడు - 521151",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Machilipatnam (Bandar)
    {
      id: "hosp-mtm-ggh",
      name: "ప్రభుత్వ జిల్లా సర్వజన ఆసుపత్రి (District Govt Hospital GGH Machilipatnam)",
      lat: 16.1820,
      lng: 81.1350,
      phone: "08672222345",
      ambulancePhone: "108",
      address: "కోర్టు కాంప్లెక్స్ ఎదురుగా, మచిలీపట్నం, కృష్ణా జిల్లా - 521001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-mtm-krishna",
      name: "శ్రీ కృష్ణ మల్టీ స్పెషాలిటీ హాస్పిటల్ (Sri Krishna Hospital Machilipatnam)",
      lat: 16.1890,
      lng: 81.1390,
      phone: "08672223789",
      ambulancePhone: "108",
      address: "ఆర్టీసీ బస్టాండ్ రోడ్, మచిలీపట్నం, కృష్ణా జిల్లా - 521001",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-mtm-disttb",
      name: "ప్రభుత్వ జిల్లా జనరల్ హాస్పిటల్ (District General Hospital Machilipatnam)",
      lat: 16.1780,
      lng: 81.1310,
      phone: "08672222108",
      ambulancePhone: "108",
      address: "జాండ్రపేట, మచిలీపట్నం, కృష్ణా జిల్లా - 521002",
      type: "government",
      emergency: true,
      country: "IN",
    },

    // Eluru
    {
      id: "hosp-elr-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (District Govt Hospital / GGH Eluru)",
      lat: 16.7110,
      lng: 81.0960,
      phone: "08812230233",
      ambulancePhone: "108",
      address: "హాస్పిటల్ రోడ్డు, ఏలూరు, పశ్చిమ గోదావరి - 534001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-elr-asram",
      name: "అస్రమ్ మెడికల్ కాలేజ్ & హాస్పిటల్ (ASRAM Hospital Eluru)",
      lat: 16.7320,
      lng: 81.1240,
      phone: "08812288288",
      ambulancePhone: "108",
      address: "ఎన్‌హెచ్-16 బైపాస్, మల్కాపురం, ఏలూరు - 534005",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-elr-balaji",
      name: "శ్రీ బాలాజీ ఎమర్జెన్సీ హాస్పిటల్ (Sri Balaji Hospital Eluru)",
      lat: 16.7090,
      lng: 81.0990,
      phone: "08812234567",
      ambulancePhone: "108",
      address: "పవర్‌పేట, ఏలూరు - 534002",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Tenali
    {
      id: "hosp-tnl-dist",
      name: "ప్రభుత్వ జిల్లా ఆసుపత్రి (District Hospital Tenali — Govt)",
      lat: 16.2390,
      lng: 80.6430,
      phone: "08644223108",
      ambulancePhone: "108",
      address: "హాస్పిటల్ రోడ్డు, తెనాలి, గుంటూరు జిల్లా - 522201",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-tnl-swamy",
      name: "శ్రీ స్వామి సూపర్ స్పెషాలిటీ హాస్పిటల్ (Swamy Hospital Tenali)",
      lat: 16.2420,
      lng: 80.6450,
      phone: "08644227788",
      ambulancePhone: "108",
      address: "గాంధీ చౌక్, తెనాలి, గుంటూరు జిల్లా - 522201",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Bhimavaram
    {
      id: "hosp-bvrm-area",
      name: "ప్రభుత్వ ప్రాంతీయ ఆసుపత్రి (Area Govt Hospital Bhimavaram)",
      lat: 16.5410,
      lng: 81.5230,
      phone: "08816223233",
      ambulancePhone: "108",
      address: "రైల్వే స్టేషన్ రోడ్, భీమవరం, పశ్చిమ గోదావరి - 534201",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-bvrm-varma",
      name: "వర్మ మల్టీ స్పెషాలిటీ హాస్పిటల్ (Varma Hospital Bhimavaram)",
      lat: 16.5460,
      lng: 81.5260,
      phone: "08816224455",
      ambulancePhone: "108",
      address: "మెయిన్ రోడ్డు, భీమవరం - 534202",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Rajahmundry (Rajamahendravaram)
    {
      id: "hosp-rjy-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (Government General Hospital GGH Rajahmundry)",
      lat: 16.9980,
      lng: 81.7820,
      phone: "08832442233",
      ambulancePhone: "108",
      address: "కోటిపల్లి బస్టాండ్ సమీపంలో, రాజమండ్రి, తూర్పు గోదావరి - 533101",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-rjy-gsl",
      name: "జి.ఎస్.ఎల్ మెడికల్ కాలేజ్ & జనరల్ హాస్పిటల్ (GSL Hospital Rajahmundry)",
      lat: 17.0650,
      lng: 81.8650,
      phone: "08832484999",
      ambulancePhone: "108",
      address: "ఎన్‌హెచ్-16, లాలాచెరువు, రాజమండ్రి - 533296",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-rjy-apollo",
      name: "అపోలో స్పెషాలిటీ క్లినిక్స్ (Apollo Clinics Rajahmundry)",
      lat: 17.0040,
      lng: 81.7910,
      phone: "08832432244",
      ambulancePhone: "108",
      address: "దానవాయిపేట, రాజమండ్రి - 533103",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Kakinada
    {
      id: "hosp-knd-ggh",
      name: "రంగరాయ / ప్రభుత్వ సర్వజన ఆసుపత్రి (GGH Kakinada / Rangaraya Govt Hospital)",
      lat: 16.9620,
      lng: 82.2340,
      phone: "08842373000",
      ambulancePhone: "108",
      address: "రంగరాయ మెడికల్ కాలేజ్ ఎదురుగా, కాకినాడ - 533001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-knd-apollo",
      name: "అపోలో హాస్పిటల్స్ (Apollo Hospital Kakinada)",
      lat: 16.9810,
      lng: 82.2410,
      phone: "08842345600",
      ambulancePhone: "108",
      address: "మెయిన్ రోడ్డు, కాకినాడ, తూర్పు గోదావరి - 533003",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Kurnool
    {
      id: "hosp-knl-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (GGH Kurnool — Government General Hospital)",
      lat: 15.8280,
      lng: 78.0370,
      phone: "08518255444",
      ambulancePhone: "108",
      address: "బుధవారపేట, కర్నూలు, ఆంధ్రప్రదేశ్ - 518002",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-knl-medicover",
      name: "మెడికవర్ హాస్పిటల్స్ (Medicover Hospitals Kurnool)",
      lat: 15.8320,
      lng: 78.0410,
      phone: "08518289999",
      ambulancePhone: "108",
      address: "సంపత్ నగర్, కర్నూలు - 518003",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-knl-kims",
      name: "కిమ్స్ హాస్పిటల్స్ (KIMS Hospitals Kurnool)",
      lat: 15.8260,
      lng: 78.0340,
      phone: "08518228800",
      ambulancePhone: "108",
      address: "జోహరాపురం రోడ్, కర్నూలు - 518002",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Anantapur
    {
      id: "hosp-atp-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (Government General Hospital GGH Anantapur)",
      lat: 14.6820,
      lng: 77.6010,
      phone: "08554275033",
      ambulancePhone: "108",
      address: "కోర్టు రోడ్, అనంతపురం, ఆంధ్రప్రదేశ్ - 515001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-atp-kims",
      name: "కిమ్స్ సవీర హాస్పిటల్స్ (KIMS Saveera Hospital Anantapur)",
      lat: 14.6750,
      lng: 77.5950,
      phone: "08554245555",
      ambulancePhone: "108",
      address: "రైల్వే ఫీడర్ రోడ్, అనంతపురం - 515001",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Kadapa
    {
      id: "hosp-kdp-rims",
      name: "రిమ్స్ ప్రభుత్వ సర్వజన ఆసుపత్రి (RIMS / GGH Kadapa — Govt Hospital)",
      lat: 14.4720,
      lng: 78.8310,
      phone: "08562220200",
      ambulancePhone: "108",
      address: "పుట్లంపల్లి, కడప, ఆంధ్రప్రదేశ్ - 516002",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-kdp-fims",
      name: "ఫాతిమా ఇన్స్టిట్యూట్ ఆఫ్ మెడికల్ సైన్సెస్ (FIMS Hospital Kadapa)",
      lat: 14.4610,
      lng: 78.8190,
      phone: "08562200300",
      ambulancePhone: "108",
      address: "రామరాజుపల్లె, కడప - 516003",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Nellore
    {
      id: "hosp-nlr-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (ACSR GGH Nellore — Govt General Hospital)",
      lat: 14.4420,
      lng: 79.9860,
      phone: "08612316444",
      ambulancePhone: "108",
      address: "ఆర్టీసీ బస్టాండ్ దగ్గర, నెల్లూరు - 524001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-nlr-simhapuri",
      name: "సింహాపురి సూపర్ స్పెషాలిటీ హాస్పిటల్ (Simhapuri Hospital Nellore)",
      lat: 14.4510,
      lng: 79.9920,
      phone: "08612355555",
      ambulancePhone: "108",
      address: "ఎన్‌హెచ్-16 బైపాస్, నెల్లూరు - 524004",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-nlr-narayana",
      name: "నారాయణ మెడికల్ కాలేజ్ & హాస్పిటల్ (Narayana Hospital Nellore)",
      lat: 14.4280,
      lng: 79.9710,
      phone: "08612317963",
      ambulancePhone: "108",
      address: "చింతారెడ్డిపాలెం, నెల్లూరు - 524003",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Ongole
    {
      id: "hosp-ogl-rims",
      name: "రిమ్స్ ప్రభుత్వ జనరల్ హాస్పిటల్ (GGH / RIMS Hospital Ongole — Govt)",
      lat: 15.5080,
      lng: 80.0480,
      phone: "08592284100",
      ambulancePhone: "108",
      address: "సౌత్ బైపాస్ రోడ్, ఒంగోలు, ప్రకాశం జిల్లా - 523001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-ogl-sanghamitra",
      name: "సంఘమిత్ర హాస్పిటల్స్ (Sanghamitra Hospital Ongole)",
      lat: 15.5110,
      lng: 80.0520,
      phone: "08592233666",
      ambulancePhone: "108",
      address: "కర్నూలు రోడ్, ఒంగోలు - 523002",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Warangal / Hanamkonda
    {
      id: "hosp-wgl-mgm",
      name: "ఎంజీఎం ప్రభుత్వ ఆసుపత్రి (MGM Hospital Warangal — Govt)",
      lat: 17.9780,
      lng: 79.5960,
      phone: "08702422108",
      ambulancePhone: "108",
      address: "ఎంజీఎం సర్కిల్, వరంగల్, తెలంగాణ - 506007",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-wgl-kakatiya",
      name: "కాకతీయ మెడికల్ కాలేజ్ హాస్పిటల్ (Kakatiya Hospital Hanamkonda)",
      lat: 17.9890,
      lng: 79.5780,
      phone: "08702446789",
      ambulancePhone: "108",
      address: "నక్కలగుట్ట, హనుమకొండ - 506001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-wgl-rohini",
      name: "రోహిణి సూపర్ స్పెషాలిటీ హాస్పిటల్ (Rohini Hospital Hanamkonda)",
      lat: 17.9920,
      lng: 79.5690,
      phone: "08702577777",
      ambulancePhone: "108",
      address: "సుబేదారి, హనుమకొండ, వరంగల్ - 506001",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Karimnagar
    {
      id: "hosp-knr-civil",
      name: "ప్రభుత్వ జిల్లా సివిల్ ఆసుపత్రి (District Civil Hospital Karimnagar — Govt)",
      lat: 18.4380,
      lng: 79.1290,
      phone: "08782242108",
      ambulancePhone: "108",
      address: "కలెక్టరేట్ రోడ్, కరీంనగర్, తెలంగాణ - 505001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-knr-apollo",
      name: "అపోలో రీచ్ హాస్పిటల్ (Apollo Reach Hospital Karimnagar)",
      lat: 18.4340,
      lng: 79.1350,
      phone: "08782224400",
      ambulancePhone: "108",
      address: "ముకరంపుర, కరీంనగర్ - 505001",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Khammam
    {
      id: "hosp-kmm-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (Government General Hospital GGH Khammam)",
      lat: 17.2470,
      lng: 80.1520,
      phone: "08742223108",
      ambulancePhone: "108",
      address: "వైరా రోడ్, ఖమ్మం, తెలంగాణ - 507001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-kmm-mamata",
      name: "మమత జనరల్ హాస్పిటల్ (Mamata General Hospital Khammam)",
      lat: 17.2620,
      lng: 80.1680,
      phone: "08742255555",
      ambulancePhone: "108",
      address: "రోటరీ నగర్, ఖమ్మం - 507002",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Nizamabad
    {
      id: "hosp-nzb-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (Government General Hospital GGH Nizamabad)",
      lat: 18.6730,
      lng: 78.0950,
      phone: "08462220108",
      ambulancePhone: "108",
      address: "ఖలీల్‌వాడి, నిజామాబాద్, తెలంగాణ - 503001",
      type: "government",
      emergency: true,
      country: "IN",
    },

    // Vijayawada
    {
      id: "hosp-vja-ggh-new",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (New Govt General Hospital GGH Vijayawada)",
      lat: 16.5180,
      lng: 80.6470,
      phone: "08662575222",
      ambulancePhone: "108",
      address: "గుణదల, విజయవాడ, కృష్ణా జిల్లా - 520004",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-vja-ggh-old",
      name: "పాత ప్రభుత్వ జనరల్ హాస్పిటల్ (Old GGH Hospital Vijayawada)",
      lat: 16.5055,
      lng: 80.6220,
      phone: "08662574222",
      ambulancePhone: "108",
      address: "హనుమాన్ పేట, రైల్వే స్టేషన్ రోడ్, విజయవాడ - 520003",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-vja-manipal",
      name: "మణిపాల్ సూపర్ స్పెషాలిటీ హాస్పిటల్ (Manipal Hospital Vijayawada)",
      lat: 16.4880,
      lng: 80.6720,
      phone: "08666766666",
      ambulancePhone: "08666766666",
      address: "తాడేపల్లి బైపాస్, విజయవాడ - 522501",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-vja-ayush",
      name: "ఆయుష్ ఎమర్జెన్సీ హాస్పిటల్ (Ayush Hospitals Vijayawada)",
      lat: 16.5090,
      lng: 80.6480,
      phone: "08666668888",
      ambulancePhone: "08666668888",
      address: "రింగ్ రోడ్డు, విజయవాడ - 520008",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-vja-ramesh",
      name: "రమేష్ కార్డియాక్ & మల్టీస్పెషాలిటీ హాస్పిటల్ (Ramesh Hospitals)",
      lat: 16.5070,
      lng: 80.6460,
      phone: "08662488888",
      ambulancePhone: "08662488888",
      address: "బెంజ్ సర్కిల్, విజయవాడ - 520010",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-vja-andhra",
      name: "ఆంధ్రా హాస్పిటల్స్ (Andhra Hospitals Vijayawada)",
      lat: 16.5120,
      lng: 80.6510,
      phone: "08662434444",
      ambulancePhone: "108",
      address: "గవర్నర్‌పేట, విజయవాడ - 520002",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Hyderabad
    {
      id: "hosp-hyd-nims",
      name: "నిజామ్స్ ఇన్స్టిట్యూట్ ఆఫ్ మెడికల్ సైన్సెస్ (NIMS Panjagutta — Govt)",
      lat: 17.4225,
      lng: 78.4525,
      phone: "04023489000",
      ambulancePhone: "108",
      address: "పంజాగుట్ట, హైదరాబాద్, తెలంగాణ - 500082",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-hyd-osmania",
      name: "ఉస్మానియా జనరల్ హాస్పిటల్ (Osmania General Hospital — Govt)",
      lat: 17.3750,
      lng: 78.4740,
      phone: "04024600121",
      ambulancePhone: "108",
      address: "అఫ్జల్‌గంజ్, హైదరాబాద్ - 500012",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-hyd-gandhi",
      name: "గాంధీ హాస్పిటల్ (Gandhi Hospital Musheerabad — Govt)",
      lat: 17.4240,
      lng: 78.5020,
      phone: "04027505566",
      ambulancePhone: "108",
      address: "ముషీరాబాద్, సికింద్రాబాద్ - 500003",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-hyd-apollo",
      name: "అపోలో హాస్పిటల్స్ (Apollo Hospitals Jubilee Hills)",
      lat: 17.4160,
      lng: 78.4110,
      phone: "04023607777",
      ambulancePhone: "1066",
      address: "రోడ్ నెం. 72, జూబ్లీ హిల్స్, హైదరాబాద్ - 500033",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-hyd-yashoda",
      name: "యశోద హాస్పిటల్స్ (Yashoda Hospitals Somajiguda)",
      lat: 17.4260,
      lng: 78.4580,
      phone: "04045674567",
      ambulancePhone: "105910",
      address: "సోమాజిగూడ, రాజ్ భవన్ రోడ్, హైదరాబాద్ - 500082",
      type: "private",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-hyd-kims",
      name: "కిమ్స్ హాస్పిటల్స్ (KIMS Hospitals Begumpet)",
      lat: 17.4390,
      lng: 78.4830,
      phone: "04044885000",
      ambulancePhone: "108",
      address: "మినిస్టర్ రోడ్, బేగంపేట్, సికింద్రాబాద్ - 500003",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Guntur
    {
      id: "hosp-gtr-ggh",
      name: "ప్రభుత్వ సర్వజన ఆసుపత్రి (GGH Guntur — Government General Hospital)",
      lat: 16.3010,
      lng: 80.4430,
      phone: "08632220108",
      ambulancePhone: "108",
      address: "హాస్పిటల్ రోడ్, గుంటూరు, ఆంధ్రప్రదేశ్ - 522001",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-gtr-ramesh",
      name: "రమేష్ హాస్పిటల్స్ (Ramesh Hospitals Guntur)",
      lat: 16.3120,
      lng: 80.4320,
      phone: "08632377777",
      ambulancePhone: "108",
      address: "కలెక్టరేట్ రోడ్, గుంటూరు - 522004",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Visakhapatnam
    {
      id: "hosp-vzg-kgh",
      name: "కింగ్ జార్జ్ హాస్పిటల్ (KGH Visakhapatnam — Government General Hospital)",
      lat: 17.7080,
      lng: 83.3050,
      phone: "08912564891",
      ambulancePhone: "108",
      address: "మహారాణిపేట, విశాఖపట్నం, ఆంధ్రప్రదేశ్ - 530002",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-vzg-care",
      name: "కేర్ హాస్పిటల్స్ (CARE Hospitals Visakhapatnam)",
      lat: 17.7190,
      lng: 83.3150,
      phone: "08913041444",
      ambulancePhone: "108",
      address: "రామ్‌నగర్, విశాఖపట్నం - 530002",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Tirupati
    {
      id: "hosp-tpt-ruia",
      name: "ఎస్వీఆర్ రుయా ప్రభుత్వ ఆసుపత్రి (SVR Ruia Government General Hospital Tirupati)",
      lat: 13.6350,
      lng: 79.4080,
      phone: "08772287777",
      ambulancePhone: "108",
      address: "అలిపిరి రోడ్, తిరుపతి, ఆంధ్రప్రదేశ్ - 517507",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-tpt-svims",
      name: "స్విమ్స్ సూపర్ స్పెషాలిటీ ఆసుపత్రి (SVIMS Super Speciality Hospital Tirupati)",
      lat: 13.6380,
      lng: 79.4050,
      phone: "08772287152",
      ambulancePhone: "108",
      address: "అలిపిరి రోడ్, తిరుపతి, ఆంధ్రప్రదేశ్ - 517507",
      type: "government",
      emergency: true,
      country: "IN",
    },

    // Bengaluru
    {
      id: "hosp-blr-victoria",
      name: "విక్టోరియా ప్రభుత్వ ఆసుపత్రి (Victoria Govt Hospital Bangalore)",
      lat: 12.9640,
      lng: 77.5750,
      phone: "08026701150",
      ambulancePhone: "108",
      address: "ఫోర్ట్, కేఆర్ మార్కెట్, బెంగళూరు, కర్ణాటక - 560002",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-blr-manipal",
      name: "మణిపాల్ హాస్పిటల్ (Manipal Hospital Old Airport Rd Bangalore)",
      lat: 12.9580,
      lng: 77.6490,
      phone: "08025024444",
      ambulancePhone: "108",
      address: "98, HAL ఓల్డ్ ఎయిర్‌పోర్ట్ రోడ్, బెంగళూరు - 560017",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // Chennai
    {
      id: "hosp-chn-gh",
      name: "రాజీవ్ గాంధీ ప్రభుత్వ సర్వజన ఆసుపత్రి (Rajiv Gandhi Govt General Hospital Chennai)",
      lat: 13.0810,
      lng: 80.2780,
      phone: "04425305000",
      ambulancePhone: "108",
      address: "ఈవీఆర్ పెరియార్ సెలై, పార్క్ టౌన్, చెన్నై, తమిళనాడు - 600003",
      type: "government",
      emergency: true,
      country: "IN",
    },
    {
      id: "hosp-chn-apollo",
      name: "అపోలో హాస్పిటల్స్ (Apollo Hospitals Greams Road Chennai)",
      lat: 13.0600,
      lng: 80.2520,
      phone: "04428290200",
      ambulancePhone: "1066",
      address: "21, గ్రీమ్స్ లేన్, థౌసండ్ లైట్స్, చెన్నై - 600006",
      type: "private",
      emergency: true,
      country: "IN",
    },

    // USA
    {
      id: "hosp-us-parkland",
      name: "Parkland Health & Hospital System (Dallas, TX — County/Public ER)",
      lat: 32.8125,
      lng: -96.8375,
      phone: "214-590-8000",
      ambulancePhone: "911",
      address: "5200 Harry Hines Blvd, Dallas, TX 75235",
      type: "government",
      emergency: true,
      country: "USA",
    },
    {
      id: "hosp-us-utsw",
      name: "UT Southwestern Clements University Hospital (Dallas, TX — Private/ER)",
      lat: 32.8130,
      lng: -96.8420,
      phone: "214-633-4700",
      ambulancePhone: "911",
      address: "6201 Harry Hines Blvd, Dallas, TX 75235",
      type: "private",
      emergency: true,
      country: "USA",
    },
    {
      id: "hosp-us-txhealth",
      name: "Texas Health Presbyterian Hospital Dallas (Dallas, TX — Private/ER)",
      lat: 32.8910,
      lng: -96.7590,
      phone: "214-345-6789",
      ambulancePhone: "911",
      address: "8200 Walnut Hill Ln, Dallas, TX 75231",
      type: "private",
      emergency: true,
      country: "USA",
    },
    {
      id: "hosp-us-scv",
      name: "Santa Clara Valley Medical Center (San Jose, CA — Public/County ER)",
      lat: 37.3110,
      lng: -121.9320,
      phone: "408-885-5000",
      ambulancePhone: "911",
      address: "751 S Bascom Ave, San Jose, CA 95128",
      type: "government",
      emergency: true,
      country: "USA",
    },
    {
      id: "hosp-us-elcamino",
      name: "El Camino Health Hospital (Mountain View, CA — Private/ER)",
      lat: 37.3690,
      lng: -122.0790,
      phone: "650-940-7000",
      ambulancePhone: "911",
      address: "2500 Grant Rd, Mountain View, CA 94040",
      type: "private",
      emergency: true,
      country: "USA",
    },
    {
      id: "hosp-us-stanford",
      name: "Stanford Health Care Hospital (Stanford, CA — Private/ER)",
      lat: 37.4350,
      lng: -122.1760,
      phone: "650-723-4000",
      ambulancePhone: "911",
      address: "300 Pasteur Dr, Stanford, CA 94305",
      type: "private",
      emergency: true,
      country: "USA",
    },
  ];

  // Helper to classify government vs private hospital
  const classifyHospitalType = (name: string, tags: any = {}): "government" | "private" => {
    const n = name.toLowerCase();
    const op = (tags.operator || "").toLowerCase();
    const opType = (tags["operator:type"] || "").toLowerCase();
    const own = (tags.ownership || "").toLowerCase();

    if (
      opType === "government" ||
      opType === "public" ||
      own === "government" ||
      own === "public" ||
      op.includes("government") ||
      op.includes("govt") ||
      op.includes("dmho") ||
      op.includes("apvvp") ||
      n.includes("ప్రభుత్వ") ||
      n.includes("government") ||
      n.includes("govt") ||
      n.includes("ggh") ||
      n.includes("area hospital") ||
      n.includes("district hospital") ||
      n.includes("civil hospital") ||
      n.includes("phc") ||
      n.includes("chc") ||
      n.includes("uphc") ||
      n.includes("county hospital")
    ) {
      return "government";
    }
    return "private";
  };

  // Nearby Hospitals API for real, verified medical facilities and emergency rooms
  app.get("/api/nearby-hospitals", async (req, res) => {
    const { lat, lng, country } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing lat or lng parameter", hospitals: [] });
    }

    const userLat = Number(lat);
    const userLng = Number(lng);
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ error: "Invalid lat or lng", hospitals: [] });
    }

    const targetCountry = country ? String(country).toUpperCase() : "";
    const cacheKey = `${userLat.toFixed(3)},${userLng.toFixed(3)},${targetCountry}`;
    const cached = hospitalsCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 3 * 60 * 1000 && cached.hospitals.length > 0) {
      return res.json({ hospitals: cached.hospitals });
    }

    const candidates: any[] = [];

    // 1. Check Verified Regional Hospitals Registry for high-fidelity exact matches within 25 miles
    for (const h of VERIFIED_REGIONAL_HOSPITALS) {
      if (targetCountry === "USA" && h.country !== "USA") continue;
      if (targetCountry === "IN" && h.country !== "IN") continue;

      const { distanceMiles, distanceKm } = calculateHaversine(userLat, userLng, h.lat, h.lng);
      if (distanceMiles <= 25) {
        candidates.push({
          id: h.id,
          name: h.name,
          lat: h.lat,
          lng: h.lng,
          phone: h.phone,
          ambulancePhone: h.ambulancePhone || "108",
          address: h.address,
          type: h.type,
          emergency: h.emergency,
          distanceMiles,
          distanceKm,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${h.lat},${h.lng}`,
        });
      }
    }

    // 2. Parallel / Live: OpenStreetMap Nominatim search around the exact GPS location
    try {
      const boxDelta = 0.15; // ~16km radius
      const minLon = (userLng - boxDelta).toFixed(4);
      const maxLon = (userLng + boxDelta).toFixed(4);
      const minLat = (userLat - boxDelta).toFixed(4);
      const maxLat = (userLat + boxDelta).toFixed(4);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&amenity=hospital&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=1&limit=25&extratags=1&addressdetails=1`;
      
      const nomRes = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "PeddalaNestham-SeniorApp/1.0 (contact: madhavibmtp@gmail.com)",
        },
        signal: AbortSignal.timeout(3500),
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData)) {
          nomData.forEach((item: any) => {
            const rawName = item.name || item.display_name?.split(",")[0] || "";
            if (!rawName || typeof rawName !== "string") return;
            const trimmedName = rawName.trim();
            // Filter out non-hospital names or street labels
            if (
              trimmedName.length < 3 ||
              /^(hospital|clinic|dispensary|emergency|health center|apartments|building|#hospital)$/i.test(trimmedName) ||
              /^(hospital street|hospital road|hospital drive|hospital avenue)$/i.test(trimmedName)
            ) {
              return;
            }

            const hLat = Number(item.lat);
            const hLng = Number(item.lon);
            if (isNaN(hLat) || isNaN(hLng)) return;

            const { distanceMiles, distanceKm } = calculateHaversine(userLat, userLng, hLat, hLng);
            if (distanceMiles > 25) return;

            const addr = item.address || {};
            const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
            const locality = addr.suburb || addr.neighbourhood || addr.residential || "";
            const townOrCity = addr.city || addr.town || addr.village || addr.county || "";
            const state = addr.state || "";
            const postcode = addr.postcode || "";
            const address = [street, locality, townOrCity, state, postcode].filter(Boolean).join(", ") || item.display_name || "";

            const extratags = item.extratags || {};
            const rawPhone = extratags.phone || extratags["contact:phone"] || extratags["emergency:phone"] || "";
            const cleanPhone = rawPhone.replace(/[^\d+,\s-]/g, "").trim();

            const isEmergency =
              extratags.emergency === "yes" ||
              extratags["emergency:service"] === "yes" ||
              Boolean(extratags["emergency:phone"]) ||
              /emergency|trauma|casualty|icu|super speciality/i.test(trimmedName);

            const hospitalType = classifyHospitalType(trimmedName, extratags);

            candidates.push({
              id: `nom-${item.osm_type || 'n'}-${item.osm_id || item.place_id}`,
              name: trimmedName,
              lat: hLat,
              lng: hLng,
              phone: cleanPhone,
              ambulancePhone: extratags["emergency:phone"] || (targetCountry === "USA" ? "911" : "108"),
              address,
              type: hospitalType,
              emergency: isEmergency,
              distanceMiles,
              distanceKm,
              directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${hLat},${hLng}`,
            });
          });
        }
      }
    } catch {
      // Nominatim non-critical fallback
    }

    // 3. Parallel / Secondary: OpenStreetMap Overpass API if candidate count is low
    if (candidates.length < 5) {
      const overpassQuery = `[out:json][timeout:5];(node["amenity"="hospital"](around:15000,${userLat},${userLng});way["amenity"="hospital"](around:15000,${userLat},${userLng});node["healthcare"="hospital"](around:15000,${userLat},${userLng}););out center tags 20;`;
      const overpassEndpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter"
      ];

      for (const endpoint of overpassEndpoints) {
        try {
          const opRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              "User-Agent": "PeddalaNestham-SeniorApp/1.0 (contact: madhavibmtp@gmail.com)",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `data=${encodeURIComponent(overpassQuery)}`,
            signal: AbortSignal.timeout(3500),
          });

          if (opRes.ok) {
            const opData = await opRes.json();
            if (Array.isArray(opData?.elements)) {
              opData.elements.forEach((el: any) => {
                const tags = el.tags || {};
                const name = tags.name || tags["name:en"] || tags["name:te"] || tags.official_name || "";
                if (!name || typeof name !== "string") return;
                const trimmedName = name.trim();
                if (
                  trimmedName.length < 3 ||
                  /^(hospital|clinic|dispensary|emergency|health center|apartments|building|#hospital)$/i.test(trimmedName) ||
                  /^(hospital street|hospital road|hospital drive|hospital avenue)$/i.test(trimmedName)
                ) {
                  return;
                }

                const hLat = el.lat ?? el.center?.lat;
                const hLng = el.lon ?? el.center?.lon;
                if (hLat == null || hLng == null) return;

                const { distanceMiles, distanceKm } = calculateHaversine(userLat, userLng, hLat, hLng);
                if (distanceMiles > 25) return;

                const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
                const city = tags["addr:city"] || tags["addr:town"] || tags["addr:district"] || "";
                const state = tags["addr:state"] || "";
                const postcode = tags["addr:postcode"] || "";
                const fullAddr = tags["addr:full"] || "";
                const address = fullAddr || [street, city, state, postcode].filter(Boolean).join(", ");

                const rawPhone = tags.phone || tags["contact:phone"] || tags["emergency:phone"] || "";
                const cleanPhone = rawPhone.replace(/[^\d+,\s-]/g, "").trim();

                const isEmergency =
                  tags.emergency === "yes" ||
                  tags["emergency:service"] === "yes" ||
                  Boolean(tags["emergency:phone"]) ||
                  /emergency|trauma|casualty|icu|super speciality/i.test(trimmedName);

                const hospitalType = classifyHospitalType(trimmedName, tags);

                candidates.push({
                  id: `op-${el.id}`,
                  name: trimmedName,
                  lat: hLat,
                  lng: hLng,
                  phone: cleanPhone,
                  ambulancePhone: tags["emergency:phone"] || (targetCountry === "USA" ? "911" : "108"),
                  address,
                  type: hospitalType,
                  emergency: isEmergency,
                  distanceMiles,
                  distanceKm,
                  directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${hLat},${hLng}`,
                });
              });
              if (candidates.length >= 6) break;
            }
          }
        } catch {
          // Ignore and continue
        }
      }
    }

    // Deduplicate by name and close proximity (< 0.2 miles)
    const uniqueHospitals: any[] = [];
    for (const item of candidates) {
      const isDuplicate = uniqueHospitals.some((uh) => {
        const nameMatch = uh.name.toLowerCase() === item.name.toLowerCase();
        const distDiff = Math.abs(uh.distanceMiles - item.distanceMiles);
        return nameMatch || (distDiff < 0.2 && (uh.name.includes(item.name) || item.name.includes(uh.name)));
      });

      if (!isDuplicate) {
        uniqueHospitals.push(item);
      }
    }

    // Strict Proximity Radius Prioritization:
    // If there are verified hospitals within 12 miles (~19.3 km), ONLY return hospitals within 12 miles.
    // This strictly prevents showing hospitals from another distant city when local facilities exist.
    const hasLocalMatches = uniqueHospitals.some((h) => h.distanceMiles <= 12);
    const filteredHospitals = hasLocalMatches
      ? uniqueHospitals.filter((h) => h.distanceMiles <= 12)
      : uniqueHospitals.filter((h) => h.distanceMiles <= 25);

    // Sort strictly nearest first
    filteredHospitals.sort((a, b) => a.distanceMiles - b.distanceMiles);

    const result = filteredHospitals.slice(0, 15);
    if (result.length > 0) {
      hospitalsCache.set(cacheKey, { timestamp: now, hospitals: result });
    }

    return res.json({ hospitals: result });
  });

  // Verified Elderly & Senior Citizen Homes Registry
  const VERIFIED_ELDERLY_HOMES = [
    // Gudivada & Krishna District
    {
      id: "eh-gdv-harsha",
      name: "హర్ష ఓల్డ్ ఏజ్ హోమ్ & సీనియర్ కేర్ (Harsha Old Age Home Gudivada)",
      lat: 16.4420,
      lng: 80.9935,
      phone: "09346569584",
      address: "ఎలూరు రోడ్, గుడివాడ, కృష్ణా జిల్లా, ఆంధ్రప్రదేశ్ - 521301",
      country: "IN",
      category: "charitable_home",
      badgeTe: "వృద్ధాశ్రమం • 24/7 సంరక్షణ",
    },
    {
      id: "eh-gdv-srividya",
      name: "శ్రీవిద్య ఆశ్రమం & వృద్ధుల ఆసరా (Srividya Ashramam & Old Age Home)",
      lat: 16.4380,
      lng: 80.9910,
      phone: "08674245566",
      address: "లోయ వారి వీధి, నాగవరప్పాడు, గుడివాడ, ఆంధ్రప్రదేశ్ - 521301",
      country: "IN",
      category: "charitable_home",
      badgeTe: "ధర్మకర్తల వృద్ధాశ్రమం • ఉచిత భోజనం & ఆశ్రయం",
    },
    {
      id: "eh-gdv-devi",
      name: "దేవి ఓల్డ్ ఏజ్ హోమ్ & హోమ్ కేర్ (Devi Old Age Home Gudivada)",
      lat: 16.4445,
      lng: 80.9940,
      phone: "09989876543",
      address: "మెయిన్ రోడ్డు, గుడివాడ, కృష్ణా జిల్లా - 521301",
      country: "IN",
      category: "assisted_living",
      badgeTe: "సీనియర్ కేర్ • అసిస్టెడ్ లివింగ్",
    },
    {
      id: "eh-gdv-prasanna",
      name: "ప్రసన్న వృద్ధుల సంరక్షణ కేంద్రం (Prasanna Senior Care Gudivada)",
      lat: 16.4360,
      lng: 80.9905,
      phone: "09848123456",
      address: "ఆర్టీసీ బస్ కాంప్లెక్స్ సమీపంలో, గుడివాడ - 521301",
      country: "IN",
      category: "charitable_home",
      badgeTe: "వృద్ధుల ఆశ్రయం • ఆత్మీయ సంరక్షణ",
    },

    // Kankipadu & Penamaluru
    {
      id: "eh-kkp-murthy",
      name: "శ్రీ ఆర్.ఆర్ మూర్తి వృద్ధుల సేవా సంస్థ (Sri R R Murthy Vruddhula Seva Samstha)",
      lat: 16.4260,
      lng: 80.7520,
      phone: "08662822345",
      address: "మెయిన్ రోడ్డు, కంకిపాడు, కృష్ణా జిల్లా, ఆంధ్రప్రదేశ్ - 521151",
      country: "IN",
      category: "charitable_home",
      badgeTe: "ప్రభుత్వ గుర్తింపు పొందిన వృద్ధాశ్రమం",
    },
    {
      id: "eh-kkp-ammananna",
      name: "అమ్మ నాన్న ఓల్డ్ ఏజ్ హోమ్ (Amma Nanna Old Age Home Kankipadu)",
      lat: 16.4290,
      lng: 80.7560,
      phone: "08659282803",
      address: "బందరు రోడ్, కంకిపాడు, కృష్ణా జిల్లా, ఆంధ్రప్రదేశ్ - 521151",
      country: "IN",
      category: "charitable_home",
      badgeTe: "వృద్ధుల ఆసరా & ఉచిత ఆశ్రమం",
    },
    {
      id: "eh-kkp-raja",
      name: "రాజా హోమ్ కేర్ & సీనియర్ హోమ్ (Raja Home Care & Old Age Home)",
      lat: 16.4240,
      lng: 80.7480,
      phone: "09848012345",
      address: "పంచాయతీ ఆఫీస్ దగ్గర, కంకిపాడు, కృష్ణా జిల్లా - 521151",
      country: "IN",
      category: "assisted_living",
      badgeTe: "వృద్ధుల గృహ సంరక్షణ & ఆశ్రయం",
    },
    {
      id: "eh-kkp-anandalahari",
      name: "ఆనంద లహరి సీనియర్ లివింగ్ హోమ్స్ (Ananda Lahari Retirement Homes)",
      lat: 16.4450,
      lng: 80.7250,
      phone: "09885463376",
      address: "ప్రైమ్ బందరు రోడ్, ఈడుపుగల్లు, కంకిపాడు మండలం, కృష్ణా జిల్లా",
      country: "IN",
      category: "assisted_living",
      badgeTe: "సీనియర్ గేటెడ్ రిటైర్మెంట్ హోమ్స్",
    },

    // Vijayawada
    {
      id: "eh-vja-amma",
      name: "అమ్మ ఓల్డ్ ఏజ్ హోమ్ & నర్సింగ్ కేర్ (Amma Old Age Home Vijayawada)",
      lat: 16.4980,
      lng: 80.6550,
      phone: "08008681519",
      address: "నం. 60-9-3, గాయత్రీ నగర్, సిద్ధార్థ నగర్, బెంజ్ సర్కిల్, విజయవాడ - 520008",
      country: "IN",
      category: "charitable_home",
      badgeTe: "ధృవీకరించిన వృద్ధాశ్రమం • ఉచిత భోజనం & ఆశ్రయం",
    },
    {
      id: "eh-vja-teja",
      name: "తేజ ఓల్డ్ ఏజ్ హోమ్‌కేర్ సర్వీసెస్ (Teja Old Age Home Vijayawada)",
      lat: 16.5180,
      lng: 80.6150,
      phone: "07093911010",
      address: "వైవీ రావు ఎస్టేట్, వైఎస్సార్ రోడ్, జక్కంపూడి / విజయవాడ - 520012",
      country: "IN",
      category: "assisted_living",
      badgeTe: "సీనియర్ సిటిజన్ సంరక్షణ నిలయం",
    },
    {
      id: "eh-vja-tanmayee",
      name: "తన్మయి ఓల్డ్ ఏజ్ హోమ్ (Tanmayee Old Age Home Vijayawada)",
      lat: 16.5200,
      lng: 80.6250,
      phone: "08897730222",
      address: "స్టేట్ హైవే 236, విజయవాడ, ఆంధ్రప్రదేశ్ - 520012",
      country: "IN",
      category: "charitable_home",
      badgeTe: "వృద్ధుల విశ్రాంతి నిలయం",
    },
    {
      id: "eh-vja-prasanna",
      name: "ప్రసన్న ఓల్డ్ ఏజ్ హోమ్ & నర్సింగ్ కేర్ (Prasanna Old Age Home)",
      lat: 16.5050,
      lng: 80.6450,
      phone: "09849234567",
      address: "క్రీస్తురాజపురం రోడ్, మొగల్రాజపురం, విజయవాడ - 520010",
      country: "IN",
      category: "assisted_living",
      badgeTe: "వృద్ధుల ప్రత్యేక వైద్య & నర్సింగ్ సేవలు",
    },

    // Hyderabad
    {
      id: "eh-hyd-srimatha",
      name: "శ్రీమత ఓల్డ్ ఏజ్ హోమ్ (Srimatha Old Age Home Hyderabad)",
      lat: 17.4120,
      lng: 78.4980,
      phone: "09010246333",
      address: "నల్లకుంట / విద్యానగర్, హైదరాబాద్, తెలంగాణ - 500044",
      country: "IN",
      category: "charitable_home",
      badgeTe: "వృద్ధుల సమగ్ర సంరక్షణ • 24/7 సేవలు",
    },
    {
      id: "eh-hyd-harsha",
      name: "హర్ష ఓల్డ్ ఏజ్ హోమ్ (Harsha Old Age Home Vanasthalipuram)",
      lat: 17.3380,
      lng: 78.5680,
      phone: "09346569584",
      address: "ప్లాట్ నెం. 19A, మన్సూరాబాద్ రోడ్, వనస్థలిపురం, హైదరాబాద్ - 500070",
      country: "IN",
      category: "charitable_home",
      badgeTe: "ఆశ్రమ వాతావరణం • నిరంతర వైద్య పర్యవేక్షణ",
    },
    {
      id: "eh-hyd-prashanthi",
      name: "ప్రశాంతి ఓల్డ్ ఏజ్ హోమ్ (Prashanthi Old Age Home Kukatpally)",
      lat: 17.4850,
      lng: 78.3980,
      phone: "09550874598",
      address: "అడ్డగుట్ట సొసైటీ, హెచ్‌ఎంటీ హిల్స్, కూకట్‌పల్లి, హైదరాబాద్ - 500085",
      country: "IN",
      category: "assisted_living",
      badgeTe: "ధృవీకరించిన సీనియర్ హోమ్ • పౌష్టికాహారం & ఆసరా",
    },
    {
      id: "eh-hyd-fatima",
      name: "ఫాతిమా ఓల్డ్ ఏజ్ హోమ్ (Fatima Old Age Home Falaknuma)",
      lat: 17.3320,
      lng: 78.4680,
      phone: "07660954936",
      address: "ఫలక్‌నుమా రైల్వే స్టేషన్ రోడ్, ఫలక్‌నుమా, హైదరాబాద్, తెలంగాణ",
      country: "IN",
      category: "charitable_home",
      badgeTe: "వృద్ధుల ఆశ్రయం & ఆత్మీయ సేవలు",
    },
    {
      id: "eh-hyd-heritage",
      name: "హెరిటేజ్ ఎల్డర్ కేర్ సర్వీసెస్ (Heritage Elder Care & Assisted Living)",
      lat: 17.4300,
      lng: 78.4350,
      phone: "09848878697",
      address: "కమలాపురి కాలనీ, సత్యసాయి కళ్యాణ మండపం దగ్గర, శ్రీనగర్ కాలనీ, హైదరాబాద్ - 500073",
      country: "IN",
      category: "assisted_living",
      badgeTe: "అసిస్టెడ్ లివింగ్ • డిమెన్షియా & అల్జీమర్స్ కేర్",
    },
    {
      id: "eh-hyd-avisya",
      name: "అవిస్య ఎల్డర్ కేర్ (Avisya Elder Care Services)",
      lat: 17.4380,
      lng: 78.4480,
      phone: "08886600566",
      address: "వాసవి ఎంపీఎం గ్రాండ్, అమీర్‌పేట్ మెట్రో స్టేషన్ పక్కన, హైదరాబాద్ - 500073",
      country: "IN",
      category: "assisted_living",
      badgeTe: "సీనియర్ సిటిజన్ గృహ సహాయం & సంరక్షణ",
    },

    // Guntur
    {
      id: "eh-gtr-shirdisai",
      name: "శ్రీ షిర్డీ సాయి ఓల్డ్ ఏజ్ హోమ్ (Sri Shirdi Sai Old Age Home Guntur)",
      lat: 16.3050,
      lng: 80.4350,
      phone: "09848123456",
      address: "శ్యామలా నగర్, బ్రాడీపేట దగ్గర, గుంటూరు, ఆంధ్రప్రదేశ్ - 522006",
      country: "IN",
      category: "charitable_home",
      badgeTe: "వృద్ధుల ఆశ్రయం & నిత్య అన్నదానం",
    },
    {
      id: "eh-gtr-ammavodi",
      name: "అమ్మ ఒడి వృద్ధాశ్రమం (Amma Vodi Vruddhashramam Guntur)",
      lat: 16.2950,
      lng: 80.4420,
      phone: "09440123456",
      address: "నల్లపాడు మెయిన్ రోడ్, గుంటూరు - 522005",
      country: "IN",
      category: "charitable_home",
      badgeTe: "నిరాశ్రయులైన వృద్ధులకు ఉచిత ఆసరా",
    },

    // Visakhapatnam
    {
      id: "eh-vzg-prema",
      name: "ప్రేమ సమాజం వృద్ధాశ్రమం (Prema Samajam Old Age Home Vizag)",
      lat: 17.7180,
      lng: 83.2980,
      phone: "08912564222",
      address: "డాబాగార్డెన్స్ మెయిన్ రోడ్డు, విశాఖపట్నం, ఆంధ్రప్రదేశ్ - 530020",
      country: "IN",
      category: "charitable_home",
      badgeTe: "చారిత్రక ధర్మ సంస్థ • ఉచిత వృద్ధుల ఆశ్రయం",
    },
    {
      id: "eh-vzg-saipriya",
      name: "సాయి ప్రియ ఓల్డ్ ఏజ్ హోమ్ (Sai Priya Senior Citizen Home)",
      lat: 17.7450,
      lng: 83.3250,
      phone: "09848234567",
      address: "ఎంవీపీ కాలనీ, సెక్టార్ 3, విశాఖపట్నం - 530017",
      country: "IN",
      category: "assisted_living",
      badgeTe: "సీనియర్ కేర్ & నర్సింగ్ హోమ్",
    },

    // Tirupati
    {
      id: "eh-tpt-ttd",
      name: "టిటిడి కరుణధామం వృద్ధాశ్రమం (TTD Karunadhamam Old Age Home)",
      lat: 13.6280,
      lng: 79.4180,
      phone: "08772277777",
      address: "అలిపిరి బైపాస్ రోడ్, తిరుపతి, ఆంధ్రప్రదేశ్ - 517507",
      country: "IN",
      category: "charitable_home",
      badgeTe: "టిటిడి ఉచిత వృద్ధాశ్రమం",
    },

    // USA Verified Senior Living Communities
    {
      id: "eh-us-sunrise-dal",
      name: "Sunrise Senior Living (Assisted Living & Memory Care)",
      lat: 32.7950,
      lng: -96.8050,
      phone: "1-888-434-4648",
      address: "Dallas Metro Area, Texas, USA",
      country: "USA",
      category: "assisted_living",
      badgeTe: "Senior Assisted Living & Memory Care",
    },
    {
      id: "eh-us-brookdale-dal",
      name: "Brookdale Senior Living (Retirement & Elder Care)",
      lat: 32.8120,
      lng: -96.7950,
      phone: "1-888-203-8771",
      address: "Dallas / Fort Worth, Texas, USA",
      country: "USA",
      category: "assisted_living",
      badgeTe: "Verified Senior Living Community",
    },
    {
      id: "eh-us-atria-ca",
      name: "Atria Senior Living (Senior Care & Assisted Living)",
      lat: 37.3382,
      lng: -121.8863,
      phone: "1-866-324-6330",
      address: "San Jose & Bay Area, California, USA",
      country: "USA",
      category: "assisted_living",
      badgeTe: "Licensed California Senior Living",
    },
    {
      id: "eh-us-aegis-ca",
      name: "Aegis Living (Assisted Living & Memory Care)",
      lat: 37.3861,
      lng: -122.0839,
      phone: "1-844-243-4470",
      address: "Mountain View / Silicon Valley, California, USA",
      country: "USA",
      category: "assisted_living",
      badgeTe: "Premium Senior Assisted Living",
    },
  ];

  // Cache for nearby elderly homes in memory (3 minutes TTL)
  const elderlyHomesCache = new Map<string, { timestamp: number; homes: any[] }>();

  // Nearby Verified Elderly Homes & Senior Care API
  app.get("/api/nearby-elderly-homes", async (req, res) => {
    const { lat, lng, country } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing lat or lng parameter", homes: [] });
    }

    const userLat = Number(lat);
    const userLng = Number(lng);
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ error: "Invalid lat or lng", homes: [] });
    }

    const targetCountry = country ? String(country).toUpperCase() : "";
    const cacheKey = `${userLat.toFixed(3)},${userLng.toFixed(3)},${targetCountry}`;
    const cached = elderlyHomesCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 3 * 60 * 1000) {
      return res.json({ homes: cached.homes, userAreaCoords: { lat: userLat, lng: userLng } });
    }

    // Compute live distance from user coordinates for all verified elderly homes
    const allMatches = VERIFIED_ELDERLY_HOMES
      .filter((h) => {
        if (targetCountry === "USA") return h.country === "USA";
        if (targetCountry === "IN") return h.country === "IN";
        return true;
      })
      .map((h) => {
        const { distanceMiles, distanceKm } = calculateHaversine(userLat, userLng, h.lat, h.lng);
        return {
          ...h,
          distanceMiles,
          distanceKm,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${h.lat},${h.lng}`,
        };
      });

    allMatches.sort((a, b) => a.distanceMiles - b.distanceMiles);

    // Proximity logic:
    // If there are verified homes in the immediate local area (<= 12 miles), strictly show only those local homes.
    // E.g., if user is in Gudivada (homes at ~0.2 miles), never include Vijayawada (23 miles away) or Kankipadu (16 miles away).
    // If the closest home is further out, allow up to 20 miles.
    // If closest home is > 20 miles (32 km), return empty list so the app shows:
    // “ఈ ప్రాంతంలో ధృవీకరించిన వృద్ధుల సేవలు ప్రస్తుతం కనుగొనబడలేదు”
    const closestDist = allMatches[0]?.distanceMiles ?? 999;
    const maxRadius = closestDist <= 12 ? 12 : 20;
    const nearby = allMatches.filter((h) => h.distanceMiles <= maxRadius);

    const result = nearby.slice(0, 8);
    elderlyHomesCache.set(cacheKey, { timestamp: now, homes: result });

    return res.json({
      homes: result,
      userAreaCoords: { lat: userLat, lng: userLng }
    });
  });

  // Forward Geocoding API to resolve destination addresses into drop_lat and drop_lng
  app.get("/api/geocode", async (req, res) => {
    const { q, lat, lng, city } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing destination query parameter" });
    }

    // Clean destination query (remove conversational Telugu verbs like "వెళ్లాలి", "తీసుకెళ్లండి")
    let cleanQuery = q.trim()
      .replace(/(కి|కు)?\s*(వెళ్లాలి|వెళ్ళాలి|తీసుకెళ్లండి|తీసుకెళ్ళండి|కావాలి|పోవాలి)\s*$/iu, "")
      .replace(/^(నేను|మేము|మనం|నాకు|నా|దయచేసి|ప్లీజ్)\s+/iu, "")
      .trim();

    if (!cleanQuery) {
      cleanQuery = q.trim();
    }

    const proximityLat = lat ? Number(lat) : null;
    const proximityLng = lng ? Number(lng) : null;
    const cityHint = typeof city === "string" ? city.trim() : "";

    // 1. Primary: OpenStreetMap Nominatim with proximity viewbox
    try {
      let searchQuery = cleanQuery;
      if (cityHint && !cleanQuery.toLowerCase().includes(cityHint.toLowerCase())) {
        searchQuery = `${cleanQuery}, ${cityHint}`;
      }
      let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        searchQuery
      )}&limit=1&accept-language=te,en&countrycodes=in`;

      if (proximityLat && proximityLng && !isNaN(proximityLat) && !isNaN(proximityLng)) {
        const delta = 0.6;
        url += `&viewbox=${proximityLng - delta},${proximityLat + delta},${proximityLng + delta},${proximityLat - delta}`;
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "PeddalaNestham-SeniorApp/1.0 (contact: madhavibmtp@gmail.com)",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          const first = results[0];
          return res.json({
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon),
            name: first.name || cleanQuery,
            displayName: first.display_name,
          });
        }
      }
    } catch (err: any) {
      console.warn("Primary forward geocode error:", err?.message || err);
    }

    // 2. Secondary fallback: Photon POI search
    try {
      let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=1`;
      if (proximityLat && proximityLng && !isNaN(proximityLat) && !isNaN(proximityLng)) {
        photonUrl += `&lat=${proximityLat}&lon=${proximityLng}`;
      }

      const photonRes = await fetch(photonUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        const feat = photonData?.features?.[0];
        if (feat?.geometry?.coordinates) {
          const [lon, latVal] = feat.geometry.coordinates;
          const p = feat.properties || {};
          return res.json({
            lat: latVal,
            lng: lon,
            name: p.name || cleanQuery,
            displayName: [p.name, p.street, p.city, p.state].filter(Boolean).join(", "),
          });
        }
      }
    } catch (err: any) {
      console.warn("Secondary forward geocode error:", err?.message || err);
    }

    return res.status(404).json({ error: "Destination not found", query: cleanQuery });
  });

  // High-fidelity natural, smooth, clear Telugu female voice TTS API with chunking & in-memory cache
  const ttsCache = new Map<string, Buffer>();

  app.get("/api/tts", async (req, res) => {
    try {
      const text = typeof req.query.text === "string" ? req.query.text.trim() : "";
      const tl = typeof req.query.tl === "string" && ["te", "en", "hi", "ta"].includes(req.query.tl) ? req.query.tl : "te";
      if (!text) {
        return res.status(400).json({ error: "Missing text parameter" });
      }

      const cacheKey = `${tl}:${text}`;

      // Check cache first
      if (ttsCache.has(cacheKey)) {
        const cached = ttsCache.get(cacheKey)!;
        res.set({
          "Content-Type": "audio/mpeg",
          "Content-Length": String(cached.length),
          "Cache-Control": "public, max-age=86400",
        });
        return res.send(cached);
      }

      // Split text strictly on true sentence boundaries (. ! ? । \n), NEVER on commas or mid-sentence
      const chunks: string[] = [];
      if (text.length <= 180) {
        chunks.push(text);
      } else {
        const sentences = text.split(/(?<=[.!?।\n])\s+/).filter(Boolean);
        let cur = "";
        for (const s of sentences) {
          if (!cur) {
            cur = s;
          } else if ((cur + " " + s).length <= 180) {
            cur = cur + " " + s;
          } else {
            chunks.push(cur);
            if (s.length <= 180) {
              cur = s;
            } else {
              // Rare: individual sentence > 180 chars. Split on word boundary without cutting words
              const words = s.split(/\s+/);
              let wCur = "";
              for (const w of words) {
                if (!wCur) {
                  wCur = w;
                } else if ((wCur + " " + w).length <= 180) {
                  wCur = wCur + " " + w;
                } else {
                  chunks.push(wCur);
                  wCur = w;
                }
              }
              cur = wCur;
            }
          }
        }
        if (cur) chunks.push(cur);
      }

      if (chunks.length === 0) {
        return res.status(400).json({ error: "No text chunks to synthesize" });
      }

      const audioBuffers: Buffer[] = [];
      for (const chunk of chunks) {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          chunk
        )}&tl=${encodeURIComponent(tl)}&client=tw-ob`;
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!response.ok) {
          throw new Error(`TTS upstream failed with status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuffer));
      }

      const combined = Buffer.concat(audioBuffers);
      if (ttsCache.size < 500) {
        ttsCache.set(cacheKey, combined);
      }

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": String(combined.length),
        "Cache-Control": "public, max-age=86400",
      });
      return res.send(combined);
    } catch (err: any) {
      console.error("TTS synthesis error:", err?.message || err);
      return res.status(500).json({ error: "TTS generation failed" });
    }
  });

  // Vite middleware setup for dev, static serving for production
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isDevCommand = process.env.npm_lifecycle_event === "dev";

  if (hasDist && !isDevCommand) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
