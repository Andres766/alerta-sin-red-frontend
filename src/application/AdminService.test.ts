import { describe, expect, it } from 'vitest'
import { ApiClient } from '../infrastructure/http/ApiClient'
import { AdminService } from './AdminService'

function recordingApi() {
  const calls: { url: string; method: string; auth: string | null; body: unknown }[] = []
  const fetchImpl: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers)
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      auth: headers.get('Authorization'),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    })
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return { calls, api: new ApiClient('/api/v1', fetchImpl) }
}

describe('AdminService', () => {
  it('envía el token Bearer en las operaciones protegidas', async () => {
    const { calls, api } = recordingApi()
    await new AdminService(api).stats('tok')
    expect(calls[0]).toMatchObject({ url: '/api/v1/admin/stats', auth: 'Bearer tok' })
  })

  it('activa y desactiva cuentas con la ruta correcta', async () => {
    const { calls, api } = recordingApi()
    const service = new AdminService(api)
    await service.setActive('tok', 'u-1', false)
    await service.setActive('tok', 'u-1', true)
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST /api/v1/admin/users/u-1/deactivate',
      'POST /api/v1/admin/users/u-1/activate',
    ])
  })

  it('crea cuentas enviando correo, contraseña y rol', async () => {
    const { calls, api } = recordingApi()
    await new AdminService(api).createUser('tok', { email: 'op@x.co', password: 'clave-de-doce', role: 'OPERATOR' })
    expect(calls[0]?.body).toEqual({ email: 'op@x.co', password: 'clave-de-doce', role: 'OPERATOR' })
  })
})

describe('cambio de contraseña', () => {
  it('envía la clave actual y la nueva con el token de la sesión', async () => {
    const { calls, api } = recordingApi()
    await new AdminService(api).changePassword('tok', 'actual-123', 'nueva-clave-segura')
    expect(calls[0]).toMatchObject({
      url: '/api/v1/auth/change-password', method: 'POST', auth: 'Bearer tok',
      body: { current_password: 'actual-123', new_password: 'nueva-clave-segura' },
    })
  })
})

describe('gestión de zonas', () => {
  it('crea con POST y actualiza con PATCH solo los campos cambiados', async () => {
    const { calls, api } = recordingApi()
    const service = new AdminService(api)
    await service.updateZone('tok', 'z-1', { susceptibility: 5 })
    expect(calls[0]).toMatchObject({
      url: '/api/v1/admin/zones/z-1', method: 'PATCH', auth: 'Bearer tok', body: { susceptibility: 5 },
    })
  })
})
