import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

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

interface TmtGpsVehicle {
  /** d[0] = [server_time, device_time, lat, lon, speed, heading, pct, sensors] */
  d?: [string, string, string, string, string | number, string | number, number, Record<string, unknown>][];
  /** "off" | "s" (stopped) | "m" (moving) | "i" (idle/engine on parked) */
  st?: string;
  /** "teltonika" | "ruptela" */
  p?: string;
  /** Engine hours as string */
  eh?: string | number;
}

interface GDiamondDataSet {
  id?: string;
  Status?: string;
  /** "1" = ignition on, "0" = off */
  ignState?: string;
  batteryLevel?: string | number;
  /** Pipe-delimited position strings */
  Points?: string[];
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
        `unixtimestamp=${ts}&user_id=0&c=0&n=`,
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

  // ─── TMT GPS (track.tmtgps.io) ───────────────────────────────────────────

  /**
   * Authenticate via auto-login URL, fetch the vehicle list and live tracking
   * data from track.tmtgps.io.
   * Auth flow: GET ?au=<token> → PHPSESSID cookie → subsequent requests.
   */
  async fetchDevicesTmtGps(authUrl?: string): Promise<PilotDevice[]> {
    const url = authUrl ?? this.config.get<string>('TMTGPS_AUTH_URL', '');
    if (!url) return [];

    const BASE = 'https://track.tmtgps.io';

    try {
      // 1. Auto-login: stop at first response (may be 302) to grab Set-Cookie
      const loginRes = await axios.get<unknown>(url, {
        timeout: 15_000,
        maxRedirects: 0,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
          Referer: `${BASE}/`,
        },
      });

      const setCookieHeaders = (loginRes.headers['set-cookie'] ?? []) as string[];
      const sessionCookie = setCookieHeaders
        .map((c) => c.split(';')[0].trim())
        .find((c) => c.startsWith('PHPSESSID=')) ?? '';

      if (!sessionCookie) {
        this.logger.warn('TmtGps: no PHPSESSID cookie received from auth URL');
        return [];
      }

      const sharedHeaders = {
        Cookie: sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${BASE}/tracking.php`,
      };

      // 2. Fetch vehicle list: IMEI → plate number
      const listRes = await axios.get<unknown>(
        `${BASE}/func/fn_settings.objects.php?cmd=load_object_list&_search=false&rows=200&page=1&sidx=name&sord=asc`,
        { timeout: 15_000, headers: { ...sharedHeaders, Accept: 'application/json, text/javascript, */*' } },
      );

      const listData = listRes.data as { rows?: Array<{ id: string; cell: string[] }> };
      if (!listData.rows?.length) {
        this.logger.warn('TmtGps: empty vehicle list');
        return [];
      }

      const imeiToPlate = new Map<string, string>();
      for (const row of listData.rows) {
        const plate = this.parseTmtPlate(row.cell[0] ?? '');
        if (plate) imeiToPlate.set(row.id, plate);
      }

      // 3. Fetch live tracking data for all vehicles
      const trackRes = await axios.post<unknown>(
        `${BASE}/func/fn_objects.php`,
        'cmd=load_object_data',
        {
          timeout: 15_000,
          headers: {
            ...sharedHeaders,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Accept: 'application/json, text/javascript, */*',
            Origin: BASE,
          },
        },
      );

      const trackData = trackRes.data as Record<string, TmtGpsVehicle>;
      const devices: PilotDevice[] = [];

      for (const [imei, vehicle] of Object.entries(trackData)) {
        const plateNumber = imeiToPlate.get(imei);
        if (!plateNumber) continue;
        const device = this.toDeviceTmtGps(imei, plateNumber, vehicle);
        if (device) devices.push(device);
      }

      return devices;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`TmtGps fetch failed: ${message}`);
      return [];
    }
  }

  /**
   * Parse plate from TMT GPS cell[0] which comes in two formats:
   *   "9147 - ا س ح "   (number - Arabic)
   *   "ا ط ل - 5850"    (Arabic - number)
   * Returns canonical "Arabic number" format, e.g. "ا س ح 9147".
   */
  private parseTmtPlate(cell0: string): string {
    const parts = cell0.split(/\s*-\s*/);
    if (parts.length !== 2) return cell0.trim();
    const [a, b] = parts.map((p) => p.trim());
    const aIsNumber = /^\d+$/.test(a.replace(/\s/g, ''));
    const arabic = aIsNumber ? b : a;
    const number = aIsNumber ? a : b;
    return `${arabic} ${number}`.trim();
  }

  private toDeviceTmtGps(imei: string, plateNumber: string, v: TmtGpsVehicle): PilotDevice | null {
    const d = v.d?.[0];
    if (!d) return null;

    const location = this.parseCoordinatePair(d[2], d[3]);
    const speed = Number(d[4]) || 0;
    const heading = Number(d[5]) || 0;
    const sensors = (d[7] ?? {}) as Record<string, unknown>;
    const isRuptela = v.p === 'ruptela';

    // Ignition: io1 (teltonika) or io251 (ruptela)
    const ignRaw = isRuptela ? sensors['io251'] : sensors['io1'];
    const ignitionOn = ignRaw !== undefined ? Number(ignRaw) === 1 : null;

    // Battery voltage mV → V: io66 (teltonika) or io29 (ruptela)
    const batRaw = Number(isRuptela ? sensors['io29'] : sensors['io66']);
    const batteryVoltage = batRaw > 0 ? batRaw / 1000 : null;

    // Mileage: io16 metres (teltonika) or io163 km (ruptela)
    let providerMileage: number | null = null;
    if (isRuptela) {
      const m = Number(sensors['io163']);
      providerMileage = m > 0 ? m : null;
    } else {
      const m = Number(sensors['io16']);
      providerMileage = m > 0 ? m / 1000 : null;
    }

    // Engine hours
    const ehRaw = Number(v.eh ?? 0);
    const motorHoursSeconds = ehRaw > 0 ? ehRaw * 3600 : null;

    // Status: "off" = offline, "s" = stopped, "m" = moving, "i" = idle (engine on)
    const st = v.st ?? '';
    const isOnline = st !== 'off';
    const isEngineOn = st === 'm' || st === 'i' || ignitionOn === true;

    const satellites = sensors['gpslev'] !== undefined ? Number(sensors['gpslev']) : null;

    return {
      plateNumber,
      providerVehicleId: undefined,
      deviceImei: imei,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      altitude: null,
      speed,
      heading,
      satellites,
      recordedAt: d[0] ? new Date(d[0]) : new Date(),
      isOnline,
      isEngineOn,
      sourceState: st || undefined,
      providerMileage,
      motorHoursSeconds,
      lastStop: null,
      lastMove: null,
      batteryVoltage,
      ignitionOn,
      loadWeight: null,
    };
  }

  // ─── GDiamond GPS (fleet.gdiamond.net:8443) ──────────────────────────────

  /**
   * Saudi plate letters appear in provider data as Latin transliterations
   * in reverse RTL order (e.g. "5662 KXA" → أ ص ك 5662).
   */
  private readonly GDIAMOND_LATIN_TO_ARABIC: Record<string, string> = {
    A: 'أ', B: 'ب', J: 'ح', D: 'د', R: 'ر',
    S: 'س', X: 'ص', T: 'ط', E: 'ع', F: 'ف',
    G: 'ق', K: 'ك', L: 'ل', M: 'م', N: 'ن',
    H: 'ه', W: 'و', Y: 'ي',
  };

  private parseGDiamondPlate(name: string): string {
    // Format: "5662 KXA" (number space latin-letters in reverse RTL order)
    const m = name.trim().match(/^(\d+)\s+([A-Z]+)$/);
    if (!m) return name.trim();
    const number = m[1];
    const arabicLetters = m[2]
      .split('')
      .reverse()
      .map((c) => this.GDIAMOND_LATIN_TO_ARABIC[c] ?? c)
      .join(' ');
    return `${arabicLetters} ${number}`;
  }

  /**
   * Login via GTS form POST to get JSESSIONID, then fetch live map data.
   * DataSets[].Points[0] is a pipe-delimited string with:
   *   [0]=recordId  [1]=name  [2]=epoch  [8]=lat  [9]=lon
   *   [10]=#sats    [11]=kph  [12]=heading  [13]=alt  [17]=mileage(km)
   * Ignition and status come from dataset-level fields.
   */
  async fetchDevicesGDiamond(): Promise<PilotDevice[]> {
    const account = this.config.get<string>('GDIAMOND_ACCOUNT', '');
    const user = this.config.get<string>('GDIAMOND_USER', '');
    const pass = this.config.get<string>('GDIAMOND_PASSWORD', '');
    if (!account || !user || !pass) return [];

    const BASE = 'https://fleet.gdiamond.net:8443';
    // Self-signed cert on non-standard port — disable verification for this host only
    const agent = new https.Agent({ rejectUnauthorized: false });

    try {
      // 1. Login — standard GTS servlet form POST
      const loginRes = await axios.post<unknown>(
        `${BASE}/track/Track`,
        `page=login.user&account=${encodeURIComponent(account)}&user=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
        {
          timeout: 15_000,
          httpsAgent: agent,
          maxRedirects: 10,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            Referer: `${BASE}/track/Track?page=login.user`,
          },
        },
      );

