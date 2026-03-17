#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const skillsDir = path.join(__dirname, '../skills');
const targetDir = path.join(process.env.HOME, '.config/opencode/skill');

fs.mkdirSync(targetDir, { recursive: true });

fs.readdirSync(skillsDir).forEach(skill => {
  const src = path.join(skillsDir, skill);
  const dest = path.join(targetDir, skill);
  
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }
  
  execSync(`cp -r "${src}" "${dest}"`);
  console.log(`Installed: ${skill}`);
});

console.log('\nSkills installed successfully!');
