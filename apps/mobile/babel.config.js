module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Keep this last per Reanimated docs
      'react-native-reanimated/plugin',
    ],
  }
}

