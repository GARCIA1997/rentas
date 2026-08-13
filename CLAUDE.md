# KsaRed — contexto del proyecto

Este archivo es el mapa completo del repo para cualquier sesión de Claude Code que trabaje aquí:
qué es, cómo está armado, y las decisiones que no son obvias leyendo un archivo suelto. Léelo
antes de tocar código que no conozcas.

## Qué es

**KsaRed** es una PWA de gestión de rentas para un administrador de propiedades en México
(Coahuayana de Hidalgo, Michoacán y Villa de Álvarez, Colima — son las dos únicas ciudades que
el sistema acepta hoy, ver `frontend/lib/api.ts:VALID_CITIES`). Cubre el ciclo completo:

1. Alta de propiedades e inquilinos (perfiles separados — ver más abajo por qué).
2. Creación de contratos de arrendamiento con generación automática del calendario de pagos.
3. Generación de PDFs de contrato con fundamento legal real (ver sección Marco Legal) y de
   recibos de pago.
4. Registro de pagos, cobro de renta, seguimiento de vencidos.
5. Renovación manual de contratos con sugerencia de aumento de renta.
6. Portal del inquilino: cada inquilino con cuenta ve su contrato, su historial de pagos y
   descarga sus propios recibos/contrato.
7. Envío de recibos/contratos al inquilino por WhatsApp (`wa.me` deep link, no hay API de
   WhatsApp Business — es un link que abre WhatsApp con el mensaje precargado).

Hay un solo rol administrador de facto (`ADMIN`) más los inquilinos (`INQUILINO`); no hay
multi-tenancy entre distintos administradores/dueños de propiedades.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React, TypeScript, Tailwind CSS v4 |
| Backend | Node.js (ESM, `"type": "module"`), Express |
| ORM / DB | Prisma 5 + PostgreSQL 16 |
| PDFs | Puppeteer (Chromium del sistema en Alpine, no el bundle de Puppeteer) |
| Auth | JWT (access 30 días + refresh 7 días), passwords con bcryptjs |
| Contenedores | Docker Compose (postgres + backend + frontend) |
| CI/CD | GitHub Actions — `ci.yml` (verificación) + `deploy.yml` (build in-situ y despliegue por SSH) |

No hay framework de testing externo: el backend usa el test runner nativo de Node
(`node --test`), sin Jest ni Vitest.

## Estructura del repo

```
rentas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # fuente de verdad del modelo de datos
│   │   └── migrations/            # una carpeta por migración, nunca se editan a mano
│   ├── src/
│   │   ├── index.js                # entrypoint Express; sólo escucha si es el entrypoint real
│   │   │                            # (pathToFileURL check — permite importar `app` en tests)
│   │   ├── routes/                 # un archivo por recurso, mapea verbo+path → controller
│   │   ├── controllers/            # valida input (express-validator) y llama al service
│   │   ├── services/                # toda la lógica de negocio y las queries de Prisma viven aquí
│   │   ├── middleware/              # authenticateJWT, requireAdmin, requireTenant, errorHandler
│   │   ├── db/
│   │   │   ├── seed.js              # datos iniciales — credenciales del admin por env vars
│   │   │   ├── contractTemplates.js # las 3 plantillas HTML de contrato (ver Contratos)
│   │   │   └── legalFramework.js    # fundamento legal por jurisdicción (ver Marco Legal)
│   │   ├── utils/rentCalculation.js # sugerencia de renta, elegibilidad de renovación
│   │   └── assets/icon.png          # logo embebido como data-URI en los PDFs
│   ├── scripts/
│   │   ├── smoke-test.js            # integración end-to-end contra Postgres real (usa `app`)
│   │   ├── audit-contract-templates.js  # detecta/corrige contratos con plantilla equivocada
│   │   └── preview-contract-pdf.js  # genera PDFs de muestra de las 3 plantillas
│   └── src/**/*.test.js             # unit tests junto al código que prueban
│
├── frontend/
│   ├── app/
│   │   ├── (app)/                   # route group: todo lo detrás de login vive aquí
│   │   │   ├── layout.tsx           # ProtectedRoute + AppShell centralizados
│   │   │   ├── dashboard/           # KPIs admin / resumen de pagos del inquilino
│   │   │   ├── properties/          # listado + [id] perfil de propiedad
│   │   │   ├── tenants/             # listado + [id]/profile
│   │   │   ├── contracts/           # listado + [id] detalle + [id]/renew + new (wizard)
│   │   │   ├── payments/            # listado con segmentos (vencidos/próximos/pagados)
│   │   │   ├── profile/             # perfil del inquilino (portal)
│   │   │   ├── settings/            # representantes + tema + perfil admin
│   │   │   └── reports/
│   │   ├── login/, register/        # fuera del route group, sin AppShell
│   │   └── globals.css              # design tokens + utilidades de "glass" (ver Colorimetría)
│   ├── components/                  # AppShell, Modal, TenantFormModal, ToastProvider, icons…
│   ├── lib/
│   │   ├── api.ts                   # ÚNICO punto de contacto con el backend — todo tipado aquí
│   │   ├── authContext.tsx          # User type vive aquí; login/logout/refresh
│   │   ├── themeContext.tsx         # claro/oscuro/sistema, persistido en localStorage
│   │   └── formatDate.ts
│   └── hooks/useAuth.ts
│
├── docker-compose.yml                # dev: bind mounts + hot reload en los tres servicios
├── docker-compose.prod.yml           # prod: build real, sin bind mounts, puertos en 127.0.0.1
├── .github/workflows/
│   ├── ci.yml                       # lint + tests + Postgres real + smoke test + build de imágenes
│   └── deploy.yml                    # SSH al VPS, build in-situ y despliegue — se salta limpio
│                                      # si faltan secretos, no falla en rojo
└── .env.example                      # variables de entorno documentadas, valores dummy
```

