# 📱 iOS Native Always-On Location Setup

This guide covers setting up the native iOS module for always-on background location tracking that works even when the app is completely closed.

## 🚨 **Critical Requirements**

### **1. Physical iOS Device Required**
- **❌ iOS Simulator**: Background location does NOT work in simulator
- **✅ Physical Device**: iPhone/iPad required for testing always-on tracking
- **📱 iOS 15.1+**: Minimum supported version

### **2. Developer Account & Entitlements**
- **🍎 Apple Developer Account**: Required for background location entitlements
- **📝 Proper Entitlements**: Must be configured in provisioning profile
- **🔒 Code Signing**: Proper certificates for background capabilities

## 🛠️ **Setup Steps**

### **Step 1: Configure iOS Entitlements**

The following files are already configured:

**`ios/mobile/mobile.entitlements`:**
```xml
<key>com.apple.developer.location.background</key>
<true/>
<key>com.apple.developer.location.continuous</key>  
<true/>
```

**`ios/mobile/Info.plist`:**
```xml
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>background-processing</string>
</array>
```

### **Step 2: Build & Install on Device**

```bash
# Navigate to mobile app
cd apps/mobile

# Install pods (includes native module)
cd ios && pod install && cd ..

# Build and install on connected device
npx expo run:ios --device

# Or use Xcode for debugging
open ios/mobile.xcworkspace
```

### **Step 3: Configure Device Permissions**

After installing the app on device:

1. **Grant Location Permission**:
   - Open app → Allow location access
   - **CRITICAL**: Choose "Allow While Using App" first
   - Go to Settings → Privacy & Security → Location Services → [App Name]
   - **Change to "Always"** ⭐ (required for background tracking)

2. **Enable Background App Refresh**:
   - Settings → General → Background App Refresh
   - Enable globally AND for your app specifically

3. **Test Permissions**:
   - Open app → Tracking tab
   - Should show "Native: Always (Perfect for background tracking)"

### **Step 4: Test Always-On Tracking**

1. **Start Tracking**: Tap toggle in Tracking tab
2. **Background Test**: 
   - Home button to background app
   - Move 500+ meters (or drive)
   - Check database for new location_events

3. **Closed App Test**: 
   - Force close app (swipe up → swipe app away)
   - Move significant distance (1+ miles)
   - iOS should auto-relaunch app and log location
   - Check database for events

## 📊 **Native Module Architecture**

### **Files Created:**

#### **Swift Implementation**
- **`RNBackgroundLocationManager.swift`**: Native iOS location manager
  - Implements `CLLocationManagerDelegate`
  - Handles background location updates
  - Direct Supabase API calls from native code
  - Automatic local queueing for failed network requests

#### **React Native Bridge**
- **`RNBackgroundLocationManager.m`**: Objective-C bridge
  - Exposes Swift module to React Native
  - Promise-based async methods
  - Event emitter for location updates

#### **TypeScript Wrapper**
- **`NativeLocationManager.ts`**: TypeScript interface
  - Type-safe wrapper for native module
  - Event listeners for location updates
  - Status monitoring and error handling

### **How It Works**

#### **1. App Active**
```
React Native ↔ Native Module ↔ iOS CoreLocation ↔ Database
```

#### **2. App Backgrounded**  
```
iOS CoreLocation → Native Swift → Direct API → Database
```

#### **3. App Closed**
```
iOS SLC → Auto App Launch → Native Swift → Database → App Closes
```

## 🔍 **Monitoring & Debugging**

### **Check Native Status**
In the mobile app Tracking tab, look for:
- **"Native: Always (Perfect for background tracking)"** ✅ Working
- **"Native: When In Use (Limited background tracking)"** ⚠️ Needs "Always" permission
- **"Native: Denied"** ❌ Permission denied
- **"Native: Not available"** ❌ Module not loaded

### **Database Monitoring**
```sql
-- Check recent location events (should continue when app closed)
SELECT 
    user_id,
    timestamp,
    latitude,
    longitude,
    event_type,
    processed,
    created_at
FROM location_events 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- Verify automated processing is working
SELECT * FROM get_processing_job_status();
```

### **iOS Console Logs**
Use Xcode → Window → Devices and Simulators → View Device Logs to see:
```
📍 Native location update received: {...}
📍 Location sent to Supabase successfully  
📍 Background location tracking started successfully
```

## ⚠️ **Common Issues**

### **"Native: Not available"**
- Pod install not run after adding Swift files
- Xcode project needs rebuilding
- Check that `.swift` and `.m` files are in project

### **"Native: When In Use" (Not Always)**
- User needs to manually change permission in iOS Settings
- App can request but can't force "Always" permission
- Guide users: Settings → Privacy → Location Services → [App] → Always

### **No Background Updates**
- Background App Refresh disabled
- Battery Low Power Mode enabled  
- Device not moved enough for SLC (need 500m+ movement)

### **Network Failures**
- Events queued locally in UserDefaults
- Automatic retry when network restored
- Check queued events count in app

## 🔋 **Battery Impact**

The native implementation is designed for minimal battery usage:

- **iOS SLC System**: Uses cell tower changes, not GPS
- **Smart Throttling**: Maximum one update per 2 minutes
- **Network Efficiency**: Background URL sessions
- **Queue Management**: Local storage prevents API spam

**Battery usage should be similar to Apple Maps or other navigation apps when running in background.**

## 🎯 **Production Deployment**

### **App Store Requirements**
1. **Background Location Justification**: Required in App Store review
   - Clearly explain business use case in app description
   - Reference legitimate business need for location tracking

2. **Privacy Policy**: Must disclose location data usage
   - How data is collected, stored, and used
   - User rights and data retention policies

3. **Entitlements**: Ensure production provisioning profile includes:
   - Background location entitlement
   - Background processing entitlement

### **User Onboarding**
- **Clear explanation** of why "Always" permission is needed
- **Step-by-step permission guide** in app
- **Fallback messaging** for users who deny always access

---

## 📞 **Support**

For technical issues:
1. Check device permissions and settings first
2. Monitor database logs for processing status  
3. Review iOS device logs via Xcode
4. Test on multiple physical devices for consistency

**The system provides enterprise-grade location tracking comparable to professional fleet management solutions!** 🚀