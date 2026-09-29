# Protocolo de Arquitectura, Roles y Contratos de API

Este repositorio es un Monorepo colaborativo para el sistema de seguridad ciudadana en tiempo real. Todos los agentes de Antigravity deben cumplir estrictamente estas directrices.

---

## 1. Distribución de Roles y Territorios de Código

Cada miembro del equipo tiene la custodia exclusiva de su componente:
- **`apps/mobile/` — Frente Móvil (Andrés)**: App del Ciudadano (React Native / Expo). Botón de pánico, modo fantasma, audio en vivo, onboarding KYC bancario.
- **`apps/web/` — Frente Web (Nyck)**: Centro de Mando Policial y Despacho Operativo (React / Vite). Mosaico de cámaras HLS/RTSP, despacho de patrullas, mapa táctico.
- **`apps/api/` — Frente Backend y Datos (Joan)**: Servidor Express, base de datos Supabase / PostgreSQL, WebSockets y documentación Swagger.

> **Regla de No Invasión**: Ningún agente debe modificar archivos de otra carpeta sin un requerimiento de contrato explícito.

---

## 2. Prohibición de Redundancia y Fuente Única de la Verdad

1. **La Base de Datos es ÚNICA**: Está centralizada en PostgreSQL / Supabase y gestionada exclusivamente a través de `apps/api`.
2. **Prohibición de Persistencia Local Falsa**:
   - `apps/mobile` y `apps/web` son **clientes consumidores**.
   - Está **estrictamente prohibido** que un agente cree bases de datos locales redundantes (SQLite, Realm, WatermelonDB, JSONs locales simulados) o instancie clientes independientes de Supabase dentro de `apps/mobile` o `apps/web` para almacenar datos de negocio.
3. **Consumo Centralizado**:
   - Todo flujo de datos (usuarios, alertas, incidentes, cámaras, reportes) se envía y consulta a través de `http://localhost:3001/api` y los sockets correspondientes.

---

## 3. Protocolo de Contratos de API (Handshake Frontend ↔ Backend)

Cuando el agente de **Andrés (Móvil)** o **Nyck (Web)** requiera una funcionalidad o dato que **aún no exista** en el backend:

### A. Lo que debe hacer el Agente de Frontend (Móvil o Web):
1. **NO inventar bases de datos locales** ni datos mock permanentes.
2. Definir en el servicio de su app la interfaz TypeScript del contrato (DTO de entrada y DTO de respuesta).
3. **Generar el Bloque de Especificación para Joan (Backend)**: Debe entregar al usuario un bloque listo para copiar y pegar para Joan con el siguiente formato exacto:

```markdown
### 📋 Solicitud de Endpoint para Joan (Backend)
- **Método y Ruta**: `[GET | POST | PUT | DELETE] /api/[módulo]/[ruta]`
- **Propósito**: Breve explicación de para qué lo necesita el frontend.
- **Ubicación sugerida en backend**: `apps/api/src/modules/[módulo]/presentation/routes.ts`
- **Autenticación requerida**: Sí (Bearer Token JWT) / No (Pública)
- **Payload / Body Esperado (JSON)**:
\`\`\`json
{
  "campo": "tipo y descripción"
}
\`\`\`
- **Respuesta Esperada (JSON)**:
\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`
- **Lógica / Tablas involucradas**: Indicación de qué tablas de Supabase (`alerts`, `users`, `cameras`, etc.) debe consultar o actualizar.
```

### B. Lo que debe hacer el Agente de Joan (Backend):
1. Tomar la especificación generada por el frontend e implementarla en `apps/api`.
2. Mantener la respuesta exacta del contrato acordado.
3. Añadir la anotación Swagger OpenAPI correspondiente para mantener la documentación al día.
4. Notificar a su usuario cuando el endpoint esté listo y desplegado en local.

---

## 4. Control de Cambios y Git

1. Cada desarrollador trabaja en su rama propia (`andres`, `Nyck`, `notbread` o su rama designada).
2. Los merges hacia `main` se realizan verificando que no existan conflictos en los archivos de configuración compartidos (`package.json`, `.env`).
