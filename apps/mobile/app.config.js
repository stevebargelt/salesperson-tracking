/**
 * Use ts-node here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript
 */
require("ts-node/register");
// Load environment variables from workspace root .env file
require('dotenv').config({ path: '../../.env' });
/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }) => {
    const existingPlugins = config.plugins ?? [];
    return {
        ...config,
        extra: {
            ...config.extra,
            supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
            supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        ios: {
            ...config.ios,
            // This privacyManifests is to get you started.
            // See Expo's guide on apple privacy manifests here:
            // https://docs.expo.dev/guides/apple-privacy/
            // You may need to add more privacy manifests depending on your app's usage of APIs.
            // More details and a list of "required reason" APIs can be found in the Apple Developer Documentation.
            // https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
            privacyManifests: {
                NSPrivacyAccessedAPITypes: [
                    {
                        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
                        NSPrivacyAccessedAPITypeReasons: ["CA92.1"], // CA92.1 = "Access info from same app, per documentation"
                    },
                ],
            },
        },
        plugins: [...existingPlugins, require("./plugins/withSplashScreen").withSplashScreen],
    };
};
export {};
//# sourceMappingURL=app.config.js.map