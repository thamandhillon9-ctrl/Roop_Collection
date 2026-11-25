import React, { useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

const FLAGSHIP_COORDS = { lat: 18.9281, lng: 72.8321 }; // Kala Ghoda, Fort, Mumbai

function FlagshipMarker() {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(true);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={FLAGSHIP_COORDS}
        onClick={() => setOpen((v) => !v)}
        title="MAISON VERRI Flagship Atelier"
      >
        <Pin background="#0D0D0D" borderColor="#B8924A" glyphColor="#C6A462" scale={1.15} />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} maxWidth={240} onCloseClick={() => setOpen(false)}>
          <div className="p-1 text-[#111111]">
            <p className="font-semibold text-xs">MAISON VERRI Flagship Atelier</p>
            <p className="text-[11px] text-[#57534E] mt-0.5">
              14 Rope Walk Lane, Kala Ghoda, Fort, Mumbai 400001
            </p>
            <p className="text-[11px] text-[#9A7736] mt-1">Open Daily · 10:30 AM – 8:30 PM</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function StoreLocatorMap() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

  if (!apiKey) {
    return (
      <div className="w-full h-80 bg-[#EAE2D3] border border-[#D6CCB8] flex flex-col items-center justify-center p-6 text-center space-y-2">
        <MapPin className="w-6 h-6 text-[#9A7736]" />
        <p className="font-serif text-xl text-[#111111]">MAISON VERRI Flagship Atelier</p>
        <p className="text-sm text-[#57534E] max-w-md">
          14 Rope Walk Lane, Kala Ghoda, Fort, Mumbai 400001 · Coordinates 18.9281° N, 72.8321° E
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-80 border border-[#D6CCB8] overflow-hidden bg-[#EAE2D3]">
      <APIProvider apiKey={apiKey} libraries={['marker']} language="en" region="IN">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={FLAGSHIP_COORDS}
          defaultZoom={15}
          gestureHandling="cooperative"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <FlagshipMarker />
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
