"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialRoutingWorker = void 0;
const ioredis_1 = require("ioredis");
// En producción, reemplazar con las entidades Mongoose reales de la base de datos de Autoridades/Patrullas
const mockFindAuthoritiesNear = async (_latitude, _longitude, _maxDistanceMeters) => {
    return [
        { id: 'police-station-central', name: 'Comisaría Central', distance: 1200 },
        { id: 'patrol-car-9x', name: 'Patrulla 9X', distance: 350 }
    ];
};
class SpatialRoutingWorker {
    constructor() {
        this.publisher = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        console.log('🗺️ [SpatialRoutingWorker] Online and processing Geospatial Streams');
    }
    /**
     * BUCLE DE CONSUMO: Topic de Pánico y Ubicaciones en Vivo
     */
    async startConsuming() {
        setInterval(async () => {
            // Mock de consumo del topic "topic.alert.location"
            const rawEvents = [
                {
                    id: 'mock-loc-123',
                    message: {
                        alertId: 'ALT-999',
                        latitude: 4.6097,
                        longitude: -74.0817,
                        timestamp: Date.now()
                    }
                }
            ];
            for (const event of rawEvents) {
                await this.routeSpatialEvent(event.message);
            }
        }, 1000); // Poll de muy alta frecuencia (1s) para routing en tiempo real
    }
    /**
     * PROCESAMIENTO CPU INTENSIVO -> RUTEO DINÁMICO
     */
    async routeSpatialEvent(payload) {
        try {
            // 1. Detección de Proximidad (El cuello de botella de CPU)
            // Buscamos autoridades (Patrullas, Centros de Mando) en un radio de 3 KM.
            // En MongoDB esto invoca una query pesada indizada por un índice Geospacial 2dsphere ($geoNear).
            const nearbyAuthorities = await mockFindAuthoritiesNear(payload.latitude, payload.longitude, 3000);
            if (nearbyAuthorities.length === 0) {
                console.warn(`[SpatialRouter] ⚠️ Alerta aislada ${payload.alertId}: No hay patrullas en 3KM. Escalando a Nivel Nacional.`);
                await this.publisher.publish('ALERTS_NATIONAL_ESCALATION', JSON.stringify(payload));
                return;
            }
            // 2. Fragmentación del Evento (Targeted Routing)
            // Solo despertamos los WebSockets de las delegaciones / patrullas implicadas,
            // evitando saturar el socket cluster de las autoridades en otras ciudades.
            for (const authority of nearbyAuthorities) {
                const routingKey = `authority.channel.${authority.id}`;
                await this.publisher.publish(routingKey, JSON.stringify({
                    type: 'ALARM_PROXIMITY_ALERT',
                    alertId: payload.alertId,
                    citizenLocation: { lat: payload.latitude, lng: payload.longitude },
                    distanceToYouMeters: authority.distance,
                    urgency: 'CRITICAL_LIFE_THREAT'
                }));
            }
            // 3. Predicción Geoespacial (Heatmap Live)
            // Añadimos la métrica para clustering predictivo (por ejemplo, InfluxDB o Redis Geo)
            // para predecir zonas de "Flash Mobs" delictivos basados en densidad atípica.
            await this.publisher.geoadd('livestats:danger_zones', payload.longitude, payload.latitude, payload.alertId);
        }
        catch (error) {
            console.error(`[SpatialRouter] Falla ruteando alerta ${payload.alertId}`, error);
            // Estrategia de Fallback: Si el motor de proximidad cae, se asume el peor caso 
            // y se envía la alerta a la delegación más grande por defecto (Fail-Safe global).
            await this.publisher.publish('FAILSAFE_DISPATCH', JSON.stringify(payload));
        }
    }
}
exports.SpatialRoutingWorker = SpatialRoutingWorker;
// new SpatialRoutingWorker().startConsuming();
//# sourceMappingURL=SpatialRoutingWorker.js.map