const { withAppBuildGradle } = require('expo/config-plugins')

/**
 * Configures the Play upload key for local release builds (`./gradlew bundleRelease`).
 * Credentials come from environment variables or ~/.gradle/gradle.properties:
 *   AEROFMS_UPLOAD_STORE_FILE, AEROFMS_UPLOAD_STORE_PASSWORD, AEROFMS_UPLOAD_KEY_ALIAS, AEROFMS_UPLOAD_KEY_PASSWORD
 * Without them the release build falls back to the debug key (only for local testing –
 * Play Console rejects such bundles). EAS Build manages signing on its own.
 */
const MARKER = '// aerofms-release-signing'

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents
    if (gradle.includes(MARKER)) return cfg
    const helper = `
${MARKER}
def aerofmsProp = { String name -> (project.findProperty(name) ?: System.getenv(name)) }
def aerofmsHasUploadKey = aerofmsProp('AEROFMS_UPLOAD_STORE_FILE') != null
`
    gradle = gradle.replace(/android\s*\{/, `${helper}\nandroid {`)
    gradle = gradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        upload {
            if (aerofmsHasUploadKey) {
                storeFile file(aerofmsProp('AEROFMS_UPLOAD_STORE_FILE'))
                storePassword aerofmsProp('AEROFMS_UPLOAD_STORE_PASSWORD')
                keyAlias aerofmsProp('AEROFMS_UPLOAD_KEY_ALIAS')
                keyPassword aerofmsProp('AEROFMS_UPLOAD_KEY_PASSWORD')
            }
        }`,
    )
    gradle = gradle.replace(
      /(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig aerofmsHasUploadKey ? signingConfigs.upload : signingConfigs.debug',
    )
    cfg.modResults.contents = gradle
    return cfg
  })
}
