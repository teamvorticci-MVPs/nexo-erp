# Nexo ERP — Contexto del proyecto

## Qué es este proyecto
SaaS multi-tenant de gestión para negocios. Nombre: **Nexo**. Tagline: "Gestión inteligente para tu negocio".

## Stack obligatorio
- Next.js 15 + React 19 + TypeScript
- TailwindCSS + Shadcn/UI (preset Nova, Radix, Lucide icons)
- Supabase (Auth + PostgreSQL + Storage + Realtime)
- TanStack Table, React Hook Form + Zod, Recharts, Zustand, date-fns
- Tipografía: Montserrat (400/500/600/700) via next/font/google
- Hosting: Vercel (free tier)

## Arquitectura de datos
- OLTP (transaccional, no analítico)
- Multi-tenant: TODAS las tablas tienen `tenant_id uuid NOT NULL`
- Aislamiento total via Row Level Security (RLS) en PostgreSQL
- NUNCA omitir tenant_id en queries, inserts ni updates

## Roles
- `admin` — acceso completo
- `vendedor` — solo ventas, consulta productos/inventario/clientes/alertas

## Módulos MVP
Dashboard, Productos, Inventario, Nueva Venta (POS), Caja, Reportes, Alertas, Configuración

## Diseño
- Layout: sidebar fijo izquierdo (w-56, compacto) + área principal
- Sidebar: logo Nexo (ícono Boxes) arriba + nav items text-[13px] + botón "Nueva venta" azul fijo abajo + avatar usuario abajo
- Logo en sidebar: si tenant.logo_url → <img>, sino ícono Boxes azul
- Color primario: #3B82F6 (azul)
- Estados: Normal=verde, Bajo=amarillo, Agotado/Crítico=rojo
- Fondo general: #F9FAFB, cards: blanco con border #E5E7EB
- Densidad visual alta: paddings compactos, texto 13px en body/labels
- NO modificar layouts ni flujos del diseño

## Convenciones de código
- Componentes: PascalCase
- Archivos: kebab-case
- Hooks: use prefix (useProducts, useSales, etc.)
- Server Components por defecto, Client Components solo cuando necesario ('use client')
- Validación con Zod en frontend Y backend
- Siempre manejar loading, error y empty states

## Estructura de carpetas
src/
  app/
    (auth)/login, register
    (dashboard)/dashboard, productos, inventario, ventas, caja, reportes, alertas, configuracion
  components/ui/, layout/, modules/
  hooks/
  lib/supabase.ts, utils.ts, validations/
  types/database.ts
  stores/ (Zustand)

## Seguridad
- JWT via Supabase Auth
- RLS en todas las tablas
- Nunca exponer service_role key al frontend
- createAdminClient() SOLO en Server Actions y Route Handlers
- Rate limiting en rutas sensibles
