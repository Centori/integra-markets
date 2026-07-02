// Xcode 26 tightened C++ `consteval` enforcement, which breaks React Native
// 0.76's use of `fmt::basic_format_string`. Community workaround: pass
// `-DFMT_ENFORCE_COMPILE_STRING=0` to every C++ target's compile flags so
// fmt falls back to runtime format-string parsing instead of compile-time.
//
// This is the same fix `patch-package` maintainers push around for RN 0.76 +
// Xcode 26. Remove once RN 0.77+ ships with the upstream fmt fix.
//
// Reference: React Native fmt/consteval Xcode 26 incompatibility

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const POD_INSTALL_HOOK = `
# --- fix-fmt-consteval: injected by expo-plugins/fix-fmt-consteval.cjs ---
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      existing_c = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
      existing_cxx = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
      config.build_settings['OTHER_CFLAGS'] = "#{existing_c} -DFMT_ENFORCE_COMPILE_STRING=0"
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "#{existing_cxx} -DFMT_ENFORCE_COMPILE_STRING=0"
    end
  end
end
# --- /fix-fmt-consteval ---
`.trim();

module.exports = function withFixFmtConsteval(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');
      if (contents.includes('fix-fmt-consteval')) {
        return config;
      }
      contents = `${contents.trim()}\n\n${POD_INSTALL_HOOK}\n`;
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
