"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalEventPublisher = exports.EventPublisher = void 0;
const ioredis_1 = require("ioredis");
const env_1 = require("../../config/env");
class EventPublisher {
    constructor() {
        this.publisher = new ioredis_1.Redis(env_1.env.REDIS_URL || 'redis://127.0.0.1:6379', {
            lazyConnect: true,
        });
    }
    /**
     * INGESTA (Fast Route)
     * Recibe el payload en ráfaga (posiblemente miles por segundo tras un reconecte offline)
     * y lo inyecta a la cola sin bloquear el Event Loop procesando datos en DB.
     */
    async appendToStream(topic, eventId, payload) {
        const streamPayload = {
            eventId, // Clave de Idempotencia proporcionada por el dispositivo Edge (Mobile)
            timestamp: Date.now().toString(),
            data: JSON.stringify(payload)
        };
        try {
            // XADD añade a un Redis Stream (persistencia temporal como Kafka) 
            // en contraposición a Pub/Sub que es "fire-and-forget".
            await this.publisher.xadd(topic, '*', 'payload', JSON.stringify(streamPayload));
            // En una arquitectura Cloud Run + Google PubSub nativa:
            // await pubsub.topic(topic).publishMessage({ json: streamPayload, orderingKey: eventId });
        }
        catch (error) {
            console.error(`🚨 [EventPublisher] Falla crítica inyectando al topic ${topic}:`, error);
            throw new Error('Broker Unavailable');
        }
    }
    /**
     * BROADCAST DIRECTO (Baja Latencia)
     * Usado por el Worker de Prioridad para disparar las pantallas de comandos de Autoridades
     * en menos de 50ms desde la ingesta.
     */
    async broadcastCriticalAlert(alertPayload) {
        await this.publisher.publish('SYSTEM_ALERTS_LIVE', JSON.stringify(alertPayload));
    }
}
exports.EventPublisher = EventPublisher;
exports.globalEventPublisher = new EventPublisher();
//# sourceMappingURL=EventPublisher.js.map