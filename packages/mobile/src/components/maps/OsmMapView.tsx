import React, {useMemo} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {WebView} from 'react-native-webview';

type Coord = {latitude: number; longitude: number};

interface Props {
  center: Coord;
  marker?: Coord;
  route?: Coord[];
  zoom?: number;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
}

export function OsmMapView({center, marker, route = [], zoom = 15, style, interactive = true}: Props) {
  const source = useMemo(() => {
    const payload = JSON.stringify({center, marker, route, zoom, interactive});

    return {
      html: `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
      .leaflet-container { font-family: sans-serif; background: #e5e7eb; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const data = ${payload};
      const map = L.map('map', {
        zoomControl: data.interactive,
        dragging: data.interactive,
        scrollWheelZoom: data.interactive,
        doubleClickZoom: data.interactive,
        boxZoom: data.interactive,
        keyboard: data.interactive,
        tap: data.interactive,
      }).setView([data.center.latitude, data.center.longitude], data.zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (data.route && data.route.length > 1) {
        const latlngs = data.route.map(p => [p.latitude, p.longitude]);
        const polyline = L.polyline(latlngs, {color: '#2563eb', weight: 4}).addTo(map);
        map.fitBounds(polyline.getBounds(), {padding: [24, 24]});
      }

      if (data.marker) {
        L.circleMarker([data.marker.latitude, data.marker.longitude], {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#16a34a',
          fillOpacity: 1,
        }).addTo(map);
      }
    </script>
  </body>
</html>`,
    };
  }, [center, interactive, marker, route, zoom]);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        originWhitelist={["*"]}
        source={source}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {overflow: 'hidden'},
  webview: {backgroundColor: '#e5e7eb'},
});