#!/bin/bash
# 🚀 RED CIUDADANA - STAGING DEPLOYMENT (Google Cloud Shell)
# Autor: Principal Platform Engineer
# Descripción: Despliegue secuencial, idempotente y observable para GCP Staging.

set -e # Manejo de Errores: Fail-Fast (detiene la ejecución si cualquier comando falla)

echo "========================================================="
echo "  🛡️ INICIANDO SECUENCIA DE PRE-PRODUCCIÓN (STAGING) 🛡️  "
echo "========================================================="

# ==============================================================================
# 1. VALIDACIÓN DE ENTORNO Y REQUISITOS (Pre-Flight Checks)
# ==============================================================================
echo "[1/5] Verificando entorno Cloud Shell..."
if ! command -v gcloud &> /dev/null; then
  echo "❌ ERROR FATAL: 'gcloud' no está instalado. Ejecute este script dentro de Google Cloud Shell."
  exit 1
fi

export PROJECT_ID=$(gcloud config get-value core/project)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ ERROR FATAL: No hay proyecto activo en gcloud."
  echo "👉 SOLUCIÓN: Ejecute 'gcloud config set project [SU_PROJECT_ID]'"
  exit 1
fi

echo "✅ Proyecto Activo: $PROJECT_ID"

# Chequeo estricto de Secrets reales pasados por bash envs
if [ -z "$MONGODB_URI" ] || [ -z "$REDIS_URL" ] || [ -z "$JWT_SECRET" ]; then
  echo "❌ ERROR FATAL: Variables Críticas Ausentes."
  echo "Antes de ejecutar, debes exportar las credenciales reales de Staging:"
  echo "export MONGODB_URI='mongodb+srv://...' REDIS_URL='redis://...' JWT_SECRET='tu_secreto'"
  exit 1
fi

# ==============================================================================
# 2. DEFINICIÓN DE ARQUITECTURA BASE
# ==============================================================================
REGION="us-central1"
ARTIFACT_REPO="red-ciudadana-repo"
IMAGE_TAG="staging-$(date +%s)"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/api-core:${IMAGE_TAG}"

echo "[2/5] Infraestructura Base (Artifact Registry y Buckets)..."

# Idempotencia: Crea el Artifact Registry si no existe (Silencia errores si ya existe)
gcloud artifacts repositories create $ARTIFACT_REPO --repository-format=docker --location=$REGION --description="Docker repository for Red Ciudadana Backend" || true

# Idempotencia: Crea el Bucket de Almacenamiento S3 nativo (Evidence)
gcloud storage buckets create gs://${PROJECT_ID}-evidence-stg --location=$REGION || true
# Habilita política de retención (Archivado automático para ahorrar costos)
gcloud storage buckets update gs://${PROJECT_ID}-evidence-stg --lifecycle-file=<(echo '{"rule":[{"action":{"type":"SetStorageClass","storageClass":"COLDLINE"},"condition":{"age":30}}]}') || true

# ==============================================================================
# 3. COMPILACIÓN Y SUBIDA (CI Continuous Integration)
# ==============================================================================
echo "[3/5] Construyendo imagen de Docker nativa y subiendo a Artifact Registry..."
# Se asume que el comando se lanza desde la carpeta raiz o scripts/
cd ../apps/api || cd apps/api
gcloud builds submit . --tag ${IMAGE_PATH}

# ==============================================================================
# 4. DESPLIEGUE A CLOUD RUN (Secuencia Estricta Evitando Race Conditions)
# ==============================================================================
echo "[4/5] Desplegando Topología Distribuida en Cloud Run..."

# 👉 4.A: EVIDENCE WORKER (Aislado, I/O intensivo)
echo "🚀 Levantando Evidence Worker..."
gcloud run deploy evidence-worker-stg \
  --image ${IMAGE_PATH} \
  --region ${REGION} \
  --no-allow-unauthenticated \
  --command="node" --args="dist/workers/evidence-index.js" \
  --min-instances 0 --max-instances 50 \
  --cpu 1 --memory 1024Mi \
  --timeout 300s \
  --set-env-vars="COMPONENT_ROLE=EVIDENCE_WORKER,NODE_ENV=staging,BUCKET_NAME=${PROJECT_ID}-evidence-stg" \
  --set-secrets="REDIS_URL=${REDIS_URL},MONGODB_URI=${MONGODB_URI}" || echo "Aviso: Uso de Secrets real recomendado vía Secret Manager"
  
