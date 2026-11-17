import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Circle, MapStyleElement } from 'react-native-maps';
import { WebView, WebViewProps } from 'react-native-webview';
import { palette } from '../theme/prismTheme';
import { PrismIcon } from './ui/PrismPrimitives';

const NativeWebView = WebView as unknown as React.ComponentType<WebViewProps & { ref?: any }>;

export interface CameraItem {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface TacticalMapProps {
  mapRef?: React.RefObject<any>;
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

const HAS_GOOGLE_MAPS_KEY = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());

/**
 * Clean luminous Pearl & Silver-Ice map style for Android Google Maps
 * (iOS Apple Maps uses native userInterfaceStyle="light").
 */
const PEARL_LIGHT_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#F2F5F9' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#526071' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#E8EEF5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#E1F2EE' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }] },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#DCE4EE' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#F8FAFC' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#CBD5E1' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#CBE8F6' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0284C7' }],
  },
];

function buildAndroidLeafletHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #EEF2F7;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    .leaflet-tile-pane {
      filter: saturate(0.36) brightness(1.03) contrast(0.96);
    }
    .leaflet-control-attribution {
      background: rgba(255,255,255,0.65) !important;
      font-size: 8px !important;
      color: #64748B !important;
      padding: 1px 5px !important;
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
      box-shadow: 0 6px 16px rgba(15,23,42,0.22);
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
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255,255,255,0.95);
      border: 1.5px solid rgba(14,165,233,0.55);
      box-shadow: 0 4px 12px rgba(15,23,42,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${lat}, ${lng}],
      zoom: 16,
      zoomControl: false,
      attributionControl: true
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var userMarker = null;
    var sosCircle = null;
    var camLayer = L.layerGroup().addTo(map);

    function makeUserIcon(isAlert) {
      var dot = isAlert ? '#E11D48' : '#0EA5E9';
      var halo = isAlert ? 'rgba(225,29,72,0.34)' : 'rgba(56,189,248,0.34)';
      return L.divIcon({
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: '<div class="rc-user-pin-wrap">' +
              '<div class="rc-user-pin-halo" style="background:' + halo + '"></div>' +
              '<div class="rc-user-pin-core"><div class="rc-user-pin-dot" style="background:' + dot + '"></div></div>' +
              '</div>'
      });
    }

    window.__rcUpdateState = function(payload) {
      if (!payload) return;
      if (typeof payload.lat === 'number' && typeof payload.lng === 'number') {
        var icon = makeUserIcon(Boolean(payload.isAlertActive));
        if (!userMarker) {
          userMarker = L.marker([payload.lat, payload.lng], { icon: icon, zIndexOffset: 900 }).addTo(map);
        } else {
          userMarker.setLatLng([payload.lat, payload.lng]);
          userMarker.setIcon(icon);
        }
        if (payload.isAlertActive) {
          if (!sosCircle) {
            sosCircle = L.circle([payload.lat, payload.lng], {
              radius: 220,
              color: 'rgba(225,29,72,0.72)',
              weight: 2,
              fillColor: 'rgba(225,29,72,0.14)',
              fillOpacity: 1
            }).addTo(map);
          } else {
            sosCircle.setLatLng([payload.lat, payload.lng]);
          }
        } else if (sosCircle) {
          map.removeLayer(sosCircle);
          sosCircle = null;
        }
      }
      if (Array.isArray(payload.cameras)) {
        camLayer.clearLayers();
        payload.cameras.forEach(function(c) {
          if (!c || !c.location) return;
          var camIcon = L.divIcon({
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            html: '<div class="rc-cam-pin"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" stroke-width="2.2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>'
          });
          L.marker([c.location.latitude, c.location.longitude], { icon: camIcon })
            .bindPopup('<b>' + (c.name || 'Cámara comunitaria') + '</b>')
            .addTo(camLayer);
        });
      }
    };

    window.__rcFlyTo = function(lat, lng, zoom) {
      if (typeof lat === 'number' && typeof lng === 'number') {
        map.flyTo([lat, lng], zoom || 16, { animate: true, duration: 0.75 });
      }
    };
  </script>
