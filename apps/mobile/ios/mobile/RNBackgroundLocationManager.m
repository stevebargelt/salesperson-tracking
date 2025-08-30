#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RNBackgroundLocationManager, RCTEventEmitter)

// Start background location tracking
RCT_EXTERN_METHOD(startBackgroundTracking:(NSString *)userId
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

@end
