# StudyHub / FocusHub Project Overview

This document summarizes the current workspace snapshot: what the app is, how it is organized, which technologies it uses, and where the important pieces live in the codebase.

## 1. Project Snapshot

- Current product branding in the app metadata is FocusHub, while the package name in the workspace is `my-project`.
- The app is a Next.js App Router application with dashboard, admin, and auth route groups.
- The backend is centered on Supabase, with SQL migrations in `scripts/` and server/session helpers in `lib/supabase/`.
- The UI is built from shadcn/ui primitives, Radix UI components, Tailwind CSS v4, and custom layout components.

Key entry points:

- [package.json](package.json)
- [app/layout.tsx](app/layout.tsx)
- [app/page.tsx](app/page.tsx)
- [middleware.ts](middleware.ts)
- [next.config.mjs](next.config.mjs)
- [tsconfig.json](tsconfig.json)

## 2. Tech Stack

### Core Framework

| Technology | Where it is defined | Notes |
| --- | --- | --- |
| Next.js 16.2.0 | [package.json](package.json), [app/layout.tsx](app/layout.tsx), [app/page.tsx](app/page.tsx), [next.config.mjs](next.config.mjs) | App Router is the main application structure. |
| React 19 | [package.json](package.json) | Used throughout the app and component tree. |
| TypeScript 5.7.3 | [package.json](package.json), [tsconfig.json](tsconfig.json), [next-env.d.ts](next-env.d.ts) | Strict TypeScript project with `noEmit`. |

### Styling and UI

| Technology | Where it is defined | Notes |
| --- | --- | --- |
| Tailwind CSS v4 | [app/globals.css](app/globals.css), [styles/globals.css](styles/globals.css), [postcss.config.mjs](postcss.config.mjs) | Global design tokens and theme variables live in CSS. |
| shadcn/ui | [components.json](components.json), [components/ui/button.tsx](components/ui/button.tsx), [components/ui/card.tsx](components/ui/card.tsx), [components/ui/form.tsx](components/ui/form.tsx) | Component generator is configured for the `new-york` style. |
| Radix UI primitives | [package.json](package.json), [components/ui/](components/ui) | Many UI primitives are wrapped in `components/ui/*`. |
| Lucide icons | [package.json](package.json), [app/page.tsx](app/page.tsx) | Primary icon set used in the landing page and UI. |
| Theme handling | [components/theme-provider.tsx](components/theme-provider.tsx) | Theme provider wiring for the app shell. |
| Toasts and notifications UI | [components/ui/sonner.tsx](components/ui/sonner.tsx), [components/ui/toaster.tsx](components/ui/toaster.tsx), [hooks/use-toast.ts](hooks/use-toast.ts) | Toast system and wrappers live here. |

### Data, Auth, and Backend

| Technology | Where it is defined | Notes |
| --- | --- | --- |
| Supabase SSR | [lib/supabase/client.ts](lib/supabase/client.ts), [lib/supabase/server.ts](lib/supabase/server.ts), [lib/supabase/route-client.ts](lib/supabase/route-client.ts), [lib/supabase/middleware.ts](lib/supabase/middleware.ts) | Browser, server, route, and middleware clients are separated. |
| Middleware auth/session refresh | [middleware.ts](middleware.ts), [lib/supabase/middleware.ts](lib/supabase/middleware.ts) | Protects dashboard/admin paths and refreshes sessions. |
| Supabase migrations | [scripts/000_run_all_migrations.sql](scripts/000_run_all_migrations.sql) and the numbered SQL files in [scripts/](scripts) | Schema, auth, rooms, planner, quiz, notifications, leaderboard, and admin functions. |
| Zod validation | [package.json](package.json), [lib/auth/schemas.ts](lib/auth/schemas.ts) | Used for runtime validation of auth and form input. |
| React Hook Form | [package.json](package.json), [components/ui/form.tsx](components/ui/form.tsx) | Form state management layer. |
| Supabase auth helpers | [lib/auth/current-user.ts](lib/auth/current-user.ts), [lib/auth/admin.ts](lib/auth/admin.ts), [lib/auth/room-password.ts](lib/auth/room-password.ts) | Converts auth/profile data into app-level user objects and admin checks. |

### Feature Libraries

