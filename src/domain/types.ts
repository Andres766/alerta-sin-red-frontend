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
  message: string
}

export interface AlertRecord {
  id: string
  zone_id: string
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
