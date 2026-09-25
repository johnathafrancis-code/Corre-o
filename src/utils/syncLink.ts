import { Loan, Transaction, VaultGoal, PartnerConfig } from '../types/finance';

export interface CoupleSyncPackage {
  v: number;
  timestamp: string;
  sourceDevice: string;
  loans: Loan[];
  transactions: Transaction[];
  vaultGoals: VaultGoal[];
  partners?: PartnerConfig;
}

// Convert data to compressed base64 string
export function exportCoupleDataToString(data: {
  loans: Loan[];
  transactions: Transaction[];
  vaultGoals: VaultGoal[];
  partners?: PartnerConfig;
  sourceDevice: string;
}): string {
  const pkg: CoupleSyncPackage = {
    v: 1,
    timestamp: new Date().toISOString(),
    sourceDevice: data.sourceDevice,
    loans: data.loans || [],
    transactions: data.transactions || [],
    vaultGoals: data.vaultGoals || [],
    partners: data.partners,
  };

  const jsonStr = JSON.stringify(pkg);
  // Base64 encode safe for UTF-8
  const b64 = btoa(encodeURIComponent(jsonStr));
  return b64;
}

// Parse and validate imported string
export function parseCoupleDataFromString(payloadStr: string): CoupleSyncPackage | null {
  try {
    const trimmed = payloadStr.trim();
    if (!trimmed) return null;

    // Check if it's a URL
    let dataPart = trimmed;
    if (trimmed.includes('couple_sync=')) {
      const match = trimmed.match(/couple_sync=([^&#]+)/);
      if (match && match[1]) {
        dataPart = decodeURIComponent(match[1]);
      }
    }

    const decodedJson = decodeURIComponent(atob(dataPart));
    const parsed = JSON.parse(decodedJson);

    if (parsed && (Array.isArray(parsed.loans) || Array.isArray(parsed.transactions))) {
      return parsed as CoupleSyncPackage;
    }
  } catch (e) {
    console.error('Erro ao ler pacote de sincronização:', e);
  }
  return null;
}

// Generate complete URL to share via WhatsApp
export function generateCoupleShareUrl(data: {
  loans: Loan[];
  transactions: Transaction[];
  vaultGoals: VaultGoal[];
  partners?: PartnerConfig;
  sourceDevice: string;
}): string {
  const payload = exportCoupleDataToString(data);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?couple_sync=${encodeURIComponent(payload)}`;
}
