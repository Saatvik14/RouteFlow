import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';

const MapScreen = () => {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        // enables the blue dot for current location
        showsUserLocation={true}
        // enables the button to center on current location
        showsMyLocationButton={true}
        // Set mapType to "none" so the default provider tiles 
        // (Google/Apple) don't render behind OpenStreetMap
        mapType="none"
      >
        <UrlTile
          /**
           * OpenStreetMap tile server template.
           * {z} - Zoom level
           * {x} - X coordinate
           * {y} - Y coordinate
           */
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          /**
           * shouldReplaceMapContent tells the native map to skip rendering 
           * the default layer entirely.
           */
          shouldReplaceMapContent={true}
          maximumZ={19}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapScreen;