import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ordersService } from './../../services/api/orders';
import { routesService } from './../../services/api/routes';
import { ROUTE_STATUS_PENDING } from './route-preview.helpers';

function getRouteMethod<T extends (...args: any[]) => any>(name: string): T {
  const method = (routesService as Record<string, any>)[name];

  if (typeof method !== 'function') {
    throw new Error(`Missing routesService.${name}. Add this API method first.`);
  }

  return method.bind(routesService) as T;
}


function getAssetName(asset: any, fallbackName: string) {
  if (asset?.fileName) return String(asset.fileName);
  if (asset?.name) return String(asset.name);
  if (asset?.uri) {
    const parts = asset.uri.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      return lastPart;
    }
  }
  return fallbackName;
}

function getAssetMimeType(asset: any, fallbackType: string) {
  return String(asset?.mimeType || asset?.type || fallbackType);
}

async function appendAssetToFormData(
  formData: FormData,
  fieldName: string,
  asset: any,
  fallbackName: string,
  fallbackType: string,
) {
  const name = getAssetName(asset, fallbackName);
  const type = getAssetMimeType(asset, fallbackType);

  if (Platform.OS === 'web') {
    if (asset?.file) {
      formData.append(fieldName, asset.file);
      return;
    }

    const blob = await fetch(asset.uri).then((response) => response.blob());
    formData.append(fieldName, new File([blob], name, { type }));
    return;
  }

  formData.append(fieldName, {
    uri: asset.uri,
    name,
    type,
  } as any);
}

async function openCameraForImage() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Camera permission is required.');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

export async function scanAddressFromCamera() {
  const asset = await openCameraForImage();
  if (!asset) return null;

  const formData = new FormData();
  await appendAssetToFormData(formData, 'image', asset, 'address-scan.jpg', 'image/jpeg');

  const scanAddressImage = getRouteMethod<(formData: FormData) => Promise<any>>(
    'scanAddressImage',
  );

  return scanAddressImage(formData);
}

export async function scanRouteManifestFromCamera() {
  const asset = await openCameraForImage();
  if (!asset) return null;

  const formData = new FormData();
  await appendAssetToFormData(formData, 'image', asset, 'route-manifest-scan.jpg', 'image/jpeg');

  const scanRouteManifestImage = getRouteMethod<(formData: FormData) => Promise<any>>(
    'scanRouteManifestImage',
  );

  return scanRouteManifestImage(formData);
}

export async function importRouteManifestFromFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const pickedFile = result.assets[0];
  let fallbackName = 'route-manifest.xlsx';
  let fallbackMime = 'application/octet-stream';

  if (pickedFile.uri) {
    const uri = pickedFile.uri.toLowerCase();
    if (uri.endsWith('.csv')) {
      fallbackName = 'route-manifest.csv';
      fallbackMime = 'text/csv';
    } else if (uri.endsWith('.xls')) {
      fallbackName = 'route-manifest.xls';
      fallbackMime = 'application/vnd.ms-excel';
    } else if (uri.endsWith('.xlsx')) {
      fallbackName = 'route-manifest.xlsx';
      fallbackMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
  }

  const formData = new FormData();
  await appendAssetToFormData(
    formData,
    'file',
    pickedFile,
    fallbackName,
    fallbackMime,
  );

  const importRouteManifest = getRouteMethod<(formData: FormData) => Promise<any>>(
    'importRouteManifest',
  );

  return importRouteManifest(formData);
}

export async function resolveAddressText(text: string) {
  const resolveAddress = getRouteMethod<(text: string) => Promise<any>>(
    'resolveAddressText',
  );

  return resolveAddress(text);
}

function getWebSpeechRecognitionConstructor() {
  const globalRef = globalThis as any;

  return (
    globalRef.SpeechRecognition ||
    globalRef.webkitSpeechRecognition ||
    null
  );
}

function listenForWebVoiceAddress() {
  return new Promise<string>((resolve, reject) => {
    const SpeechRecognition = getWebSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      reject(new Error('Voice input is not supported in this browser.'));
      return;
    }

    const recognition = new SpeechRecognition();

    let settled = false;
    let latestTranscript = '';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);

      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };

    const finish = (text: string) => {
      if (settled) return;

      settled = true;
      cleanup();

      const cleanText = text.trim();

      if (!cleanText) {
        reject(new Error('No voice input detected.'));
        return;
      }

      resolve(cleanText);
    };

    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript =
        event?.results?.[0]?.[0]?.transcript ||
        event?.results?.[0]?.transcript ||
        latestTranscript ||
        '';

      latestTranscript = String(transcript);
      finish(latestTranscript);
    };

    recognition.onerror = (event: any) => {
      if (settled) return;

      settled = true;
      cleanup();

      reject(new Error(event?.message || event?.error || 'Voice recognition failed.'));
    };

    recognition.onend = () => {
      if (latestTranscript) {
        finish(latestTranscript);
      }
    };

    timeoutId = setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // ignore stop errors
      }

      if (!settled) {
        finish(latestTranscript);
      }
    }, 12000);

    recognition.start();
  });
}

