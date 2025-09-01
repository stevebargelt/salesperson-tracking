#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RNBackgroundLocationManager, RCTEventEmitter)

// Start background location tracking
RCT_EXTERN_METHOD(startBackgroundTracking:(NSString *)userId
                  supabaseUrl:(NSString *)supabaseUrl
                  supabaseKey:(NSString *)supabaseKey
                  accessToken:(NSString *)accessToken
                  refreshToken:(NSString *)refreshToken
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Legacy 4-arg variant to preserve compatibility
RCT_EXTERN_METHOD(startBackgroundTrackingLegacy:(NSString *)userId
                  supabaseUrl:(NSString *)supabaseUrl
                  supabaseKey:(NSString *)supabaseKey
                  accessToken:(NSString *)accessToken
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Stop background location tracking
RCT_EXTERN_METHOD(stopBackgroundTracking:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Get current tracking status and permissions
RCT_EXTERN_METHOD(getTrackingStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Get native queue status (count, lastQueuedAt, lastFlushAt)
RCT_EXTERN_METHOD(getQueueInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Manually trigger a queue flush
RCT_EXTERN_METHOD(flushQueueNow:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Clear the native queue (debugging)
RCT_EXTERN_METHOD(clearQueueNow:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
<<<<<<< HEAD

=======
>>>>>>> d80d974
@end
