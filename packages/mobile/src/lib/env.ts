// Central config — edit these for your environment.
// In a CI/CD pipeline inject via react-native-config or replace at build time.

const runtimeEnv = (globalThis as {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;

const DEFAULT_PROD_API_URL = 'https://fleet.starfishumluj.com/api/v1';
const DEFAULT_PROD_SOCKET_URL = 'https://fleet.starfishumluj.com';

export const API_URL = runtimeEnv?.API_URL ?? DEFAULT_PROD_API_URL;

export const SOCKET_URL = runtimeEnv?.SOCKET_URL ?? DEFAULT_PROD_SOCKET_URL;

// Maps enabled by default (OpenStreetMap — no API key required).
export const ENABLE_MAPS = true;
