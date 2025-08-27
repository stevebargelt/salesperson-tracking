# 📱 Salesperson Tracking System

A comprehensive location-based tracking system for field sales teams, built with React Native, React Admin Dashboard, and Supabase backend.

## 🏗️ **System Architecture**

### **Frontend Applications**
- **📱 Mobile App** (`apps/mobile`) - Ignite-based React Native iOS app
- **🖥️ Admin Dashboard** (`apps/admin-web`) - React web app for management

### **Backend & Database**  
- **🛢️ Supabase** - PostgreSQL + PostGIS for spatial operations
- **⚡ Automated Processing** - pg_cron jobs every 5 minutes
- **🔄 Real-time Sync** - Background location event correlation

### **Shared Libraries**
- **📦 Types** (`libs/shared/types`) - Shared TypeScript interfaces
- **🔌 Supabase Client** (`libs/shared/supabase`) - Database helpers
- **🛠️ Utilities** (`libs/shared/utils`) - Common functions

## 📍 **Location Tracking Features**

### **🔋 Always-On Location Tracking**
- **Native iOS Module**: Custom Swift implementation for true background tracking
- **Significant Location Changes (SLC)**: Battery-efficient iOS location monitoring
- **App State Coverage**: Works when app is active, backgrounded, OR completely closed
- **Automatic Restart**: iOS automatically relaunches app for location updates

### **📊 Intelligent Processing**
- **Server-side Correlation**: Backend processes location events into visits
- **PostGIS Spatial Queries**: Precise geofencing with confidence scoring
- **Automated Job**: Processes events every 5 minutes via pg_cron
- **Offline Queueing**: Location events stored locally when network unavailable

### **🎯 Visit Detection**
- **Geofence Entry/Exit**: Automatic visit creation when entering account radius
- **Confidence Scoring**: Only processes high-confidence location correlations
- **Overlap Prevention**: Smart logic prevents duplicate visits
- **Duration Calculation**: Automatic check-in/check-out timing

## 🚀 **Getting Started**

### **1. Database Setup**
```bash
# Run all migrations in Supabase SQL Editor
# See SUPABASE_SETUP.md for detailed instructions
```

**Required Migrations** (run in order):
1. `001_initial_schema.sql` - Core tables and types
2. `002_row_level_security.sql` - Security policies  
3. `003_spatial_functions.sql` - PostGIS and visit detection
4. `004_analytics_functions.sql` - Reporting and metrics
5. **`005_automated_processing.sql`** ⭐ - **Every 5-minute automation**

### **2. Start Applications**
```bash
# Start admin web app (http://localhost:4200)
npx nx dev admin-web

# Start mobile app development server  
npx nx start mobile

# Run mobile app on iOS simulator
npx expo run:ios --project-dir apps/mobile
```

### **3. Build iOS App with Native Module**
```bash
# Install pods with native modules
cd apps/mobile/ios && pod install

# Build and run on device (required for background location)
npx expo run:ios --project-dir apps/mobile --device
```

## 📱 **Mobile App Features**

### **🏠 Dashboard Tab**
- **Real-time metrics**: Today's visits, total hours, weekly stats
- **Last visit info**: Most recent account visited with date
- **Live data**: Fetched from Supabase visits table

### **📍 Tracking Tab**  
- **Native tracking toggle**: Enables always-on iOS location monitoring
- **Status monitoring**: Shows native module status and permissions
- **Queue management**: View and sync offline location events
- **Manual controls**: Force sync, get current location

### **🏢 Accounts Tab**
- **Real distances**: GPS-calculated distances from current location
- **Sorted by proximity**: Closest accounts first
- **Account details**: Name, address, geofence radius
- **Dynamic updates**: Refreshes as you move

### **👤 Profile Tab**
- **User information**: Email, role, account status
- **Settings overview**: Location permissions, background refresh status  
- **Statistics**: Total visits, weekly counts, average durations
- **Data management**: Clear local storage, sign out

## 🖥️ **Admin Dashboard Features**

- **User Management**: Create and manage salesperson accounts
- **Account Management**: Define client locations with geofences
- **Visit Analytics**: Monitor and analyze visit data
- **Real-time Monitoring**: Track active users and processing status

## 🔧 **Technical Highlights**

### **🔋 Battery Optimization**
- **iOS SLC**: Uses system-level significant location changes
- **Minimal processing**: Client only logs events, server correlates visits
- **Smart throttling**: 2-minute minimum between location updates
- **Background URL sessions**: Efficient network usage

### **🛡️ Security & Privacy**
- **Row-level security**: Users only see their own data
- **Permission-based access**: Proper iOS location permission handling
- **Encrypted transport**: HTTPS API calls to Supabase
- **Local queueing**: Secure local storage for offline events

### **📈 Scalability**
- **Server-side processing**: Handles multiple users simultaneously
- **Spatial indexing**: Optimized PostGIS queries
- **Automated cleanup**: Prevents data overflow
- **Monitoring tools**: Built-in health checks and metrics

## 🚨 **Important Notes**

### **iOS Device Testing Required**
- **Simulator limitation**: Background location doesn't work in iOS Simulator
- **Physical device**: Required for testing always-on tracking
- **Developer account**: Needed for background location entitlements

### **User Permissions**
- **"Always" location access**: Required for background tracking
- **Background App Refresh**: Must be enabled in iOS Settings
- **Notification permissions**: For location update alerts

### **Monitoring Commands**

**Check automated processing status:**
```sql
-- Verify pg_cron job is running
SELECT * FROM get_processing_job_status();

-- Manual processing test  
SELECT * FROM trigger_location_processing();

-- Check unprocessed events
SELECT COUNT(*) FROM location_events WHERE processed = false;
```

## 📊 **System Status**

- ✅ **Phase 1**: Foundation complete (database, schemas, types)
- ✅ **Phase 2**: Mobile app with native iOS always-on tracking
- ✅ **Phase 3**: Admin dashboard for management  
- ✅ **Phase 4**: Automated backend processing (5-minute intervals)
- ✅ **Phase 5**: Real-time data integration

**🎯 The system is production-ready for field sales location tracking!**

---

## 🔗 **Related Documentation**

- **[Supabase Setup Guide](SUPABASE_SETUP.md)** - Database configuration
- **[Implementation Status](IMPLEMENTATION_STATUS.md)** - Development progress
- **[iOS Device Setup](IOS_DEVICE_SETUP.md)** - Device configuration guide