## Cómo correrlo local

```bash
cp .env.example .env    # ajustar si hace falta; los defaults ya sirven para Docker Compose
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

Backend en `:4000`, frontend en `:3000`, Postgres expuesto en `:5442` (host) → `5432` (contenedor).
El `SEED_ADMIN_PASSWORD`/`SEED_ADMIN_PHONE` los define quien despliega — sin ellos, el seed usa
una contraseña de desarrollo conocida y avisa por consola. **El repo es público: nunca commitear
credenciales reales.**

Comandos backend relevantes (`backend/package.json`):
- `npm run dev` — servidor con `--watch`
- `npm test` / `npm run test:ci` — unit tests (`node --test "src/**/*.test.js"`)
- `npm run test:smoke` — integración contra una base ya migrada y sembrada
- `npm run lint` / `npm run lint:fix`
- `npm run db:seed`, `prisma:migrate`, `prisma:studio`

Frontend: `npm run dev`, `npm run build`, `npm run lint`, `npx tsc --noEmit`.

## Modelo de datos — decisiones que no son obvias

- **`Tenant` no tiene `propertyId`.** Un inquilino es sólo un perfil de persona. Qué propiedad
  ocupa, desde cuándo y en qué términos vive enteramente en `Contract` (`tenantId` +
  `propertyId` + `startDate`). Esto permite que un mismo inquilino tenga contratos históricos
  en distintas propiedades sin relación directa Tenant→Property.
- **`Contract.durationMonths` + `paymentDay`, no sólo `startDate`/`endDate`.** `endDate` existe
  por compatibilidad pero se deriva de `startDate + durationMonths`. El calendario de pagos se
  genera completo al firmar el contrato (`markAsSigned`), no pago por pago a mano.
- **`Contract.templateUsed` es `String` NOT NULL** (migración `make_template_required`, agosto
  2026). Antes era nullable y eso permitió contratos sin plantilla que no podían generar PDF ni
  renovarse — ver `backend/src/services/CONTRACT_RENEWAL_CHECKLIST.md` para el post-mortem
  completo y la lista de campos que deben/no deben heredarse en una renovación.
- **`ContractTemplate.propertyType`** (`HOUSE` | `LOCAL` | `null`) evita que un local comercial
  reciba el clausulado de casa habitación (o viceversa) — pasó en producción antes de agregar
  esta validación. `resolveTemplateForProperty()` en `contractService.js` la hace cumplir al
  crear y al renovar; `scripts/audit-contract-templates.js [--fix]` audita/corrige lo existente.
- **`Contract.previousContractId`** enlaza una renovación con el contrato del que viene
  (auto-relación `ContractRenewal`). Una renovación es un contrato nuevo en `DRAFT`, no una
  edición del anterior.
- **Todos los montos son `Decimal(12,2)`** — nunca `Float`, por precisión en dinero. Llegan al
  frontend como `string` (así serializa Prisma `Decimal` a JSON); convertir con `Number()`
  antes de operar o formatear.
- **`RegistrationInvite`** es el único camino para crear una cuenta — ver sección
  "Alta de cuentas" más abajo. `token` es de un solo uso (`usedAt`) y vence
  (`expiresAt`, 7 días); `tenantId` sólo aplica a invitaciones de `INQUILINO`.

## Autenticación y autorización

- JWT firmado con `JWT_SECRET` (access, 30 días) y `JWT_REFRESH_SECRET` (refresh, 7 días).
  Access token viaje en `Authorization: Bearer <token>`; no hay cookies httpOnly, el frontend
  guarda `accessToken`/`user` en `localStorage` (`authContext.tsx`).
- `middleware/auth.js`: `authenticateJWT` decodifica y setea `req.user`; `requireAdmin` exige
  `role === 'ADMIN'`; `requireTenant` acepta ambos roles (nombre engañoso — en realidad es "estás
  logueado", casi todo lo usa así de facto vía `authenticateJWT` en `/api/me/*`).
- Casi todas las rutas admin llevan `router.use(authenticateJWT, requireAdmin)` al inicio del
  archivo — mirar el `router.use` antes de asumir que un endpoint es público.

### Alta de cuentas: sólo por invitación, no hay registro público

`POST /api/auth/register` **no existe** (se quitó agosto 2026, ver más abajo). La única forma
de crear una cuenta es aceptando una invitación:

- Un admin genera una invitación (`POST /api/invites`, requiere sesión de admin):
  `{ role: 'ADMIN' }` o `{ role: 'INQUILINO', tenantId }` — para inquilinos, el `Tenant` ya
  debe existir (dado de alta antes por el admin) y no tener `userId` todavía.
- El link (`{FRONTEND_URL}/register?token=...`) lo comparte el admin por fuera de la app
  (WhatsApp, lo que sea). `GET /api/invites/:token` es público y sólo devuelve lo necesario
  para pintar la pantalla: el rol, y si es de inquilino, `tenant.fullName`/`tenant.phone` de
  solo lectura — nunca datos sensibles adicionales.
- `POST /api/invites/:token/accept` (público) consume el token — de un solo uso, vence a los
  7 días (`RegistrationInvite.expiresAt`). Para invitación de inquilino sólo pide **contraseña**
  (nombre y teléfono ya vienen del `Tenant`); para invitación de admin pide los datos completos.
  El `Tenant.userId` se liga **por id explícito** desde la invitación, no por coincidencia de
  teléfono como antes — elimina el caso raro de que dos registros compartieran teléfono.
- **Por qué se quitó el registro público**: se consideró hacer que el registro público creara
  cuentas `ADMIN` directamente (para simplificar el alta del propio admin en el primer deploy) —
  eso habría dejado acceso total de administrador a cualquiera que encontrara la URL, sin
  invitación. En vez de eso se rediseñó todo el flujo hacia invitaciones de un solo uso, que de
  paso cierra también el registro abierto de `INQUILINO` que existía antes. Decisión de
  seguridad deliberada, agosto 2026 — nunca reintroducir un endpoint de registro sin invitación.

## Rutas del API (todas bajo `/api`)

```
POST   /auth/login | /auth/refresh | /auth/logout

POST   /invites                    ← requiere sesión de admin
GET    /invites/:token             ← público
POST   /invites/:token/accept      ← público, consume el token

GET    /properties | /properties/:id | /properties/:id/detail
POST   /properties            PUT /properties/:id            DELETE /properties/:id

GET    /tenants | /tenants/:id
POST   /tenants                PUT /tenants/:id               DELETE /tenants/:id

GET    /representatives | /representatives/:id
POST   /representatives        PUT /representatives/:id       DELETE /representatives/:id

GET    /contract-templates

GET    /contracts/renewal-alerts   ← DEBE ir antes de /contracts/:id (colisión de rutas)
GET    /contracts | /contracts/:id
POST   /contracts              PUT /contracts/:id             DELETE /contracts/:id
POST   /contracts/:id/generate-pdf     GET /contracts/:id/pdf
POST   /contracts/:id/mark-signed
POST   /contracts/:id/cancel
POST   /contracts/:id/renew

GET    /rent-payments | /rent-payments/:id
GET    /rent-payments/filter/overdue | /rent-payments/filter/upcoming
GET    /rent-payments/export/csv
POST   /rent-payments          PUT /rent-payments/:id         DELETE /rent-payments/:id
POST   /rent-payments/:id/mark-paid
GET    /rent-payments/:id/receipt

GET    /dashboard/stats | /dashboard/income | /dashboard/payment-stats

GET    /me/tenant | /me/contracts | /me/payments | /me/settings
PUT    /me/settings
GET    /me/contracts/:id/pdf | /me/payments/:id/receipt

POST   /me/reports                 ← inquilino reporta una incidencia
GET    /me/reports                 ← inquilino ve sus propios reportes
GET    /reports                    ← admin ve todos los reportes
PUT    /reports/:id/status         ← admin cambia el estatus (dispara notificación al inquilino)

GET    /me/notifications | /me/notifications/unread-count
PUT    /me/notifications/read-all  ← mismo endpoint para admin e inquilino, cada quien ve las suyas

GET    /health                 ← sin auth, usado por el healthcheck de deploy
```

## Contratos: generación de PDF y plantillas

Tres plantillas HTML en `backend/src/db/contractTemplates.js`, sembradas por `seed.js`,
renderizadas con reemplazo simple de placeholders `{{variable}}` (`renderTemplate()` en
`pdfService.js` — no es un motor de templates real, es un `.replace` con regex).

**⚠️ El HTML que se renderiza vive en la base de datos (`ContractTemplate.templateContent`),
no se lee del archivo en cada generación.** `generateContractPdf()` busca la plantilla por
`contract.templateUsed` y usa lo que está en la tabla — editar `contractTemplates.js` no
tiene ningún efecto en los PDFs hasta correr `npm run db:seed` (el seed hace `upsert` con
`update: { templateContent: ... }`, así que sí actualiza plantillas existentes, no sólo
crea nuevas). **`deploy.yml` sólo corre `prisma migrate deploy`, nunca `db:seed`** — tras
mergear un cambio al HTML de una plantilla hay que correr el seed a mano en el VPS
(`docker compose -f docker-compose.prod.yml --env-file .env run --rm backend npm run
db:seed`) o el cambio queda sin efecto en producción indefinidamente, en silencio.

Los datos del tenant que llegan al PDF son los que el `select` de Prisma en
`contractService.js` (`includeRelations.tenant`) decide traer — campos que existen en la
BD pero no están en ese `select` nunca llegan a `buildContractVariables()`, aunque el
tenant los tenga. Ya pasó con `curp`/`address` (capturados por el escaneo del INE desde
hace varias versiones, pero ausentes del `select` hasta que se agregaron explícitamente).

- **`CASA_TEMPLATE`** — casa habitación (`propertyType: 'HOUSE'`).
- **`LOCAL_TEMPLATE`** — local comercial (`propertyType: 'LOCAL'`).
- **`COAHUAYANA_TEMPLATE`** — versión enriquecida con inventario, reglas de convivencia,
  estacionamiento y testigo (`propertyType: null`, agnóstica — se puede asignar a cualquiera).

Estructura legal: proemio con términos definidos (EL ARRENDADOR / EL ARRENDATARIO / EL INMUEBLE
o EL LOCAL) → sección Declaraciones (I, II, III) → cláusulas numeradas en ordinales (Primera,
Segunda...). `buildContractVariables()` en `pdfService.js` arma las ~30 variables que rellenan
la plantilla: montos formateados en MXN, fechas en español, textos condicionales según si el
agua está incluida, si hay penalización pactada, si el contrato se renueva automático, etc.

**PDF real** se genera con Puppeteer contra Chromium del sistema (no el bundle propio — ver
`PUPPETEER_EXECUTABLE_PATH` en el Dockerfile del backend, necesario porque Alpine + el Chromium
que trae Puppeteer no son compatibles de forma confiable).

### Marco legal (`backend/src/db/legalFramework.js`)

El arrendamiento es materia **local** en México — lo rige el código civil de cada estado, no el
federal. `resolveJurisdiction(city)` mapea la ciudad de la propiedad a su entidad:

| Ciudad | Entidad | Particularidad |
|---|---|---|
| Coahuayana de Hidalgo | Michoacán de Ocampo | **Ley Inquilinaria** especial para vivienda |
| Villa de Álvarez, Colima | Colima | Sólo Código Civil estatal |

**Verificado contra texto oficial** (agosto 2026): el articulado de Colima (arts. 2288, 2296,
2302, 2315, 2370, 2379) y la Ley Inquilinaria de Michoacán completa (arts. 1-27). **El Código
Civil del Estado de Michoacán se cita sólo por nombre, sin número de artículo** — no se localizó
su texto legible y el archivo lo deja documentado explícitamente para no inventar una cita falsa.

La Ley Inquilinaria de Michoacán es **de orden público e irrenunciable** (art. 2) y aplica sólo
a vivienda. Impone topes que la app hace cumplir en `checkStatutoryCompliance()`:
- Depósito en garantía: máximo 1 mes de renta (art. 15).
- Duración mínima: 1 año, forzosa sólo para el arrendador — el inquilino puede terminar
  anticipado avisando con 2 meses (art. 14). El clausulado de casa habitación en Michoacán
  refleja esto (`term_binding_text` en `pdfService.js`), no pacta plazo forzoso para ambas partes.
- El último recibo presume el pago de rentas anteriores (art. 10) — no al revés.

`getContract()` adjunta `legalWarnings: string[]` a cada contrato (p. ej. "el depósito excede el
tope legal"); el frontend lo muestra como aviso en `/contracts/[id]`, no bloquea el guardado.

**Pendiente de verificar con un abogado local** antes de usar en firma real: el articulado
específico del Código Civil de Michoacán, y confirmar que la Ley Inquilinaria de 1986 (única
versión consultada íntegra) no fue modificada de fondo por la reforma de 2016.

## Escaneo del INE (alta de inquilinos)

`/tenants/new` es un wizard de pantallas dedicadas que captura el frente y el reverso de
la credencial, lee los datos con OCR y prellena el formulario. El teléfono nunca sale del
INE, siempre se captura a mano.

**⚠️ El OCR corre ENTERAMENTE EN EL CLIENTE.** `tesseract.js` procesa el blob recién
capturado en el navegador, *antes* de subir la foto. Esto ya causó una confusión completa:
se agregó preprocesamiento con `sharp` en el backend creyendo que mejoraría la lectura, y
no cambió nada — el OCR ya había terminado cuando la imagen llegaba al servidor.
`backend/src/services/imagePreprocessor.js` **sólo** normaliza la copia que se archiva
(orientación EXIF + resolución acotada), y a propósito **no** altera tonos: esa copia es
el respaldo de la identificación y una versión alterada vale menos como evidencia.

El preprocesamiento que sí determina si se lee algo vive en el frontend:

| Archivo | Responsabilidad |
|---|---|
| `lib/cardFrame.ts` | Geometría del marco guía → ROI. Aparte del componente para poder verificarla numéricamente |
| `lib/imagePreprocess.ts` | Pipeline en canvas: recorte ROI → giro → escalado → gris → contraste → umbral adaptativo |
| `lib/ineOcr.ts` | Configuración del worker de Tesseract y las pasadas (frente, reverso, MRZ) |
| `lib/mrzParser.ts` | MRZ del reverso, formato **TD1** (3 líneas × 30) con dígitos verificadores ICAO |
| `lib/ineParser.ts` | Regex del frente + fusión de fuentes por campo |
| `components/IneCamera.tsx` | Cámara a pantalla completa, marco vertical, linterna |

Decisiones que no son obvias:

- **El marco guía es vertical y la credencial se coloca girada 90°.** Con el teléfono en
  retrato, una credencial de pie ocupa el lado largo del sensor: ~50% más de píxeles por
  milímetro que acostada. El texto de la CURP mide ~2 mm, así que esa diferencia decide si
  el motor puede resolverlo. La imagen se gira de vuelta antes del OCR, y si el puntaje sale
  muy bajo se reintenta con el giro opuesto (por si se giró la credencial al otro lado).
- **El recorte a la ROI es la mejora más grande.** Sin él Tesseract intenta segmentar toda
  la escena (mesa, mano, sombra) y acaba leyendo el fondo. Junto con `PSM.SINGLE_BLOCK` y
  `user_defined_dpi=300` es la diferencia entre "no lee nada" y leer los campos.
- **El marco guía usa la mayor parte de la pantalla** (`FRAME_WIDTH_RATIO`/
  `FRAME_MAX_HEIGHT_RATIO` en `cardFrame.ts`, ~0.92×0.90) — más marco es más píxeles reales
  de la credencial, que es la palanca más directa para mejorar la lectura. El recorte fino
  automático (`detectCardBounds`) corre siempre después, pero es deliberadamente
  conservador (tope 18%, nunca pierde texto): ajusta el margen que ya quedó dentro del
  marco, no sustituye tener un marco grande — con el marco muy ajustado a la credencial casi
  no encuentra nada que recortar, lo cual es "estar funcionando" y no "no estar corriendo".
- **El MRZ del reverso es la fuente confiable, no el frente.** Tipografía OCR-B hecha para
  máquinas, posiciones fijas por norma ICAO 9303, y dígitos verificadores que permiten
  *saber* si la lectura salió bien. El frente tiene guilloches, holograma y un layout que
  cambió entre las emisiones de 2013, 2019 y 2023. Por eso el nombre y la fecha se toman
  del MRZ cuando está disponible, y el frente sólo aporta domicilio y clave de elector.
- **El siglo de nacimiento NO se lee del diferenciador de la CURP** (posición 16), aunque
  la norma lo codifique ahí. Es justo la posición donde el OCR confunde `0` con `O`, y
  equivocarla mueve la fecha un siglo en silencio (1985 → 2085). Se deduce por
  plausibilidad, y luego se usa ese siglo para corregir el carácter al revés.
- El umbral es **adaptativo** (Bradley-Roth sobre imagen integral), no global: una foto de
  credencial casi siempre tiene un lado más iluminado, y cualquier corte único deja media
  credencial en negro.
- **El recorte fino al contorno se detecta por textura, no por brillo** (`detectCardBounds`):
  se suma la diferencia entre píxeles vecinos por fila y columna, y se aprieta el margen
  mientras el detalle sea bajo. La credencial está impresa (detalle alto), la mesa no. Keyear
  en brillo se cae en cuanto la superficie es clara. Sólo recorta hacia adentro y con tope del
  18%, así que el peor caso es no recortar — nunca perder texto.
- **El nombre se valida antes de aceptarse** (`looksLikePersonName`). El modo de falla del OCR
  del frente no es devolver nada, es devolver *algo*: media etiqueta, un pedazo del domicilio,
  ruido del holograma. Si ninguna fuente pasa el filtro el campo se deja **vacío a propósito**:
  un campo vacío se ve y se llena, un nombre equivocado se firma en el contrato.
- **El nombre va en orden apellidos-primero** en las dos fuentes (MRZ y frente), igual que
  impreso en la credencial. Que coincidan importa porque el admin compara el campo contra la
  credencial que tiene en la mano.

### Permisos sobre los datos del INE

Sólo el administrador toca esta información. Verificado end-to-end contra el backend:

| Acción del inquilino | Resultado |
|---|---|
| `PUT /tenants/:id` (propio o ajeno) | 403 |
| `GET /tenants`, `DELETE /tenants/:id` | 403 |
| `GET /tenants/:id/ine-front` / `-back` | 403 |
| `PUT /me/settings` con `fullName`/`curp`/`role` inyectados | campos ignorados (allowlist de un solo campo) |

`updateMySettings` acepta **únicamente** `notificationsEnabled`; es un allowlist explícito, no
un filtro por lista negra. El portal del inquilino no tiene campos editables de datos
personales. Las fotos se sirven sólo por rutas de admin (`router.use(authenticateJWT,
requireAdmin)`), así que no se pueden poner en un `<img src>`: el perfil las trae con `fetch` +
header de auth y arma un object URL (mismo patrón que los PDFs).

### Orientación

La app está pensada para retrato: el manifest declara `orientation: 'portrait'`, y `IneCamera`
además intenta `screen.orientation.lock()`. **El lock sólo funciona en la PWA instalada** o en
pantalla completa según el navegador (Safari no lo soporta), así que el layout sigue siendo
responsive — forzar vertical no es algo que la web permita garantizar desde una pestaña.

**Techo conocido:** tesseract.js sobre fotos reales de INE tiene un techo de precisión. El
formulario de revisión siempre es editable y marca de qué fuente vino cada campo por eso.
Si se necesita más exactitud, el siguiente paso es un OCR en la nube (Google Vision,
AWS Textract) llamado desde el backend — tiene costo por imagen, se descartó a propósito
por ahora a favor de la opción sin costo.

## Renovación de contratos

Manual, no automática. `getContractsNeedingRenewal()` encuentra contratos `ACTIVE` cuyo
`endDate` cae dentro de los próximos 2 meses (`isContractRenewalEligible` en
`rentCalculation.js`) — se muestran como alertas en el dashboard y en `/contracts`.

`renewContract(previousContractId, data)`:
1. Valida elegibilidad (ACTIVE + dentro de 2 meses) y que el contrato anterior tenga los campos
   críticos (`templateUsed`, `paymentDay`, `tenantId`, `propertyId`) — si no, corta con un
   mensaje claro en vez de arrastrar un contrato incompleto a la renovación.
2. Crea un contrato nuevo en `DRAFT`, `startDate` = día siguiente al `endDate` del anterior,
   hereda términos (agua, penalidades, reglas, plantilla — revalidada por
   `resolveTemplateForProperty`, no copiada a ciegas), permite editar `monthlyRent` y
   `durationMonths`.
3. **No genera pago de depósito** (se asume que el depósito original sigue en garantía).
4. La renta sugerida: `calculateSuggestedRent()` = 7% de aumento redondeado hacia arriba a la
   decena más cercana (`Math.ceil(rent * 1.07 / 10) * 10`).

Formulario en `frontend/app/(app)/contracts/[id]/renew/page.tsx`: muestra el contrato original,
permite editar duración/renta con botón "usar sugerencia", **requiere elegir representante**
(el PDF no se puede generar sin uno).

## Cláusulas adicionales de casa habitación (CASA_TEMPLATE y COAHUAYANA_TEMPLATE)

Tres cláusulas se agregan siempre en `buildContractVariables()` (`pdfService.js`) y se insertan
vía placeholder en ambas plantillas de vivienda — **no** en `LOCAL_TEMPLATE`. Usan el mismo
patrón que `tenancy_law_text`: bloque HTML autocontenido con su propia etiqueta, insertado con
sufijo "BIS" o sin ordinal fijo en vez de renumerar las cláusulas existentes.

- **Terminación anticipada por EL ARRENDATARIO** (`early_termination_clause`) — **jurisdiction-aware
  a propósito**: en Michoacán (vivienda, `tenancyLaw.tenantMayTerminate`) el aviso es de
  **2 meses**, citando el art. 14 de la Ley Inquilinaria como derecho irrenunciable (art. 2). Un
  contrato que pactara 1 mes ahí sería letra muerta frente al inquilino — no es una cláusula que
  se pueda generalizar a "1 mes" sin verificar primero si hay una ley especial protegiendo un
  plazo mayor. Fuera de esa jurisdicción (Colima, o vivienda sin ley especial) sí se pacta 1 mes.
  En ambos casos, no dar el aviso deja el depósito a disposición del arrendador.
- **Estacionamiento** (`parking_text`, condicionado a `Contract.hasParking`) — declara
  explícitamente si hay o no cajón asignado, en cualquiera de los dos sentidos. Callar la
  cláusula cuando no hay estacionamiento dejaría la duda de si se pactó tácitamente.
  `hasParking` se establece en el wizard (checkbox "Establecer espacio de estacionamiento",
  visible sólo para propiedades `HOUSE`) y se hereda en renovaciones igual que `waterIncluded`.
- **Silencio nocturno** (`noise_clause`, 23:00–07:00, siempre presente) — deliberadamente
  **aparte** de `convivance_rules` (que ya menciona ruido moderado desde las 22:00, pero es
  texto que el admin puede sobrescribir por completo vía `contract.convivanceRules`). Si esta
  regla viviera dentro de ese texto, un admin que personalizara la convivencia la borraría sin
  querer.

Como con cualquier cambio a `contractTemplates.js`, **hay que correr `npm run db:seed`** para que
tome efecto — ver la nota de arriba sobre dónde vive el HTML real.

## Reportes de mantenimiento y notificaciones in-app

El inquilino reporta incidencias desde `/profile` (botón "Reportar incidencia" → modal con
descripción). Dispara una notificación a **todos** los admins; cuando un admin cambia el estatus
del reporte (`/settings/reports`), se notifica de vuelta al inquilino. Ambos lados usan
notificaciones **in-app** (campana en `AppShell`, sondeo cada 60s) — no email, SMS ni WhatsApp.

**Reutiliza infraestructura que ya existía migrada en el schema pero nunca se conectó a nada**:
`MaintenanceReport` y `NotificationLog` estaban ahí desde la migración inicial, sin service, sin
controller, sin ruta. En vez de crear modelos nuevos se conectaron los existentes:

- `MaintenanceReport.status` se convirtió de `String` libre a un enum propio
  (`MaintenanceReportStatus`: `REPORTED` / `IN_PROGRESS` / `RESOLVED`) para consistencia con el
  resto del schema. `propertyId` ganó una relación real a `Property` (antes era un `String?`
  suelto, sin FK). `priority` se dejó tal cual (sin UI todavía, no se pidió).
- `propertyId` se resuelve **automáticamente** del contrato activo del inquilino al crear el
  reporte (mismo patrón que `getMyTenant`) — no se le pide elegir la propiedad, ya vive implícita
  en su contrato.
- `NotificationLog.whatsappMessage` (`@db.Text NOT NULL`) se reusa como el texto de la
  notificación in-app — es el único campo de texto que trae el modelo, y el nombre es un
  remanente de un diseño original pensado para WhatsApp que nunca se conectó. Renombrarlo
  hubiera sido una migración sin beneficio real; se documenta aquí para que no confunda.
- `NotificationType` ganó `REPORT_STATUS_CHANGED` (nuevo); `MAINTENANCE_REPORT` ya existía y se
  reusa para "nuevo reporte creado".
- "Marcar como leídas" es de una sola pasada (`PUT /me/notifications/read-all`, marca todas las
  no leídas del usuario) en vez de tracking por notificación individual — se dispara al abrir la
  campana. Suficiente para el volumen de esta app; no hay endpoint de marcar una sola.

`reportService.js` tiene el fan-out a admins (`prisma.user.findMany({ where: { role: 'ADMIN' } })`
+ `notificationLog.createMany`) y la notificación de vuelta al inquilino en `updateReportStatus`.

## Colorimetría y sistema de diseño

Tailwind v4 con configuración **en CSS**, no en `tailwind.config.js` (no existe ese archivo —
todo vive en `frontend/app/globals.css` vía `@theme inline`). Tipografía: Geist Sans / Geist Mono
(`next/font/google`), con fallback a SF Pro / system-ui para sensación nativa en iOS.

### Tokens semánticos (claro / oscuro vía clase `.dark` en `<html>`)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-primary` | `#0d9488` (teal 600) | igual | Acento de marca, CTAs, links activos |
| `--color-primary-pressed` | `#0f766e` | igual | Estado presionado |
| `--color-canvas` | `#eef2f4` | `#0a0e14` | Fondo de página |
| `--color-surface` | blanco 68% + blur | `#1c2433` 62% + blur | Cards ("glass") |
| `--color-heading` | `#0f172a` (slate 900) | `#f1f5f9` (slate 100) | Texto principal |
| `--color-muted` | `#64748b` (slate 500) | `#94a3b8` (slate 400) | Texto secundario |

El tema se resuelve en `themeContext.tsx` con preferencia `light`/`dark`/`system`, persistida en
`localStorage`, y aplica la clase `.dark` en `<html>` — todo Tailwind con prefijo `dark:` en el
código funciona sobre esa clase.

### Estética "liquid glass" (iOS-like)

Definida globalmente en `globals.css`, **no hay que repetirla por componente**:
- `.bg-canvas`: fondo con 4 `radial-gradient` mesh (teal, índigo `#6366f1`, ámbar `#f59e0b`)
  fijos al viewport (`background-attachment: fixed`) — así toda superficie opaca del app tiene
  color detrás para que el blur de las cards encima se note.
- `.bg-surface`: cualquier card se vuelve vidrio esmerilado real —
  `backdrop-filter: blur(24px) saturate(1.8)`, borde interior sutil, sombra suave en capas,
  gradiente de "highlight" superior. Se aplica poniendo la clase `bg-surface`, sin CSS extra.
- `.glass-chrome`: variante más fuerte para elementos flotantes fijos (sidebar, tab bar, bottom
  sheets) — blur más agresivo (`32px saturate(2)`).
- `.bg-primary`: los botones sólidos llevan un sheen especular superior + sombra teñida del
  color primario + animación de "press" (`scale(0.97)` + oscurecido al `:active`).
- Radios de esquina más redondeados que el default de Tailwind (`--radius-2xl: 1.5rem`,
  `--radius-3xl: 2rem`) — busca la sensación de iOS reciente, no Material.

### Colores de estado (semánticos, usados con Tailwind directo, sin token custom)

No hay un token de "success/warning/danger" — se usa la paleta de Tailwind directamente y
consistentemente por significado en toda la app:

| Significado | Clases típicas | Dónde aparece |
|---|---|---|
| Éxito / pagado / activo | `emerald-50..900` | Badges de estado PAID/ACTIVE, resúmenes de renovación |
| Advertencia / próximo a vencer | `amber-50..900` | Alertas de renovación, pagos próximos, avisos legales |
| Peligro / vencido / cancelado | `red-50..900` | Pagos OVERDUE, contratos CANCELLED, confirmaciones destructivas |
| Neutral / info | `slate` (vía `heading`/`muted`) | Todo lo demás |

Patrón repetido: `bg-{color}-50 dark:bg-{color}-900/10` para el fondo de una card de alerta,
`text-{color}-800 dark:text-{color}-400` para el texto, `border-{color}-200 dark:border-{color}-800`
para el borde — mantiene contraste correcto en ambos temas sin condicionales en JS.

### Mobile-first / AppShell

`components/AppShell.tsx` decide entre dos layouts según viewport, no según JS de detección de
dispositivo — es puro CSS responsive (`hidden sm:flex` / etc):
- **Desktop (`≥ sm`)**: sidebar fija flotante (`glass-chrome`, esquinas redondeadas, inset del
  borde de pantalla) con navegación completa.
- **Mobile (`< sm`)**: top bar delgada + **bottom tab bar** fijo estilo iOS con blur, safe-area
  insets para el home indicator de iPhone.

Tabs difieren por rol: admin ve Inicio/Propiedades/Inquilinos/Contratos/Pagos/Más; inquilino ve
Inicio/Perfil/Más (el portal es deliberadamente más chico).

`components/Modal.tsx` es responsive por CSS: en mobile se comporta como bottom sheet
(`animate-sheet-up`, `rounded-t-2xl`), en desktop como modal centrado — mismo componente, sin
lógica duplicada.

## CI/CD

**`ci.yml`** (en cada push/PR a `main`): tres jobs.
1. `backend` — lint, unit tests contra `node --test "src/**/*.test.js"` (falla si corren menos
   de 20 pruebas — guarda contra que el glob se rompa y el job pase en falso verde, ya pasó una
   vez), `prisma migrate deploy` contra Postgres real del job, `prisma migrate diff` para
   detectar schema sin migración (usa una base **desechable aparte** para el shadow — nunca la
   de desarrollo, ver nota abajo), seed, smoke test end-to-end, auditoría de plantillas.
