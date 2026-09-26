# Proyecto: Red Ciudadana de Seguridad (xtrueker/red-ciudadana-core)

## 1. ¿Qué es este proyecto?

**Red Ciudadana de Seguridad** es una plataforma tecnológica integral diseñada para fortalecer la seguridad ciudadana mediante la colaboración activa entre los habitantes y centros de mando especializados. El proyecto combina herramientas móviles, monitoreo por video y análisis inteligente de datos para proporcionar respuestas rápidas ante incidentes y promover la prevención del delito.

El sistema se basa en un ecosistema de aplicaciones que trabajan en tiempo real:
- **App Móvil (Ciudadano):** Una herramienta para reportar emergencias y compartir ubicación en tiempo real.
- **Centro de Mando (Operador):** Un panel web avanzado para visualizar incidentes, cámaras y coordinar la respuesta.
- **Backend (API Core):** El motor que procesa alertas, gestiona el streaming de video y realiza cálculos tácticos.

---

## 2. Componentes del Sistema

### A. Aplicación Móvil (Expo/React Native)
Permite a los ciudadanos interactuar directamente con la red de seguridad:
- **Botón de Pánico Inteligente:** Activa una alerta inmediata con coordenadas GPS precisas.
- **Transmisión de Ubicación en Vivo:** Al activar una alerta, la app transmite la trayectoria del usuario en tiempo real hacia los operadores.
- **Notificaciones Preventivas:** Recepción de alertas sobre incidentes cercanos o zonas de riesgo.

### B. Centro de Mando Web (React/Vite/TypeScript)
Diseñado para operadores de seguridad que gestionan el territorio:
- **Mapa en Tiempo Real:** Visualización dinámica de todas las alertas activas y la posición de los usuarios afectados.
- **Gestión de Cámaras:** Integración de flujos de video (RTSP/WebRTC) para monitoreo preventivo y reactivo.
- **Dashboard de Operaciones:** Herramientas para asignar recursos, cerrar alertas y analizar la situación global.

### C. Infraestructura de Video (MediaMTX / FFmpeg)
Una arquitectura robusta para la gestión de cámaras de seguridad:
- **Streaming de Baja Latencia:** Permite ver cámaras instaladas en la ciudad directamente en el navegador.
- **Escaneo de Cámaras:** Herramientas para descubrir y configurar cámaras en la red de manera automatizada.

---

## 3. Funcionalidades de Inteligencia y Táctica

El proyecto va más allá de un simple reporte de incidentes, incorporando herramientas de análisis espacial:

- **Hotspots (Mapas de Calor):** Visualización de datos históricos para identificar las "zonas calientes" donde ocurren más delitos, permitiendo una planificación preventiva.
- **Reachability (Alcance de Sospechosos):** Generación de polígonos de búsqueda (isócronas) que estiman hasta dónde podría haber llegado un sospechoso caminando, en moto o vehículo en un tiempo determinado.
- **Escape Routing (Rutas de Salida):** Cálculo de rutas seguras para ciudadanos que se encuentran en una zona de peligro, guiándolos fuera del área del incidente.

---

## 4. ¿Hacia dónde apunta el proyecto? (Visión de Futuro)

El proyecto tiene como objetivo evolucionar en las siguientes direcciones:

1.  **Escalabilidad Geográfica:** Capacidad para desplegarse en múltiples municipios con una arquitectura basada en microservicios y escalado vía Redis para Sockets en tiempo real.
2.  **IA para Detección Automática:** Integración de modelos de visión por computadora para detectar comportamientos sospechosos o armas en los flujos de video de forma automática.
3.  **Integración con Servicios de Emergencia (911):** Establecer puentes de comunicación directa con fuerzas policiales y servicios médicos para una respuesta coordinada.
4.  **Hardware de Comunidad:** Posibilidad de integrar botones de pánico físicos instalados en postes o comercios que se conecten directamente a la Red Ciudadana.

---

## 5. Arquitectura Técnica (Resumen)

- **Frontend:** React with TypeScript, Vite, Tailwind CSS, Leaflet para mapas.
- **Mobile:** Expo / React Native.
- **Backend:** Node.js (Express), MongoDB (Mongoose), Socket.IO (Real-time).
- **Video:** MediaMTX (Media Server), FFmpeg.
- **DevOps:** Docker, Redis (Adaptador para Sockets), Cloud Run (Estrategia de despliegue).

---
*Documento generado automáticamente por Antigravity para la descripción del core del proyecto.*