      const setCookies = (loginRes.headers['set-cookie'] ?? []) as string[];
      const sessionCookie = setCookies
        .map((c) => c.split(';')[0].trim())
        .find((c) => c.startsWith('JSESSIONID=')) ?? '';

      if (!sessionCookie) {
        this.logger.warn('GDiamond: no JSESSIONID cookie received — check login credentials');
        return [];
      }

      // 2. Fetch live map data (last known position for all devices)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86_400_000);
      const dateTo = `${tomorrow.getFullYear()}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}/23:59`;
      const uniq = Math.random().toString();

      const dataRes = await axios.get<unknown>(
        `${BASE}/track/Track?page=map.device.new&page_cmd=mapupd&_uniq=${uniq}&date_fr=&date_to=${encodeURIComponent(dateTo)}&date_tz=GMT%2B03%3A00&group=all&devStatus=ALL&limType=last`,
        {
          timeout: 15_000,
          httpsAgent: agent,
          headers: {
            Accept: '*/*',
            Cookie: sessionCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            Referer: `${BASE}/track/Track?page=map.device.new`,
            'X-Requested-With': 'XMLHttpRequest',
            'If-Modified-Since': 'Sat, 1 Jan 2000 00:00:00 GMT',
          },
        },
      );

      const body = dataRes.data as { JMapData?: { DataSets?: unknown[] } };
      const datasets = body.JMapData?.DataSets ?? [];

