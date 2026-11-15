# AlertaSinRed · PWA (frontend)

Aplicación web progresiva **offline-first** para consultar el riesgo de deslizamiento y
creciente de ríos en zonas de Nariño y Putumayo, incluso **sin conexión**, y suscribirse a
alertas por SMS.

> Proyecto final · Programación Orientada a la Web · Ingeniería de Software · UCC Pasto
> API (backend): repositorio `alerta-sin-red-backend`.

| Tema | Tecnología |
|---|---|
| Interfaz | React 19 · TypeScript (estricto) · Tailwind CSS 4 · React Router 7 · Inter (local) |
| Idiomas y temas | Español e inglés (diccionarios tipados) · claro, oscuro o el del sistema |
| Offline | Service Worker propio (Workbox, `injectManifest`) · IndexedDB (`idb`) · Background Sync |
| Build y pruebas | Vite 8 · Vitest |
| Despliegue | Vercel (reenvía `/api/*` a Render) · Docker + Nginx (alternativa) |

La estrategia offline (qué se guarda, cuándo y cómo se sincroniza) está en
[docs/OFFLINE.md](docs/OFFLINE.md).

## Funcionalidades

**Para la comunidad**
- **Riesgo de cada zona** calculado por el modelo de IA del backend, con la explicación
  de por qué se asignó ese nivel, la probabilidad de cada nivel y qué hacer.
- **Funciona sin internet:** la app abre desde la caché y muestra el último estado
  guardado, avisando de cuándo es; si los datos tienen más de 3 horas, lo advierte.
- **Resumen de la región y mapa esquemático** dibujado en el dispositivo (sin teselas
  externas, también funciona sin conexión).
- **"Mi zona":** fijar la zona propia para verla primero y recibir **avisos en el
  celular** cuando suba a riesgo alto (también con la app cerrada, si está instalada).
- **Zonas cerca de mí:** consulta espacial en el servidor (PostGIS) o, sin conexión,
  cálculo en el dispositivo. **Búsqueda** sin tildes y **filtro por nivel**.
- **Alertas por SMS:** suscripción con formato automático del número y baja desde el
  mismo dispositivo; sin señal, quedan pendientes y se envían solas al volver la conexión.
- **Compartir una alerta** por WhatsApp u otras apps; **enlaces directos** a cada zona.
- **Instalar la app** (Android, Chrome, Edge; instrucciones en iPhone).
- **Cómo funciona:** explicación sencilla y ficha técnica del modelo con sus limitaciones.

**Para operadores** (`/operador`)
- Evaluación con IA a demanda, indicadores (zonas por nivel, SMS de 24 h, última
  evaluación) y últimos SMS, incluidos los de fin de alerta.
- Exportación del historial a CSV.
- Administradores: cuentas de operadores, zonas monitoreadas, SMS de prueba de la
  pasarela y bitácora de auditoría. Cada operador puede cambiar su contraseña.

**Interfaz**
- **Español e inglés** con un selector ES/EN. Los textos viven en `src/i18n/es.ts` y
  `src/i18n/en.ts`; el inglés se tipa contra el español, así que una clave sin traducir
  no compila, y una prueba verifica que ambos tengan las mismas claves y parámetros.
  Fechas, números y "hace 5 minutos" siguen el idioma (`Intl`). Las notificaciones del
  celular también salen en el idioma elegido.
- **Tema claro, oscuro o el del sistema.** Los colores son variables CSS (`src/index.css`)
  con un juego para cada tema; un script mínimo (`public/theme-init.js`) aplica el tema
  antes de pintar para que no haya parpadeo. El color solo marca los niveles de riesgo.
- **Diseño de aplicación:** barra lateral en escritorio, barra superior y navegación
  inferior en celular; las pantallas usan el ancho disponible en dos columnas y el panel
  del operador se organiza en pestañas.

