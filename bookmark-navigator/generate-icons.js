const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'src', 'icons');

const sizes = [
  { name: 'icon16.png', size: 16 },
  { name: 'icon48.png', size: 48 },
  { name: 'icon128.png', size: 128 }
];

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9"/>
      <stop offset="100%" style="stop-color:#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  <path d="M32 32h64v12H32zM32 56h48v12H32zM32 80h56v12H32zM32 104h40v12H32z" fill="#fff" opacity="0.9"/>
  <circle cx="96" cy="96" r="20" fill="#fbbf24"/>
  <path d="M90 96l4 4 8-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function generateIcons() {
  for (const { name, size } of sizes) {
    const buffer = Buffer.from(svgContent);
    await sharp(buffer, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, name));
    console.log(`Generated ${name}`);
  }
}

generateIcons().catch(console.error);