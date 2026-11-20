# Graph Report - red-ciudadana-seguridad  (2026-11-19)

## Corpus Check
- 163 files · ~216,596 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1229 nodes · 2333 edges · 107 communities (65 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8db81715`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CommandCenter/TacticalMap.tsx
- Emergencies.tsx
- security-integration.test.js
- connection.ts
- devDependencies
- dependencies
- dependencies
- system.ts
- expo
- CameraScanner.ts
- devDependencies
- compilerOptions
- compilerOptions
- scripts
- compilerOptions
- Camera.ts
- GhostModeService
- StealthEmergencyService
- EvidenceWorker
- socket.ts
- SpatialRoutingWorker
- k6_stress_test.js
- mobile/tsconfig.json
- useGeolocation.ts
- scripts
- web/tsconfig.json
- deploy_staging.sh
- types.d.ts
- localDatabase.ts
- permissions
- Operators.tsx
- metro.config.js
- Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)
- EvidenceStorageService.ts
- OfflineBufferService
- CARBON STATE CHECKPOINT (2026-11-19 21:17)
- getPgPool
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md
- middlewares/auth.ts
- mobile/src/services/auth.ts
- LiquidPrimitives.tsx
- CommandCenter/index.tsx
- unit.test.js
- api.ts
- KycVerificationService.ts
- PatrolService
- server.ts
- EvidenceVaultModal.tsx
- logger.ts
- PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)
- teams.ts
- models/index.ts
- mobile/src/App.tsx
- Team
- UIBackgroundModes
- PatrolModeScreen.tsx
- expo-camera
- infoPlist
- web/src/App.tsx
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
- HomeScreen.tsx
- react-dom
- dependencies
- react-native-gesture-handler
- react-native-safe-area-context
- react-native-screens
- react-native-volume-manager
- react-native-web
- Operator
- components/TacticalMap.tsx
- env.ts
- scripts/migrate.ts
- Alert
- ios
- GhostModeScreen.tsx
- assets.d.ts
- Roles.tsx
- expo-splash-screen
- leaflet
- react-native-maps
- @types/leaflet
- Operator.ts
- expo-haptics
- expo-system-ui
- react
- socket.io-client
- Team.ts
- JobQueue
- axios
- PushNotificationService
- expo-asset

## God Nodes (most connected - your core abstractions)
1. `getPgPool()` - 68 edges
2. `useCommandStore` - 21 edges
3. `compilerOptions` - 20 edges
4. `User` - 19 edges
5. `OfflineBufferService` - 18 edges
6. `compilerOptions` - 18 edges
7. `env` - 17 edges
8. `compilerOptions` - 17 edges
9. `config` - 15 edges
10. `Team` - 14 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `supabase()`  [EXTRACTED]
  scripts/create_demo_user.ts → apps/api/src/infrastructure/database/connection.ts
- `main()` --calls--> `supabase()`  [EXTRACTED]
  apps/api/seed_demo_user.ts → apps/api/src/infrastructure/database/connection.ts
- `ensureMigrationsTable()` --calls--> `getPgPool()`  [EXTRACTED]
  apps/api/src/scripts/migrate.ts → apps/api/src/infrastructure/database/connection.ts
- `getAppliedMigrations()` --calls--> `getPgPool()`  [EXTRACTED]
  apps/api/src/scripts/migrate.ts → apps/api/src/infrastructure/database/connection.ts
- `run()` --calls--> `getPgPool()`  [EXTRACTED]
  apps/api/src/scripts/migrate.ts → apps/api/src/infrastructure/database/connection.ts

## Import Cycles
- None detected.

## Communities (107 total, 42 thin omitted)

### Community 0 - "CommandCenter/TacticalMap.tsx"
Cohesion: 0.18
Nodes (12): SATELLITE_CLEAN_STYLE, SATELLITE_WITH_ROADS_STYLE, AuthResponse, authService, LoginData, RegisterData, AuthState, CityCoordinate (+4 more)

### Community 1 - "Emergencies.tsx"
Cohesion: 0.11
Nodes (31): CameraModalProps, exactRoutes, EmergencyCamerasSection(), EmergencyCamerasSectionProps, EmergencyDossierPanel(), EmergencyDossierPanelProps, EmergencyEvidenceSection(), EmergencyEvidenceSectionProps (+23 more)

### Community 2 - "security-integration.test.js"
Cohesion: 0.15
Nodes (11): { alertRouter }, assert, { authRouter }, { dbConnection, getPgPool, supabase }, { describe, it, before, after }, { env }, express, http (+3 more)

### Community 3 - "connection.ts"
Cohesion: 0.16
Nodes (7): main(), DatabaseConnection, dbConnection, supabase(), CreateUserDTO, MediaService, main()

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (39): description, devDependencies, mongoose, pino-pretty, ts-node, @types/bcryptjs, @types/cors, @types/express (+31 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (38): dependencies, axios, deck.gl, lucide-react, maplibre-gl, react, react-dom, react-map-gl (+30 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, helmet, ioredis (+35 more)

### Community 7 - "system.ts"
Cohesion: 0.15
Nodes (15): CreateAlertDTO, HydratedAlertRecord, router, ALERT_VALID_STATUSES, ANONYMOUS_CITIZEN_UUID, AUTHORITY_ROLES, EMERGENCY_PUSH_CHANNEL_ID, FACIAL_VERIFICATION_STATUSES (+7 more)

### Community 8 - "expo"
Cohesion: 0.17
Nodes (11): projectId, expo, extra, icon, name, orientation, scheme, slug (+3 more)

### Community 9 - "CameraScanner.ts"
Cohesion: 0.22
Nodes (7): CAMERA_MAC, CameraScanner, execAsync, getLocalSubnets(), normalizeMac(), TARGET_IP, TARGET_PORTS

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

### Community 15 - "Camera.ts"
Cohesion: 0.08
Nodes (17): Camera, CreateCameraDTO, calculateEscapeRoutes(), directionToAngle, fetchRoute(), getDestinationPoints(), CameraService, ICameraRepository (+9 more)

### Community 16 - "GhostModeService"
Cohesion: 0.21
Nodes (4): GhostModeCallback, GhostModeService, GhostModeTriggerEvent, VolumeKey

### Community 17 - "StealthEmergencyService"
Cohesion: 0.30
Nodes (5): StealthEmergencyService, MediaSessionCompat, IBinder, Intent, Service

### Community 18 - "EvidenceWorker"
Cohesion: 0.43
Nodes (3): EvidenceWorker, mockS3Upload(), mockSaveToDB()

### Community 19 - "socket.ts"
Cohesion: 0.16
Nodes (16): startServer(), AuthUserPayload, WhatsAppDispatchService, WhatsAppEmergencyInput, activePatrolUnits, dispatchTacticalAlert(), emitToAlertRoom(), emitToOperators() (+8 more)

### Community 21 - "k6_stress_test.js"
Cohesion: 0.40
Nodes (3): errorRate, ingestionLatency, options

### Community 22 - "mobile/tsconfig.json"
Cohesion: 0.50
Nodes (3): compilerOptions, extends, expo/tsconfig.base

### Community 24 - "scripts"
Cohesion: 0.12
Nodes (15): dependencies, pg, pg, name, private, scripts, build:api, build:web (+7 more)

### Community 33 - "localDatabase.ts"
Cohesion: 0.12
Nodes (12): localDatabase, LocalDatabaseService, memoryStore, CachedCameraRecord, ILocalDatabase, LOCAL_DB_STORAGE_KEYS, LocalAlertRecord, localDatabase (+4 more)

### Community 34 - "permissions"
Cohesion: 0.17
Nodes (12): permissions, ACCESS_BACKGROUND_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, CAMERA, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, FOREGROUND_SERVICE_MICROPHONE (+4 more)

### Community 35 - "Operators.tsx"
Cohesion: 0.38
Nodes (5): AdminOperators(), CreateOperatorPayload, Operator, operatorService, OperatorStats

### Community 37 - "Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)"
Cohesion: 0.20
Nodes (9): 1. ¿Qué es este proyecto?, 2. Componentes del Sistema, 3. Funcionalidades de Inteligencia y Táctica, 4. ¿Hacia dónde apunta el proyecto? (Visión de Futuro), 5. Arquitectura Técnica (Resumen), A. Aplicación Móvil (Expo/React Native), B. Centro de Mando Web (React/Vite/TypeScript), C. Infraestructura de Video (MediaMTX / FFmpeg) (+1 more)

### Community 38 - "EvidenceStorageService.ts"
Cohesion: 0.21
Nodes (10): EvidenceStorageService, SaveAudioEvidenceInput, SavedAudioEvidenceResult, stripDataUriPrefix(), DEFAULT_AUDIO_CHUNK_DURATION_MS, decryptBuffer(), encryptBuffer(), getMasterKey() (+2 more)

### Community 39 - "OfflineBufferService"
Cohesion: 0.10
Nodes (14): CovertAudioService, AlertResolvedListener, BufferedPayload, cancelledTempIds, deleteNativeAudioFile(), memoryQueue, OfflineBufferService, resolvedAlertMap (+6 more)

### Community 40 - "CARBON STATE CHECKPOINT (2026-11-19 21:17)"
Cohesion: 0.33
Nodes (5): CARBON STATE CHECKPOINT (2026-11-19 21:17), Invariantes y Rutas Descartadas, Objetivo Activo, Pulso Git, Siguiente Accion Quirurgica

### Community 41 - "getPgPool"
Cohesion: 0.21
Nodes (3): getPgPool(), User, PushDispatchService

### Community 42 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 45 - "middlewares/auth.ts"
Cohesion: 0.18
Nodes (16): REACHABILITY_SPEEDS_KMH, router, cameraRepository, cameraService, router, ADMIN_ONLY_ROLES, ADMIN_SUPERVISOR_ROLES, ALL_AUTHENTICATED_ROLES (+8 more)

### Community 46 - "mobile/src/services/auth.ts"
Cohesion: 0.14
Nodes (16): config, defaultLat, defaultLng, envApiUrl, api, AuthListener, authListeners, LoginData (+8 more)

### Community 47 - "LiquidPrimitives.tsx"
Cohesion: 0.14
Nodes (25): CameraModal(), AmbientPrismCanvas(), AmbientPrismCanvasProps, LiquidGlassCard(), LiquidGlassCardProps, LiquidInput(), LiquidInputProps, LiquidPillButton() (+17 more)

### Community 48 - "CommandCenter/index.tsx"
Cohesion: 0.15
Nodes (19): ADMIN_MODULES, AdminMenu(), AudioStreamer(), CommandCenterSidebar(), PoliceSirenBorders(), PoliceSirenBordersProps, calculateDistance(), getRiskColor() (+11 more)

### Community 49 - "unit.test.js"
Cohesion: 0.20
Nodes (8): assert, { buildCitizenTrackingUrl, resolveHeadersBaseUrl }, { describe, it }, { env }, jwt, { parsePostgisPoint, normalizePostgisLocationToWkt }, { requireAuth, requireRole }, { User }

### Community 50 - "api.ts"
Cohesion: 0.24
Nodes (8): AlertEvent, AlertTimeline(), AlertWizardSidebar(), Props, analysisService, api, routingService, EmergencyAlert

### Community 51 - "KycVerificationService.ts"
Cohesion: 0.13
Nodes (24): analyzeLiveFrameAntiSpoofing(), compareFacesAwsRekognition(), createKycError(), decodeBase64Image(), extractColombianIdIntelligence(), hmacSha256(), ID_SPOOF_TEXT_KEYWORDS, inspectAndNormalizeImage() (+16 more)

### Community 53 - "server.ts"
Cohesion: 0.12
Nodes (16): isCompiledJs, options, swaggerSpec, router, router, router, router, router (+8 more)

### Community 54 - "EvidenceVaultModal.tsx"
Cohesion: 0.27
Nodes (9): AlertEvidenceBundle, EvidenceClipItem, EvidenceVaultModal(), EvidenceVaultModalProps, formatBytes(), formatDateTime(), resolveStreamUrl(), styles (+1 more)

### Community 55 - "logger.ts"
Cohesion: 0.24
Nodes (9): CONFIG_PATH, createBasicConfig(), startCameraMonitor(), updateExistingConfig(), updateMediaMTXConfig(), logger, backgroundQueue, Job (+1 more)

### Community 56 - "PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)"
Cohesion: 0.29
Nodes (6): 1. ZONAS EXCLUSIVAS Y ZONA COMPARTIDA, 2. BASE DE DATOS ÚNICA Y CONSUMO VÍA API CENTRAL, 3. REGLAS DE CONVIVENCIA EN EL BACKEND COMPARTIDO (`apps/api/` + `supabase/`), 4. GESTIÓN DE RAMAS Y GIT (CERO CONFLICTOS), ⛔ PROHIBICIONES ESTRICTAS DE INVASIÓN:, PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)

### Community 57 - "teams.ts"
Cohesion: 0.32
Nodes (6): AdminTeams(), CreateTeamPayload, Team, TeamMember, teamService, TeamStats

### Community 59 - "mobile/src/App.tsx"
Cohesion: 0.11
Nodes (32): App(), styles, AmbientPrismCanvas(), AmbientPrismCanvasProps, LiquidGlassCard(), LiquidGlassCardProps, LiquidInput(), LiquidInputProps (+24 more)

### Community 61 - "UIBackgroundModes"
Cohesion: 0.40
Nodes (5): UIBackgroundModes, audio, fetch, location, remote-notification

### Community 62 - "PatrolModeScreen.tsx"
Cohesion: 0.19
Nodes (11): PrismIcon(), PatrolModeScreenProps, STATUS_CONFIG, styles, authService, DispatchListener, PatrolListener, PatrolLocationUpdate (+3 more)

### Community 64 - "infoPlist"
Cohesion: 0.29
Nodes (7): NSCameraUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationAlwaysUsageDescription, NSLocationWhenInUseUsageDescription, NSMicrophoneUsageDescription, NSPhotoLibraryUsageDescription, infoPlist

### Community 65 - "web/src/App.tsx"
Cohesion: 0.33
Nodes (6): App(), CommandCenterLayout(), AdminKPI(), kpiService, KpiSummary, useAuthStore

### Community 68 - "android"
Cohesion: 0.29
Nodes (7): backgroundColor, foregroundImage, adaptiveIcon, package, userInterfaceStyle, versionCode, android

### Community 76 - "HomeScreen.tsx"
Cohesion: 0.26
Nodes (10): TacticalMap(), usePanicSystem(), HomeScreen(), HomeScreenProps, styles, PatrolModeScreen(), PanicState, confirmAction() (+2 more)

### Community 78 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, expo, react-native, react-native-webview, @react-navigation/native, expo, react-native, react-native-webview (+1 more)

### Community 85 - "components/TacticalMap.tsx"
Cohesion: 0.20
Nodes (17): buildMobileLeafletHtml(), MobileLeafletWebViewMap(), NativeMapView(), NativeWebView, PEARL_LIGHT_MAP_STYLE, ensureLeafletStyles(), styles, TacticalMap() (+9 more)

### Community 86 - "env.ts"
Cohesion: 0.11
Nodes (15): ensureUserExists(), migrate(), objectIdToUuid(), env, EnvConfig, parseFiniteNumber(), stripWrappingQuotes(), validateEnv() (+7 more)

### Community 87 - "scripts/migrate.ts"
Cohesion: 0.39
Nodes (7): ensureMigrationsTable(), getAppliedMigrations(), listMigrationFiles(), MigrationRecord, MIGRATIONS_DIR, run(), sha256()

### Community 89 - "ios"
Cohesion: 0.40
Nodes (5): ios, buildNumber, bundleIdentifier, supportsTablet, userInterfaceStyle

### Community 90 - "GhostModeScreen.tsx"
Cohesion: 0.20
Nodes (9): plugins, GhostModeScreen(), GhostModeScreenProps, styles, { width, height }, expo-asset, expo-secure-store, expo-sqlite (+1 more)

### Community 92 - "Roles.tsx"
Cohesion: 0.38
Nodes (5): AdminRoles(), AVAILABLE_PERMISSIONS, CreateRoleDTO, Role, rolesService

### Community 97 - "Operator.ts"
Cohesion: 0.33
Nodes (5): CreateOperatorDTO, OperatorDTO, OperatorShift, OperatorSpecialty, OperatorStatus

### Community 102 - "Team.ts"
Cohesion: 0.33
Nodes (5): CreateTeamDTO, TeamDTO, TeamMemberDTO, TeamStatus, TeamType

## Knowledge Gaps
- **458 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+453 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPgPool()` connect `getPgPool` to `Operator.ts`, `connection.ts`, `Team.ts`, `system.ts`, `EvidenceStorageService.ts`, `middlewares/auth.ts`, `Camera.ts`, `KycVerificationService.ts`, `Operator`, `socket.ts`, `scripts/migrate.ts`, `Alert`, `models/index.ts`, `Team`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `expo` connect `expo` to `ios`, `GhostModeScreen.tsx`, `android`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `plugins` connect `GhostModeScreen.tsx` to `expo`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _458 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Emergencies.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11497584541062802 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._