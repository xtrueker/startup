# Graph Report - red-ciudadana-seguridad  (2026-11-17)

## Corpus Check
- 150 files · ~190,787 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1103 nodes · 1902 edges · 102 communities (62 shown, 40 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4636d375`
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
- OfflineBufferService
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
- KycVerificationService.ts
- PatrolService
- logger.ts
- mobile/presentation/routes.ts
- escapeRouting.ts
- PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)
- teams.ts
- DatabaseConnection
- PrismPrimitives.tsx
- operators.ts
- Roles.tsx
- PatrolModeScreen.tsx
- KPI.tsx
- infoPlist
- expo-asset
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
- dependencies
- react-native-gesture-handler
- react-native-safe-area-context
- react-native-screens
- react-native-volume-manager
- react-native-web
- EvidenceVaultModal.tsx
- components/TacticalMap.tsx
- JobQueue.ts
- AuditService.ts
- LocalDatabaseService
- ios
- GhostModeScreen.tsx
- assets.d.ts
- swagger.ts
- expo-splash-screen
- leaflet
- react-native-maps
- @types/leaflet
- expo-camera
- expo-haptics
- expo-system-ui
- react
- socket.io-client

## God Nodes (most connected - your core abstractions)
1. `getPgPool()` - 39 edges
2. `supabase()` - 37 edges
3. `compilerOptions` - 20 edges
4. `useCommandStore` - 19 edges
5. `OfflineBufferService` - 18 edges
6. `compilerOptions` - 18 edges
7. `User` - 17 edges
8. `compilerOptions` - 17 edges
9. `Team` - 13 edges
10. `PatrolService` - 13 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `supabase()`  [EXTRACTED]
  scripts/create_demo_user.ts → apps/api/src/infrastructure/database/connection.ts
- `startServer()` --calls--> `initSocket()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/shared/utils/socket.ts
- `EvidenceVaultModal()` --calls--> `glassSurfaceStyle()`  [EXTRACTED]
  apps/mobile/src/components/EvidenceVaultModal.tsx → apps/mobile/src/theme/prismTheme.ts
- `EvidenceVaultModal()` --calls--> `sculptedShadow()`  [EXTRACTED]
  apps/mobile/src/components/EvidenceVaultModal.tsx → apps/mobile/src/theme/prismTheme.ts
- `HomeScreen()` --calls--> `useLocationStreaming()`  [EXTRACTED]
  apps/mobile/src/screens/HomeScreen.tsx → apps/mobile/src/hooks/useLocationStreaming.ts

## Import Cycles
- None detected.

## Communities (102 total, 40 thin omitted)

### Community 0 - "web/src/App.tsx"
Cohesion: 0.17
Nodes (13): App(), CommandCenterLayout(), AccessDenied(), AccessDeniedProps, Login(), LoginProps, Register(), AuthResponse (+5 more)

### Community 1 - "Emergencies.tsx"
Cohesion: 0.11
Nodes (33): CameraModal(), CameraModalProps, exactRoutes, EmergencyCamerasSection(), EmergencyCamerasSectionProps, EmergencyDossierPanel(), EmergencyDossierPanelProps, EmergencyEvidenceSection() (+25 more)

### Community 2 - "mobile/src/App.tsx"
Cohesion: 0.09
Nodes (18): App(), styles, AlertResolvedListener, BufferedPayload, cancelledTempIds, memoryQueue, resolvedAlertMap, resolvedListeners (+10 more)

### Community 3 - "supabase"
Cohesion: 0.14
Nodes (9): main(), dbConnection, supabase(), Camera, RoleDTO, CreateUserDTO, User, MediaService (+1 more)

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
Cohesion: 0.20
Nodes (8): CameraScanner, execAsync, CONFIG_PATH, createBasicConfig(), startCameraMonitor(), updateExistingConfig(), updateMediaMTXConfig(), startServer()

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
Cohesion: 0.17
Nodes (12): permissions, ACCESS_BACKGROUND_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, CAMERA, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, FOREGROUND_SERVICE_MICROPHONE (+4 more)

### Community 35 - "TacticalMap.web.tsx"
Cohesion: 0.32
Nodes (7): CameraItem, deltaToZoom(), ensureLeafletStyles(), styles, TacticalMap(), TacticalMapProps, webDivStyle

### Community 37 - "Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)"
Cohesion: 0.20
Nodes (9): 1. ¿Qué es este proyecto?, 2. Componentes del Sistema, 3. Funcionalidades de Inteligencia y Táctica, 4. ¿Hacia dónde apunta el proyecto? (Visión de Futuro), 5. Arquitectura Técnica (Resumen), A. Aplicación Móvil (Expo/React Native), B. Centro de Mando Web (React/Vite/TypeScript), C. Infraestructura de Video (MediaMTX / FFmpeg) (+1 more)

### Community 38 - "HomeScreen.tsx"
Cohesion: 0.31
Nodes (7): isValidCoord(), PublicCamera, useCameras(), HomeScreen(), HomeScreenProps, INITIAL_REGION, styles

### Community 39 - "OfflineBufferService"
Cohesion: 0.15
Nodes (4): CovertAudioService, OfflineBufferService, useLocationStreaming(), PanicService

### Community 40 - "colombiaCities.ts"
Cohesion: 0.40
Nodes (5): CityCoordinate, COLOMBIA_CITIES, DEFAULT_COLOMBIA_CITY, getCityCoordinates(), normalizeText()

### Community 41 - "getPgPool"
Cohesion: 0.10
Nodes (10): getPgPool(), Operator, Role, CreateTeamDTO, Team, TeamDTO, TeamMemberDTO, TeamStatus (+2 more)

### Community 42 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 45 - "server.ts"
Cohesion: 0.13
Nodes (21): router, router, router, cameraRepository, cameraService, router, router, router (+13 more)

### Community 46 - "mobile/src/services/auth.ts"
Cohesion: 0.20
Nodes (7): config, envApiUrl, AuthListener, authListeners, LoginData, RegisterData, safeStorage

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
Cohesion: 0.19
Nodes (14): ensureUserExists(), migrate(), objectIdToUuid(), env, EnvConfig, activePatrolUnits, dispatchTacticalAlert(), emitToOperators() (+6 more)

### Community 51 - "KycVerificationService.ts"
Cohesion: 0.10
Nodes (29): analyzeLiveFrameAntiSpoofing(), compareFacesAwsRekognition(), decodeBase64Image(), extractColombianIdIntelligence(), hmacSha256(), ID_SPOOF_TEXT_KEYWORDS, inspectAndNormalizeImage(), invokeAwsRekognition() (+21 more)

### Community 53 - "logger.ts"
Cohesion: 0.19
Nodes (8): CitizenCamera, getDistanceInMeters(), PredictiveEngine, EmergencyPushPayload, RegisterPushTokenInput, WhatsAppDispatchService, WhatsAppEmergencyInput, logger

### Community 54 - "mobile/presentation/routes.ts"
Cohesion: 0.15
Nodes (8): Alert, CreateAlertDTO, HydratedAlertRecord, CreateCameraDTO, router, normalizePostgisLocationToWkt(), parsePostgisPoint(), emitToAlertRoom()

### Community 55 - "escapeRouting.ts"
Cohesion: 0.60
Nodes (4): calculateEscapeRoutes(), directionToAngle, fetchRoute(), getDestinationPoints()

### Community 56 - "PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)"
Cohesion: 0.29
Nodes (6): 1. ZONAS EXCLUSIVAS Y ZONA COMPARTIDA, 2. BASE DE DATOS ÚNICA Y CONSUMO VÍA API CENTRAL, 3. REGLAS DE CONVIVENCIA EN EL BACKEND COMPARTIDO (`apps/api/` + `supabase/`), 4. GESTIÓN DE RAMAS Y GIT (CERO CONFLICTOS), ⛔ PROHIBICIONES ESTRICTAS DE INVASIÓN:, PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)

