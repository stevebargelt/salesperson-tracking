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
    private var lastSentAt: Date? = nil

    override init() {
        super.init()
        print("🔧 RNBackgroundLocationManager native module initialized")
        setupLocationManager()
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

    // MARK: - React Native Bridge Methods
    @objc
    func startBackgroundTracking(_ userId: String, supabaseUrl: String, supabaseKey: String, accessToken: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        print("🔧 startBackgroundTracking called with userId: \(userId)")
        self.userId = userId
        self.supabaseUrl = supabaseUrl
        self.supabaseKey = supabaseKey
        self.accessToken = accessToken

        locationManager?.requestAlwaysAuthorization()

        if CLLocationManager.significantLocationChangeMonitoringAvailable() {
            locationManager?.startMonitoringSignificantLocationChanges()
            isTracking = true
            resolver(["status": "started", "message": "Background location tracking started"])
        } else {
            rejecter("UNAVAILABLE", "Significant location changes not available", nil)
        }
    }

    @objc
    func stopBackgroundTracking(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        locationManager?.stopMonitoringSignificantLocationChanges()
        isTracking = false
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
                print("📍 Failed to send location to Supabase")
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

        // Default URLSession should be sufficient; can be upgraded to background session if needed
        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                print("📍 Supabase POST error: \(error.localizedDescription)")
                completion(false)
                return
            }
            if let httpResp = response as? HTTPURLResponse, (200...299).contains(httpResp.statusCode) {
                completion(true)
            } else {
                if let httpResp = response as? HTTPURLResponse {
                    print("📍 Supabase POST failed with status: \(httpResp.statusCode)")
                }
                completion(false)
            }
        }.resume()
    }
}
