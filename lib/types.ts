// SQLite/Prisma non supporta enum nativi: questi tipi danno comunque
// sicurezza a compile-time nel codice applicativo per i campi
// categorici che nello schema sono semplici String.

export const SIGNAL_TYPES = [
  "azienda",
  "asset",
  "settore",
  "paese",
  "tema",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const ASSET_TYPES = ["crypto", "azione", "indice"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];