### Community 57 - "teams.ts"
Cohesion: 0.36
Nodes (6): AdminTeams(), CreateTeamPayload, Team, TeamMember, teamService, TeamStats

### Community 59 - "PrismPrimitives.tsx"
Cohesion: 0.12
Nodes (30): AmbientPrismCanvas(), AmbientPrismCanvasProps, LiquidGlassCard(), LiquidGlassCardProps, LiquidInput(), LiquidInputProps, LiquidPillButton(), LiquidPillButtonProps (+22 more)

### Community 60 - "operators.ts"
Cohesion: 0.38
Nodes (5): AdminOperators(), CreateOperatorPayload, Operator, operatorService, OperatorStats

### Community 61 - "Roles.tsx"
Cohesion: 0.38
Nodes (5): AdminRoles(), AVAILABLE_PERMISSIONS, CreateRoleDTO, Role, rolesService

### Community 62 - "PatrolModeScreen.tsx"
Cohesion: 0.19
Nodes (11): TelemetryEqualizer(), PatrolModeScreenProps, STATUS_CONFIG, styles, authService, DispatchListener, PatrolListener, PatrolLocationUpdate (+3 more)

### Community 63 - "KPI.tsx"
Cohesion: 0.60
Nodes (3): AdminKPI(), kpiService, KpiSummary