**Accesibilidad:** títulos por página, anuncio de navegación para lectores de pantalla,
enlaces reales en el mapa, pestañas con teclado (patrón WAI-ARIA), foco nunca oculto
bajo la barra inferior, contraste AA en ambos temas y respeto de `prefers-reduced-motion`.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173 (proxy /api -> http://localhost:8000)
```

Para apuntar a otra API en desarrollo: `VITE_API_PROXY=http://127.0.0.1:8010 npm run dev`.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con el Service Worker activo |
| `npm run build` | Verificación de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build (útil para probar el modo offline real) |
| `npm test` | 49 pruebas con Vitest (lógica offline con IndexedDB simulado, dominio y servicios) |
| `npm run typecheck` | Solo verificación de tipos |
| `npm run lint` | Análisis estático con Oxlint (TypeScript, hooks de React, accesibilidad) |

## Calidad

Se usa **Oxlint** en lugar de ESLint porque `typescript-eslint` aún no es compatible con
TypeScript 7. La configuración (`.oxlintrc.json`) activa las reglas de corrección, las de
los hooks de React y las de accesibilidad. Reglas desactivadas a propósito:

| Regla | Motivo |
|---|---|
| `react/set-state-in-effect` | Los efectos cargan datos de IndexedDB o de la API: es sincronizar con un sistema externo, el uso legítimo de un efecto |
| `jsx-a11y/prefer-tag-over-role` | `role="status"` es el patrón WAI-ARIA para avisos que cambian en vivo; `<output>` es para resultados de cálculos |
| `import/no-unassigned-import` | Importaciones con efecto intencional (hoja de estilos, `fake-indexeddb/auto` en pruebas) |
| `no-underscore-dangle` | `self.__WB_MANIFEST` es el nombre que exige Workbox |

## Cómo demostrar el modo offline

1. `npm run build && npm run preview` y abra la app con conexión.
2. DevTools → **Aplicación** → **Service workers** → marque **Sin conexión**.
3. Recargue: la app abre, muestra el riesgo guardado y el aviso "Sin conexión".
4. Suscríbase a alertas SMS: queda en **Pendientes de envío**.
5. Desmarque **Sin conexión**: la solicitud se envía sola.

## Despliegue en Vercel

`vercel.json` ya define el build (Vite, `npm ci`, `dist`), las cabeceras de seguridad y la
regla que reenvía `/api/*` a la API en Render. Así la PWA y la API comparten origen: no
hay CORS y el Service Worker puede cachear las respuestas.

1. Si la URL de la API no es `https://alerta-sin-red-api.onrender.com`, cámbiela en
   `vercel.json`.
2. Vercel → **Add New → Project** → este repositorio → **Deploy**.
3. Use el dominio principal del proyecto (`*.vercel.app` corto). Las URL largas de cada
   despliegue tienen protección de Vercel y la app no puede leer la API a través de ellas.

## Estructura

```
src/
├── domain/          tipos, niveles de riesgo, geodesia, tiempo, filtros, teléfono
├── i18n/            diccionarios es/en, traductor, textos del dominio (niveles, factores, compartir)
├── infrastructure/  ApiClient (HTTP tipado) e IndexedDB (snapshot, outbox, suscripciones, preferencias)
├── application/     RiskService, SubscriptionService, OutboxProcessor, RiskNotifier, AdminService…
├── hooks/           estado de React (snapshot, conexión, bandeja de salida, sesión, tema)
├── components/      interfaz reutilizable (tarjetas, mapa esquemático, íconos…)
├── pages/           pantallas
├── components/admin/ secciones del panel del operador
├── services.ts      raíz de composición: único lugar que instancia las clases
└── sw.ts            Service Worker (reutiliza las mismas clases de application/infrastructure)
```

## Seguridad

- Content-Security-Policy estricta (sin scripts inline ni de terceros), `X-Frame-Options`,
  `nosniff`, HSTS y `Permissions-Policy` (definidas en `vercel.json` y `nginx.conf`).
- El token del operador vive solo en memoria, nunca en `localStorage`.
- `/auth/*` y `/admin/*` nunca se guardan en caché.
- La ubicación del usuario se usa solo para la consulta y no se almacena.
