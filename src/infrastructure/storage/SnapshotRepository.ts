import type { RiskSnapshot } from '../../domain/types'
import type { AppDatabase, StoredSnapshot } from './database'

/** Repositorio del último estado de riesgo conocido (consultable sin conexión). */
export class SnapshotRepository {
  constructor(private readonly db: () => Promise<AppDatabase>) {}

  async save(snapshot: RiskSnapshot): Promise<void> {
    const record: StoredSnapshot = { key: 'latest', snapshot, savedAt: new Date().toISOString() }
    await (await this.db()).put('snapshot', record)
  }

  async load(): Promise<StoredSnapshot | undefined> {
    return (await this.db()).get('snapshot', 'latest')
  }
}
