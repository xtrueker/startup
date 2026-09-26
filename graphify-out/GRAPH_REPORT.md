# Graph Report - red-ciudadana-seguridad  (2026-09-25)

## Corpus Check
- 97 files · ~102,053 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 695 nodes · 942 edges · 42 communities (31 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a3f610a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CommandCenter/index.tsx
- server.ts
- mobile/src/App.tsx
- supabase
- devDependencies
- dependencies
- dependencies
- dependencies
- expo
- CameraScanner
- devDependencies
- compilerOptions
- compilerOptions
- scripts
- compilerOptions
- cameras/presentation/routes.ts
- GhostModeService
- StealthEmergencyService
- EvidenceWorker
- EventPublisher
- SpatialRoutingWorker
- k6_stress_test.js
- mobile/tsconfig.json
- useGeolocation.ts
- dependencies
- web/tsconfig.json
- deploy_staging.sh
- types.d.ts
- web/src/App.tsx
- Marco Teórico de Arquitectura e Infraestructura Tecnológica
- JobQueue.ts
- metro.config.js
- Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 17 edges
4. `supabase()` - 16 edges
5. `scripts` - 12 edges
6. `Camera` - 11 edges
7. `expo` - 11 edges
8. `GhostModeService` - 11 edges
9. `useCommandStore` - 11 edges
10. `Alert` - 10 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --calls--> `startCameraMonitor()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/jobs/updateCameraConfig.ts
- `startServer()` --calls--> `initSocket()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/shared/utils/socket.ts
- `HomeScreen()` --calls--> `useCameras()`  [EXTRACTED]
  apps/mobile/src/screens/HomeScreen.tsx → apps/mobile/src/hooks/useCameras.ts
- `HomeScreen()` --calls--> `useLocationStreaming()`  [EXTRACTED]
  apps/mobile/src/screens/HomeScreen.tsx → apps/mobile/src/hooks/useLocationStreaming.ts
- `Props` --references--> `EmergencyAlert`  [EXTRACTED]
  apps/web/src/components/CommandCenter/AlertWizardSidebar.tsx → apps/web/src/stores/useCommandStore.ts

## Import Cycles
- None detected.

## Communities (42 total, 11 thin omitted)

### Community 0 - "CommandCenter/index.tsx"
Cohesion: 0.08
Nodes (32): AlertEvent, AlertTimeline(), AlertWizardSidebar(), Props, AudioStreamer(), exactRoutes, calculateDistance(), getRiskColor() (+24 more)

### Community 1 - "server.ts"
Cohesion: 0.06
Nodes (38): ensureUserExists(), migrate(), objectIdToUuid(), env, EnvConfig, dbConnection, getPgPool(), Alert (+30 more)

### Community 2 - "mobile/src/App.tsx"
Cohesion: 0.06
Nodes (36): App(), styles, config, usePanicSystem(), CovertAudioService, BufferedPayload, OfflineBufferService, PublicCamera (+28 more)

### Community 3 - "supabase"
Cohesion: 0.09
Nodes (11): DatabaseConnection, supabase(), Camera, CreateCameraDTO, CreateUserDTO, User, calculateEscapeRoutes(), directionToAngle (+3 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (33): description, devDependencies, mongoose, pino-pretty, ts-node, @types/bcryptjs, @types/cors, @types/express (+25 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (38): dependencies, axios, deck.gl, lucide-react, maplibre-gl, react, react-dom, react-map-gl (+30 more)

### Community 6 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, helmet, ioredis (+27 more)

### Community 7 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, axios, expo, expo-av, expo-file-system, expo-haptics, expo-location, expo-notifications (+31 more)

### Community 8 - "expo"
Cohesion: 0.06
Nodes (30): backgroundColor, adaptiveIcon, package, permissions, versionCode, projectId, expo, android (+22 more)

### Community 10 - "devDependencies"
Cohesion: 0.05
Nodes (37): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+29 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+18 more)

### Community 12 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noUnusedLocals (+15 more)

### Community 13 - "scripts"
Cohesion: 0.08
Nodes (25): devDependencies, @babel/core, babel-preset-expo, @types/react, typescript, @types/react, typescript, main (+17 more)

### Community 14 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+14 more)

### Community 15 - "cameras/presentation/routes.ts"
Cohesion: 0.12
Nodes (7): CameraService, ICameraRepository, MongoCameraRepository, cameraRepository, cameraService, router, getSocket()

### Community 17 - "StealthEmergencyService"
Cohesion: 0.30
Nodes (5): StealthEmergencyService, MediaSessionCompat, IBinder, Intent, Service

### Community 18 - "EvidenceWorker"
Cohesion: 0.43
Nodes (3): EvidenceWorker, mockS3Upload(), mockSaveToDB()

### Community 21 - "k6_stress_test.js"
Cohesion: 0.40
Nodes (3): errorRate, ingestionLatency, options

### Community 22 - "mobile/tsconfig.json"
Cohesion: 0.50
Nodes (3): compilerOptions, extends, expo/tsconfig.base

### Community 24 - "dependencies"
Cohesion: 0.50
Nodes (3): dependencies, pg, pg

### Community 33 - "web/src/App.tsx"
Cohesion: 0.19
Nodes (11): App(), CommandCenterLayout(), AccessDenied(), AccessDeniedProps, CitizenTracker(), Login(), Register(), AuthResponse (+3 more)

### Community 34 - "Marco Teórico de Arquitectura e Infraestructura Tecnológica"
Cohesion: 0.15
Nodes (12): 1. Patrón Arquitectónico: Arquitectura Orientada a Eventos (EDA) y Cliente-Servidor, 2. Persistencia de Datos: MongoDB y Mongoose, 3. Comunicación en Tiempo Real: Socket.io y Redis, 4. Análisis Geográfico: Turf.js, 5. Procesamiento de Video: MediaMTX y FFmpeg, 6. Frontend y Mobile: Ecosistema React, Justificación Técnica:, Justificación Técnica: (+4 more)

### Community 35 - "JobQueue.ts"
Cohesion: 0.29
Nodes (4): backgroundQueue, Job, JobHandler, JobQueue

### Community 37 - "Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)"
Cohesion: 0.20
Nodes (9): 1. ¿Qué es este proyecto?, 2. Componentes del Sistema, 3. Funcionalidades de Inteligencia y Táctica, 4. ¿Hacia dónde apunta el proyecto? (Visión de Futuro), 5. Arquitectura Técnica (Resumen), A. Aplicación Móvil (Expo/React Native), B. Centro de Mando Web (React/Vite/TypeScript), C. Infraestructura de Video (MediaMTX / FFmpeg) (+1 more)

### Community 42 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **283 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+278 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _283 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CommandCenter/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0797872340425532 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06490384615384616 - nodes in this community are weakly interconnected._
- **Should `mobile/src/App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055944055944055944 - nodes in this community are weakly interconnected._
- **Should `supabase` be split into smaller, more focused modules?**
  _Cohesion score 0.0873440285204991 - nodes in this community are weakly interconnected._