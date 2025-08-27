# iOS Device Testing Setup

## Quick Device Testing Approach

Since we're getting React Native version conflicts, let's use Xcode directly:

### Step 1: Open Project in Xcode

```bash
# Open the iOS workspace in Xcode
open apps/mobile-ios/ios/MobileIos.xcworkspace
```

### Step 2: Configure for Your Device

1. **Select your iPhone** from the device list (top toolbar in Xcode)
2. **Set Bundle Identifier**: 
   - Click on "MobileIos" in project navigator
   - Go to "Signing & Capabilities"
   - Change Bundle Identifier to something unique like: `com.yourcompany.salesperson-tracker`
3. **Select your Apple Developer Team** (or use automatic signing)

### Step 3: Build and Install

1. **Click the "Play" button** in Xcode to build and install
2. **Trust the app** on your iPhone when prompted (Settings → General → VPN & Device Management)
3. **Grant location permissions** when the app asks

### Step 4: Test Location Tracking

1. **Login** with: steve@harebrained-apps.com (password you set)
2. **Turn on location tracking**
3. **Visit one of your assigned Seattle accounts** (like Northgate Mall)
4. **Check the admin dashboard** to see if visits are detected

## Alternative: Use Expo for Easier Testing

If Xcode gives you trouble, we could also set up Expo for faster device testing:

```bash
# Install Expo CLI
npm install -g @expo/cli

# Create an Expo version
npx create-expo-app salesperson-tracker-mobile --template=blank-typescript

# Copy our components over
```

## Expected Behavior on Real Device

When you visit an assigned account location:
1. **SLC events** fire when you move ~500m
2. **Location events** get sent to Supabase
3. **Server algorithms** detect visit patterns
4. **Visit records** get created automatically
5. **Admin dashboard** shows new visits in real-time

## Troubleshooting

If the build fails in Xcode:
1. **Clean build folder** (Product → Clean Build Folder)
2. **Delete derived data** (Xcode → Preferences → Locations → Derived Data → Delete)
3. **Restart Xcode**
4. **Try building again**

## Success Metrics

Once working on device, you should see:
- ✅ App installs and runs on iPhone
- ✅ Location permission prompts appear
- ✅ Login works with salesperson credentials
- ✅ Assigned accounts load in the app
- ✅ Location events are created and sent to backend
- ✅ Visits are automatically detected when near accounts

Try the Xcode approach first - it's the most reliable for React Native apps!