import Foundation
import CoreLocation
import UIKit

@objc(RNBackgroundLocationManager)
class RNBackgroundLocationManager: NSObject, RCTBridgeModule {
    
    static func moduleName() -> String {
        return "RNBackgroundLocationManager"
    }
    
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    private var locationManager: CLLocationManager?
    private var isTracking: Bool = false
    private var userId: String?
    
    override init() {
        super.init()
        print("🔧 RNBackgroundLocationManager native module initialized")
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
        
        print("🔧 startBackgroundTracking called with userId: \(userId)")
        self.userId = userId
        
        // Request always authorization
        locationManager?.requestAlwaysAuthorization()
        
        // Start significant location changes
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
}

// MARK: - CLLocationManagerDelegate
extension RNBackgroundLocationManager: CLLocationManagerDelegate {
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        print("📍 Native location update: \(location.coordinate.latitude), \(location.coordinate.longitude)")
        
        // For now, just log - we'll add Supabase integration after basic module works
    }
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        let statusString = authorizationStatusString(status)
        print("📍 Authorization changed to: \(statusString)")
        
        // Auto-start tracking if we get always authorization
        if status == .authorizedAlways && !isTracking && userId != nil {
            manager.startMonitoringSignificantLocationChanges()
            isTracking = true
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("📍 Location error: \(error.localizedDescription)")
    }
}