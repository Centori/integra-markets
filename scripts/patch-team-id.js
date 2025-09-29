#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pbxprojPath = path.resolve('ios/IntegraMarkets.xcodeproj/project.pbxproj');
const TEAM_ID = '86S4AC8C45';

if (!fs.existsSync(pbxprojPath)) {
  console.error('pbxproj not found at', pbxprojPath);
  process.exit(1);
}

let s = fs.readFileSync(pbxprojPath, 'utf8');
let patched = 0;

// Insert DEVELOPMENT_TEAM inside each buildSettings block if missing
s = s.replace(/(buildSettings = \{)([\s\S]*?)(\n\s*\};)/g, (m, a, b, c) => {
  if (!/DEVELOPMENT_TEAM\s*=/.test(b)) {
    patched++;
    return a + b + `\n        DEVELOPMENT_TEAM = ${TEAM_ID};` + c;
  }
  return m;
});

fs.writeFileSync(pbxprojPath, s);
console.log('Patched configs:', patched);