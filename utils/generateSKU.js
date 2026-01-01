// src/lib/utils/generateSKU.js
export function generateSKU(prefix = "P") {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}