</body>
</html>`;
}

function AndroidLeafletWebViewMap({
  mapRef,
  initialRegion,
  userLocation,
  currentLocation,
  cameras,
  isAlertActive,
}: TacticalMapProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const hasCenteredInitial = useRef(false);

  const html = useMemo(
    () => buildAndroidLeafletHtml(initialRegion.latitude, initialRegion.longitude),
    // Solo construir HTML base una vez; las actualizaciones viajan sin recargar vía injectJavaScript
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!mapRef) return;
    (mapRef as React.MutableRefObject<any>).current = {
      animateToRegion: (region: { latitude: number; longitude: number; latitudeDelta?: number }) => {
        const zoom =
          region.latitudeDelta && region.latitudeDelta > 0
            ? Math.max(12, Math.min(18, Math.round(Math.log2(360 / region.latitudeDelta))))
            : 16;
        webViewRef.current?.injectJavaScript(
          `window.__rcFlyTo && window.__rcFlyTo(${region.latitude}, ${region.longitude}, ${zoom}); true;`
        );
      },
    };
  }, [mapRef]);

  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    const lat = currentLocation?.lat ?? userLocation?.latitude;
    const lng = currentLocation?.lng ?? userLocation?.longitude;

    const payload = JSON.stringify({
      lat: lat ?? null,
      lng: lng ?? null,
      isAlertActive,
      cameras,
    });
    webViewRef.current.injectJavaScript(
      `window.__rcUpdateState && window.__rcUpdateState(${payload}); true;`
    );

    if (lat != null && lng != null && !hasCenteredInitial.current) {
      hasCenteredInitial.current = true;
      webViewRef.current.injectJavaScript(
        `window.__rcFlyTo && window.__rcFlyTo(${lat}, ${lng}, 16); true;`
      );
    }
  }, [loaded, userLocation, currentLocation, cameras, isAlertActive]);

  return (
    <NativeWebView
      ref={(instance: WebView | null) => {
        webViewRef.current = instance;
      }}
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://redciudadana.app' }}
      onLoadEnd={() => setLoaded(true)}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

export function TacticalMap(props: TacticalMapProps) {
  // En Android standalone APK sin Google Maps API Key de pago, usamos Leaflet + OpenStreetMap
  // nativo en WebView acelerado por hardware para evitar crashes de Google Play Services y mapas vacíos.
  if (Platform.OS === 'android' && !HAS_GOOGLE_MAPS_KEY) {
    return <AndroidLeafletWebViewMap {...props} />;
  }

  return <NativeMapView {...props} />;
}

function NativeMapView({
  mapRef,
  initialRegion,
  userLocation,
  currentLocation,
  cameras,
  isAlertActive,
}: TacticalMapProps) {
  const internalRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const hasCenteredInitial = useRef(false);

  const setRefs = (instance: MapView | null) => {
    internalRef.current = instance;
    if (mapRef && 'current' in mapRef) {
      (mapRef as React.MutableRefObject<MapView | null>).current = instance;
    }
  };

  useEffect(() => {
    if (!mapReady || !internalRef.current) return;
    const lat = currentLocation?.lat ?? userLocation?.latitude;
    const lng = currentLocation?.lng ?? userLocation?.longitude;

    if (lat != null && lng != null && !hasCenteredInitial.current) {
      hasCenteredInitial.current = true;
      internalRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        750
      );
    }
  }, [mapReady, userLocation, currentLocation]);

  const activeLat = currentLocation?.lat ?? userLocation?.latitude;
  const activeLng = currentLocation?.lng ?? userLocation?.longitude;

  return (
    <MapView
      ref={setRefs}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      onMapReady={() => setMapReady(true)}
      showsUserLocation={true}
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      toolbarEnabled={false}
      scrollEnabled={true}
      zoomEnabled={true}
      pitchEnabled={true}
      rotateEnabled={true}
      userInterfaceStyle="light"
      mapType="standard"
      customMapStyle={Platform.OS === 'android' ? PEARL_LIGHT_MAP_STYLE : undefined}
    >
      {cameras.map((camera) => (
        <Marker
          key={camera.id}
          coordinate={{
            latitude: camera.location.latitude,
            longitude: camera.location.longitude,
          }}
          title={camera.name}
          description="Cámara comunitaria conectada"
          tracksViewChanges={false}
        >
          <View style={styles.cameraMarker}>
            <PrismIcon name="camera" size={14} color={palette.aqua} />
          </View>
        </Marker>
      ))}

      {isAlertActive && activeLat != null && activeLng != null && (
        <Circle
          center={{
            latitude: activeLat,
            longitude: activeLng,
          }}
          radius={220}
          strokeWidth={2}
          strokeColor="rgba(225, 29, 72, 0.72)"
          fillColor="rgba(225, 29, 72, 0.14)"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  cameraMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
});