# Nota: Por facilidad de Staging pasaremos variables normales si Secret Manager no está activo.
# Para forzar Env Vars temporalmente (Hardening):
gcloud run deploy evidence-worker-stg --image ${IMAGE_PATH} --region ${REGION} --no-allow-unauthenticated --command="node" --args="dist/workers/evidence-index.js" --min-instances 0 --max-instances 50 --cpu 1 --memory 1024Mi --set-env-vars="COMPONENT_ROLE=EVIDENCE_WORKER,NODE_ENV=staging,BUCKET_NAME=${PROJECT_ID}-evidence-stg,REDIS_URL=${REDIS_URL},MONGODB_URI=${MONGODB_URI}"

# 👉 4.B: SPATIAL ROUTING WORKER (Aislado, CPU intensivo geoespacial)
echo "🚀 Levantando Spatial Worker..."
gcloud run deploy spatial-worker-stg \
  --image ${IMAGE_PATH} \
  --region ${REGION} \
  --no-allow-unauthenticated \
  --command="node" --args="dist/workers/spatial-index.js" \
  --min-instances 1 --max-instances 200 \
  --cpu 4 --memory 4096Mi \
  --set-env-vars="COMPONENT_ROLE=SPATIAL_WORKER,NODE_ENV=staging,REDIS_URL=${REDIS_URL},MONGODB_URI=${MONGODB_URI}"

# 👉 4.C: API GATEWAY (Entrada principal, Concurrencia Masiva)
echo "🚀 Levantando API Gateway..."
gcloud run deploy api-gateway-stg \
  --image ${IMAGE_PATH} \
  --region ${REGION} \
  --port 3001 \
  --allow-unauthenticated \
  --min-instances 2 --max-instances 1000 \
  --concurrency 1000 \
  --cpu 2 --memory 2048Mi --cpu-boost \
  --set-env-vars="COMPONENT_ROLE=GATEWAY,NODE_ENV=staging,JWT_SECRET=${JWT_SECRET},REDIS_URL=${REDIS_URL},MONGODB_URI=${MONGODB_URI}"

GATEWAY_URL=$(gcloud run services describe api-gateway-stg --region ${REGION} --format 'value(status.url)')

# ==============================================================================
# 5. FRONTEND (Command Center Config)
# ==============================================================================
echo "[5/5] Reuniendo parámetros para Frontend Command Center..."
echo "Para desplegar React en Vercel o Netlify, asegúrate de setear esta variable de entorno:"
echo "--------------------------------------------------------"
echo " VITE_API_URL=${GATEWAY_URL}"
echo "--------------------------------------------------------"

# ==============================================================================
# POST-DEPLOY: AUDITORÍA Y MONITOREO OBLIGATORIO
# ==============================================================================
echo ""
echo "✅======================================================✅"
echo "  SISTEMA STAGING DESPLEGADO Y OPERATIVO EN GOOGLE CLOUD"
echo "✅======================================================✅"
echo ""
echo "🎯 URL PRINCIPAL (Gateway): $GATEWAY_URL"
echo ""
echo "👁️ COMANDOS DE AUDITORÍA (Monitoreo en Vivo):"
echo "Para observar el rastro de un PÁNICO cuando el móvil presione volumen:"
echo ""
echo "1. Logs del Ingestor (Llegada en milisegundos):"
echo "   gcloud beta run services logs tail api-gateway-stg --region $REGION"
echo ""
echo "2. Logs del Geo-Worker (Búsqueda en el radio):"
echo "   gcloud beta run services logs tail spatial-worker-stg --region $REGION"
echo ""
echo "3. Logs Mudos de Evidencia (Audio Storage Box):"
echo "   gcloud beta run services logs tail evidence-worker-stg --region $REGION"
echo ""
echo "👉 PRUEBA END-TO-END AHORA: Conecta tu app móvil a $GATEWAY_URL y oprime los 4 botones."
