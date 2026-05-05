import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { NaqlPermit, CreateNaqlPermitDto, PermitStatus } from '@fleet/shared';

/**
 * Naql API Client (naql.com.sa — Saudi Ministry of Transport logistics platform)
 *
 * Naql provides transport and freight services:
 *  - Transport permit issuance for freight trips
 *  - Permit status tracking
 *  - Carrier licensing information
 *
 * Set NAQL_MOCK=true in .env during development.
 * Set NAQL_MOCK=false and provide NAQL_API_KEY / NAQL_COMPANY_CODE once
 * registration as a transport company is complete at https://naql.com.sa
 */
@Injectable()
export class NaqlClient {
  private readonly logger = new Logger(NaqlClient.name);
  private readonly isMock: boolean;
  private http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.isMock = config.get<string>('NAQL_MOCK', 'true') === 'true';

    this.http = axios.create({
      baseURL: config.get<string>('NAQL_BASE_URL', 'https://api.naql.com.sa'),
      timeout: 15_000,
      headers: {
        'x-api-key': config.get<string>('NAQL_API_KEY', ''),
        'x-company-code': config.get<string>('NAQL_COMPANY_CODE', ''),
      },
    });
  }

  // ─── Permits ──────────────────────────────────────────────────────────────

  async getPermits(): Promise<NaqlPermit[]> {
    if (this.isMock) return this.mockPermits();
    const response = await this.http.get('/permits');
    return response.data as NaqlPermit[];
  }

  async getPermit(permitId: string): Promise<NaqlPermit> {
    if (this.isMock) {
      const permit = this.mockPermits().find((p) => p.permitId === permitId);
      if (!permit) throw new Error(`Mock permit ${permitId} not found`);
      return permit;
    }
    const response = await this.http.get(`/permits/${permitId}`);
    return response.data as NaqlPermit;
  }

  async createPermit(dto: CreateNaqlPermitDto): Promise<NaqlPermit> {
    if (this.isMock) {
      this.logger.log('[MOCK] Naql: creating transport permit');
      return {
        permitId: `NAQL-${Date.now()}`,
        companyCode: this.config.get<string>('NAQL_COMPANY_CODE', 'MOCK'),
        vehiclePlate: dto.vehiclePlate,
        driverNationalId: dto.driverNationalId,
        origin: dto.origin,
        destination: dto.destination,
        cargoType: dto.cargoType,
        cargoWeight: dto.cargoWeight,
        status: PermitStatus.ACTIVE,
        issuedAt: new Date(),
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      };
    }
    const response = await this.http.post('/permits', dto);
    return response.data as NaqlPermit;
  }

  async cancelPermit(permitId: string): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Naql: cancelling permit ${permitId}`);
      return;
    }
    await this.http.delete(`/permits/${permitId}`);
  }

  async getPermitStatus(permitId: string): Promise<PermitStatus> {
    if (this.isMock) return PermitStatus.ACTIVE;
    const response = await this.http.get(`/permits/${permitId}/status`);
    return response.data.status as PermitStatus;
  }

  // ─── Mock Data ────────────────────────────────────────────────────────────

  private mockPermits(): NaqlPermit[] {
    return [
      {
        permitId: 'NAQL-001',
        companyCode: 'MOCK-CO',
        vehiclePlate: 'ABC 1234',
        driverNationalId: '1098765432',
        origin: 'Riyadh',
        destination: 'Jeddah',
        cargoType: 'General Goods',
        cargoWeight: 5000,
        status: PermitStatus.ACTIVE,
        issuedAt: new Date('2026-04-01'),
        validFrom: new Date('2026-04-01'),
        validTo: new Date('2026-07-01'),
      },
      {
        permitId: 'NAQL-002',
        companyCode: 'MOCK-CO',
        vehiclePlate: 'XYZ 5678',
        driverNationalId: '2034567891',
        origin: 'Dammam',
        destination: 'Riyadh',
        cargoType: 'Refrigerated Goods',
        cargoWeight: 8000,
        status: PermitStatus.EXPIRED,
        issuedAt: new Date('2026-01-15'),
        validFrom: new Date('2026-01-15'),
        validTo: new Date('2026-04-15'),
      },
    ];
  }
}
