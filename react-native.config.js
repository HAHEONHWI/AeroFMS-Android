const { existsSync } = require('node:fs')
const { join } = require('node:path')

/**
 * Optional native modules are only autolinked when their configuration is present, so a build
 * without google-services.json / ads opt-in neither fails nor crashes at startup.
 */
const nativeFirebase = existsSync(join(__dirname, 'google-services.json'))
const adsNative = process.env.AEROFMS_ENABLE_ADS === 'true'
const off = { platforms: { android: null, ios: null } }

module.exports = {
  dependencies: {
    ...(nativeFirebase
      ? {}
      : {
          '@react-native-firebase/app': off,
          '@react-native-firebase/crashlytics': off,
          '@react-native-firebase/analytics': off,
        }),
    ...(adsNative ? {} : { 'react-native-google-mobile-ads': off }),
  },
}