      return datasets
        .map((ds) => this.toDeviceGDiamond(ds as GDiamondDataSet))
        .filter((d): d is PilotDevice => d !== null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`GDiamond GPS fetch failed: ${message}`);
      return [];
    }
  }

  private toDeviceGDiamond(ds: GDiamondDataSet): PilotDevice | null {
    const point = ds.Points?.[0];
    if (!point) return null;

    const pts = point.split('|');
    // pts[1]=name, pts[2]=epoch, pts[8]=lat, pts[9]=lon
    // pts[10]=#sats, pts[11]=kph, pts[12]=heading, pts[13]=alt, pts[17]=mileage
    const rawName = (pts[1] ?? '').trim();
    if (!rawName) return null;

    const plateNumber = this.parseGDiamondPlate(rawName);
    const epoch = Number(pts[2]) || 0;
    const location = this.parseCoordinatePair(pts[8], pts[9]);
    const speed = Number(pts[11]) || 0;
    const heading = Number(pts[12]) || 0;
    const sats = Number(pts[10]);
    const mileage = Number(pts[17]) || null;

    const status = ds.Status ?? '';
    const isOnline = status !== '' && status !== 'DEVICE_NOT_WORKING';
    const ignitionOn = ds.ignState === '1';
    const batRaw = Number(ds.batteryLevel ?? 0);
    const batteryVoltage = batRaw > 0 ? batRaw : null;

    return {
      plateNumber,
      providerVehicleId: undefined,
      deviceImei: ds.id,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      altitude: Number(pts[13]) || null,
      speed,
      heading,
      satellites: sats > 0 ? sats : null,
      recordedAt: epoch > 0 ? new Date(epoch * 1000) : new Date(),
      isOnline,
      isEngineOn: ignitionOn,
      sourceState: status || undefined,
      providerMileage: mileage && mileage > 0 ? mileage : null,
      motorHoursSeconds: null,
      lastStop: null,
      lastMove: null,
      batteryVoltage,
      ignitionOn,
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
