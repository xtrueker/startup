import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Circle, MapStyleElement } from 'react-native-maps';
import { WebView, WebViewProps } from 'react-native-webview';
import { palette } from '../theme/prismTheme';

const NativeWebView = WebView as unknown as React.ComponentType<WebViewProps & { ref?: any }>;

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

const USE_NATIVE_MAP_SDK =
  process.env.EXPO_PUBLIC_USE_NATIVE_MAPS === 'true' &&
  (Platform.OS === 'ios' || Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()));

const PEARL_LIGHT_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#F2F5F9' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#526071' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
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
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#CBE8F6' }],
  },
];

function buildMobileLeafletHtml(lat: number, lng: number): string {
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
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Roboto, sans-serif;
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
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid #0EA5E9;
      box-shadow: 0 6px 14px rgba(14,165,233,0.28), 0 2px 6px rgba(15,23,42,0.16);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function esc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    var map = L.map('map', {
      center: [${lat}, ${lng}],
      zoom: 15,
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
          var clat = Number(c.location.latitude);
          var clng = Number(c.location.longitude);
          if (!isFinite(clat) || !isFinite(clng) || (clat === 0 && clng === 0)) return;

          var radius = Number(c.coverageRadius) || 120;
          L.circle([clat, clng], {
            radius: radius,
            color: 'rgba(14,165,233,0.45)',
            weight: 1.5,
            fillColor: 'rgba(14,165,233,0.10)',
            fillOpacity: 1
          }).addTo(camLayer);

          var camIcon = L.divIcon({
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            html: '<div class="rc-cam-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>'
          });

          var addrLine = c.location.address ? '<div style="font-size:11px;color:#64748B;margin-top:2px;">' + esc(c.location.address) + '</div>' : '';
          L.marker([clat, clng], { icon: camIcon, zIndexOffset: 650 })
            .bindPopup('<div style="font-size:12.5px;"><b>' + esc(c.name || 'Cámara comunitaria') + '</b>' + addrLine + '</div>')
            .addTo(camLayer);
        });
      }
    };

    window.__rcFlyTo = function(lat, lng, zoom) {
      if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
        map.flyTo([lat, lng], zoom || 16, { animate: true, duration: 0.75 });
      }
    };

    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage('MAP_READY');
    }
  </script>
</body>
</html>`;
}

function MobileLeafletWebViewMap({
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
    () => buildMobileLeafletHtml(initialRegion.latitude, initialRegion.longitude),
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
      onMessage={(event: any) => {
        if (event?.nativeEvent?.data === 'MAP_READY') {
          setLoaded(true);
        }
      }}
      onLoadEnd={() => setLoaded(true)}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      bounces={false}
      scrollEnabled={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

/**
 * Renderiza el mismo motor cartográfico Pearl-Silver interactivo en iOS y Android
 * garantizando paridad 100% de cámaras, radios de cobertura y pines sin recortes de Fabric.
 */
export function TacticalMap(props: TacticalMapProps) {
  if (!USE_NATIVE_MAP_SDK) {
    return <MobileLeafletWebViewMap {...props} />;
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
    <View style={StyleSheet.absoluteFill} collapsable={false}>
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
        {cameras.map((camera) => {
          const lat = Number(camera?.location?.latitude);
          const lng = Number(camera?.location?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
            return null;
          }
          return (
            <React.Fragment key={camera.id}>
              <Circle
                center={{ latitude: lat, longitude: lng }}
                radius={camera.coverageRadius || 120}
                strokeWidth={1.5}
                strokeColor="rgba(14, 165, 233, 0.5)"
                fillColor="rgba(14, 165, 233, 0.12)"
              />
              <Marker
                coordinate={{ latitude: lat, longitude: lng }}
                title={camera.name}
                description={camera.location.address || 'Cámara comunitaria conectada'}
                pinColor={palette.aqua}
              />
            </React.Fragment>
          );
        })}

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
    </View>
  );
}
