# Graph Report - red-ciudadana-seguridad  (2026-11-16)

## Corpus Check
- 141 files · ~174,947 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 995 nodes · 1621 edges · 93 communities (56 shown, 37 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `806a7689`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- web/src/App.tsx
- Emergencies.tsx
- mobile/src/App.tsx
- supabase
- devDependencies
- dependencies
- dependencies
- axios
- expo
- CameraScanner
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
- colombiaCities.ts
- getPgPool
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md
- server.ts
- mobile/src/services/auth.ts
- useCommandStore
- CommandCenter/TacticalMap.tsx
- api.ts
- socket.ts
- PatrolService
- env.ts
- mobile/presentation/routes.ts
- Camera
- PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)
- teams.ts
- DatabaseConnection
- PrismPrimitives.tsx
- operators.ts
- Roles.tsx
- KPI.tsx
- infoPlist
- dependencies
- expo-audio
- expo-file-system
- android
- expo-image-picker
- expo-location
- @expo/metro-runtime
- expo-notifications
- expo-secure-store
- expo-sqlite
- expo-status-bar
- Operator.ts
- react-dom
- react-native
- react-native-gesture-handler
- react-native-safe-area-context
- react-native-screens
- react-native-volume-manager
- react-native-web
- @react-navigation/native
- red-ciudadana-core
- LocalDatabaseService
- ios
- plugins
- assets.d.ts
- expo
- expo-splash-screen
- leaflet
- react-native-maps
- @types/leaflet

## God Nodes (most connected - your core abstractions)
1. `supabase()` - 37 edges
2. `getPgPool()` - 26 edges
3. `compilerOptions` - 20 edges
4. `useCommandStore` - 19 edges
5. `compilerOptions` - 18 edges
6. `compilerOptions` - 17 edges
7. `User` - 16 edges
8. `Team` - 13 edges
9. `PatrolService` - 13 edges
10. `stripEmojis()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `supabase()`  [EXTRACTED]
  scripts/create_demo_user.ts → apps/api/src/infrastructure/database/connection.ts
- `startServer()` --calls--> `initSocket()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/shared/utils/socket.ts
- `HomeScreen()` --calls--> `glassSurfaceStyle()`  [EXTRACTED]
  apps/mobile/src/screens/HomeScreen.tsx → apps/mobile/src/theme/prismTheme.ts
- `HomeScreen()` --calls--> `sculptedShadow()`  [EXTRACTED]
  apps/mobile/src/screens/HomeScreen.tsx → apps/mobile/src/theme/prismTheme.ts
- `AlertWizardSidebar()` --calls--> `useCommandStore`  [EXTRACTED]
  apps/web/src/components/CommandCenter/AlertWizardSidebar.tsx → apps/web/src/stores/useCommandStore.ts

## Import Cycles
- None detected.

## Communities (93 total, 37 thin omitted)

### Community 0 - "web/src/App.tsx"
Cohesion: 0.17
Nodes (13): App(), CommandCenterLayout(), AccessDenied(), AccessDeniedProps, Login(), LoginProps, Register(), AuthResponse (+5 more)

### Community 1 - "Emergencies.tsx"
Cohesion: 0.11
Nodes (33): CameraModal(), CameraModalProps, exactRoutes, EmergencyCamerasSection(), EmergencyCamerasSectionProps, EmergencyDossierPanel(), EmergencyDossierPanelProps, EmergencyEvidenceSection() (+25 more)

### Community 2 - "mobile/src/App.tsx"
Cohesion: 0.13
Nodes (13): App(), styles, GhostModeScreen(), GhostModeScreenProps, styles, { width, height }, CachedCameraRecord, LocalAlertRecord (+5 more)

