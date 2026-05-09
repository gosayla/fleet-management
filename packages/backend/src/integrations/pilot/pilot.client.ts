import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface RawPilotDevice {
  '0'?: {
    id?: number;
    name?: string;
    veh_id?: number;
    active?: number;
    on?: number;
    uniqid?: string;
  };
  id?: string | number | null;
  name?: string | null;
  veh?: string | null;
  veh_id?: number | null;
  speed?: number | null;
  direction?: number | null;
  type?: number | null;
  dir?: number;
  latitude?: string | number;
  longitude?: string | number;
  lat?: string | number;
  lon?: string | number;
  altitude?: number | null;
  ts?: number | null;
  unixtimestamp?: string | number;
  on?: number | null;
  active?: number | null;
  wasl_state?: string | null;
  uniqid?: string | null;
  satsinview?: number | null;
  len?: number | null;
  motor_hours?: number | null;
  lost_connection_time?: number | null;
  cache_ts?: number | null;
  timezone?: number | null;
  tz?: string | null;
  hl?: string | null;
  src?: string | null;
  events?: unknown[];
  initial_mileage?: number | null;
  firing?: number | null;
  is_server_online?: boolean | null;
  zone?: unknown[];
  security?: unknown;
  wasl?: number | null;
  ws?: number | null;
  driver?: string | null;
  agent_id?: number | null;
  last_event?: {
    type?: string;
    text?: string;
    lat?: string | number;
    lon?: string | number;
    latitude?: string | number;
    longitude?: string | number;
    speed?: number;
    unixtimestamp?: string | number;
    last_stop?: string | number;
    last_move?: string | number;
  };
  sensors?: Record<string, string>;
}

export interface PilotDevice {
  plateNumber: string;
  providerVehicleId?: number;
  deviceImei?: string;
  /** null when provider has no valid GPS fix */
  lat: number | null;
  lng: number | null;
  altitude: number | null;
  speed: number;
  heading: number;
  satellites: number | null;
  recordedAt: Date;
  isOnline: boolean;
  isEngineOn: boolean;
  sourceState?: string;
  /** Accumulated distance (km) tracked by the GPS device — NOT true odometer */
  providerMileage: number | null;
  /** Engine run-time in seconds */
  motorHoursSeconds: number | null;
  lastStop: Date | null;
  lastMove: Date | null;
  batteryVoltage: number | null;
  ignitionOn: boolean | null;
  loadWeight: number | null;
}

@Injectable()
export class PilotClient {
  private readonly logger = new Logger(PilotClient.name);

  constructor(private readonly config: ConfigService) {}

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private looksLikeDevice(value: unknown): value is RawPilotDevice {
    if (!this.isRecord(value)) return false;
    return (
      'veh' in value ||
      'name' in value ||
      'id' in value ||
      'lat' in value ||
      'latitude' in value ||
      '0' in value
    );
  }

