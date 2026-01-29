export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 2FA Models
export interface TwoFactorSetupResponse {
  qr_code: string;
  secret: string;
  message?: string;
}

export interface TwoFactorVerifyResponse {
  message: string;
  backup_codes: string[];
}

export interface TwoFactorStatusResponse {
  is_enabled: boolean;
  message?: string;
}

export interface TwoFactorDisableRequest {
  password: string;
}