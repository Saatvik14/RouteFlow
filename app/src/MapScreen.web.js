import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';

/**
 * Internal component to handle auto-centering when location is found
 */
const LocationMarker = () => {
  // We require 'react-leaflet' dynamically to avoid 'window is not defined'
  const { Circle, CircleMarker, useMap } = require('react-leaflet');
  const [location, setLocation] = useState(null);
  const map = useMap();

  useEffect(() => {
    // This triggers the browser's geolocation prompt
    map.locate({ setView: true, maxZoom: 16 });

    map.on('locationfound', (e) => {
      setLocation({ latlng: e.latlng, accuracy: e.accuracy });
    });

    map.on('locationerror', () => {
      console.error("Location access denied or unavailable.");
    });
  }, [map]);

  if (!location) return null;

  return (
    <>
      <Circle
        center={location.latlng}
        radius={location.accuracy}
        pathOptions={{
          fillColor: '#4285F4',
          fillOpacity: 0.15,
          color: '#4285F4',
          weight: 1,
          opacity: 0.3,
        }}
      />
      <CircleMarker
        center={location.latlng}
        radius={8}
        pathOptions={{
          fillColor: '#4285F4',
          fillOpacity: 1,
          color: 'white',
          weight: 3,
        }}
      />
    </>
  );
};

const MapScreen = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This only runs once the component is mounted in the browser
    setIsClient(true);
  }, []);

  if (!isClient || Platform.OS !== 'web' || typeof window === 'undefined') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Dynamically require Leaflet and its styles only in the browser
  const { MapContainer, TileLayer } = require('react-leaflet');
  const L = require('leaflet');
  require('leaflet/dist/leaflet.css');

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapContainer
        center={[0, 0]}
        zoom={2}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
      </MapContainer>
    </div>
  );
};

export default MapScreen;