  private normalizeRawPayload(data: unknown): RawPilotDevice[] {
    let raw = data;

    // Some clients/proxies may return JSON as string.
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return [];
      }
    }

    if (Array.isArray(raw)) {
      return raw.filter((item): item is RawPilotDevice => this.looksLikeDevice(item));
    }

    if (!this.isRecord(raw)) {
      return [];
    }

    // Common wrapped shape: { value: [...], Count: n }
    if (Array.isArray(raw.value)) {
      return raw.value.filter((item): item is RawPilotDevice => this.looksLikeDevice(item));
    }

    // Fallback shape: numeric keys on object {"0": {...}, "1": {...}}
    const numericKeyValues = Object.keys(raw)
      .filter((k) => /^\d+$/.test(k))
      .map((k) => raw[k]);

    if (numericKeyValues.length > 0) {
      return numericKeyValues.filter((item): item is RawPilotDevice => this.looksLikeDevice(item));
    }

    // Single device object fallback
    if (this.looksLikeDevice(raw)) {
      return [raw];
    }

    return [];
  }

  private parseCoordinatePair(
    latRaw: string | number | undefined,
    lngRaw: string | number | undefined,
  ) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    if (lat === 0 && lng === 0) {
      return null;
    }

    return { lat, lng };
  }

  private resolveToken(token?: string) {
    const resolved = token ?? this.config.get<string>('PILOT_GPS_TOKEN', '');
    if (!resolved) {
      throw new BadRequestException('Pilot GPS token is required');
    }
    return resolved;
  }

  private buildRequestHeaders() {
    const headers: Record<string, string> = {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      Referer: 'https://ksa.pilot-gps.com/',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    };

    // Optional: pass browser cookie when provider behavior differs for server-to-server calls.
    const cookie = this.config.get<string>('PILOT_GPS_COOKIE', '').trim();
    if (cookie) {
      headers.Cookie = cookie;
    }

    return headers;
  }

  private isPositiveNumber(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  private hasValidLocation(device: RawPilotDevice): boolean {
    const current = this.parseCoordinatePair(device.lat ?? device.latitude, device.lon ?? device.longitude);
    if (current) return true;

    const fallback = this.parseCoordinatePair(
      device.last_event?.lat ?? device.last_event?.latitude,
      device.last_event?.lon ?? device.last_event?.longitude,
    );
    return fallback !== null;
  }

  private scorePayload(payload: RawPilotDevice[]): number {
    let score = 0;
    for (const d of payload) {
      if (this.hasValidLocation(d)) score += 4;
      if (this.isPositiveNumber(d.len)) score += 2;
      if (this.isPositiveNumber(d.motor_hours)) score += 2;
      if (d.sensors && Object.keys(d.sensors).length > 0) score += 1;
      if (d.wasl_state) score += 1;
    }
    return score;
  }

  async fetchDevices(token?: string): Promise<PilotDevice[]> {
    const resolvedToken = this.resolveToken(token);
    const baseUrl = `https://ksa.pilot-gps.com/monitor_token/monitor_token_data.php?token=${encodeURIComponent(resolvedToken)}`;

    const profiles = [
      { name: 'browser', headers: this.buildRequestHeaders() },
      { name: 'json', headers: { ...this.buildRequestHeaders(), Accept: 'application/json' } },
      { name: 'browser-retry', headers: this.buildRequestHeaders() },
    ] as const;

    try {
      let bestPayload: RawPilotDevice[] = [];
      let bestScore = -1;

      for (const profile of profiles) {
        const url = `${baseUrl}&_=${Date.now()}&profile=${profile.name}`;
        const response = await axios.get<unknown>(url, {
          timeout: 15000,
          headers: profile.headers,
        });

        if (!response.data) {
          continue;
        }

        const payload = this.normalizeRawPayload(response.data);
        const score = this.scorePayload(payload);

        if (score > bestScore) {
          bestScore = score;
          bestPayload = payload;
        }

        // Early exit once we clearly have rich data.
        if (score >= payload.length * 6 && payload.length > 0) {
          break;
        }
      }

      if (bestPayload.length === 0) {
        this.logger.warn('Pilot GPS response received but no devices matched expected schema');
        return [];
      }

      return bestPayload
        .map((item) => this.toDevice(item))
        .filter((item): item is PilotDevice => item !== null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch Pilot GPS devices: ${message}`);
      return [];
    }
  }

  private parseSensorValue(raw: string | undefined): number | null {
    if (!raw) return null;
    const match = raw.match(/^([0-9.]+)/);
    return match ? Number(match[1]) : null;
  }

  private parseSensorFlag(raw: string | undefined, onLabel: string): boolean | null {
    if (!raw) return null;
    return raw.toLowerCase().startsWith(onLabel.toLowerCase());
  }

  private toDate(unixRaw: string | number | undefined): Date | null {
    const n = Number(unixRaw);
    return n > 0 ? new Date(n * 1000) : null;
  }

  // ─── SmartTracker (gps.smarttrackerpro.net) ─────────────────────────────

  /**
   * Login + fetch all vehicles from gps.smarttrackerpro.net.
   * This provider uses username/password session auth (PILOTID cookie)
   * instead of a token URL.
   */
  async fetchDevicesSmartTracker(
    username?: string,
    password?: string,
  ): Promise<PilotDevice[]> {
    const user = username ?? this.config.get<string>('SMARTTRACKER_USERNAME', '');
    const pass = password ?? this.config.get<string>('SMARTTRACKER_PASSWORD', '');
    if (!user || !pass) return [];

    const BASE = 'https://gps.smarttrackerpro.net';

    try {
      // 1. Login to obtain session cookie
      const loginRes = await axios.post<unknown>(
        `${BASE}/backend/ax/user/login.php`,
        `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
        {
          timeout: 15_000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: `${BASE}/`,
          },
          withCredentials: true,
        },
      );

      const loginData = loginRes.data as Record<string, unknown>;
      if (!loginData.success) {
        this.logger.warn('SmartTracker login failed');
        return [];
      }

      const token = String(loginData.token ?? '');
      const cookie = `PILOTID=${token}; node=${loginData.node_id ?? 3}`;

      // 2. Fetch current_data for all vehicles
      const ts = Math.floor(Date.now() / 1000);
      const dataRes = await axios.post<unknown>(
        `${BASE}/backend/ax/current_data.php`,
        `unixtimestamp=${ts}&user_id=0&c=3&n=`,
        {
          timeout: 15_000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            Referer: `${BASE}/`,
            Cookie: cookie,
          },
        },
      );

      const body = dataRes.data as Record<string, unknown>;
      if (!body.success && !Array.isArray(body.objects)) return [];

      const objects = (body.objects ?? []) as RawPilotDevice[];
      return objects
        .map((item) => this.toDeviceSmartTracker(item))
        .filter((d): d is PilotDevice => d !== null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SmartTracker GPS fetch failed: ${message}`);
      return [];
    }
  }

  /**
   * Maps a SmartTracker `current_data.php` object to a PilotDevice.
   * Key differences from ksa.pilot-gps.com:
   *  - `firing`  = ignition on/off  (not sensor string)
   *  - `len`     = mileage in metres (divide by 1000 → km)
   *  - `motor_hours` already in hours (multiply by 3600 → seconds for PilotDevice)
   *  - No `sensors` object; battery/weight not provided by this provider
   */
  private toDeviceSmartTracker(item: RawPilotDevice): PilotDevice | null {
    const plateNumber = String(item.veh ?? item.name ?? item.id ?? '').trim();
    if (!plateNumber) return null;

    const location = this.parseCoordinatePair(item.lat, item.lon)
      ?? this.parseCoordinatePair(item.last_event?.lat, item.last_event?.lon);

    const ts = Number(item.unixtimestamp ?? item.last_event?.unixtimestamp ?? 0);
    const lenMeters = Number.isFinite(Number(item.len)) ? Number(item.len) : null;
    const motorH = Number.isFinite(Number(item.motor_hours)) ? Number(item.motor_hours) : null;

    return {
      plateNumber,
      providerVehicleId: typeof item.veh_id === 'number' ? item.veh_id : undefined,
      deviceImei: item.uniqid ?? undefined,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      altitude: null,
      speed: Number(item.last_event?.speed ?? 0) || 0,
      heading: Number(item.dir ?? 0),
      satellites: Number.isFinite(item.satsinview) ? (item.satsinview as number) : null,
      recordedAt: ts > 0 ? new Date(ts * 1000) : new Date(),
      isOnline: item.is_server_online === true,
      isEngineOn: Number(item.firing ?? 0) === 1,
      sourceState: item.wasl_state ?? undefined,
      // len is metres from this provider; PilotDevice.providerMileage is km
      providerMileage: lenMeters !== null && lenMeters > 0 ? lenMeters / 1000 : null,
      // motor_hours is in hours; PilotDevice stores seconds (sync service divides by 3600)
      motorHoursSeconds: motorH !== null && motorH > 0 ? motorH * 3600 : null,
      lastStop: this.toDate(item.last_event?.last_stop),
      lastMove: this.toDate(item.last_event?.last_move),
      batteryVoltage: null,
      ignitionOn: Number(item.firing ?? 0) === 1,
      loadWeight: null,
    };
  }

  private toDevice(item: RawPilotDevice): PilotDevice | null {
    const nested = item['0'];
    const plateNumber = String(item.veh ?? item.name ?? item.id ?? nested?.name ?? nested?.id ?? '').trim();
    if (!plateNumber) return null;

    const currentLocation = this.parseCoordinatePair(item.lat ?? item.latitude, item.lon ?? item.longitude);
    const fallbackLocation = this.parseCoordinatePair(
      item.last_event?.lat ?? item.last_event?.latitude,
      item.last_event?.lon ?? item.last_event?.longitude,
    );
    const location = currentLocation ?? fallbackLocation;

    const speed = Number(item.speed ?? 0);
    const heading = Number(item.direction ?? item.dir ?? 0);
    const ts = Number(item.ts ?? item.unixtimestamp ?? item.last_event?.unixtimestamp ?? 0);

    const sensors = item.sensors ?? {};
    const voltageRaw = sensors['External power supply'];
    const ignitionRaw = sensors['Ignition sensor'];
    const weightRaw = sensors['Weight'];

    const voltageMilliVolts = this.parseSensorValue(voltageRaw);
    const batteryVoltage = voltageMilliVolts !== null ? voltageMilliVolts / 1000 : null;

    return {
      plateNumber,
      providerVehicleId: item.veh_id ?? nested?.veh_id ?? undefined,
      deviceImei: item.uniqid ?? nested?.uniqid ?? undefined,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      altitude: Number.isFinite(item.altitude) ? (item.altitude as number) : null,
      speed: Number.isFinite(speed) ? speed : 0,
      heading: Number.isFinite(heading) ? heading : 0,
      satellites: Number.isFinite(item.satsinview) ? (item.satsinview as number) : null,
      recordedAt: ts > 0 ? new Date(ts * 1000) : new Date(),
      isOnline: Number(item.active ?? nested?.active ?? 0) === 1,
      isEngineOn: Number(item.on ?? nested?.on ?? 0) === 1,
      sourceState: item.wasl_state ?? undefined,
      providerMileage: Number.isFinite(item.len) ? (item.len as number) : null,
      motorHoursSeconds: Number.isFinite(item.motor_hours) ? (item.motor_hours as number) : null,
      lastStop: this.toDate(item.last_event?.last_stop),
      lastMove: this.toDate(item.last_event?.last_move),
      batteryVoltage,
      ignitionOn: this.parseSensorFlag(ignitionRaw, 'on'),
      loadWeight: this.parseSensorValue(weightRaw),
    };
  }
}
