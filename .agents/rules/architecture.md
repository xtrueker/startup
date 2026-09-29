# PROTOCOLO DE CONVIVENCIA Y TRABAJO EN EQUIPO (MONOREPO)

Este proyecto está desarrollado por un equipo de 3 personas trabajando simultáneamente con Antigravity.
Para evitar colisiones, sobreescrituras y conflictos de Git, TODO agente de Antigravity debe obedecer estrictamente este reglamento.

---

## 1. ZONAS EXCLUSIVAS (TERRITORIOS SAGRADOS)

El repositorio está dividido en 3 carpetas independientes. Cada desarrollador es el dueño absoluto de su carpeta:

| Integrante | Carpeta Exclusiva | Rol y Responsabilidad |
| :--- | :--- | :--- |
| 📱 **Andrés** | `apps/mobile/` | App del Ciudadano: Botón de pánico, modo fantasma, KYC, mapas móviles. |
| 🖥️ **Nyck** | `apps/web/` | Centro de Mando: Pantallas de operadores policiales, mosaico de cámaras, despacho. |
| ⚙️ **Joan** | `apps/api/` + DB | Servidor Central: Endpoints REST, WebSockets, Supabase/PostgreSQL y Swagger. |

### ⛔ PROHIBICIONES ESTRICTAS DE INVASIÓN:
1. El Antigravity de **Andrés** tiene PROHIBIDO editar archivos en `apps/web/` y `apps/api/`.
2. El Antigravity de **Nyck** tiene PROHIBIDO editar archivos en `apps/mobile/` y `apps/api/`.
3. El Antigravity de **Joan** tiene PROHIBIDO editar archivos en `apps/mobile/` y `apps/web/`.
4. **Archivos de la Raíz (Zona Neutral)**: Ningún agente puede modificar archivos de la raíz (`package.json`, `.gitignore`, scripts globales) sin consenso previo del equipo.

---

## 2. PROHIBICIÓN DE REDUNDANCIA Y BASES DE DATOS LOCALES

1. **La Base de Datos es ÚNICA**: Está en Supabase (PostgreSQL) y su único administrador es el backend de Joan (`apps/api`).
2. **Andrés (Móvil) y Nyck (Web) son CLIENTES CONSUMIDORES**:
   - Está **TERMINANTEMENTE PROHIBIDO** que el agente de Andrés o el de Nyck cree bases de datos locales (SQLite, Realm, JSONs locales de persistencia de negocio, mocks permanentes) para simular almacenamiento.
   - Está prohibido que el Móvil o la Web instancien clientes directos de Supabase para saltarse la API.
3. Todo dato (alertas, usuarios, incidentes, cámaras, reportes) se envía y se consulta a través de la API central (`http://localhost:3001/api`) y los WebSockets del backend.

---

## 3. PROTOCOLO DE COMUNICACIÓN: CÓMO PEDIR ENDPOINTS A JOAN

Si **Andrés** (en el Móvil) o **Nyck** (en la Web) necesitan una pantalla o función que requiere datos que la API todavía no tiene:

### Lo que hace el agente de Frontend (Andrés o Nyck):
1. Diseña la interfaz visual en su carpeta correspondiente.
2. Define la interfaz TypeScript del contrato (qué datos necesita enviar y qué espera recibir).
3. **Genera la "Ficha Técnica para Joan"**: Un bloque exacto y formateado para entregarle a Joan, con:
   - Método y Ruta (`GET /api/...`, `POST /api/...`).
   - Ubicación exacta del archivo en `apps/api/src/modules/...` donde Joan debe colocarlo.
   - Parámetros / Body esperados.
   - Estructura JSON de respuesta.
   - Consulta a la tabla de Supabase requerida.
   - Código backend sugerido listo para que el Antigravity de Joan solo lo pegue y ejecute.

### Lo que hace el agente de Joan (Backend):
1. Recibe la Ficha Técnica, crea el endpoint en `apps/api/` y realiza la consulta en Supabase.
2. Añade la documentación en Swagger (`/api/docs`).
3. Avisa a Andrés o Nyck: *"Endpoint listo y verificado, ya lo pueden consumir"*.

---

## 4. GESTIÓN DE RAMAS Y GIT (CERO CONFLICTOS)

1. Cada uno trabaja en su propia rama:
   - Andrés trabaja en: `andres`
   - Nyck trabaja en: `Nyck`
   - Joan trabaja en: `notbread` (o `joan`)
2. Al iniciar la jornada: Ejecutar `git pull origin main` para tener lo último.
3. Al finalizar una tarea: Hacer commit y push exclusivamente a su propia rama remota.
4. Como nadie toca los archivos de los demás, los `merge` hacia `main` se integran automáticamente sin conflictos de código.
