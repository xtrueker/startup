import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import L from 'leaflet';
import { palette } from '../theme/prismTheme';

export interface CameraItem {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  coverageRadius?: number;
}

export interface TacticalMapProps {
  mapRef?: any;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  userLocation: { latitude: number; longitude: number } | null;
  currentLocation: { lat: number; lng: number } | null;
  cameras: CameraItem[];
  isAlertActive: boolean;
}

const LEAFLET_STYLE_ID = 'rc-leaflet-core-styles';

function ensureLeafletStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(LEAFLET_STYLE_ID)) return;

  // Load official Leaflet stylesheet + sculpted Pearl/Aqua pin animations
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.id = LEAFLET_STYLE_ID;
  style.textContent = `
    .leaflet-container {
      width: 100%;
      height: 100%;
      background: #EEF2F7 !important;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif;
      outline: none;
    }
    .leaflet-tile-pane {
      filter: saturate(0.36) brightness(1.03) contrast(0.96);
    }
    .leaflet-control-attribution {
      background: rgba(255, 255, 255, 0.65) !important;
      backdrop-filter: blur(8px);
      font-size: 9px !important;
      color: #64748B !important;
      border-radius: 8px 0 0 0;
      padding: 2px 6px !important;
    }
    @keyframes rcPulseHalo {
      0% { transform: scale(0.85); opacity: 0.75; }
      70% { transform: scale(1.75); opacity: 0; }
      100% { transform: scale(1.75); opacity: 0; }
    }
    .rc-user-pin-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rc-user-pin-halo {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      animation: rcPulseHalo 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    }
    .rc-user-pin-core {
      position: relative;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.22), inset 0 1px 0 #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rc-user-pin-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .rc-cam-pin {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.94);
      border: 1.5px solid rgba(14, 165, 233, 0.5);
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.14);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);
}

function deltaToZoom(latDelta?: number): number {
  if (!latDelta || latDelta <= 0) return 16;
  const z = Math.round(Math.log2(360 / latDelta));
  return Math.max(11, Math.min(18, z));
}

export function TacticalMap({
  mapRef,
  initialRegion,
  userLocation,
  currentLocation,
  cameras,
  isAlertActive,
}: TacticalMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const alertCircleRef = useRef<L.Circle | null>(null);
  const cameraLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFlownToInitialFix = useRef(false);

  // 1. Mount real interactive street map (supports Desktop mouse + iOS/Android pinch-zoom)
  useEffect(() => {
    ensureLeafletStyles();
    const container = hostRef.current;
    if (!container || leafletMap.current) return;

    const map = L.map(container, {
      center: [initialRegion.latitude, initialRegion.longitude],
      zoom: deltaToZoom(initialRegion.latitudeDelta),
      zoomControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
    });

    // Official OpenStreetMap street tiles (100% free, zero watermarks, Pearl-Silver toned)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    cameraLayerRef.current = L.layerGroup().addTo(map);
    leafletMap.current = map;

    // Expose react-native-maps compatible animateToRegion on mapRef
    if (mapRef) {
      mapRef.current = {
        animateToRegion: (region: {
          latitude: number;
          longitude: number;
          latitudeDelta?: number;
        }) => {
          map.flyTo(
            [region.latitude, region.longitude],
            deltaToZoom(region.latitudeDelta ?? 0.008),
            { duration: 0.85 }
          );
        },
      };
    }

    // Keep tiles crisp across mobile orientation or viewport resizes
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize();
          })
        : null;
    ro?.observe(container);

    const timer = setTimeout(() => map.invalidateSize(), 180);

    return () => {
      clearTimeout(timer);
      ro?.disconnect();
      map.remove();
      leafletMap.current = null;
      userMarkerRef.current = null;
      alertCircleRef.current = null;
      cameraLayerRef.current = null;
    };
  }, []);

  // 2. Sync live user GPS pin & SOS emergency circle
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    const hasRealGps = Boolean(currentLocation || userLocation);
    const lat =
      currentLocation?.lat ?? userLocation?.latitude ?? initialRegion.latitude;
    const lng =
      currentLocation?.lng ?? userLocation?.longitude ?? initialRegion.longitude;

    const accent = isAlertActive ? palette.crimson : palette.aqua;
    const haloBg = isAlertActive
      ? 'rgba(225, 29, 72, 0.34)'
      : 'rgba(14, 165, 233, 0.30)';

    const icon = L.divIcon({
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      html: `
        <div class="rc-user-pin-wrap">
          <div class="rc-user-pin-halo" style="background:${haloBg};"></div>
          <div class="rc-user-pin-core">
            <div class="rc-user-pin-dot" style="background:${accent};"></div>
          </div>
        </div>
      `,
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([lat, lng], {
        icon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setIcon(icon);
    }

    // Fly smoothly once real GPS coordinates arrive
    if (hasRealGps && !hasFlownToInitialFix.current) {
      hasFlownToInitialFix.current = true;
      map.flyTo([lat, lng], 16, { duration: 0.9 });
    }

    // SOS 220m perimeter circle
    if (isAlertActive) {
      if (!alertCircleRef.current) {
        alertCircleRef.current = L.circle([lat, lng], {
          radius: 220,
          color: 'rgba(225, 29, 72, 0.72)',
          weight: 2,
          fillColor: 'rgba(225, 29, 72, 0.14)',
          fillOpacity: 1,
        }).addTo(map);
      } else {
        alertCircleRef.current.setLatLng([lat, lng]);
      }
    } else if (alertCircleRef.current) {
      alertCircleRef.current.remove();
      alertCircleRef.current = null;
    }
  }, [
    userLocation,
    currentLocation,
    isAlertActive,
    initialRegion.latitude,
    initialRegion.longitude,
  ]);

  // 3. Sync community camera markers
  useEffect(() => {
    const group = cameraLayerRef.current;
    if (!group) return;
    group.clearLayers();

    const camIcon = L.divIcon({
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: `
        <div class="rc-cam-pin">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
      `,
    });

    cameras.forEach((cam) => {
      const clat = Number(cam.location?.latitude);
      const clng = Number(cam.location?.longitude);
      if (Number.isFinite(clat) && Number.isFinite(clng) && (clat !== 0 || clng !== 0)) {
        L.circle([clat, clng], {
          radius: Number(cam.coverageRadius) || 120,
          color: 'rgba(14, 165, 233, 0.45)',
          weight: 1.5,
          fillColor: 'rgba(14, 165, 233, 0.10)',
          fillOpacity: 1,
        }).addTo(group);

        L.marker([clat, clng], {
          icon: camIcon,
        })
          .bindTooltip(cam.name, { direction: 'top', offset: [0, -14] })
          .addTo(group);
      }
    });
  }, [cameras]);

  return (
    <View style={styles.webMapRoot}>
      <div ref={hostRef} style={webDivStyle} />
    </View>
  );
}

const webDivStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
};

const styles = StyleSheet.create({
  webMapRoot: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.canvas,
    overflow: 'hidden',
  },
});
