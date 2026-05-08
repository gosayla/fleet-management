// Central config — edit these for your environment.
// In a CI/CD pipeline inject via react-native-config or replace at build time.

export const API_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.API_URL ?? 'https://fleet.starfishumluj.com/api/v1';

export const SOCKET_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.SOCKET_URL ?? 'https://fleet.starfishumluj.com';

// Maps enabled by default (OpenStreetMap — no API key required).
export const ENABLE_MAPS = true;
