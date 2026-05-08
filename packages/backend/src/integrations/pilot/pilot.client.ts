import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface RawPilotDevice {
  '0'?: {
    id?: number;
    name?: string;
    veh_id?: number;
    active?: number;
    on?: number;
  };
  id?: string;
  name?: string;
  veh?: string;
  veh_id?: number;
  speed?: number;
  direction?: number;
  dir?: number;
  latitude?: string | number;
  longitude?: string | number;
  lat?: string | number;
  lon?: string | number;
  ts?: number;
  unixtimestamp?: string | number;
  on?: number;
  active?: number;
  wasl_state?: string;
}

export interface PilotDevice {
  plateNumber: string;
  providerVehicleId?: number;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  recordedAt: Date;
  isOnline: boolean;
  isEngineOn: boolean;
  sourceState?: string;
}

@Injectable()
export class PilotClient {
  constructor(private readonly config: ConfigService) {}

  private resolveToken(token?: string) {
    const resolved = token ?? this.config.get<string>('PILOT_GPS_TOKEN', '');
    if (!resolved) {
      throw new BadRequestException('Pilot GPS token is required');
    }
    return resolved;
  }

  async fetchDevices(token?: string): Promise<PilotDevice[]> {
    const resolvedToken = this.resolveToken(token);
    const url = `https://ksa.pilot-gps.com/monitor_token/monitor_token_data.php?token=${encodeURIComponent(resolvedToken)}`;

    const response = await axios.get<RawPilotDevice[]>(url, {
      timeout: 15000,
      headers: { Accept: 'application/json' },
    });

    if (!Array.isArray(response.data)) return [];

    return response.data
      .map((item) => this.toDevice(item))
      .filter((item): item is PilotDevice => item !== null);
  }

  private toDevice(item: RawPilotDevice): PilotDevice | null {
    const nested = item['0'];
    const plateNumber = String(item.veh ?? item.name ?? nested?.name ?? item.id ?? nested?.id ?? '').trim();
    if (!plateNumber) return null;

    const latRaw = item.lat ?? item.latitude;
    const lngRaw = item.lon ?? item.longitude;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const speed = Number(item.speed ?? 0);
    const heading = Number(item.direction ?? item.dir ?? 0);
    const ts = Number(item.ts ?? item.unixtimestamp ?? 0);

    return {
      plateNumber,
      providerVehicleId: item.veh_id ?? nested?.veh_id,
      lat,
      lng,
      speed: Number.isFinite(speed) ? speed : 0,
      heading: Number.isFinite(heading) ? heading : 0,
      recordedAt: ts > 0 ? new Date(ts * 1000) : new Date(),
      isOnline: Number(item.active ?? nested?.active ?? 0) === 1,
      isEngineOn: Number(item.on ?? nested?.on ?? 0) === 1,
      sourceState: item.wasl_state,
    };
  }
}
