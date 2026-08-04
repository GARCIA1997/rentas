# KsaRed

PWA de gestión de rentas para administración de propiedades en México (Coahuayana de Hidalgo,
Michoacán y Villa de Álvarez, Colima). Contratos de arrendamiento con fundamento legal por
estado, calendario de pagos automático, recibos en PDF y portal para el inquilino.

Para el contexto completo de arquitectura, modelo de datos, diseño visual y decisiones no
obvias, ver [CLAUDE.md](CLAUDE.md).

## Stack

Next.js 16 · TypeScript · Tailwind CSS v4 — Node.js/Express · Prisma · PostgreSQL — Puppeteer
(PDFs) · Docker Compose · GitHub Actions

## Levantarlo local

```bash
cp .env.example .env
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000 (`/api/health` para verificar)
- Postgres: `localhost:5442`

Define `SEED_ADMIN_PHONE` / `SEED_ADMIN_PASSWORD` en `.env` antes de sembrar en cualquier
entorno real — sin ellas el seed usa una contraseña de desarrollo conocida.

## Desarrollo

```bash
# Backend
cd backend
npm run dev              # servidor con --watch
npm run lint              # ESLint
npm test                  # unit tests (node --test)
npm run test:smoke         # integración contra Postgres real, ya migrado y sembrado

# Frontend
cd frontend
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## CI/CD

`ci.yml` corre en cada push a `main`: lint + tests unitarios + migraciones contra Postgres real
+ smoke test end-to-end (backend), lint + typecheck + build (frontend), y construcción de ambas
imágenes Docker. `deploy.yml` publica a Docker Hub y despliega por SSH cuando CI pasa — se salta
limpio si los secretos de despliegue no están configurados.

## Licencia

Privado. Todos los derechos reservados.