### Community 3 - "supabase"
Cohesion: 0.18
Nodes (8): main(), dbConnection, supabase(), RoleDTO, CreateUserDTO, User, MediaService, main()

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (33): description, devDependencies, mongoose, pino-pretty, ts-node, @types/bcryptjs, @types/cors, @types/express (+25 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (38): dependencies, axios, deck.gl, lucide-react, maplibre-gl, react, react-dom, react-map-gl (+30 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, helmet, ioredis (+35 more)

### Community 8 - "expo"
Cohesion: 0.17
Nodes (11): projectId, expo, extra, icon, name, orientation, scheme, slug (+3 more)

### Community 9 - "CameraScanner"
Cohesion: 0.10
Nodes (16): CameraScanner, execAsync, CONFIG_PATH, createBasicConfig(), startCameraMonitor(), updateExistingConfig(), updateMediaMTXConfig(), startServer() (+8 more)

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
Cohesion: 0.12
Nodes (15): dependencies, pg, pg, name, private, scripts, build:api, build:web (+7 more)

### Community 33 - "LocalDatabaseWeb"
Cohesion: 0.18
Nodes (5): CachedCameraRecord, LocalAlertRecord, localDatabase, LocalDatabaseWeb, memoryStore

### Community 34 - "permissions"
Cohesion: 0.18
Nodes (11): permissions, ACCESS_BACKGROUND_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, FOREGROUND_SERVICE_MICROPHONE, RECEIVE_BOOT_COMPLETED (+3 more)

### Community 35 - "TacticalMap.web.tsx"
Cohesion: 0.28
Nodes (8): CameraItem, deltaToZoom(), ensureLeafletStyles(), styles, TacticalMap(), TacticalMapProps, webDivStyle, palette

### Community 37 - "Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)"
Cohesion: 0.20
Nodes (9): 1. ¿Qué es este proyecto?, 2. Componentes del Sistema, 3. Funcionalidades de Inteligencia y Táctica, 4. ¿Hacia dónde apunta el proyecto? (Visión de Futuro), 5. Arquitectura Técnica (Resumen), A. Aplicación Móvil (Expo/React Native), B. Centro de Mando Web (React/Vite/TypeScript), C. Infraestructura de Video (MediaMTX / FFmpeg) (+1 more)

### Community 38 - "HomeScreen.tsx"
Cohesion: 0.15
Nodes (15): CameraItem, PEARL_LIGHT_MAP_STYLE, styles, TacticalMap(), TacticalMapProps, PrismIcon(), PublicCamera, useCameras() (+7 more)

### Community 39 - "PanicService"
Cohesion: 0.18
Nodes (6): usePanicSystem(), CovertAudioService, BufferedPayload, memoryQueue, OfflineBufferService, PanicService

### Community 40 - "colombiaCities.ts"
Cohesion: 0.40
Nodes (5): CityCoordinate, COLOMBIA_CITIES, DEFAULT_COLOMBIA_CITY, getCityCoordinates(), normalizeText()

### Community 41 - "getPgPool"
Cohesion: 0.13
Nodes (9): getPgPool(), Operator, Role, CreateTeamDTO, Team, TeamDTO, TeamMemberDTO, TeamStatus (+1 more)

### Community 42 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 45 - "server.ts"
Cohesion: 0.12
Nodes (21): options, swaggerSpec, router, router, cameraRepository, cameraService, router, router (+13 more)

### Community 46 - "mobile/src/services/auth.ts"
Cohesion: 0.14
Nodes (13): config, AuthListener, authListeners, authService, LoginData, RegisterData, safeStorage, DispatchListener (+5 more)

### Community 47 - "useCommandStore"
Cohesion: 0.15
Nodes (15): ADMIN_MODULES, AdminMenu(), AudioStreamer(), CommandCenterSidebar(), PoliceSirenBorders(), PoliceSirenBordersProps, CitizenCamera, CommandCenterState (+7 more)

### Community 48 - "CommandCenter/TacticalMap.tsx"
Cohesion: 0.21
Nodes (12): AlertWizardSidebar(), calculateDistance(), getRiskColor(), useTacticalHeatmapLayer(), SATELLITE_CLEAN_STYLE, SATELLITE_WITH_ROADS_STYLE, TacticalMap(), useSocket() (+4 more)

### Community 49 - "api.ts"
Cohesion: 0.27
Nodes (7): AlertEvent, AlertTimeline(), Props, CitizenTracker(), analysisService, api, EmergencyAlert

### Community 50 - "socket.ts"
Cohesion: 0.21
Nodes (11): AuditLogEntry, AuditService, activePatrolUnits, dispatchTacticalAlert(), emitToOperators(), extractUserFromSocket(), getActivePatrolUnits(), getSocket() (+3 more)

### Community 53 - "env.ts"
Cohesion: 0.29
Nodes (6): ensureUserExists(), migrate(), objectIdToUuid(), env, EnvConfig, router

### Community 54 - "mobile/presentation/routes.ts"
Cohesion: 0.22
Nodes (4): Alert, CreateAlertDTO, router, emitToAlertRoom()

### Community 55 - "Camera"
Cohesion: 0.17
Nodes (6): Camera, CreateCameraDTO, calculateEscapeRoutes(), directionToAngle, fetchRoute(), getDestinationPoints()

### Community 56 - "PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)"
Cohesion: 0.29
Nodes (6): 1. ZONAS EXCLUSIVAS Y ZONA COMPARTIDA, 2. BASE DE DATOS ÚNICA Y CONSUMO VÍA API CENTRAL, 3. REGLAS DE CONVIVENCIA EN EL BACKEND COMPARTIDO (`apps/api/` + `supabase/`), 4. GESTIÓN DE RAMAS Y GIT (CERO CONFLICTOS), ⛔ PROHIBICIONES ESTRICTAS DE INVASIÓN:, PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)

### Community 57 - "teams.ts"
Cohesion: 0.36
Nodes (6): AdminTeams(), CreateTeamPayload, Team, TeamMember, teamService, TeamStats

### Community 59 - "PrismPrimitives.tsx"
Cohesion: 0.12
Nodes (33): AmbientPrismCanvas(), AmbientPrismCanvasProps, LiquidGlassCard(), LiquidGlassCardProps, LiquidInput(), LiquidInputProps, LiquidPillButton(), LiquidPillButtonProps (+25 more)

### Community 60 - "operators.ts"
Cohesion: 0.38
Nodes (5): AdminOperators(), CreateOperatorPayload, Operator, operatorService, OperatorStats

### Community 61 - "Roles.tsx"
Cohesion: 0.38
Nodes (5): AdminRoles(), AVAILABLE_PERMISSIONS, CreateRoleDTO, Role, rolesService

### Community 63 - "KPI.tsx"
Cohesion: 0.60
Nodes (3): AdminKPI(), kpiService, KpiSummary

### Community 64 - "infoPlist"
Cohesion: 0.20
Nodes (10): NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationAlwaysUsageDescription, NSLocationWhenInUseUsageDescription, NSMicrophoneUsageDescription, UIBackgroundModes, infoPlist, audio, fetch (+2 more)

### Community 65 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, expo-asset, expo-haptics, react, socket.io-client, react, socket.io-client, expo-asset (+1 more)

### Community 68 - "android"
Cohesion: 0.29
Nodes (7): backgroundColor, foregroundImage, adaptiveIcon, package, userInterfaceStyle, versionCode, android

### Community 76 - "Operator.ts"
Cohesion: 0.33
Nodes (5): CreateOperatorDTO, OperatorDTO, OperatorShift, OperatorSpecialty, OperatorStatus

### Community 89 - "ios"
Cohesion: 0.40
Nodes (5): ios, buildNumber, bundleIdentifier, supportsTablet, userInterfaceStyle

### Community 90 - "plugins"
Cohesion: 0.40
Nodes (5): plugins, expo-asset, expo-secure-store, expo-sqlite, expo-status-bar

## Knowledge Gaps
- **387 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+382 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo` connect `expo` to `ios`, `plugins`, `android`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `expo`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `expo-secure-store` connect `plugins` to `mobile/src/services/auth.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _387 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Emergencies.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10714285714285714 - nodes in this community are weakly interconnected._
- **Should `mobile/src/App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._