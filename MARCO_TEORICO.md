# Marco Teórico de Arquitectura e Infraestructura Tecnológica

Este documento describe la fundamentación académica y técnica del proyecto **Red Ciudadana de Seguridad**, justificando la selección de herramientas y el diseño arquitectónico propuesto para cumplir con los estándares de un proyecto de grado.

---

## 1. Patrón Arquitectónico: Arquitectura Orientada a Eventos (EDA) y Cliente-Servidor

El proyecto implementa una combinación de patrones:
1.  **Arquitectura Cliente-Servidor:** Utilizada para la gestión de recursos estáticos (web/mobile) y persistencia de datos (API REST).
2.  **Event-Driven Architecture (EDA):** Fundamental para el manejo de alertas. Un "evento" de pánico se propaga instantáneamente desde el emisor (ciudadano) hacia los receptores (operadores) sin necesidad de peticiones repetitivas.

**Justificación:** La seguridad ciudadana no admite retrasos (latencia). Los protocolos HTTP tradicionales son ineficientes para el seguimiento en vivo, por lo que el uso de Sockets garantiza una comunicación bidireccional en tiempo real.

---

## 2. Persistencia de Datos: MongoDB y Mongoose

Se seleccionó **MongoDB** (base de datos NoSQL orientada a documentos) sobre bases de datos relacionales (SQL).

### Justificación Técnica:
-   **Soporte Geoespacial Nativo:** MongoDB permite almacenar coordenadas en formato GeoJSON y realizar consultas de proximidad (Ej: "Encontrar cámaras en un radio de 500m") mediante índices `$geometry` de forma extremadamente eficiente.
-   **Flexibilidad de Esquema:** Las alertas de seguridad pueden contener datos heterogéneos (fotos, audio, información del dispositivo, niveles de batería). Un esquema flexible permite evolucionar el sistema sin las restricciones de integridad referencial rígida de SQL que podrían ralentizar el desarrollo del prototipo.
-   **Escalabilidad Horizontal:** Su naturaleza distribuida facilita la expansión del sistema a medida que el número de ciudadanos conectados aumenta.

---

## 3. Comunicación en Tiempo Real: Socket.io y Redis

Para la mensajería instantánea de alertas y GPS, se utiliza **Socket.io**.

### Justificación Técnica:
-   **Abstracción de WebSockets:** Proporciona mecanismos de "fallback" (long-polling) en caso de que la red móvil del ciudadano no soporte WebSockets puros, asegurando que el botón de pánico siempre sea entregado.
-   **Escalabilidad con Redis:** Se utiliza un **Redis Adapter** para conectar múltiples instancias del servidor. Esto permite que un ciudadano conectado al "Servidor A" pueda alertar a un operador conectado al "Servidor B", algo crítico para la disponibilidad del sistema en entornos de producción (Cloud Run / Kubernetes).

---

## 4. Análisis Geográfico: Turf.js

**Turf.js** es la biblioteca elegida para el procesamiento de geometría espacial en el backend.

### Justificación Técnica:
-   **Computación Geoespacial en el Lado del Servidor:** Permite realizar cálculos complejos (como la generación de polígonos de alcance o "isócronas") sin consumir cuotas de APIs externas (como Google Maps).
-   **Eficiencia:** Al ejecutarse nativamente en Node.js, reduce la latencia de procesamiento táctico de rutas de escape.

---

## 5. Procesamiento de Video: MediaMTX y FFmpeg

Para la visualización de cámaras de seguridad urbanas.

### Justificación Técnica:
-   **Transmuxing:** MediaMTX permite convertir flujos RTSP (estándar de cámaras de seguridad) a formatos compatibles con la web (WebRTC/HLS) en tiempo real.
-   **Baja Latencia:** El uso de WebRTC asegura que la seguridad preventiva se base en lo que está ocurriendo "ahora", no hace 30 segundos.

---

## 6. Frontend y Mobile: Ecosistema React

Se utiliza **React (Vite)** para la web y **Expo (React Native)** para el móvil.

### Justificación Técnica:
-   **Unicidad de Código:** Al compartir TypeScript y lógica de negocio (a través de paquetes compartidos en el monorepo), se reduce la probabilidad de errores y se acelera el desarrollo.
-   **Acceso a Sensores:** Expo proporciona una API robusta y unificada para acceder al GPS, acelerómetro y notificaciones push, vitales para el funcionamiento de una app de seguridad.

---
**Resumen para el Jurado:**
La arquitectura se ha diseñado bajo los principios de **Alta Disponibilidad, Baja Latencia y Escalabilidad**, utilizando un stack moderno (MERN extendido con Sockets) que permite la gestión eficiente de datos geoespaciales y video en tiempo real.
