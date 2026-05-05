import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  ActualDriverAdditionResult,
  ActualDriverFinalSubmitDto,
  ActualDriverVerifyAdditionDto,
  ActualDriverVerifyVehicleDto,
  TammDelegation,
  TammInsuranceResult,
  TammMvpiResult,
  TammPlateDto,
  TammVehicle,
  TammViolation,
} from '@fleet/shared';

// ─── Raw Tamm API shapes ──────────────────────────────────────────────────────

interface RawViolationItem {
  violationAmount: number;
  violationNumber: number;
  violationType: { code: number; nameAr: string; nameEn: string };
}

interface RawViolation {
  violationNumber: number;
  vehiclePlate: TammPlateDto;
  vehicleSequenceNumber: number;
  vehicleMake: string;
  violationCity: string;
  violationHijriDate: string;
  violationItems: RawViolationItem[];
  violationStatus: { code: number; nameAr: string; nameEn: string };
  violationTime: string;
  violatorId: number;
  totalFineItemsAmount: number;
  paymentDate?: string;
  paymentDateHijri?: string;
  placeHappened?: string;
  violationPoint?: number;
}

interface TammPaginatedViolations {
  content: RawViolation[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ─── Query option types ───────────────────────────────────────────────────────

export interface ViolationsQueryOptions {
  /** 0 = Company (by MOI number), 2 = Plate info. Default: 0 */
  searchType?: 0 | 2;
  /** Required when searchType=0. Defaults to TAMM_MOI_NUMBER env var. */
  idNumber?: string;
  /** Required when searchType=2 */
  plateDto?: TammPlateDto;
  fromDate?: string; // 'YYYY-MM-DD'
  toDate?: string;
  page?: number;
  size?: number;
}

export interface MvpiQueryOptions {
  /** 0 = Plate number, 1 = Sequence number */
  searchType: 0 | 1;
  plate?: TammPlateDto;
  sequenceNumber?: string;
}

export interface InsuranceQueryOptions {
  /** 0 = Plate number, 1 = Sequence number, 2 = Custom card */
  searchType: 0 | 1 | 2;
  plate?: TammPlateDto;
  sequenceNumber?: string;
  customCard?: string;
}

/**
 * Tamm API Client — ELM platform (tamm.api.elm.sa)
 *
 * Authentication: Keycloak OAuth2 client_credentials
 *   Token endpoint: https://idp.elm.sa/auth/realms/Tamm/protocol/openid-connect/token
 *
 * Every API request carries:
 *   Authorization: Bearer <token>
 *   X-Integrator-User-Id: <TAMM_MOI_NUMBER>
 *
 * Endpoints (per Integration Guides v0.1–v0.3):
 *   POST /api/v1/inquiry/traffic-violations        — unpaid violations
 *   POST /api/v1/inquiry/traffic-violations/paid   — paid violations
 *   POST /api/v1/inquiry/mvpi/latest-inspection    — MVPI status + odometer
 *   POST /api/v1/inquiry/vehicle-insurance         — insurance policies
 *
 * Set TAMM_MOCK=true (default) for local dev without real credentials.
 */
@Injectable()
export class TammClient {
  private readonly logger = new Logger(TammClient.name);
  private readonly isMock: boolean;
  private readonly moiNumber: string;
  private http: AxiosInstance;
  private idpHttp: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {
    this.isMock = config.get<string>('TAMM_MOCK', 'true') === 'true';
    this.moiNumber = config.get<string>('TAMM_MOI_NUMBER', '');

    this.http = axios.create({
      baseURL: config.get<string>('TAMM_BASE_URL', 'https://tamm.api.elm.sa'),
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });

    const idpUrl = config.get<string>('TAMM_IDP_URL', 'https://idp.elm.sa');
    const idpRealm = config.get<string>('TAMM_IDP_REALM', 'Tamm');
    this.idpHttp = axios.create({
      baseURL: `${idpUrl}/realms/${idpRealm}/protocol/openid-connect`,
      timeout: 10_000,
    });
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  private async fetchToken(): Promise<void> {
    const clientId = this.config.get<string>('TAMM_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('TAMM_CLIENT_SECRET', '');

    if (!clientId || !clientSecret) {
      throw new Error(
        'Tamm credentials missing: set TAMM_CLIENT_ID and TAMM_CLIENT_SECRET',
      );
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await this.idpHttp.post<{
      access_token: string;
      expires_in: number;
    }>('/token', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    this.accessToken = response.data.access_token;
    // 30 s buffer so we refresh before the token actually expires
    this.tokenExpiresAt = Date.now() + (response.data.expires_in - 30) * 1000;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.isMock) return;
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.fetchToken();
    }
    this.http.defaults.headers.common['Authorization'] =
      `Bearer ${this.accessToken}`;
    this.http.defaults.headers.common['X-Integrator-User-Id'] = this.moiNumber;
  }

  /** Transparently re-authenticate once on 401 then retry the call. */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr?.response?.status === 401) {
        this.accessToken = null;
        await this.ensureAuthenticated();
        return fn();
      }
      // Surface Tamm API errors (403, 400, 500…) with their response body
      if (axiosErr?.response) {
        const status = axiosErr.response.status;
        const body = axiosErr.response.data as Record<string, unknown>;
        const msg =
          (body?.message as { en?: string } | string | undefined) ??
          axiosErr.message;
        const msgText =
          typeof msg === 'object' ? (msg?.en ?? JSON.stringify(msg)) : msg;
        this.logger.error(
          `Tamm API ${status}: ${msgText}`,
          JSON.stringify(body),
        );
        throw new HttpException(
          { tamm: body, message: `Tamm API error ${status}: ${msgText}` },
          status >= 400 && status < 600
            ? (status as HttpStatus)
            : HttpStatus.BAD_GATEWAY,
        );
      }
      throw err;
    }
  }

  // ─── Traffic Violations ───────────────────────────────────────────────────

  /**
   * Fetch unpaid traffic violations.
   * Docs: POST /api/v1/inquiry/traffic-violations
   */
  async getUnpaidViolations(
    opts: ViolationsQueryOptions = {},
  ): Promise<TammPaginatedViolations> {
    if (this.isMock) return this.mockPaginatedViolations(false);
    await this.ensureAuthenticated();
    const { page = 0, size = 50, ...rest } = opts;
    return this.withRetry(async () => {
      const res = await this.http.post<TammPaginatedViolations>(
        `/api/v1/inquiry/traffic-violations?page=${page}&size=${size}`,
        this.buildViolationBody(rest),
      );
      return res.data;
    });
  }

  /**
   * Fetch paid traffic violations.
   * Docs: POST /api/v1/inquiry/traffic-violations/paid
   */
  async getPaidViolations(
    opts: ViolationsQueryOptions = {},
  ): Promise<TammPaginatedViolations> {
    if (this.isMock) return this.mockPaginatedViolations(true);
    await this.ensureAuthenticated();
    const { page = 0, size = 50, ...rest } = opts;
    return this.withRetry(async () => {
      const res = await this.http.post<TammPaginatedViolations>(
        `/api/v1/inquiry/traffic-violations/paid?page=${page}&size=${size}`,
        this.buildViolationBody(rest),
      );
      return res.data;
    });
  }

  private buildViolationBody(
    opts: Omit<ViolationsQueryOptions, 'page' | 'size'>,
  ): Record<string, unknown> {
    const searchType = opts.searchType ?? 0;
    return {
      searchType,
      ...(searchType === 0
        ? { idNumber: opts.idNumber ?? this.moiNumber }
        : {}),
      ...(searchType === 2 ? { plateDto: opts.plateDto } : {}),
      ...(opts.fromDate ? { fromDate: opts.fromDate } : {}),
      ...(opts.toDate ? { toDate: opts.toDate } : {}),
    };
  }

  // ─── MVPI (Periodic Inspection) ──────────────────────────────────────────

  /**
   * Get latest MVPI status and odometer reading.
   * Docs: POST /api/v1/inquiry/mvpi/latest-inspection
   */
  async getMvpiStatus(opts: MvpiQueryOptions): Promise<TammMvpiResult> {
    if (this.isMock) return this.mockMvpi();
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.http.post<TammMvpiResult>(
        '/api/v1/inquiry/mvpi/latest-inspection',
        opts,
      );
      return res.data;
    });
  }

  // ─── Vehicle Insurance ───────────────────────────────────────────────────

  /**
   * Get vehicle insurance policies.
   * Docs: POST /api/v1/inquiry/vehicle-insurance
   */
  async getInsurance(opts: InsuranceQueryOptions): Promise<TammInsuranceResult> {
    if (this.isMock) return this.mockInsurance();
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.http.post<TammInsuranceResult>(
        '/api/v1/inquiry/vehicle-insurance',
        opts,
      );
      return res.data;
    });
  }

  // ─── Backwards-compat methods (used by TammSyncService / TammController) ──

  /**
   * Tamm does not expose a company vehicle list endpoint.
   * Returns mock in all environments; use local DB vehicles in production.
   */
  async getVehicles(): Promise<TammVehicle[]> {
    if (this.isMock) return this.mockVehicles();
    this.logger.warn(
      'TammClient.getVehicles() — no real endpoint available; returning empty list',
    );
    return [];
  }

  /**
   * Fetch unpaid violations and normalise to TammViolation[].
   * When a plateNumber is given, uses searchType=2 (plate lookup);
   * otherwise uses searchType=0 (company / MOI number).
   */
  async getViolations(plateNumber?: string): Promise<TammViolation[]> {
    if (this.isMock) return this.mockViolations(plateNumber);
    const paginated = await this.getUnpaidViolations({
      searchType: plateNumber ? 2 : 0,
      ...(plateNumber ? { plateDto: this.parsePlateString(plateNumber) } : {}),
    });
    return paginated.content.map((raw) => this.mapRawViolation(raw, false));
  }

  async renewRegistration(
    vehicleId: string,
  ): Promise<{ success: boolean; referenceNumber: string }> {
    this.logger.log(
      `[MOCK] Tamm: renewing registration for vehicle ${vehicleId}`,
    );
    return { success: true, referenceNumber: `REG-${Date.now()}` };
  }

  async getInspectionStatus(
    _vehicleId: string,
  ): Promise<{ status: string; expiryDate: Date }> {
    return {
      status: 'VALID',
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
  }

  async getDelegations(vehicleId: string): Promise<TammDelegation[]> {
    return this.mockDelegations(vehicleId);
  }

  async issueDelegation(
    vehicleId: string,
    delegateName: string,
    delegateNationalId: string,
    isInternational: boolean,
    validFrom: Date,
    validTo: Date,
  ): Promise<TammDelegation> {
    return {
      delegationId: `DEL-${Date.now()}`,
      vehicleId,
      delegateName,
      delegateNationalId,
      isInternational,
      validFrom,
      validTo,
      isActive: true,
    };
  }

  async cancelDelegation(
    _vehicleId: string,
    delegationId: string,
  ): Promise<void> {
    this.logger.log(`[MOCK] Tamm: cancel delegation ${delegationId}`);
  }

  // ─── Actual Driver ────────────────────────────────────────────────────────

  /**
   * Step 1 — verify vehicle by plate.
   * Returns the X-Conversation-Id header that must be passed to Steps 2 & 3.
   * Docs: POST /api/v1/actual-driver/addition/verifyVehicle
   */
  async actualDriverVerifyVehicle(
    dto: ActualDriverVerifyVehicleDto,
  ): Promise<{ conversationId: string }> {
    if (this.isMock) {
      return { conversationId: `MOCK-CONV-${Date.now()}` };
    }
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.http.post(
        '/api/v1/actual-driver/addition/verifyVehicle',
        dto,
      );
      const conversationId =
        res.headers['x-conversation-id'] ||
        res.headers['X-Conversation-Id'] ||
        res.data?.conversationId ||
        '';
      return { conversationId: conversationId as string };
    });
  }

  /**
   * Step 2 — verify person identity and trigger OTP send.
   * Requires X-Conversation-Id from Step 1.
   * Docs: POST /api/v1/actual-driver/addition/verify
   */
  async actualDriverVerifyAddition(
    conversationId: string,
    dto: ActualDriverVerifyAdditionDto,
  ): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Actual driver verify addition: conv=${conversationId}`);
      return;
    }
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      await this.http.post('/api/v1/actual-driver/addition/verify', dto, {
        headers: { 'X-Conversation-Id': conversationId },
      });
    });
  }

  /**
   * Step 3 — submit OTP (or null for company) and finalise assignment.
   * Docs: POST /api/v1/actual-driver/addition/
   */
  async actualDriverFinalSubmit(
    conversationId: string,
    dto: ActualDriverFinalSubmitDto,
  ): Promise<ActualDriverAdditionResult> {
    if (this.isMock) {
      return { referenceNumber: Math.floor(Math.random() * 9e10) + 1e10 };
    }
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.http.post<ActualDriverAdditionResult>(
        '/api/v1/actual-driver/addition/',
        dto,
        { headers: { 'X-Conversation-Id': conversationId } },
      );
      return res.data;
    });
  }

  /**
   * Resend OTP — callable after 2 minutes if OTP not received.
   * Docs: GET /api/v1/actual-driver/addition/retrySendOtp
   */
  async actualDriverResendOtp(conversationId: string): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Actual driver resend OTP: conv=${conversationId}`);
      return;
    }
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      await this.http.get('/api/v1/actual-driver/addition/retrySendOtp', {
        headers: { 'X-Conversation-Id': conversationId },
      });
    });
  }

  /**
   * Cancel Step 1 — verify vehicle for actual driver removal.
   * Returns X-Conversation-Id to use in the DELETE call.
   * Docs: POST /api/v1/actual-driver/removal/verify
   */
  async actualDriverRemoveVerify(
    plateDto: TammPlateDto,
  ): Promise<{ conversationId: string }> {
    if (this.isMock) {
      return { conversationId: `MOCK-CONV-RM-${Date.now()}` };
    }
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.http.post(
        '/api/v1/actual-driver/removal/verify',
        { plateDto },
      );
      const conversationId =
        res.headers['x-conversation-id'] ||
        res.headers['X-Conversation-Id'] ||
        res.data?.conversationId ||
        '';
      return { conversationId: conversationId as string };
    });
  }

  /**
   * Cancel Step 2 — remove actual driver.
   * Docs: DELETE /api/v1/actual-driver/removal/?moveVehicleToCurrentBranch={bool}
   */
  async actualDriverRemove(
    conversationId: string,
    moveVehicleToCurrentBranch = false,
  ): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Actual driver removal: conv=${conversationId}`);
      return;
    }
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      await this.http.delete(
        `/api/v1/actual-driver/removal/?moveVehicleToCurrentBranch=${moveVehicleToCurrentBranch}`,
        { headers: { 'X-Conversation-Id': conversationId } },
      );
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapRawViolation(raw: RawViolation, isPaid: boolean): TammViolation {
    const p = raw.vehiclePlate;
    const plateStr =
      [p.text1, p.text2, p.text3].filter(Boolean).join('') + ' ' + p.number;
    const item = raw.violationItems?.[0];
    return {
      violationId: raw.violationNumber.toString(),
      plateNumber: plateStr.trim(),
      vehicleId: raw.vehicleSequenceNumber?.toString() ?? '',
      description:
        item?.violationType?.nameEn ||
        item?.violationType?.nameAr ||
        'Traffic Violation',
      amount: raw.totalFineItemsAmount,
      issuedAt: new Date(raw.violationHijriDate ?? Date.now()),
      location: raw.violationCity,
      isPaid,
    };
  }

  /**
   * Best-effort parse of "ABC 1234" style plate string into a TammPlateDto.
   * Only used as a fallback when a raw plate string is passed to getViolations().
   */
  private parsePlateString(plate: string): TammPlateDto {
    const parts = plate.trim().split(/\s+/);
    const letters = parts[0] ?? '';
    const num = parseInt(parts[1] ?? '0', 10);
    return {
      text1: letters[0] ?? '',
      text2: letters[1] ?? '',
      text3: letters[2] ?? '',
      number: isNaN(num) ? 0 : num,
      type: { code: 1 },
    };
  }

  // ─── Mock Data ────────────────────────────────────────────────────────────

  private mockVehicles(): TammVehicle[] {
    return [
      {
        vehicleId: 'tamm-v-001',
        plateNumber: 'ABC 1234',
        make: 'Toyota',
        model: 'Hilux',
        year: 2022,
        registrationExpiry: new Date('2026-08-15'),
        inspectionExpiry: new Date('2026-05-30'),
        insuranceExpiry: new Date('2026-11-01'),
        owner: 'Al-Rashidi Logistics Co.',
      },
      {
        vehicleId: 'tamm-v-002',
        plateNumber: 'XYZ 5678',
        make: 'Ford',
        model: 'Transit',
        year: 2021,
        registrationExpiry: new Date('2026-06-20'),
        inspectionExpiry: new Date('2026-07-10'),
        insuranceExpiry: new Date('2026-09-15'),
        owner: 'Al-Rashidi Logistics Co.',
      },
    ];
  }

  private mockPaginatedViolations(isPaid: boolean): TammPaginatedViolations {
    const items: RawViolation[] = [
      {
        violationNumber: isPaid ? 3900131314 : 6999979991,
        vehiclePlate: {
          text1: 'ب',
          text2: 'س',
          text3: 'س',
          number: 4926,
          type: { code: 1, nameAr: 'خاص', nameEn: 'Private Car' },
        },
        vehicleSequenceNumber: 997630501,
        vehicleMake: 'Toyota',
        violationCity: isPaid ? 'الرياض' : 'جدة',
        violationHijriDate: '1446-02-29',
        violationItems: [
          {
            violationAmount: isPaid ? 300 : 700,
            violationNumber: isPaid ? 3900131314 : 6999979991,
            violationType: {
              code: isPaid ? 300 : 4800,
              nameAr: 'تجاوز السرعة',
              nameEn: isPaid
                ? 'Speeding — up to 25 km/h over limit'
                : 'Running red light',
            },
          },
        ],
        violationStatus: {
          code: 2,
          nameAr: isPaid ? 'صدر وتم دفعه' : 'صدر وغير مدفوع',
          nameEn: isPaid
            ? 'Issued to violator and paid'
            : 'Issued to violator but un-paid',
        },
        violationTime: '12:00',
        violatorId: 7001396907,
        totalFineItemsAmount: isPaid ? 300 : 700,
        violationPoint: isPaid ? 0 : 6,
        ...(isPaid
          ? { paymentDate: '2024-09-02', paymentDateHijri: '1446-02-29' }
          : {}),
      },
    ];
    return {
      content: items,
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
    };
  }

  private mockViolations(plateNumber?: string): TammViolation[] {
    const all: TammViolation[] = [
      {
        violationId: 'VIO-001',
        plateNumber: 'ABC 1234',
        vehicleId: 'tamm-v-001',
        description: 'Speeding — 130 km/h in 100 zone',
        amount: 500,
        issuedAt: new Date('2026-04-10'),
        location: 'Riyadh — Northern Ring Road',
        isPaid: false,
      },
      {
        violationId: 'VIO-002',
        plateNumber: 'XYZ 5678',
        vehicleId: 'tamm-v-002',
        description: 'Running red light',
        amount: 700,
        issuedAt: new Date('2026-03-22'),
        location: 'Jeddah — King Fahd Road',
        isPaid: true,
      },
    ];
    if (plateNumber) return all.filter((v) => v.plateNumber === plateNumber);
    return all;
  }

  private mockMvpi(): TammMvpiResult {
    return {
      plate: {
        text1: 'أ',
        text2: 'ب',
        text3: 'ج',
        number: 1234,
        type: { code: 1, nameAr: 'خاص', nameEn: 'Private Car' },
      },
      sequenceNumber: 997630501,
      mvpiStatus: 'VALID',
      mvpiExpiryDate: '2027-05-01',
      mvpiExpiryDateHijri: '1449-10-02',
      odometer: 85000,
    };
  }

  private mockInsurance(): TammInsuranceResult {
    return {
      plate: {
        text1: 'أ',
        text2: 'ب',
        text3: 'ج',
        number: 1234,
        type: { code: 1, nameAr: 'خاص', nameEn: 'Private Car' },
      },
      list: [
        {
          insuranceCompanyName: 'الشركة التعاونية للتأمين',
          mainPolicyNumber: 'T344-M320-X362-L503-U1143',
          subPolicyNumber: 'R337-R504-Y638-P454-P4990',
          policyEndDate: '2027-05-01',
          policyIssueDate: '2026-05-01',
          policyStartDate: '2026-05-01',
          policyCoverType: {
            code: 1,
            nameAr: 'تأمين شامل',
            nameEn: 'COMPREHENSIVE INSURANCE',
          },
        },
      ],
    };
  }

  private mockDelegations(vehicleId: string): TammDelegation[] {
    return [
      {
        delegationId: 'DEL-001',
        vehicleId,
        delegateName: 'Mohammed Al-Qahtani',
        delegateNationalId: '1098765432',
        isInternational: false,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
        isActive: true,
      },
    ];
  }
}

