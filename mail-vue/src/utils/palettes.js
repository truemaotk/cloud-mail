// Names follow Apple announcements and the brands' own stories. Web swatches
// are approximations, NOT official material HEX values. Accents and optional
// surface tints are adjusted for readable UI. Keep existing stored keys.
export const paletteGroups = [
  { key: 'neutral', label: 'paletteGroupNeutral' },
  { key: 'iphone', label: 'paletteGroupIphone' },
  { key: 'mac', label: 'paletteGroupMac' },
  { key: 'ipad', label: 'paletteGroupIpad' },
  { key: 'watch', label: 'paletteGroupWatch' },
  { key: 'brand', label: 'paletteGroupBrand' },
]

export const palettes = [
  { key: 'graphite', group: 'neutral', label: 'paletteGraphite', origin: 'macOS', swatch: '#6E6E73', light: '#2C2C2E', dark: '#E5E5EA' },
  { key: 'silver', group: 'neutral', label: 'paletteSilver', origin: 'Mac · iPad · Watch', swatch: '#D7D9DB', light: '#51575F', dark: '#D5D9DF' },
  { key: 'space-black', group: 'neutral', label: 'paletteSpaceBlack', origin: 'MacBook Pro', swatch: '#2E3033', tint: '#74777D', light: '#41454D', dark: '#C9CDD5' },
  { key: 'indigo', group: 'iphone', label: 'paletteIndigo', origin: 'iPhone 17', swatch: '#D1CAE4', light: '#68518F', dark: '#C9B9EA' },
  { key: 'sage', group: 'iphone', label: 'paletteSage', origin: 'iPhone 17', swatch: '#B3BDA3', light: '#4F6847', dark: '#BECDA9' },
  { key: 'terracotta', group: 'iphone', label: 'paletteTerracotta', origin: 'iPhone 17 Pro', swatch: '#D98149', light: '#9C4C25', dark: '#EAB08E' },
  { key: 'deep-blue', group: 'iphone', label: 'paletteDeepBlue', origin: 'iPhone 17 Pro', swatch: '#354764', tint: '#8496B2', light: '#344D73', dark: '#B2C8EC' },
  { key: 'ultramarine', group: 'iphone', label: 'paletteUltramarine', origin: 'iPhone 16', swatch: '#7A88D6', light: '#424EA0', dark: '#BCC5FF' },
  { key: 'desert-titanium', group: 'iphone', label: 'paletteDesert', origin: 'iPhone 16 Pro', swatch: '#C7AD97', light: '#77573F', dark: '#E3C5AD' },
  { key: 'ocean', group: 'mac', label: 'paletteOcean', origin: 'MacBook Air', swatch: '#B7C9DB', light: '#386080', dark: '#A9C7E0' },
  { key: 'rose', group: 'mac', label: 'paletteRose', origin: 'MacBook Air · iPad Air', swatch: '#E8DFCE', light: '#79623D', dark: '#DFCEAA' },
  { key: 'plum', group: 'mac', label: 'palettePlum', origin: 'MacBook Air', swatch: '#38434F', light: '#45586E', dark: '#B0BDCF' },
  { key: 'imac-pink', group: 'mac', label: 'paletteImacPink', origin: 'iMac', swatch: '#E8B4BD', light: '#914B60', dark: '#EFBBCB' },
  { key: 'imac-yellow', group: 'mac', label: 'paletteImacYellow', origin: 'iMac', swatch: '#E8CE87', light: '#796020', dark: '#E7CE8B' },
  { key: 'imac-green', group: 'mac', label: 'paletteImacGreen', origin: 'iMac', swatch: '#A8C5B3', light: '#3F6754', dark: '#AED6BE' },
  { key: 'imac-purple', group: 'mac', label: 'paletteImacPurple', origin: 'iMac', swatch: '#B7ACD2', light: '#66508C', dark: '#D2BFF0' },
  { key: 'ipad-blue', group: 'ipad', label: 'paletteIpadBlue', origin: 'iPad Air', swatch: '#A8BECF', light: '#3F5D73', dark: '#B2CEDE' },
  { key: 'ipad-purple', group: 'ipad', label: 'paletteIpadPurple', origin: 'iPad Air', swatch: '#BEB7CD', light: '#665A7E', dark: '#D0C6E4' },
  { key: 'space-gray', group: 'ipad', label: 'paletteSpaceGray', origin: 'iPad Air', swatch: '#8D8F94', light: '#4E5058', dark: '#CCD0D9' },
  { key: 'natural-titanium', group: 'watch', label: 'paletteNatural', origin: 'Apple Watch Series 10', swatch: '#B9B5AA', light: '#626052', dark: '#D7D2C5' },
  { key: 'gold-titanium', group: 'watch', label: 'paletteGold', origin: 'Apple Watch Series 10', swatch: '#C9B58E', light: '#76603A', dark: '#E1CCA4' },
  { key: 'rose-gold', group: 'watch', label: 'paletteRoseGold', origin: 'Apple Watch Series 10', swatch: '#DAB6AC', light: '#87584E', dark: '#ECC6BC' },
  { key: 'hermes-orange', group: 'brand', label: 'paletteHermes', origin: 'Hermès', swatch: '#E87832', light: '#985021', dark: '#F0B284' },
  { key: 'tiffany-blue', group: 'brand', label: 'paletteTiffany', origin: 'Tiffany & Co.', swatch: '#81D8D0', light: '#236C68', dark: '#9EDDD6' },
]

export function getPalette(key) {
  return palettes.find(item => item.key === key) || palettes[0]
}
