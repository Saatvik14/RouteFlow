# Location provider setup

RouteFlow uses separate provider chains for location lookup and map display:

- Autocomplete, forward geocoding, reverse geocoding, and manifest geocoding: Google, then TomTom, then Geoapify.
- Map display: Google, then TomTom raster maps, then the existing OpenStreetMap/Esri fallback.

Providers with a missing key or a disabled flag are skipped. Backend quota, rate-limit, authentication, timeout, and provider failures fall through to the next configured provider. A provider that reports quota/auth failure is skipped for `LOCATION_PROVIDER_COOLDOWN_SECONDS` so every request does not repeatedly hit an exhausted key.

Automatic failover starts when a provider rejects requests; it cannot infer that a billing credit has been consumed while the provider continues accepting and charging requests. Set hard per-API quotas in Google Cloud and equivalent limits in TomTom to make the rejection point match the usage ceiling you want. Billing alerts alone are not a hard stop.

## Backend keys

Copy the location section from `backend/.env.example` into `backend/.env`:

```dotenv
GOOGLE_MAPS_API_KEY=
TOMTOM_API_KEY=
GEOAPIFY_API_KEY=

LOCATION_PROVIDER_ORDER=google,tomtom,geoapify
LOCATION_GOOGLE_ENABLED=true
LOCATION_TOMTOM_ENABLED=true
LOCATION_GEOAPIFY_ENABLED=true
```

Enable **Places API (New)** and **Geocoding API** for the Google server key. Restrict the key to those APIs and to the backend's outbound IP addresses where possible.

The backend returns Google Places predictions without fetching every prediction's details. It requests Place Details only for the item the user selects, and passes the same autocomplete session token to control billing. If that detail request exhausts quota, the selected address text is geocoded through the next available provider.

## App map keys

Copy `app/.env.example` to `app/.env.local` and add the map keys:

```dotenv
EXPO_PUBLIC_GOOGLE_MAPS_ENABLED=true
GOOGLE_MAPS_ANDROID_API_KEY=
GOOGLE_MAPS_IOS_API_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY=

EXPO_PUBLIC_TOMTOM_MAPS_ENABLED=true
EXPO_PUBLIC_TOMTOM_MAPS_API_KEY=
```

Enable **Maps SDK for Android**, **Maps SDK for iOS**, and **Maps JavaScript API** on the corresponding Google keys. Use separate restricted keys:

- Android: restrict by package `com.vvdevill.app` and release/debug SHA-1 fingerprints.
- iOS: restrict by bundle ID `com.vvdevill.app`.
- Web: restrict by the deployed HTTP referrers.

The TomTom map key is included in the client bundle, just like browser/mobile Google map keys, so apply TomTom's application/domain restrictions. Server-only Google, TomTom, and Geoapify lookup keys remain in `backend/.env` and are never sent to the app.

After changing native map keys, rebuild the development/production app because `app.config.js` injects them into the native projects at build time. Web public variables also require a fresh Expo export. Restart the backend after changing its provider flags or keys.

## Failover behavior

- Google and TomTom lookup quota responses (`RESOURCE_EXHAUSTED`, `OVER_QUERY_LIMIT`, HTTP 429, and related errors) trigger automatic backend failover.
- On web, Google script/auth loading failure switches to TomTom; repeated TomTom tile failures switch to OpenStreetMap or Esri imagery.
- On native, failure to initialize the Google map within 10 seconds switches to TomTom/OSM. Native Google SDKs do not expose every tile-quota failure to JavaScript, so `EXPO_PUBLIC_GOOGLE_MAPS_ENABLED=false` remains the deterministic emergency switch.
