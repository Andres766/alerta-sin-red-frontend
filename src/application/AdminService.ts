import type { AlertRecord, EvaluationResult, TokenResponse } from '../domain/types'
import type { ApiClient } from '../infrastructure/http/ApiClient'

export class AdminService {
  constructor(private readonly api: ApiClient) {}

  login(email: string, password: string): Promise<TokenResponse> {
    return this.api.post<TokenResponse>('/auth/login', { email, password })
  }

  evaluate(token: string): Promise<EvaluationResult> {
    return this.api.post<EvaluationResult>('/admin/evaluations', undefined, token)
  }

  alerts(token: string): Promise<AlertRecord[]> {
    return this.api.get<AlertRecord[]>('/admin/alerts?limit=20', token)
  }

  stats(token: string): Promise<{ active_subscribers: number; zones: number }> {
    return this.api.get('/admin/stats', token)
  }
}
