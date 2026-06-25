import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from './../constants/api';

async function uploadFile({
  url,
  fieldName,
  file,
  token,
}: {
  url: string;
  fieldName: string;
  file: {
    uri: string;
    name: string;
    type: string;
  };
  token?: string;
}) {
  const formData = new FormData();

  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Upload failed');
  }

  return data;
}

export async function scanAddressWithCamera(token?: string) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Camera permission is required');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  return uploadFile({
    url: `${API_BASE_URL}/route/address/scan`,
    fieldName: 'image',
    token,
    file: {
      uri: asset.uri,
      name: 'address-scan.jpg',
      type: 'image/jpeg',
    },
  });
}

export async function scanRouteManifestWithCamera(token?: string) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Camera permission is required');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  return uploadFile({
    url: `${API_BASE_URL}/route/manifest/scan`,
    fieldName: 'image',
    token,
    file: {
      uri: asset.uri,
      name: 'manifest-scan.jpg',
      type: 'image/jpeg',
    },
  });
}

export async function importRouteManifestFile(token?: string) {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  return uploadFile({
    url: `${API_BASE_URL}/route/manifest/import`,
    fieldName: 'file',
    token,
    file: {
      uri: asset.uri,
      name: asset.name || 'manifest.xlsx',
      type: asset.mimeType || 'application/octet-stream',
    },
  });
}

export async function resolveVoiceAddress(text: string, token?: string) {
  const response = await fetch(`${API_BASE_URL}/route/address/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Could not resolve voice address');
  }

  return data;
}

export async function addBulkStopsToRoute({
  routeId,
  stops,
  token,
}: {
  routeId: number | string;
  stops: any[];
  token?: string;
}) {
  const validStops = stops
    .filter(stop => stop.valid !== false)
    .map(stop => ({
      title: stop.title || stop.customer_name || '',
      customer_name: stop.customer_name || '',
      phone: stop.phone || '',
      address: stop.address,
      latitude: stop.latitude,
      longitude: stop.longitude,
      location: stop.location,
      notes: stop.notes || '',
      packages: stop.packages || 1,
      stop_type: 'delivery',
      source: stop.source || 'manifest',
      raw_manifest_row: stop.raw || stop.raw_manifest_row || null,
    }));

  const response = await fetch(`${API_BASE_URL}/order/add/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      route_id: routeId,
      stops: validStops,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Could not add stops');
  }

  return data;
}