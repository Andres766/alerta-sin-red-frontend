import type {
  AlertRecord,
  AuditEntry,
  DashboardStats,
  EvaluationResult,
  NewUserAccount,
  NewZone,
  SmsTestResult,
  Zone,
  ZoneChanges,
  TokenResponse,
  UserAccount,
} from '../domain/types'
import type { ApiClient } from '../infrastructure/http/ApiClient'

/** Operaciones del panel; todas (salvo login) requieren el token del operador. */
export class AdminService {
  constructor(private readonly api: ApiClient) {}

  login(email: string, password: string): Promise<TokenResponse> {
    return this.api.post<TokenResponse>('/auth/login', { email, password })
  }

  /** Devuelve un token nuevo: los anteriores dejan de valer al cambiar la clave. */
  changePassword(token: string, currentPassword: string, newPassword: string): Promise<TokenResponse> {
    return this.api.post<TokenResponse>(
      '/auth/change-password',
      { current_password: currentPassword, new_password: newPassword },
      token,
    )
  }

  me(token: string): Promise<UserAccount> {
    return this.api.get<UserAccount>('/auth/me', token)
  }

  evaluate(token: string): Promise<EvaluationResult> {
    return this.api.post<EvaluationResult>('/admin/evaluations', undefined, token)
  }

  alerts(token: string): Promise<AlertRecord[]> {
    return this.api.get<AlertRecord[]>('/admin/alerts?limit=20', token)
  }

  stats(token: string): Promise<DashboardStats> {
    return this.api.get<DashboardStats>('/admin/stats', token)
  }

  users(token: string): Promise<UserAccount[]> {
    return this.api.get<UserAccount[]>('/admin/users', token)
  }

  createUser(token: string, account: NewUserAccount): Promise<UserAccount> {
    return this.api.post<UserAccount>('/admin/users', account, token)
  }

  auditLog(token: string, limit = 100): Promise<AuditEntry[]> {
    return this.api.get<AuditEntry[]>(`/admin/audit?limit=${limit}`, token)
  }

  sendTestSms(token: string, phone: string): Promise<SmsTestResult> {
    return this.api.post<SmsTestResult>('/admin/sms/test', { phone }, token)
  }

  assessmentsCsv(token: string, days: number): Promise<Blob> {
    return this.api.getBlob(`/admin/assessments.csv?days=${days}`, token)
  }

  createZone(token: string, zone: NewZone): Promise<Zone> {
    return this.api.post<Zone>('/admin/zones', zone, token)
  }

  updateZone(token: string, zoneId: string, changes: ZoneChanges): Promise<Zone> {
    return this.api.patch<Zone>(`/admin/zones/${encodeURIComponent(zoneId)}`, changes, token)
  }

  setActive(token: string, userId: string, active: boolean): Promise<UserAccount> {
    const action = active ? 'activate' : 'deactivate'
    return this.api.post<UserAccount>(`/admin/users/${encodeURIComponent(userId)}/${action}`, undefined, token)
  }
}
