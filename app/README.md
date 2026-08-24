# RouteFloww app

Expo Router/React Native application supporting business dispatch on web and a mobile-first driver workflow on Android/iOS.

## Setup

1. Run `npm install`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to the backend origin, for example `http://localhost:5000` on web or `http://10.0.2.2:5000` from the Android emulator.
3. Start with `npx expo start`.

The installed source currently targets Expo SDK 54. Keep package versions aligned with that SDK until a separate, verified framework upgrade is planned.

## Enterprise screens

- `/dashboard` — dispatcher alerts, operational route progress, filters and assignment
- `/team` — business members, secure invitations, drivers, permissions and route history
- `/reports` — date/driver filters, delivery results and CSV export
- `/route-detail?id=...` — live progress, location freshness, stop outcomes, proofs and audit timeline
- `/driver-routes` — today, upcoming and recent driver assignments
- `/driver-route?id=...` — accept/reject/start, current-stop execution, proof capture and route completion
- `/invite?token=...` — invitation validation, sign-in acceptance and new-account password setup

Authentication routing uses organization membership when available and falls back to the legacy JWT role for existing independent drivers.

## Commands

| Command | Purpose |
| --- | --- |
| `npx expo start` | Start the Expo development server |
| `npx tsc --noEmit` | Type-check application source |
| `npx expo export --platform web` | Create the static web export |
| `npx expo export --platform android` | Bundle the Android application for platform validation |

`npm run lint` needs ESLint packages and a repository configuration; they are not currently installed in this project.
