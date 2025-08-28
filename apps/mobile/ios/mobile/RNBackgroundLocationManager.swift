import Foundation
import CoreLocation
import UIKit

@objc(RNBackgroundLocationManager)
class RNBackgroundLocationManager: RCTEventEmitter, CLLocationManagerDelegate {
    
    private var locationManager: CLLocationManager?
    private var isTracking: Bool = false
    private var lastLocationUpdate: Date = Date()
    private let minimumUpdateInterval: TimeInterval = 120 // 2 minutes between updates
    
    // User credentials for API calls
    private var userId: String?
    private var supabaseUrl: String?
    private var supabaseKey: String?
    
    override init() {
        super.init()
        setupLocationManager()
    }
    
    private func setupLocationManager() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyHundredMeters
        locationManager?.distanceFilter = 500 // 500 meters for SLC
        
        // Configure for background operation
        if #available(iOS 9.0, *) {
            locationManager?.allowsBackgroundLocationUpdates = true
        }
        locationManager?.pausesLocationUpdatesAutomatically = false
    }
    
    // MARK: - React Native Bridge Methods
    
    @objc
    func startBackgroundTracking(_ userId: String, supabaseUrl: String, supabaseKey: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        
        self.userId = userId
        self.supabaseUrl = supabaseUrl
        self.supabaseKey = supabaseKey
        
        // Request always authorization
        locationManager?.requestAlwaysAuthorization()
        
        // Start significant location changes
        if CLLocationManager.significantLocationChangeMonitoringAvailable() {
            locationManager?.startMonitoringSignificantLocationChanges()
            isTracking = true
            
            // Also start standard location updates for more precision when app is active
            locationManager?.startUpdatingLocation()
            
            resolver(["status": "started", "message": "Background location tracking started"])
        } else {
            rejecter("UNAVAILABLE", "Significant location changes not available", nil)
        }
    }
    
    @objc
    func stopBackgroundTracking(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        
        locationManager?.stopMonitoringSignificantLocationChanges()
        locationManager?.stopUpdatingLocation()
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
        guard let location = locations.last,
              let userId = self.userId,
              let supabaseUrl = self.supabaseUrl,
              let supabaseKey = self.supabaseKey else {
            return
        }
        
        // Throttle updates to prevent battery drain
        let now = Date()
        guard now.timeIntervalSince(lastLocationUpdate) >= minimumUpdateInterval else {
            return
        }
        lastLocationUpdate = now
        
        // Create location event data
        let locationData: [String: Any] = [
            "user_id": userId,
            "timestamp": ISO8601DateFormatter().string(from: location.timestamp),
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "event_type": "significant_change",
            "detected_accounts": [], // Server-side processing handles this
            "processed": false
        ]
        
        // Send to Supabase (works in background)
        sendLocationToSupabase(locationData: locationData, supabaseUrl: supabaseUrl, supabaseKey: supabaseKey)
        
        // Send event to React Native if app is active
        if hasListeners {
            sendEvent(withName: "onLocationUpdate", body: locationData)
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        let statusString = authorizationStatusString(status)
        
        if hasListeners {
            sendEvent(withName: "onAuthorizationChanged", body: ["status": statusString])
        }
        
        // Auto-start tracking if we get always authorization
        if status == .authorizedAlways && !isTracking && userId != nil {
            manager.startMonitoringSignificantLocationChanges()
            isTracking = true
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if hasListeners {
            sendEvent(withName: "onLocationError", body: ["error": error.localizedDescription])
        }
    }
    
    // MARK: - Helper Methods
    
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
    
    private func sendLocationToSupabase(locationData: [String: Any], supabaseUrl: String, supabaseKey: String) {
        guard let url = URL(string: "\(supabaseUrl)/rest/v1/location_events") else {
            print("❌ Invalid Supabase URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: locationData)
            request.httpBody = jsonData
            
            // Use background session for reliability
            let config = URLSessionConfiguration.background(withIdentifier: "com.mobile.background-location")
            config.sessionSendsLaunchEvents = true
            let session = URLSession(configuration: config)
            
            let task = session.dataTask(with: request) { [weak self] (data, response, error) in
                if let error = error {
                    print("❌ Failed to send location to Supabase: \(error.localizedDescription)")
                    // Queue for retry when app becomes active
                    self?.queueLocationEvent(locationData)
                } else {
                    print("📍 Location sent to Supabase successfully")
                }
            }
            task.resume()
            
        } catch {
            print("❌ Failed to serialize location data: \(error.localizedDescription)")
            queueLocationEvent(locationData)
        }
    }
    
    private func queueLocationEvent(_ locationData: [String: Any]) {
        // Store in UserDefaults for retry when app becomes active
        var queue = UserDefaults.standard.array(forKey: "location_queue") as? [[String: Any]] ?? []
        
        // Add timestamp for retry logic
        var eventWithRetry = locationData
        eventWithRetry["queued_at"] = Date().timeIntervalSince1970
        eventWithRetry["retry_count"] = 0
        
        queue.append(eventWithRetry)
        
        // Keep only last 100 events to prevent storage overflow
        if queue.count > 100 {
            queue = Array(queue.suffix(100))
        }
        
        UserDefaults.standard.set(queue, forKey: "location_queue")
        print("📍 Location event queued for retry. Queue size: \(queue.count)")
    }
    
    // MARK: - React Native Event Emitter
    
    override func supportedEvents() -> [String]! {
        return ["onLocationUpdate", "onAuthorizationChanged", "onLocationError"]
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
}