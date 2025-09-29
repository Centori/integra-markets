const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withDisablePrivacyAggregation(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf-8');
        
        // Add environment variables at the top
        const envVars = `
# Disable Privacy Manifest Aggregation
ENV['PRIVACY_MANIFEST_AGGREGATION_ENABLED'] = '0'
ENV['COCOAPODS_DISABLE_PRIVACY_MANIFEST_AGGREGATION'] = '1'
`;
        
        if (!podfileContent.includes('PRIVACY_MANIFEST_AGGREGATION_ENABLED')) {
          // Add after the first require_relative line
          podfileContent = podfileContent.replace(
            /(require_relative.*?\n)/,
            `$1${envVars}`
          );
          
          fs.writeFileSync(podfilePath, podfileContent);
        }
      }
      
      return config;
    },
  ]);
}

module.exports = withDisablePrivacyAggregation;