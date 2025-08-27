/* eslint-env node */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Configure paths to shared libraries
const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

config.watchFolders = [
  workspaceRoot,
  path.resolve(workspaceRoot, "libs/shared/types/src"),
  path.resolve(workspaceRoot, "libs/shared/supabase/src"), 
  path.resolve(workspaceRoot, "libs/shared/utils/src"),
]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]

config.resolver.alias = {
  "@salesperson-tracking/types": path.resolve(workspaceRoot, "libs/shared/types/src"),
  "@salesperson-tracking/supabase": path.resolve(workspaceRoot, "libs/shared/supabase/src"),
  "@salesperson-tracking/utils": path.resolve(workspaceRoot, "libs/shared/utils/src"),
}

config.transformer.getTransformOptions = async () => ({
  transform: {
    // Inline requires are very useful for deferring loading of large dependencies/components.
    // For example, we use it in app.tsx to conditionally load Reactotron.
    // However, this comes with some gotchas.
    // Read more here: https://reactnative.dev/docs/optimizing-javascript-loading
    // And here: https://github.com/expo/expo/issues/27279#issuecomment-1971610698
    inlineRequires: true,
  },
})

// This is a temporary fix that helps fixing an issue with axios/apisauce.
// See the following issues in Github for more details:
// https://github.com/infinitered/apisauce/issues/331
// https://github.com/axios/axios/issues/6899
// The solution was taken from the following issue:
// https://github.com/facebook/metro/issues/1272
config.resolver.unstable_conditionNames = ["require", "default", "browser"]

// This helps support certain popular third-party libraries
// such as Firebase that use the extension cjs.
config.resolver.sourceExts.push("cjs")

module.exports = config
