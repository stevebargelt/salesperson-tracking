# TODOs

## iOS: Secure token storage in Keychain

- Migrate native token persistence from `UserDefaults` to Keychain in `apps/mobile/ios/mobile/RNBackgroundLocationManager.swift`.
- Store at least the refresh token (and optionally the access token) using Keychain APIs (`SecItemAdd`/`SecItemUpdate`).
- Use `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` to allow background uploads while device is locked and prevent restore to another device.
- Consider an access group if future extensions (e.g., widgets) need access.
- Replace reads/writes at:
  - saving tokens when starting tracking
  - updating tokens after a refresh
  - loading tokens before refresh/flush

## Android parity (next milestone)

- Implement native background tracking with Fused Location Provider + Foreground Service.
- Persistent queue and token refresh (via GoTrue) similar to iOS.

## Geocoding (production)

- Replace client-side Nominatim fallback with a server-side RPC using `pg_net/http` and a paid geocoding provider.

## CI/CD: PR dev IPA artifact (future)

- Add a lightweight job to the PR checks workflow to build a development or ad-hoc .ipa and upload as an artifact for reviewers/QA.
- Reuse Fastlane lanes (e.g., `build_development`) and `actions/upload-artifact`.
- Run only on pull_request to reduce macOS minutes and avoid TestFlight uploads.
