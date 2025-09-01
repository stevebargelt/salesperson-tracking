import Foundation
import CoreLocation
import UIKit
import React

@objc(RNBackgroundLocationManager)
class RNBackgroundLocationManager: RCTEventEmitter, CLLocationManagerDelegate {
    private var locationManager: CLLocationManager?
    private var isTracking: Bool = false
    private var userId: String?
    private var supabaseUrl: String?
    private var supabaseKey: String?
    private var accessToken: String?
    private var refreshToken: String?
    private var urlSession: URLSession!
    private let queueKey = "location_event_queue"
    private let tokenStoreKey = "supabase_tokens" // TODO: Migrate to Keychain with kSecAttrAccessibleAfterFirstUnlock(ThisDeviceOnly)
    private var flushTimer: Timer?
    private var lastFlushAt: Date?
    private var lastStatusCode: Int?
    private var lastSentAt: Date? = nil

    override init() {
        super.init()
        print("🔧 RNBackgroundLocationManager native module initialized")
        setupLocationManager()
        setupUrlSession()
        // Try to flush any queued events on init
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.flushQueue()
        }
    }

    override static func moduleName() -> String! { "RNBackgroundLocationManager" }
    override static func requiresMainQueueSetup() -> Bool { true }

    override func supportedEvents() -> [String]! {
        return ["onLocationUpdate", "onAuthorizationChanged", "onLocationError"]
    }

    private func setupLocationManager() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyHundredMeters
        locationManager?.distanceFilter = 500 // 500 meters for SLC
        if #available(iOS 9.0, *) {
            locationManager?.allowsBackgroundLocationUpdates = true
        }
        locationManager?.pausesLocationUpdatesAutomatically = false
    }

    private func setupUrlSession() {
        // Use default session because background sessions do not support completion handlers.
        // TODO: Implement a delegate-based background URLSession for true terminated uploads.
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        urlSession = URLSession(configuration: config)
    }

    // MARK: - React Native Bridge Methods
    @objc
    func startBackgroundTracking(_ userId: String, supabaseUrl: String, supabaseKey: String, accessToken: String, refreshToken: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        print("🔧 startBackgroundTracking called with userId: \(userId)")
        self.userId = userId
        self.supabaseUrl = supabaseUrl
        self.supabaseKey = supabaseKey
        self.accessToken = accessToken
        self.refreshToken = refreshToken

        // Persist tokens for later refresh attempts
        let tokenDict: [String: String] = ["access": accessToken, "refresh": refreshToken]
        // TODO: Store in Keychain instead of UserDefaults for stronger security
        UserDefaults.standard.set(tokenDict, forKey: tokenStoreKey)

        locationManager?.requestAlwaysAuthorization()

        if CLLocationManager.significantLocationChangeMonitoringAvailable() {
            locationManager?.startMonitoringSignificantLocationChanges()
            isTracking = true

            // Start periodic queue flush
            self.flushTimer?.invalidate()
            self.flushTimer = Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { [weak self] _ in
                self?.flushQueue()
            }
            resolver(["status": "started", "message": "Background location tracking started"])
        } else {
            rejecter("UNAVAILABLE", "Significant location changes not available", nil)
        }
    }

    // Legacy 4-arg method: load refresh token from storage if available
    @objc(startBackgroundTrackingLegacy:supabaseUrl:supabaseKey:accessToken:resolver:rejecter:)
    func startBackgroundTrackingLegacy(_ userId: String, supabaseUrl: String, supabaseKey: String, accessToken: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        var savedRefresh: String? = nil
        if let saved = UserDefaults.standard.dictionary(forKey: tokenStoreKey) as? [String: String] {
            savedRefresh = saved["refresh"]
        }
        self.startBackgroundTracking(userId, supabaseUrl: supabaseUrl, supabaseKey: supabaseKey, accessToken: accessToken, refreshToken: savedRefresh ?? "", resolver: resolver, rejecter: rejecter)
    }

    @objc
    func stopBackgroundTracking(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        locationManager?.stopMonitoringSignificantLocationChanges()
        isTracking = false
        flushTimer?.invalidate()
        flushTimer = nil
        resolver(["status": "stopped", "message": "Background location tracking stopped"])
    }

    @objc
    func getTrackingStatus(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let authStatus = CLLocationManager.authorizationStatus()
        let statusString = authorizationStatusString(authStatus)
        resolver([
            "isTracking": isTracking,
            "authorizationStatus": statusString,
            "backgroundRefreshStatus": UIApplication.shared.backgroundRefreshStatus.rawValue,
            "significantLocationAvailable": CLLocationManager.significantLocationChangeMonitoringAvailable()
        ])
    }

    // MARK: - CLLocationManagerDelegate
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        // Throttle to minimum 2 minutes between sends
        if let last = lastSentAt, Date().timeIntervalSince(last) < 120 { return }
        lastSentAt = Date()

        let payload: [String: Any] = [
            "user_id": userId ?? "",
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": max(location.horizontalAccuracy, 0),
            "event_type": "significant_change",
            "detected_accounts": [],
            "processed": false
        ]

        print("📍 Native location update: \(location.coordinate.latitude), \(location.coordinate.longitude)")
        sendEvent(withName: "onLocationUpdate", body: payload)

        postToSupabase(payload: payload) { success in
            if success {
                print("📍 Location sent to Supabase successfully")
            } else {
                print("📍 Failed to send location to Supabase, queuing")
                self.enqueue(payload: payload)
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        let statusString = authorizationStatusString(status)
        print("📍 Authorization changed to: \(statusString)")
        sendEvent(withName: "onAuthorizationChanged", body: ["status": statusString])

        if status == .authorizedAlways && !isTracking && userId != nil {
            manager.startMonitoringSignificantLocationChanges()
            isTracking = true
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("📍 Location error: \(error.localizedDescription)")
        sendEvent(withName: "onLocationError", body: ["error": error.localizedDescription])
    }

    // MARK: - Helpers
    private func authorizationStatusString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorizedWhenInUse: return "whenInUse"
        case .authorizedAlways: return "always"
        @unknown default: return "unknown"
        }
    }

    private func postToSupabase(payload: [String: Any], completion: @escaping (Bool) -> Void) {
        guard let supabaseUrl = self.supabaseUrl, let supabaseKey = self.supabaseKey, let token = self.accessToken else {
            completion(false)
            return
        }

        guard let url = URL(string: "\(supabaseUrl)/rest/v1/location_events") else {
            completion(false)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("return=minimal", forHTTPHeaderField: "Prefer")

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: [payload], options: [])
        } catch {
            completion(false)
            return
        }

        urlSession.dataTask(with: request) { _, response, error in
            if let error = error {
                print("📍 Supabase POST error: \(error.localizedDescription)")
                completion(false)
                return
            }
            if let httpResp = response as? HTTPURLResponse {
                self.lastStatusCode = httpResp.statusCode
                if (200...299).contains(httpResp.statusCode) {
                    completion(true)
                } else if httpResp.statusCode == 401 {
                    // Try to refresh token and retry once
                    self.refreshAccessToken { refreshed in
                        if refreshed {
                            self.postToSupabase(payload: payload, completion: completion)
                        } else {
                            completion(false)
                        }
                    }
                } else {
                    print("📍 Supabase POST failed with status: \(httpResp.statusCode)")
                    completion(false)
                }
            } else {
                completion(false)
            }
        }.resume()
    }

    // MARK: - Queue & Retry
    private func enqueue(payload: [String: Any]) {
        var queue = (UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]]) ?? []
        var item = payload
        item["_ts"] = ISO8601DateFormatter().string(from: Date())
        queue.append(item)
        // Keep last 200 items
        if queue.count > 200 { queue.removeFirst(queue.count - 200) }
        UserDefaults.standard.set(queue, forKey: queueKey)
    }

    private func flushQueue() {
        let queue = (UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]]) ?? []

        if queue.isEmpty { return }
        // Attempt batch post
        guard let supabaseUrl = self.supabaseUrl, let supabaseKey = self.supabaseKey else { return }
        guard let url = URL(string: "\(supabaseUrl)/rest/v1/location_events") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(supabaseKey, forHTTPHeaderField: "apikey")
        if let token = self.accessToken { request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.addValue("return=minimal", forHTTPHeaderField: "Prefer")

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: queue, options: [])
        } catch { return }

        urlSession.dataTask(with: request) { _, response, error in
            if let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                // Clear queue
                UserDefaults.standard.removeObject(forKey: self.queueKey)
                print("📍 Flushed \(queue.count) queued events")
                self.lastFlushAt = Date()
                self.lastStatusCode = httpResp.statusCode
            } else if let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 401 {
                self.lastStatusCode = httpResp.statusCode
                self.refreshAccessToken { refreshed in
                    if refreshed { self.flushQueue() }
                }
            } else if let error = error {
                print("📍 Flush queue network error: \(error.localizedDescription)")
            }
        }.resume()
    }

    // Expose manual flush
    @objc
    func flushQueueNow(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let before = (UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]])?.count ?? 0
        self.flushQueue()
        let after = (UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]])?.count ?? 0

        var lastAny: Any = NSNull()
        if let lf = self.lastFlushAt {
            lastAny = ISO8601DateFormatter().string(from: lf) as Any
        }
        resolver(["queuedBefore": before, "queuedAfter": after, "lastFlushAt": lastAny])

    }

    // MARK: - Queue Info
    @objc
    func getQueueInfo(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let queue = (UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]]) ?? []
        let count = queue.count
        var lastQueuedAt: String? = nil
        if let last = queue.last, let ts = last["_ts"] as? String { lastQueuedAt = ts }
        let lastFlushTs = lastFlushAt != nil ? ISO8601DateFormatter().string(from: lastFlushAt!) : nil
        resolver([
            "queueCount": count,
            "lastQueuedAt": lastQueuedAt as Any,
            "lastFlushAt": lastFlushTs as Any,
            "lastStatusCode": lastStatusCode as Any
        ])
    }

    // Clear queue contents (debugging)
    @objc
    func clearQueueNow(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let count = (UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]])?.count ?? 0
        UserDefaults.standard.removeObject(forKey: queueKey)
        resolver(["cleared": count])
    }

    // MARK: - Token Refresh
    private func refreshAccessToken(completion: @escaping (Bool) -> Void) {
        guard let supabaseUrl = self.supabaseUrl, let supabaseKey = self.supabaseKey else { completion(false); return }
        // Load refresh token from memory or storage
        var refresh = self.refreshToken
        if refresh == nil {
            if let saved = UserDefaults.standard.dictionary(forKey: tokenStoreKey) as? [String: String] {
                self.accessToken = saved["access"]
                refresh = saved["refresh"]
            }
        }
        guard let refreshToken = refresh else { completion(false); return }

        guard let url = URL(string: "\(supabaseUrl)/auth/v1/token?grant_type=refresh_token") else { completion(false); return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(supabaseKey, forHTTPHeaderField: "apikey")
        // GoTrue requires Authorization: Bearer <refresh_token>
        request.addValue("Bearer \(refreshToken)", forHTTPHeaderField: "Authorization")
        let body: [String: Any] = ["refresh_token": refreshToken]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body, options: [])

        urlSession.dataTask(with: request) { data, response, error in
            if let error = error { print("📍 Token refresh error: \(error.localizedDescription)"); completion(false); return }
            guard let data = data else { completion(false); return }
            if let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
               let newAccess = json["access_token"] as? String {
                self.accessToken = newAccess
                if let newRefresh = json["refresh_token"] as? String { self.refreshToken = newRefresh }
                // Persist
                var dict: [String: String] = ["access": newAccess]
                if let r = self.refreshToken { dict["refresh"] = r }
                // TODO: Store in Keychain instead of UserDefaults for stronger security
                UserDefaults.standard.set(dict, forKey: self.tokenStoreKey)
                print("📍 Access token refreshed")
                completion(true)
            } else {
                completion(false)
            }
        }.resume()
    }
}
