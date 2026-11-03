import type { ModelCard } from '../domain/types'
import type { ApiClient } from '../infrastructure/http/ApiClient'

/** Ficha técnica del modelo de IA (el Service Worker la guarda para verla sin conexión). */
export class ModelInfoService {
  constructor(private readonly api: ApiClient) {}

  card(): Promise<ModelCard> {
    return this.api.get<ModelCard>('/model')
  }
}
