// Smoke test de integración: levanta el servidor contra una base real ya migrada y
// sembrada, y recorre el flujo crítico end-to-end. Corre en CI después de
// `prisma migrate deploy` + `db:seed`.
//
//   npm run test:smoke
//
// A diferencia de las pruebas unitarias, esto sí toca Postgres: verifica que el esquema,
// las migraciones, el seed y las rutas encajen entre sí.
import { app } from '../src/index.js';

const PORT = Number(process.env.SMOKE_PORT || 4599);
const BASE = `http://127.0.0.1:${PORT}`;

// Credenciales del admin sembrado. Deben coincidir con las que usó el seed; en CI ambas
// salen de las mismas variables de entorno.
const ADMIN = {
  phone: process.env.SEED_ADMIN_PHONE || '5550000000',
  password: process.env.SEED_ADMIN_PASSWORD || 'changeme-dev-only',
};

let passed = 0;
const failures = [];

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.error(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const api = async (path, { token, method = 'GET', body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* respuesta no-JSON: se reporta con el status */
  }
  return { status: res.status, body: json, raw: text };
};

const main = async () => {
  const server = app.listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    console.log('\n▶ salud');
    const health = await api('/api/health');
    check('GET /api/health responde 200', health.status === 200, `status ${health.status}`);
    check('reporta status ok', health.body?.status === 'ok');

    console.log('\n▶ autenticación');
    const badLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { phone: ADMIN.phone, password: 'contraseña-incorrecta' },
    });
    check('rechaza credenciales inválidas', badLogin.status === 401, `status ${badLogin.status}`);

    const login = await api('/api/auth/login', { method: 'POST', body: ADMIN });
    check('acepta las credenciales del admin sembrado', login.status === 200, login.raw?.slice(0, 200));

    const token = login.body?.accessToken || login.body?.token;
    check('devuelve un token de acceso', Boolean(token));
    if (!token) throw new Error('sin token: no se puede continuar');

    console.log('\n▶ autorización');
    const noAuth = await api('/api/contracts');
    check('bloquea el acceso sin token', noAuth.status === 401, `status ${noAuth.status}`);

    console.log('\n▶ recursos principales');
    for (const path of ['/api/properties', '/api/tenants', '/api/representatives', '/api/contracts']) {
      const res = await api(path, { token });
      check(`GET ${path} devuelve una lista`, res.status === 200 && Array.isArray(res.body), `status ${res.status}`);
    }

    const stats = await api('/api/dashboard/stats', { token });
    check('GET /api/dashboard/stats responde 200', stats.status === 200, `status ${stats.status}`);

    console.log('\n▶ plantillas de contrato');
    const templates = await api('/api/contract-templates', { token });
    check('hay plantillas sembradas', templates.status === 200 && templates.body?.length > 0);
    check(
      'las plantillas declaran a qué tipo de inmueble aplican',
      Array.isArray(templates.body) &&
        templates.body.some((t) => t.propertyType === 'HOUSE') &&
        templates.body.some((t) => t.propertyType === 'LOCAL'),
      'falta la plantilla de casa o la de local'
    );

    console.log('\n▶ renovaciones');
    const alerts = await api('/api/contracts/renewal-alerts', { token });
    check(
      'GET /api/contracts/renewal-alerts no colisiona con /:id',
      alerts.status === 200 && Array.isArray(alerts.body),
      `status ${alerts.status}`
    );
  } finally {
    server.close();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed} verificaciones pasaron, ${failures.length} fallaron`);
  if (failures.length > 0) {
    failures.forEach((f) => console.error(`   · ${f}`));
    process.exit(1);
  }
  process.exit(0);
};

main().catch((err) => {
  console.error('\n❌ El smoke test reventó:', err);
  process.exit(1);
});
