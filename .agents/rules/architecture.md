# PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO — 2 INTEGRANTES)

Este proyecto está desarrollado por un equipo de **2 personas** (**Andrés** y **Nyck**) trabajando simultáneamente con Antigravity.
Para evitar colisiones, sobreescrituras y conflictos de Git, TODO agente de Antigravity debe obedecer estrictamente este reglamento.

---

## 1. ZONAS EXCLUSIVAS Y ZONA COMPARTIDA

El repositorio se organiza en dos territorios exclusivos de frontend y un territorio compartido de backend:

| Integrante | Carpeta / Alcance | Rol y Responsabilidad |
| :--- | :--- | :--- |
| 📱 **Andrés** | `apps/mobile/` *(Exclusiva)* | App del Ciudadano y Patrulla Móvil: Botón SOS, modo silencioso/fantasma, KYC, mapas móviles. |
| 🖥️ **Nyck** | `apps/web/` *(Exclusiva)* | Centro de Mando Web: Pantallas de operadores, mosaico de cámaras, despacho y paneles admin. |
| ⚙️ **Andrés + Nyck** | `apps/api/` + `supabase/` + `postman/` *(Compartida)* | Servidor Central: Endpoints REST, WebSockets, modelos PostgreSQL/Supabase, migraciones SQL y Swagger. |

### ⛔ PROHIBICIONES ESTRICTAS DE INVASIÓN:
1. El Antigravity de **Andrés** tiene **PROHIBIDO** editar archivos en `apps/web/`.
2. El Antigravity de **Nyck** tiene **PROHIBIDO** editar archivos en `apps/mobile/`.
3. **Backend Compartido (`apps/api/`, `supabase/`, `postman/`)**: Tanto el Antigravity de **Andrés** como el de **Nyck** están **AUTORIZADOS** para crear y modificar endpoints, sockets, modelos y migraciones siguiendo las reglas de la Sección 3.
4. **Archivos de la Raíz (Zona Neutral)**: Ningún agente puede modificar archivos de la raíz (`package.json`, `.gitignore`, scripts globales) sin consenso previo entre Andrés y Nyck.

---

## 2. BASE DE DATOS ÚNICA Y CONSUMO VÍA API CENTRAL

1. **La Base de Datos es ÚNICA**: Está en Supabase (PostgreSQL) y su único punto de acceso de negocio es el servidor central (`apps/api/`).
2. **Prohibición de Clientes Directos y Persistencia Paralela en Frontend**:
   - Está **PROHIBIDO** que `apps/mobile/` o `apps/web/` instancien clientes directos de Supabase para saltarse la API central.
   - Está prohibido crear bases de datos paralelas de negocio o mocks permanentes para simular el backend (solo se permite cola/caché temporal offline de emergencia en móvil que sincronice contra la API).
3. Todo dato (alertas, usuarios, incidentes, cámaras, operadores, equipos, reportes) se envía y consulta a través de `http://localhost:3001/api` y los WebSockets del backend.

---

## 3. REGLAS DE CONVIVENCIA EN EL BACKEND COMPARTIDO (`apps/api/` + `supabase/`)

Para que **Andrés** y **Nyck** puedan trabajar en `apps/api/` sin pisarse cambios ni generar conflictos de Git:

1. **Aislamiento por módulos**: Crear o editar la lógica dentro de su carpeta correspondiente en `apps/api/src/modules/<modulo>/` sin alterar módulos ajenos que no estén relacionados con la tarea.
2. **Edición quirúrgica en archivos troncales (`server.ts`, `socket.ts`, `models/index.ts`)**: Añadir únicamente las importaciones, rutas o eventos necesarios sin reformatear ni reordenar el resto del archivo, facilitando el merge automático de Git.
3. **Respeto de contratos existentes**: Nunca eliminar campos ni romper la estructura JSON de un endpoint o evento WebSocket que ya consuma la otra aplicación (`apps/mobile/` o `apps/web/`) sin mantener retrocompatibilidad o acordarlo previamente.
4. **Migraciones SQL limpias e idempotentes**: Cualquier cambio de esquema en Supabase debe guardarse como un archivo nuevo en `supabase/migrations/YYYYMMDD_descripcion.sql` usando cláusulas seguras (`IF NOT EXISTS`), además de actualizar Swagger (`/api/docs`) y/o la colección en `postman/` cuando aplique.
5. **Compilación limpia obligatoria**: Todo cambio en `apps/api/` debe compilar sin errores de TypeScript (`npm run build:api` o `tsc --noEmit`) antes de entregarse.

---

## 4. GESTIÓN DE RAMAS Y GIT (CERO CONFLICTOS)

1. Ramas activas del equipo:
   - **Andrés** trabaja en: `andres`
   - **Nyck** trabaja en: `Nyck`
   *(La antigua rama `notbread` / `joan` queda fuera de uso).*
2. **Antes de editar `apps/api/`**: Ejecutar `git fetch origin` y sincronizar los últimos cambios (`main` o la rama del compañero) para trabajar siempre sobre la versión más reciente del backend.
3. **Al finalizar una tarea**: Hacer `commit` y `push` exclusivamente a la propia rama remota (`andres` o `Nyck`), integrando hacia `main` de forma coordinada.
