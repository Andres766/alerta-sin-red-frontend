// Contratos de datos compartidos con la API (espejo de app/api/schemas.py).

export type RiskLevel = 'BAJO' | 'MODERADO' | 'ALTO' | 'MUY_ALTO'
export type HazardType = 'DESLIZAMIENTO' | 'CRECIENTE' | 'MIXTO'

export interface Zone {
  id: string
  name: string
  municipality: string
  department: string
  hazard_type: HazardType
  susceptibility: number
  slope_deg: number
  latitude: number
  longitude: number
}

export interface Assessment {
  id: string
  level: RiskLevel
  alert_color: string
  probability: number
  probabilities: Record<RiskLevel, number>
  features: Record<string, number>
  key_factors: string[]
  model_version: string
  weather_source: string
  assessed_at: string
}

/** Peor nivel de riesgo de un día (hora de Colombia). */
export interface DayRisk {
  day: string
  level: RiskLevel
  probability: number
  evaluations: number
}

export interface ZoneRisk {
  zone: Zone
  assessment: Assessment | null
}

export interface RiskSnapshot {
  generated_at: string
  items: ZoneRisk[]
}

export interface NearbyZone {
  zone: Zone
  distance_km: number
}

export interface SubscriptionRequest {
  phone: string
  zone_id: string
  accepts_data_policy: boolean
}

export interface SubscriptionResponse {
  id: string
  zone_id: string
  phone_masked: string
  active: boolean
  /** Código de baja: el servidor lo entrega una sola vez (null si ya existía). */
  cancel_token: string | null
  message: string
}

export interface CancelRequest {
  subscription_id: string
  cancel_token: string
}

export interface AlertRecord {
  id: string
  zone_id: string
  /** ALERT: el riesgo subió; ALL_CLEAR: aviso de fin de alerta. */
  kind: 'ALERT' | 'ALL_CLEAR'
  level: RiskLevel
  channel: string
  status: 'SENT' | 'FAILED'
  error: string | null
  created_at: string
}

export interface EvaluationResult {
  evaluated: number
  failures: Record<string, string>
  assessments: Assessment[]
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  role: string
}

/** Origen de los datos mostrados: clave para que el usuario sepa si está viendo algo viejo. */
export type DataSource = 'network' | 'cache'

export type Role = 'ADMIN' | 'OPERATOR'

export interface UserAccount {
  id: string
  email: string
  role: Role
  active: boolean
  created_at: string
}

export interface NewUserAccount {
  email: string
  password: string
  role: Role
}

export interface DashboardStats {
  zones: number
  active_subscribers: number
  zones_by_level: Record<RiskLevel | 'SIN_EVALUAR', number>
  sms_sent_24h: number
  sms_failed_24h: number
  last_evaluation_at: string | null
}

export interface ModelCard {
  version: string
  algorithm: string
  trained_at: string
  data_source: string
  n_samples: number
  feature_order: string[]
  feature_importances: Record<string, number>
  metrics: Record<string, number>
  confusion_matrix: number[][]
  labels: RiskLevel[]
  limitations: string[]
}

export type NewZone = Omit<Zone, 'id'>

export interface ZoneChanges {
  hazard_type?: HazardType
  susceptibility?: number
  slope_deg?: number
}

export interface AuditEntry {
  id: string
  actor: string
  action: string
  target: string | null
  details: string | null
  created_at: string
}

export interface SmsTestResult {
  success: boolean
  channel: string
  phone_masked: string
  provider_message_id: string | null
  error: string | null
}