2. `frontend` — lint, `tsc --noEmit`, build de Next.
3. `docker` — construye ambas imágenes (sin publicar) para validar que los Dockerfile siguen
   funcionando.

**`deploy.yml`** (dispara cuando `ci.yml` termina en éxito sobre `main`, o manual vía
`workflow_dispatch`): un job `preflight` detecta si existen los secretos del VPS
(`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `DEPLOY_PATH`, y opcionalmente `VPS_PORT`); si faltan,
el job de despliegue se **salta limpio** (no falla en rojo). Si están, entra por SSH y hace,
dentro de `DEPLOY_PATH` en el VPS:

```
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env run --rm backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

seguido de un health check contra `/api/health` con reintentos. **No publica a ningún registro
de imágenes** (no hay Docker Hub de por medio) — construye directamente en el VPS con
`docker-compose.prod.yml`, que es el compose de *producción* (sin bind mounts, backend sin
`--watch`, ver más abajo) y vive versionado en el repo; el `.env` con los secretos reales
**nunca** se versiona, sólo existe en el VPS.

⚠️ **`prisma migrate diff --shadow-database-url <URL>` borra el contenido de esa base** — Prisma
la usa como scratch. Nunca apuntarlo a una base de desarrollo o producción real (ya pasó: se
perdieron datos locales probando esto a mano).

### Despliegue real: VPS compartido con Kredired

La instancia productiva vive en `https://ksared.kredired.cloud`, en el mismo VPS de Hostinger
que otra aplicación (Kredired) que **no es de este repo y nunca se toca** desde aquí. Aislamiento:

| | Kredired (ajeno) | ksared (este repo) |
|---|---|---|
| Carpeta en el VPS | `~/kredired` | `~/ksared` (= `DEPLOY_PATH`) |
| Contenedores | `kredired-app-1`, `kredired-db-1` | `ksared_postgres`, `ksared_backend`, `ksared_frontend` |
| Puertos de host (127.0.0.1) | 3000, 5432 | 3001 (frontend), 4001 (backend), 5433 (postgres) |
| Vhost nginx | `/etc/nginx/sites-available/kredired` | `/etc/nginx/sites-available/ksared` |
| Certificado SSL | `kredired.cloud` | `ksared.kredired.cloud` |

`docker compose` sin `-p` usa el nombre del directorio como namespace del proyecto, así que
operar dentro de `~/ksared` es estructuralmente incapaz de tocar los contenedores de Kredired,
incluso si algo saliera mal en el deploy.

**nginx multiplexa un solo dominio por path**: `/` va al contenedor `frontend` (3001), `/api/`
va al contenedor `backend` (4001). `NEXT_PUBLIC_API_URL` apunta al propio dominio
(`https://ksared.kredired.cloud`) para que el navegador llame a la API en el mismo origen que
sirve las páginas — el backend nunca queda expuesto en un puerto público aparte.

**La llave SSH del pipeline (`VPS_SSH_KEY`) es dedicada** — un keypair generado sólo para que
GitHub Actions entre como `deploy@VPS`, añadido a `~deploy/.ssh/authorized_keys` sin reemplazar
las entradas ya existentes (la del admin, la del propio pipeline de Kredired). Nunca se reusa
la llave personal de quien despliega a mano.

**Redeploy manual** (si hace falta sin pasar por Actions):
```bash
ssh deploy@187.127.248.213
cd ~/ksared && git pull
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env run --rm backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

**Login del admin en producción**: el teléfono sembrado (`SEED_ADMIN_PHONE` en el `.env` del VPS)
quedó como *placeholder* al desplegar por primera vez — cambiarlo antes de operar con datos
reales de inquilinos.

## Cosas que ya se rompieron una vez (para no repetir)

- **`property.propertyType` sin seleccionar en el `include` de Prisma** → el destino declarado en
  el PDF ("uso de casa habitación") salía mal para locales comerciales. Ahora
  `contractService.js` lo incluye explícitamente con un comentario explicando por qué.
- **Contratos con `templateUsed = null`** → no podían generar PDF ni renovarse. Resuelto con
  constraint `NOT NULL` + `resolveTemplateForProperty()` con fallback automático.
- **Plantilla de casa habitación asignada a un local comercial** (y viceversa) → el contrato
  declaraba un destino falso. Resuelto con `ContractTemplate.propertyType` +
  `scripts/audit-contract-templates.js`.
- **Hooks de React (`useMemo`) llamados después de un `return` condicional** en el perfil del
  inquilino → orden de hooks inestable entre renders. Siempre mover los hooks arriba de
  cualquier `if (...) return`.
- **`node --test src`** (sin el glob de archivos) trata el directorio como un solo test y
  reporta 1 verde sin correr nada — hay que pasar el patrón `"src/**/*.test.js"` entre comillas
  explícitamente.
- **Credenciales reales del admin en `seed.js`** (teléfono y contraseña en texto plano) — el
  repo es público. Movidas a `SEED_ADMIN_PHONE`/`SEED_ADMIN_PASSWORD`, nunca hardcodear datos
  reales en scripts o seeds de un repo público.
- **`uploads/` sin volumen en `docker-compose.prod.yml`** → las fotos del INE vivían en la
  capa de escritura del contenedor, y el deploy hace `build` + `up -d` en cada push a `main`:
  eso recrea el contenedor y **borraba todas las identificaciones guardadas**. Resuelto con el
  volumen nombrado `ksared_uploads:/app/uploads`. Cualquier archivo nuevo que el backend
  escriba a disco necesita su volumen, o se pierde en el siguiente deploy.
- **Paquete npm nuevo instalado sólo en el host, no en el contenedor** → `/app/node_modules`
  del backend es un volumen anónimo aparte, así que `npm install <pkg>` en el host no lo ve.
  Ya pasó con Prisma y volvió a pasar con `sharp`: el código nuevo no corría y no era obvio
  (los archivos se guardaban con el comportamiento viejo, sin error visible). Tras agregar una
  dependencia: `docker compose exec backend npm install` y reiniciar el contenedor.
- **`curl` dentro de un `while read` se come el stdin del loop** y sólo se procesa la primera
  línea. Pasó limpiando datos de prueba y quedó un registro sin borrar. Usar `curl < /dev/null`.