export async function listenForVoiceAddress() {
  if (Platform.OS === 'web') {
    return listenForWebVoiceAddress();
  }

  const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');

  const SpeechRecognitionModule = ExpoSpeechRecognitionModule as any;

  return new Promise<string>(async (resolve, reject) => {
    let settled = false;
    let latestTranscript = '';

    let resultSubscription: { remove: () => void } | null = null;
    let errorSubscription: { remove: () => void } | null = null;
    let endSubscription: { remove: () => void } | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      resultSubscription?.remove();
      errorSubscription?.remove();
      endSubscription?.remove();

      if (timeoutId) clearTimeout(timeoutId);
    };

    const finish = (text: string) => {
      if (settled) return;

      settled = true;
      cleanup();

      const cleanText = text.trim();

      if (!cleanText) {
        reject(new Error('No voice input detected.'));
        return;
      }

      resolve(cleanText);
    };

    try {
      const permission = await SpeechRecognitionModule.requestPermissionsAsync();

      if (!permission?.granted) {
        reject(new Error('Microphone and speech recognition permission are required.'));
        return;
      }

      resultSubscription = SpeechRecognitionModule.addListener('result', (event: any) => {
        latestTranscript = String(
          event?.results?.[0]?.transcript ||
            event?.results?.[0]?.alternatives?.[0]?.transcript ||
            event?.transcript ||
            latestTranscript ||
            '',
        );

        finish(latestTranscript);
      });

      errorSubscription = SpeechRecognitionModule.addListener('error', (event: any) => {
        if (settled) return;

        settled = true;
        cleanup();

        reject(new Error(event?.message || event?.error || 'Voice recognition failed.'));
      });

      endSubscription = SpeechRecognitionModule.addListener('end', () => {
        if (latestTranscript) {
          finish(latestTranscript);
        }
      });

      timeoutId = setTimeout(() => {
        try {
          SpeechRecognitionModule.stop();
        } catch {
          // ignore stop errors
        }

        if (!settled) {
          finish(latestTranscript);
        }
      }, 12000);

      SpeechRecognitionModule.start({
        lang: 'en-IN',
        interimResults: false,
        continuous: false,
      });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export function buildManifestOrderPayloads({
  routeId,
  rows,
  startSequence,
}: {
  routeId: string;
  rows: any[];
  startSequence: number;
}) {
  return rows
    .filter((row) => row && row.valid !== false)
    .filter((row) => row.latitude !== undefined && row.longitude !== undefined)
    .map((row, index) => {
      const address = String(row.address || row.fullAddress || row.full_address || '');
      const title = String(row.title || row.customer_name || row.customerName || address.split(',')[0] || `Stop ${index + 1}`);

      return {
        route_id: routeId,
        sequence: startSequence + index,
        title,
        customer_name: row.customer_name || row.customerName || '',
        phone: row.phone || row.mobile || '',
        address,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        location:
          row.location ||
          {
            mode: 'manual_address',
            address,
            selectedFromSuggestion: true,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            details: {
              placeId: row.placeId || row.place_id || '',
              addressLine1: title,
              addressLine2: row.subtitle || '',
              city: row.city || '',
              district: row.district || '',
              state: row.state || '',
              country: row.country || '',
              countryCode: row.countryCode || row.country_code || '',
              postalCode: row.postalCode || row.postal_code || row.postcode || '',
              latitude: Number(row.latitude),
              longitude: Number(row.longitude),
            },
          },
        notes: row.notes || '',
        packages: Number(row.packages || row.package_count || 1),
        stop_type: row.stop_type || row.stopType || 'delivery',
        source: row.source || 'manifest',
        raw_manifest_row: row.raw || row.raw_manifest_row || row,
        status: ROUTE_STATUS_PENDING,
      };
    });
}

function normalizeBulkOrderPayload(payload: any, index: number) {
  const sequence = Number(
    payload?.sequence_no ??
      payload?.sequenceNo ??
      payload?.sequence ??
      index + 1,
  );

  const timeAtStopValue =
    payload?.time_at_stop ??
    payload?.timeAtStopMinutes ??
    payload?.time_at_stop_minutes ??
    null;

  return {
    ...payload,
    sequence,
    sequence_no: sequence,
    order_preference:
      payload?.order_preference ?? payload?.order ?? 'auto',
    time_at_stop:
      timeAtStopValue === null || timeAtStopValue === undefined
        ? null
        : Math.max(1, Number(timeAtStopValue)),
  };
}

function getBulkCreatedOrders(payload: any) {
  const rawPayload = payload?.data ?? payload;
  const result = rawPayload?.data ?? rawPayload;

  const created =
    result?.created_orders ??
    result?.createdOrders ??
    result?.created ??
    result?.orders ??
    result?.results ??
    [];

  return Array.isArray(created) ? created : [];
}

export async function addManifestStopsToBackend( payloads: any) {
  if (!Array.isArray(payloads.stops) || payloads.stops.length === 0) {
    throw new Error('At least one stop is required for bulk creation.');
  }

  const payload = {
    stops: payloads.stops.map(normalizeBulkOrderPayload),
    route_id: payloads.route_id,
  }

  const response = await ordersService.bulkCreateOrders(payload);
  const rawPayload = response?.data ?? response;
  const result = rawPayload?.data ?? rawPayload;
  const created = getBulkCreatedOrders(response);

  const failedCount = Number(
    result?.failed_count ??
      result?.failedCount ??
      result?.failures?.length ??
      0,
  );

  const createdCount = Number(
    result?.created_count ??
      result?.createdCount ??
      result?.inserted_count ??
      result?.insertedCount ??
      (created.length || (failedCount === 0 ? payloads.stops.length : 0)),
  );

  return {
    success:
      response?.success ??
      rawPayload?.success ??
      result?.success ??
      failedCount === 0,
    message:
      result?.message ??
      rawPayload?.message ??
      response?.message ??
      '',
    data: {
      created_count: createdCount,
      failed_count: failedCount,
      created,
      errors: result?.errors ?? result?.failures ?? [],
    },
    raw_response: response,
  };
}