| Library | Where it is defined | Notes |
| --- | --- | --- |
| @vercel/analytics | [package.json](package.json), [app/layout.tsx](app/layout.tsx) | Loaded only in production. |
| next-themes | [package.json](package.json), [components/theme-provider.tsx](components/theme-provider.tsx) | Theme switching support. |
| date-fns | [package.json](package.json) | Date formatting and time helpers. |
| recharts | [package.json](package.json), [components/ui/chart.tsx](components/ui/chart.tsx), [app/(dashboard)/analytics/page.tsx](app/%28dashboard%29/analytics/page.tsx) | Analytics visualizations. |
| cmdk | [package.json](package.json), [components/ui/command.tsx](components/ui/command.tsx) | Command palette/search UI. |
| embla-carousel-react | [package.json](package.json), [components/ui/carousel.tsx](components/ui/carousel.tsx) | Carousel interactions. |
| react-day-picker | [package.json](package.json), [components/ui/calendar.tsx](components/ui/calendar.tsx) | Calendar/date picking UI. |
| react-resizable-panels | [package.json](package.json), [components/ui/resizable.tsx](components/ui/resizable.tsx) | Resizable split-pane layouts. |
| input-otp | [package.json](package.json), [components/ui/input-otp.tsx](components/ui/input-otp.tsx) | OTP input flows. |
| vaul | [package.json](package.json), [components/ui/drawer.tsx](components/ui/drawer.tsx) | Drawer sheet interactions. |
| sonner | [package.json](package.json), [components/ui/sonner.tsx](components/ui/sonner.tsx) | Toast notifications. |
| nodemailer | [package.json](package.json), [lib/notifications/email.ts](lib/notifications/email.ts) | Email delivery helper. |
| clsx / tailwind-merge / class-variance-authority | [package.json](package.json), [lib/utils.ts](lib/utils.ts), [components/ui/*](components/ui) | Utility stack for class composition and component variants. |
| tw-animate-css | [package.json](package.json), [app/globals.css](app/globals.css), [styles/globals.css](styles/globals.css) | Animation utilities for the Tailwind layer. |

### Development Tooling

| Tooling | Where it is defined | Notes |
| --- | --- | --- |
| Tailwind PostCSS integration | [postcss.config.mjs](postcss.config.mjs), [package.json](package.json) | Tailwind v4 PostCSS plugin setup. |
| ESLint script | [package.json](package.json) | `pnpm lint` exists, but repository memory notes ESLint is not currently installed in the workspace. |
| Vercel / Next image config | [next.config.mjs](next.config.mjs) | TypeScript build errors are ignored and image optimization is disabled. |
| Path aliases | [tsconfig.json](tsconfig.json), [components.json](components.json) | `@/*` aliases root files; shadcn aliases point into `components`, `lib`, and `hooks`. |

## 3. Directory Structure

### Root Files

- [package.json](package.json) - scripts and package dependencies.
- [pnpm-lock.yaml](pnpm-lock.yaml) - locked dependency graph.
- [next.config.mjs](next.config.mjs) - Next.js runtime/build settings.
- [postcss.config.mjs](postcss.config.mjs) - PostCSS and Tailwind integration.
- [tsconfig.json](tsconfig.json) - TypeScript compiler settings and aliases.
- [middleware.ts](middleware.ts) - session/auth middleware entry point.
- [components.json](components.json) - shadcn/ui configuration.
- [.env.example](.env.example) - environment variable template.

### App Router

The app uses route groups to separate access domains:

- Public landing page: [app/page.tsx](app/page.tsx)
- Root shell and metadata: [app/layout.tsx](app/layout.tsx)
- Auth routes and auth shell: [app/(auth)/layout.tsx](app/%28auth%29/layout.tsx), [app/(auth)/login/page.tsx](app/%28auth%29/login/page.tsx), [app/(auth)/register/page.tsx](app/%28auth%29/register/page.tsx), [app/(auth)/forgot-password/page.tsx](app/%28auth%29/forgot-password/page.tsx), [app/(auth)/reset-password/page.tsx](app/%28auth%29/reset-password/page.tsx), [app/(auth)/admin/login/page.tsx](app/%28auth%29/admin/login/page.tsx)
- Dashboard routes and dashboard shell: [app/(dashboard)/layout.tsx](app/%28dashboard%29/layout.tsx), [app/(dashboard)/dashboard/page.tsx](app/%28dashboard%29/dashboard/page.tsx), [app/(dashboard)/activity/page.tsx](app/%28dashboard%29/activity/page.tsx), [app/(dashboard)/analytics/page.tsx](app/%28dashboard%29/analytics/page.tsx), [app/(dashboard)/coach/page.tsx](app/%28dashboard%29/coach/page.tsx), [app/(dashboard)/leaderboard/page.tsx](app/%28dashboard%29/leaderboard/page.tsx), [app/(dashboard)/planner/page.tsx](app/%28dashboard%29/planner/page.tsx), [app/(dashboard)/profile/page.tsx](app/%28dashboard%29/profile/page.tsx), [app/(dashboard)/quiz/page.tsx](app/%28dashboard%29/quiz/page.tsx), [app/(dashboard)/rooms/page.tsx](app/%28dashboard%29/rooms/page.tsx), [app/(dashboard)/rooms/[id]/page.tsx](app/%28dashboard%29/rooms/%5Bid%5D/page.tsx), [app/(dashboard)/settings/page.tsx](app/%28dashboard%29/settings/page.tsx), [app/(dashboard)/timer/page.tsx](app/%28dashboard%29/timer/page.tsx)
- Admin routes and admin shell: [app/(admin)/layout.tsx](app/%28admin%29/layout.tsx), [app/(admin)/admin/page.tsx](app/%28admin%29/admin/page.tsx), [app/(admin)/admin/users/page.tsx](app/%28admin%29/admin/users/page.tsx), [app/(admin)/admin/settings/page.tsx](app/%28admin%29/admin/settings/page.tsx), [app/(admin)/admin/analytics/page.tsx](app/%28admin%29/admin/analytics/page.tsx), [app/(admin)/admin/rooms/page.tsx](app/%28admin%29/admin/rooms/page.tsx), [app/(admin)/admin/quiz/page.tsx](app/%28admin%29/admin/quiz/page.tsx)
- Auth error handling: [app/auth/error/page.tsx](app/auth/error/page.tsx)

### API Routes

API handlers are organized by feature under [app/api/](app/api). The current route inventory is:

- Auth: [app/api/auth/sign-in/route.ts](app/api/auth/sign-in/route.ts), [app/api/auth/sign-up/route.ts](app/api/auth/sign-up/route.ts), [app/api/auth/sign-out/route.ts](app/api/auth/sign-out/route.ts), [app/api/auth/me/route.ts](app/api/auth/me/route.ts), [app/api/auth/forgot-password/route.ts](app/api/auth/forgot-password/route.ts), [app/api/auth/reset-password/route.ts](app/api/auth/reset-password/route.ts), [app/api/auth/admin-sign-in/route.ts](app/api/auth/admin-sign-in/route.ts)
- AI: [app/api/ai/daily-plan/route.ts](app/api/ai/daily-plan/route.ts), [app/api/ai/weekly-reflection/route.ts](app/api/ai/weekly-reflection/route.ts), [app/api/ai/session-recommendation/route.ts](app/api/ai/session-recommendation/route.ts), [app/api/ai/smart-nudges/route.ts](app/api/ai/smart-nudges/route.ts)
- Admin: [app/api/admin/overview/route.ts](app/api/admin/overview/route.ts), [app/api/admin/analytics/route.ts](app/api/admin/analytics/route.ts), [app/api/admin/users/route.ts](app/api/admin/users/route.ts), [app/api/admin/rooms/route.ts](app/api/admin/rooms/route.ts), [app/api/admin/settings/route.ts](app/api/admin/settings/route.ts), [app/api/admin/quiz/summary/route.ts](app/api/admin/quiz/summary/route.ts), [app/api/admin/quiz/categories/route.ts](app/api/admin/quiz/categories/route.ts), [app/api/admin/quiz/categories/[slug]/route.ts](app/api/admin/quiz/categories/%5Bslug%5D/route.ts), [app/api/admin/quiz/questions/route.ts](app/api/admin/quiz/questions/route.ts), [app/api/admin/quiz/questions/[id]/route.ts](app/api/admin/quiz/questions/%5Bid%5D/route.ts), [app/api/admin/leaderboard/backfill/route.ts](app/api/admin/leaderboard/backfill/route.ts)
- Planner and goals: [app/api/planner/route.ts](app/api/planner/route.ts), [app/api/planner/[itemId]/route.ts](app/api/planner/%5BitemId%5D/route.ts), [app/api/daily-goals/route.ts](app/api/daily-goals/route.ts), [app/api/weekly-goals/route.ts](app/api/weekly-goals/route.ts)
- Rooms: [app/api/rooms/route.ts](app/api/rooms/route.ts), [app/api/rooms/[id]/route.ts](app/api/rooms/%5Bid%5D/route.ts), [app/api/rooms/[id]/join/route.ts](app/api/rooms/%5Bid%5D/join/route.ts), [app/api/rooms/[id]/leave/route.ts](app/api/rooms/%5Bid%5D/leave/route.ts), [app/api/rooms/[id]/messages/route.ts](app/api/rooms/%5Bid%5D/messages/route.ts), [app/api/rooms/[id]/resources/route.ts](app/api/rooms/%5Bid%5D/resources/route.ts), [app/api/rooms/[id]/resources/[resourceId]/route.ts](app/api/rooms/%5Bid%5D/resources/%5BresourceId%5D/route.ts), [app/api/rooms/[id]/resources/[resourceId]/download/route.ts](app/api/rooms/%5Bid%5D/resources/%5BresourceId%5D/download/route.ts)
- Stats, activity, and leaderboard: [app/api/stats/overview/route.ts](app/api/stats/overview/route.ts), [app/api/stats/daily/route.ts](app/api/stats/daily/route.ts), [app/api/activity-feed/route.ts](app/api/activity-feed/route.ts), [app/api/leaderboard/route.ts](app/api/leaderboard/route.ts), [app/api/focus-sessions/route.ts](app/api/focus-sessions/route.ts), [app/api/timer-settings/route.ts](app/api/timer-settings/route.ts)
- Notifications and profile: [app/api/notifications/route.ts](app/api/notifications/route.ts), [app/api/notifications/test/route.ts](app/api/notifications/test/route.ts), [app/api/profile/badges/route.ts](app/api/profile/badges/route.ts), [app/api/settings/route.ts](app/api/settings/route.ts), [app/api/settings/account/route.ts](app/api/settings/account/route.ts)

### Shared Components

- Layout and navigation: [components/layout/header.tsx](components/layout/header.tsx), [components/layout/sidebar.tsx](components/layout/sidebar.tsx), [components/layout/dashboard-layout.tsx](components/layout/dashboard-layout.tsx), [components/layout/admin-layout.tsx](components/layout/admin-layout.tsx), [components/layout/admin-sidebar.tsx](components/layout/admin-sidebar.tsx), [components/layout/index.ts](components/layout/index.ts)
- Dashboard-specific components: [components/dashboard/weekly-goal-editor.tsx](components/dashboard/weekly-goal-editor.tsx)
- Planner components: [components/planner/study-planner.tsx](components/planner/study-planner.tsx)
- Rooms components: [components/rooms/room-shared-board.tsx](components/rooms/room-shared-board.tsx)
- UI primitives: [components/ui/](components/ui) and representative files such as [components/ui/button.tsx](components/ui/button.tsx), [components/ui/card.tsx](components/ui/card.tsx), [components/ui/dialog.tsx](components/ui/dialog.tsx), [components/ui/dropdown-menu.tsx](components/ui/dropdown-menu.tsx), [components/ui/sidebar.tsx](components/ui/sidebar.tsx), [components/ui/table.tsx](components/ui/table.tsx), [components/ui/tabs.tsx](components/ui/tabs.tsx), [components/ui/toast.tsx](components/ui/toast.tsx)

### Hooks

- [hooks/use-current-user.ts](hooks/use-current-user.ts)
- [hooks/use-mobile.ts](hooks/use-mobile.ts)
- [hooks/use-toast.ts](hooks/use-toast.ts)

### Lib

- Shared utilities: [lib/utils.ts](lib/utils.ts), [lib/format.ts](lib/format.ts), [lib/mock-data.ts](lib/mock-data.ts)
- Auth helpers: [lib/auth/schemas.ts](lib/auth/schemas.ts), [lib/auth/room-password.ts](lib/auth/room-password.ts), [lib/auth/current-user.ts](lib/auth/current-user.ts), [lib/auth/admin.ts](lib/auth/admin.ts)
- AI helpers: [lib/ai/gemini.ts](lib/ai/gemini.ts), [lib/ai/coach.ts](lib/ai/coach.ts)
- Notification helpers: [lib/notifications/preferences.ts](lib/notifications/preferences.ts), [lib/notifications/email.ts](lib/notifications/email.ts)
- Constants: [lib/constants/timer-settings.ts](lib/constants/timer-settings.ts)
- Supabase helpers: [lib/supabase/client.ts](lib/supabase/client.ts), [lib/supabase/server.ts](lib/supabase/server.ts), [lib/supabase/route-client.ts](lib/supabase/route-client.ts), [lib/supabase/middleware.ts](lib/supabase/middleware.ts)

### Types

- [types/index.ts](types/index.ts)
- [types/database.ts](types/database.ts)

### Static Assets

- [public/](public) contains placeholders, branding assets, icons, and images used by the app shell and landing page.

## 4. Important Source Files and Their Roles

| File | Role |
| --- | --- |
| [app/layout.tsx](app/layout.tsx) | Root HTML shell, metadata, viewport config, and production analytics loading. |
| [app/page.tsx](app/page.tsx) | Landing page and top-of-funnel marketing content. |
| [middleware.ts](middleware.ts) | Delegates to Supabase session middleware and route protection. |
| [lib/supabase/middleware.ts](lib/supabase/middleware.ts) | Refreshes sessions, redirects unauthenticated users, and enforces admin access. |
| [lib/supabase/server.ts](lib/supabase/server.ts) | Server-side Supabase client factory. |
| [lib/supabase/client.ts](lib/supabase/client.ts) | Browser-side Supabase client factory. |
| [lib/supabase/route-client.ts](lib/supabase/route-client.ts) | Route-handler Supabase client factory. |
| [components/layout/dashboard-layout.tsx](components/layout/dashboard-layout.tsx) | Shared dashboard shell. |
| [components/layout/admin-layout.tsx](components/layout/admin-layout.tsx) | Shared admin shell. |
| [components/theme-provider.tsx](components/theme-provider.tsx) | Theme provider wiring. |
| [lib/auth/current-user.ts](lib/auth/current-user.ts) | Maps Supabase auth/profile data into app user objects. |

## 5. Database and Migration Files

The Supabase schema and feature evolution live in the numbered SQL scripts under [scripts/](scripts):

- [scripts/000_supabase_schema.sql](scripts/000_supabase_schema.sql)
- [scripts/001_create_profiles.sql](scripts/001_create_profiles.sql)
- [scripts/002_profile_trigger.sql](scripts/002_profile_trigger.sql)
- [scripts/003_create_rooms.sql](scripts/003_create_rooms.sql)
- [scripts/004_create_sessions.sql](scripts/004_create_sessions.sql)
- [scripts/005_create_achievements.sql](scripts/005_create_achievements.sql)
- [scripts/006_seed_achievements.sql](scripts/006_seed_achievements.sql)
- [scripts/007_create_notifications.sql](scripts/007_create_notifications.sql)
- [scripts/008_admin_functions.sql](scripts/008_admin_functions.sql)
- [scripts/009_realtime_setup.sql](scripts/009_realtime_setup.sql)
- [scripts/010_room_access_and_join_updates.sql](scripts/010_room_access_and_join_updates.sql)
- [scripts/011_backfill_leaderboard_entries.sql](scripts/011_backfill_leaderboard_entries.sql)
- [scripts/012_set_admin_profile_role.sql](scripts/012_set_admin_profile_role.sql)
- [scripts/013_room_shared_resources.sql](scripts/013_room_shared_resources.sql)
- [scripts/014_study_planner.sql](scripts/014_study_planner.sql)
- [scripts/015_ai_coach.sql](scripts/015_ai_coach.sql)
- [scripts/016_quiz_feature.sql](scripts/016_quiz_feature.sql)
- [scripts/017_admin_quiz_policies.sql](scripts/017_admin_quiz_policies.sql)

## 6. Current App Areas

### Public and Auth

- Landing page and marketing entry: [app/page.tsx](app/page.tsx)
- Auth shell and pages: [app/(auth)/layout.tsx](app/%28auth%29/layout.tsx), [app/(auth)/login/page.tsx](app/%28auth%29/login/page.tsx), [app/(auth)/register/page.tsx](app/%28auth%29/register/page.tsx), [app/(auth)/forgot-password/page.tsx](app/%28auth%29/forgot-password/page.tsx), [app/(auth)/reset-password/page.tsx](app/%28auth%29/reset-password/page.tsx), [app/(auth)/admin/login/page.tsx](app/%28auth%29/admin/login/page.tsx), [app/auth/error/page.tsx](app/auth/error/page.tsx)

### Study Dashboard

- Dashboard shell: [app/(dashboard)/layout.tsx](app/%28dashboard%29/layout.tsx)
- Main modules: [app/(dashboard)/dashboard/page.tsx](app/%28dashboard%29/dashboard/page.tsx), [app/(dashboard)/activity/page.tsx](app/%28dashboard%29/activity/page.tsx), [app/(dashboard)/analytics/page.tsx](app/%28dashboard%29/analytics/page.tsx), [app/(dashboard)/coach/page.tsx](app/%28dashboard%29/coach/page.tsx), [app/(dashboard)/leaderboard/page.tsx](app/%28dashboard%29/leaderboard/page.tsx), [app/(dashboard)/planner/page.tsx](app/%28dashboard%29/planner/page.tsx), [app/(dashboard)/profile/page.tsx](app/%28dashboard%29/profile/page.tsx), [app/(dashboard)/quiz/page.tsx](app/%28dashboard%29/quiz/page.tsx), [app/(dashboard)/rooms/page.tsx](app/%28dashboard%29/rooms/page.tsx), [app/(dashboard)/rooms/[id]/page.tsx](app/%28dashboard%29/rooms/%5Bid%5D/page.tsx), [app/(dashboard)/settings/page.tsx](app/%28dashboard%29/settings/page.tsx), [app/(dashboard)/timer/page.tsx](app/%28dashboard%29/timer/page.tsx)

### Admin Console

- Admin shell: [app/(admin)/layout.tsx](app/%28admin%29/layout.tsx)
- Admin pages: [app/(admin)/admin/page.tsx](app/%28admin%29/admin/page.tsx), [app/(admin)/admin/users/page.tsx](app/%28admin%29/admin/users/page.tsx), [app/(admin)/admin/settings/page.tsx](app/%28admin%29/admin/settings/page.tsx), [app/(admin)/admin/analytics/page.tsx](app/%28admin%29/admin/analytics/page.tsx), [app/(admin)/admin/rooms/page.tsx](app/%28admin%29/admin/rooms/page.tsx), [app/(admin)/admin/quiz/page.tsx](app/%28admin%29/admin/quiz/page.tsx)

## 7. Notes on Styling Files

There are two global stylesheet locations in the workspace:

- [app/globals.css](app/globals.css) is the stylesheet imported by the root layout.
- [styles/globals.css](styles/globals.css) is an additional global theme file present in the repo.

## 8. Quick Reference

- App shell and metadata: [app/layout.tsx](app/layout.tsx)
- Landing page: [app/page.tsx](app/page.tsx)
- Route protection: [middleware.ts](middleware.ts) and [lib/supabase/middleware.ts](lib/supabase/middleware.ts)
- Browser Supabase client: [lib/supabase/client.ts](lib/supabase/client.ts)
- Server Supabase client: [lib/supabase/server.ts](lib/supabase/server.ts)
- Route Supabase client: [lib/supabase/route-client.ts](lib/supabase/route-client.ts)
- Shared UI primitives: [components/ui/](components/ui)
- Core utilities: [lib/utils.ts](lib/utils.ts)
- Database schema and migrations: [scripts/](scripts)

## 9. Validation Context

- Repository memory notes that `pnpm lint` currently fails because ESLint is not installed in the workspace, so build verification is the safer current check.
- The current workspace snapshot does not include a dedicated README, so this file is the main high-level inventory for the project.
