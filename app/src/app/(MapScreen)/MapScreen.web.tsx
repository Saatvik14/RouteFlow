import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let Polyline: any;
let useMap: any;
let L: any;

if (typeof window !== 'undefined') {
  const leaflet = require('react-leaflet');
  MapContainer = leaflet.MapContainer;
  TileLayer = leaflet.TileLayer;
  Marker = leaflet.Marker;
  Popup = leaflet.Popup;
  Polyline = leaflet.Polyline;
  useMap = leaflet.useMap;
  L = require('leaflet');
}

export type RouteMapType = 'standard' | 'satellite' | 'hybrid';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
};

export type ConfirmedRoute = {
  start: RoutePoint;
  end: RoutePoint;
  coordinates?: RoutePoint[];
};

type MapScreenProps = {
  mapType?: RouteMapType;
  centerSignal?: number;
  confirmedRoute?: ConfirmedRoute | null;
};

const FALLBACK_REGION = {
  latitude: 28.6139,
  longitude: 77.209,
};

function createIcon(color: string) {
  if (!L) return undefined;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <path fill="${color}" d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 27 17 27s17-14.3 17-27C34 7.6 26.4 0 17 0z"/>
      <circle cx="17" cy="17" r="7" fill="#FFFFFF"/>
    </svg>
  `;

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}

function MapUpdater({
  position,
  routeCoordinates,
  confirmedRoute,
  centerSignal,
}: {
  position: { lat: number; lng: number };
  routeCoordinates: RoutePoint[];
  confirmedRoute?: ConfirmedRoute | null;
  centerSignal: number;
}) {
  if (!useMap) return null;

  const map = useMap();

  useEffect(() => {
    if (confirmedRoute && routeCoordinates.length) {
      const bounds = routeCoordinates.map(point => [
        point.latitude,
        point.longitude,
      ]);

      map.fitBounds(bounds, {
        paddingTopLeft: [70, 120],
        paddingBottomRight: [70, 390],
      });

      return;
    }

    map.setView([position.lat, position.lng], 13);
  }, [map, position.lat, position.lng, confirmedRoute, routeCoordinates]);

  useEffect(() => {
    if (centerSignal > 0) {
      if (confirmedRoute && routeCoordinates.length) {
        const bounds = routeCoordinates.map(point => [
          point.latitude,
          point.longitude,
        ]);

        map.fitBounds(bounds, {
          paddingTopLeft: [70, 120],
          paddingBottomRight: [70, 390],
        });
      } else {
        map.setView([position.lat, position.lng], 13);
      }
    }
  }, [centerSignal, map, position.lat, position.lng, confirmedRoute, routeCoordinates]);

  return null;
}

export default function MapScreen({
  mapType = 'standard',
  centerSignal = 0,
  confirmedRoute = null,
}: MapScreenProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: FALLBACK_REGION.latitude,
    lng: FALLBACK_REGION.longitude,
  });

  const startIcon = useMemo(() => createIcon('#2F76F6'), []);
  const endIcon = useMemo(() => createIcon('#22C55E'), []);

  const routeCoordinates =
    confirmedRoute?.coordinates?.length
      ? confirmedRoute.coordinates
      : confirmedRoute
        ? [confirmedRoute.start, confirmedRoute.end]
        : [];

  const leafletRouteCoordinates = routeCoordinates.map(point => [
    point.latitude,
    point.longitude,
  ]);

  const moveToCurrentLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setPosition({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.log('Location error:', error);
    }
  }, []);

  useEffect(() => {
    moveToCurrentLocation();
  }, [moveToCurrentLocation]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  const tileUrl =
    mapType === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  if (!MapContainer) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        style={styles.leafletMap}
        zoomControl={false}>
        <TileLayer
          url={tileUrl}
          attribution={
            mapType === 'satellite'
              ? '&copy; Esri'
              : '&copy; OpenStreetMap contributors'
          }
        />

        {confirmedRoute ? (
          <>
            <Polyline
              positions={leafletRouteCoordinates}
              pathOptions={{
                color: '#4285F4',
                weight: 6,
                opacity: 0.95,
              }}
            />

            <Marker
              position={[
                confirmedRoute.start.latitude,
                confirmedRoute.start.longitude,
              ]}
              icon={startIcon}>
              <Popup>
                {confirmedRoute.start.description ||
                  confirmedRoute.start.title ||
                  'Start location'}
              </Popup>
            </Marker>

            <Marker
              position={[
                confirmedRoute.end.latitude,
                confirmedRoute.end.longitude,
              ]}
              icon={endIcon}>
              <Popup>
                {confirmedRoute.end.description ||
                  confirmedRoute.end.title ||
                  'End location'}
              </Popup>
            </Marker>
          </>
        ) : (
          <Marker position={[position.lat, position.lng]} icon={startIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        <MapUpdater
          position={position}
          routeCoordinates={routeCoordinates}
          confirmedRoute={confirmedRoute}
          centerSignal={centerSignal}
        />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#11151B',
  },
});