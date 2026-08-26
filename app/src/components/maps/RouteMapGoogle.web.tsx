import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getActiveRouteCoordinates } from '../../utils/routePolyline';
import type {
  ConfirmedRoute,
  RouteMapType,
  RoutePoint,
} from './RouteMap.web';

type GoogleRouteMapProps = {
  mapType?: RouteMapType;
  centerSignal?: number;
  confirmedRoute?: ConfirmedRoute | null;
  isNavigating?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null;
  onUnavailable: () => void;
};

const GOOGLE_MAPS_WEB_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY || '';
const SCRIPT_ID = 'routeflow-google-maps-js';
const CALLBACK_NAME = '__routeFlowGoogleMapsLoaded';

let googleMapsPromise: Promise<any> | null = null;
const googleMapsFailureListeners = new Set<() => void>();

const loadGoogleMaps = () => {
  const browserWindow = window as any;
  if (browserWindow.google?.maps) return Promise.resolve(browserWindow.google);
  if (googleMapsPromise) return googleMapsPromise;
  if (!GOOGLE_MAPS_WEB_API_KEY) return Promise.reject(new Error('Google Maps web key is missing'));

  googleMapsPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('Google Maps did not load in time')),
      12000,
    );
    const finish = (callback: () => void) => {
      window.clearTimeout(timeout);
      callback();
    };

    browserWindow[CALLBACK_NAME] = () =>
      finish(() => resolve(browserWindow.google));

    const previousAuthFailure = browserWindow.gm_authFailure;
    browserWindow.gm_authFailure = () => {
      if (typeof previousAuthFailure === 'function') previousAuthFailure();
      googleMapsFailureListeners.forEach(listener => listener());
      finish(() => reject(new Error('Google Maps authentication or quota check failed')));
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('error', () =>
        finish(() => reject(new Error('Google Maps script failed to load'))),
      );
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.onerror = () =>
      finish(() => reject(new Error('Google Maps script failed to load')));
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_WEB_API_KEY)}` +
      `&callback=${CALLBACK_NAME}&loading=async&v=weekly`;
    document.head.appendChild(script);
  }).catch(error => {
    googleMapsPromise = null;
    throw error;
  });

  return googleMapsPromise;
};

const isValidPoint = (point: RoutePoint) =>
  Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude));

const toLatLng = (point: RoutePoint) => ({
  lat: Number(point.latitude),
  lng: Number(point.longitude),
});

export default function GoogleRouteMap({
  mapType = 'standard',
  centerSignal = 0,
  confirmedRoute = null,
  isNavigating = false,
  userLocation = null,
  onUnavailable,
}: GoogleRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [googleApi, setGoogleApi] = useState<any>(null);
  const [browserLocation, setBrowserLocation] = useState<RoutePoint | null>(null);

  const routePoints = useMemo<RoutePoint[]>(() => {
    if (!confirmedRoute) return [];
    return [confirmedRoute.start, ...(confirmedRoute.stops || []), confirmedRoute.end]
      .filter(isValidPoint)
      .map(point => ({
        ...point,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      }));
  }, [confirmedRoute]);

  const routeCoordinates = useMemo<RoutePoint[]>(() => {
    const points = confirmedRoute?.coordinates?.length
      ? confirmedRoute.coordinates
      : routePoints;
    return points.filter(isValidPoint).map(point => ({
      ...point,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    }));
  }, [confirmedRoute, routePoints]);

  const activeRouteCoordinates = useMemo(
    () => getActiveRouteCoordinates(routeCoordinates, userLocation, isNavigating),
    [isNavigating, routeCoordinates, userLocation],
  );

  const isOptimized = Boolean(
    confirmedRoute?.coordinates &&
      confirmedRoute.coordinates.length > 2 + (confirmedRoute.stops?.length || 0),
  );

  useEffect(() => {
    let mounted = true;
    googleMapsFailureListeners.add(onUnavailable);
    loadGoogleMaps()
      .then(api => {
        if (!mounted || !containerRef.current) return;
        setGoogleApi(api);
        mapRef.current = new api.maps.Map(containerRef.current, {
          center: { lat: 28.6139, lng: 77.209 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          clickableIcons: false,
        });
      })
      .catch(error => {
        console.warn('Google Maps unavailable; switching to configured fallback:', error);
        if (mounted) onUnavailable();
      });

    return () => {
      mounted = false;
      googleMapsFailureListeners.delete(onUnavailable);
    };
  }, [onUnavailable]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(
      mapType === 'satellite' ? 'satellite' : mapType === 'hybrid' ? 'hybrid' : 'roadmap',
    );
  }, [googleApi, mapType]);

  useEffect(() => {
    if (!googleApi || !mapRef.current) return;
    overlaysRef.current.forEach(overlay => overlay.setMap?.(null));
    overlaysRef.current = [];

    if (isOptimized && activeRouteCoordinates.length > 1) {
      const polyline = new googleApi.maps.Polyline({
        path: activeRouteCoordinates.map(toLatLng),
        geodesic: true,
        strokeColor: '#2F76F6',
        strokeOpacity: 0.95,
        strokeWeight: 6,
        map: mapRef.current,
      });
      overlaysRef.current.push(polyline);
    }

    if (confirmedRoute) {
      const markerItems = [
        { key: 'start', point: confirmedRoute.start, label: 'S', color: '#2F76F6' },
        ...(confirmedRoute.stops || []).map(stop => ({
          key: `stop-${stop.id}`,
          point: stop,
          label: stop.markerLabel || String(stop.sequence),
          color: '#EA4335',
        })),
        { key: 'end', point: confirmedRoute.end, label: 'E', color: '#22C55E' },
      ];

      markerItems.filter(item => isValidPoint(item.point)).forEach(item => {
        const marker = new googleApi.maps.Marker({
          map: mapRef.current,
          position: toLatLng(item.point),
          title: item.point.title || item.point.description || '',
          label: { text: item.label, color: '#FFFFFF', fontWeight: '700' },
          icon: {
            path: googleApi.maps.SymbolPath.CIRCLE,
            fillColor: item.color,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: 14,
          },
        });
        overlaysRef.current.push(marker);
      });
    }

    const visibleUserLocation = userLocation || browserLocation;
    if (visibleUserLocation && isValidPoint(visibleUserLocation)) {
      const marker = new googleApi.maps.Marker({
        map: mapRef.current,
        position: toLatLng(visibleUserLocation),
        title: 'Your position',
        zIndex: 1000,
        icon: {
          path: googleApi.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          rotation: userLocation?.heading || 0,
          fillColor: '#2563EB',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 7,
        },
      });
      overlaysRef.current.push(marker);
    }

    if (routeCoordinates.length > 0) {
      const bounds = new googleApi.maps.LatLngBounds();
      routeCoordinates.forEach(point => bounds.extend(toLatLng(point)));
      mapRef.current.fitBounds(bounds, { top: 70, right: 70, bottom: 300, left: 70 });
    } else if (visibleUserLocation) {
      mapRef.current.setCenter(toLatLng(visibleUserLocation));
      mapRef.current.setZoom(14);
    }

    return () => {
      overlaysRef.current.forEach(overlay => overlay.setMap?.(null));
      overlaysRef.current = [];
    };
  }, [activeRouteCoordinates, browserLocation, confirmedRoute, googleApi, isOptimized, routeCoordinates, userLocation]);

  useEffect(() => {
    if (confirmedRoute || userLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      position =>
        setBrowserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [confirmedRoute, userLocation]);

  useEffect(() => {
    if (!mapRef.current || centerSignal <= 0) return;
    if (isNavigating && userLocation) {
      mapRef.current.setCenter(toLatLng(userLocation));
      mapRef.current.setZoom(18);
      mapRef.current.setHeading(userLocation.heading || 0);
      mapRef.current.setTilt(55);
    } else if (routeCoordinates.length > 0 && googleApi) {
      const bounds = new googleApi.maps.LatLngBounds();
      routeCoordinates.forEach(point => bounds.extend(toLatLng(point)));
      mapRef.current.fitBounds(bounds, { top: 70, right: 70, bottom: 300, left: 70 });
    } else if (userLocation || browserLocation) {
      mapRef.current.setCenter(toLatLng((userLocation || browserLocation) as RoutePoint));
      mapRef.current.setZoom(14);
    }
  }, [browserLocation, centerSignal, googleApi, isNavigating, routeCoordinates, userLocation]);

  return (
    <View style={styles.container}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11151B',
  },
});
