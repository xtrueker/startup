# Graph Report - red-ciudadana-seguridad  (2026-09-27)

## Corpus Check
- 102 files · ~99,148 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 757 nodes · 1028 edges · 48 communities (38 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `49803e0e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CommandCenter/index.tsx
- CameraScanner
- mobile/src/App.tsx
- supabase
- devDependencies
- dependencies
- dependencies
- dependencies
- expo
- server.ts
- devDependencies
- compilerOptions
- compilerOptions
- scripts
- compilerOptions
- CameraService
- GhostModeService
- StealthEmergencyService
- EvidenceWorker
- EventPublisher
- SpatialRoutingWorker
- k6_stress_test.js
- mobile/tsconfig.json
- useGeolocation.ts
- scripts
- web/tsconfig.json
- deploy_staging.sh
- types.d.ts
- LocalDatabaseWeb
- permissions
- TacticalMap.web.tsx
- metro.config.js
- Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)
- HomeScreen.tsx
- PanicService
- panicService.ts
- OfflineBufferService
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md
- mobile/src/services/auth.ts
- JobQueue.ts

## God Nodes (most connected - your core abstractions)
1. `supabase()` - 25 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 18 edges
4. `compilerOptions` - 17 edges
5. `expo` - 13 edges
6. `scripts` - 12 edges
7. `Camera` - 11 edges
8. `permissions` - 11 edges
9. `GhostModeService` - 11 edges
10. `useCommandStore` - 11 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `supabase()`  [EXTRACTED]
  scripts/create_demo_user.ts → apps/api/src/infrastructure/database/connection.ts
- `main()` --calls--> `supabase()`  [EXTRACTED]
  apps/api/seed_demo_user.ts → apps/api/src/infrastructure/database/connection.ts
- `startServer()` --calls--> `startCameraMonitor()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/jobs/updateCameraConfig.ts
- `startServer()` --calls--> `initSocket()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/shared/utils/socket.ts
- `HomeScreen()` --calls--> `useCameras()`  [EXTRACTED]
  apps/mobile/src/screens/HomeScreen.tsx → apps/mobile/src/hooks/useCameras.ts

## Import Cycles
- None detected.

## Communities (48 total, 10 thin omitted)

### Community 0 - "CommandCenter/index.tsx"
Cohesion: 0.06
Nodes (43): App(), AlertEvent, AlertTimeline(), AlertWizardSidebar(), Props, AudioStreamer(), exactRoutes, calculateDistance() (+35 more)

### Community 2 - "mobile/src/App.tsx"
Cohesion: 0.14
Nodes (13): App(), styles, GhostModeScreen(), GhostModeScreenProps, styles, { width, height }, LoginScreen(), LoginScreenProps (+5 more)

### Community 3 - "supabase"
Cohesion: 0.07
Nodes (15): main(), DatabaseConnection, dbConnection, supabase(), Alert, Camera, CreateCameraDTO, CreateUserDTO (+7 more)

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
Cohesion: 0.04
Nodes (47): dependencies, axios, expo, expo-asset, expo-audio, expo-file-system, expo-haptics, expo-location (+39 more)

### Community 8 - "expo"
Cohesion: 0.06
Nodes (34): projectId, expo, extra, icon, ios, name, orientation, plugins (+26 more)

### Community 9 - "server.ts"
Cohesion: 0.07
Nodes (38): ensureUserExists(), migrate(), objectIdToUuid(), env, EnvConfig, CreateAlertDTO, CONFIG_PATH, createBasicConfig() (+30 more)

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

### Community 15 - "CameraService"
Cohesion: 0.15
Nodes (3): CameraService, ICameraRepository, MongoCameraRepository

### Community 16 - "GhostModeService"
Cohesion: 0.21
Nodes (4): GhostModeCallback, GhostModeService, GhostModeTriggerEvent, VolumeKey

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

### Community 24 - "scripts"
Cohesion: 0.17
Nodes (11): dependencies, pg, pg, name, private, scripts, build:api, build:web (+3 more)

### Community 33 - "LocalDatabaseWeb"
Cohesion: 0.18
Nodes (5): CachedCameraRecord, LocalAlertRecord, localDatabase, LocalDatabaseWeb, memoryStore

### Community 34 - "permissions"
Cohesion: 0.11
Nodes (18): backgroundColor, foregroundImage, adaptiveIcon, package, permissions, userInterfaceStyle, versionCode, android (+10 more)

### Community 35 - "TacticalMap.web.tsx"
Cohesion: 0.40
Nodes (3): CameraItem, styles, TacticalMapProps

### Community 37 - "Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)"
Cohesion: 0.20
Nodes (9): 1. ¿Qué es este proyecto?, 2. Componentes del Sistema, 3. Funcionalidades de Inteligencia y Táctica, 4. ¿Hacia dónde apunta el proyecto? (Visión de Futuro), 5. Arquitectura Técnica (Resumen), A. Aplicación Móvil (Expo/React Native), B. Centro de Mando Web (React/Vite/TypeScript), C. Infraestructura de Video (MediaMTX / FFmpeg) (+1 more)

### Community 38 - "HomeScreen.tsx"
Cohesion: 0.19
Nodes (10): CameraItem, styles, TacticalMap(), TacticalMapProps, useCameras(), useLocationStreaming(), HomeScreen(), INITIAL_REGION (+2 more)

### Community 39 - "PanicService"
Cohesion: 0.30
Nodes (3): usePanicSystem(), CovertAudioService, PanicService

### Community 40 - "panicService.ts"
Cohesion: 0.22
Nodes (8): PublicCamera, CachedCameraRecord, LocalAlertRecord, localDatabase, memoryStore, PanicListener, PanicState, PanicTriggerOptions

### Community 41 - "OfflineBufferService"
Cohesion: 0.36
Nodes (3): BufferedPayload, memoryQueue, OfflineBufferService

### Community 42 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 46 - "mobile/src/services/auth.ts"
Cohesion: 0.28
Nodes (6): config, LocationStreamingOptions, api, LoginData, RegisterData, safeStorage

### Community 47 - "JobQueue.ts"
Cohesion: 0.29
Nodes (4): backgroundQueue, Job, JobHandler, JobQueue

## Knowledge Gaps
- **322 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+317 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo` connect `expo` to `permissions`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `LocalDatabaseService` connect `expo` to `panicService.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _322 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CommandCenter/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05789235639981909 - nodes in this community are weakly interconnected._
- **Should `mobile/src/App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._
- **Should `supabase` be split into smaller, more focused modules?**
  _Cohesion score 0.0730804810360777 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._