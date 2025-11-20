# Ecos del Oráculo

Suite compuesta por un backend en Node.js/Express (TypeScript) y un frontend en Angular. Provee servicios de astrología, numerología, tarot y pagos (Stripe/MONEI).

## Estructura del repositorio

- `Ecos-backend/` API REST en Express + Sequelize (PostgreSQL).
- `Ecos-oraculo/` Frontend Angular 19.
- `docs/` Documentación adicional (API, despliegue, .env, flujos).

## Arranque rápido

- Backend (dev):
  1. Crear `.env` desde `docs/.env.example` y completar claves.
  2. Instalar deps: `npm i` dentro de `Ecos-backend/`.
  3. Compilar TS: `npx tsc -w` o `npm run typescript` y ejecutar: `npm run dev`.
- Frontend (dev):
  1. Instalar deps: `npm i` dentro de `Ecos-oraculo/`.
  2. Ejecutar: `npm start` y abrir http://localhost:4200.

Para detalles profundos, ver `docs/`.