### Community 64 - "infoPlist"
Cohesion: 0.17
Nodes (12): NSCameraUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationAlwaysUsageDescription, NSLocationWhenInUseUsageDescription, NSMicrophoneUsageDescription, NSPhotoLibraryUsageDescription, UIBackgroundModes, infoPlist (+4 more)

### Community 68 - "android"
Cohesion: 0.29
Nodes (7): backgroundColor, foregroundImage, adaptiveIcon, package, userInterfaceStyle, versionCode, android

### Community 76 - "Operator.ts"
Cohesion: 0.33
Nodes (5): CreateOperatorDTO, OperatorDTO, OperatorShift, OperatorSpecialty, OperatorStatus

### Community 78 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, expo, react-native, react-native-webview, @react-navigation/native, expo, react-native, react-native-webview (+1 more)

### Community 84 - "EvidenceVaultModal.tsx"
Cohesion: 0.27
Nodes (9): AlertEvidenceBundle, EvidenceClipItem, EvidenceVaultModal(), EvidenceVaultModalProps, formatBytes(), formatDateTime(), resolveStreamUrl(), styles (+1 more)

### Community 85 - "components/TacticalMap.tsx"
Cohesion: 0.22
Nodes (8): buildMobileLeafletHtml(), CameraItem, MobileLeafletWebViewMap(), NativeWebView, PEARL_LIGHT_MAP_STYLE, TacticalMap(), TacticalMapProps, palette

### Community 86 - "JobQueue.ts"
Cohesion: 0.29
Nodes (4): backgroundQueue, Job, JobHandler, JobQueue

### Community 89 - "ios"
Cohesion: 0.40
Nodes (5): ios, buildNumber, bundleIdentifier, supportsTablet, userInterfaceStyle

### Community 90 - "GhostModeScreen.tsx"
Cohesion: 0.20
Nodes (9): plugins, GhostModeScreen(), GhostModeScreenProps, styles, { width, height }, expo-asset, expo-secure-store, expo-sqlite (+1 more)

### Community 92 - "swagger.ts"
Cohesion: 0.50
Nodes (3): isCompiledJs, options, swaggerSpec

## Knowledge Gaps
- **417 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+412 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo` connect `expo` to `ios`, `GhostModeScreen.tsx`, `android`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `plugins` connect `GhostModeScreen.tsx` to `expo`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `expo-secure-store` connect `GhostModeScreen.tsx` to `mobile/src/services/auth.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _417 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Emergencies.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10714285714285714 - nodes in this community are weakly interconnected._
- **Should `mobile/src/App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09032258064516129 - nodes in this community are weakly interconnected._
- **Should `supabase` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._