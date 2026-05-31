import React from 'react';
import MapScreen from './MapScreen';

export default function App() {
  // This ensures MapScreen is the first thing rendered 
  // when you visit localhost:8081
  return <MapScreen />;
}