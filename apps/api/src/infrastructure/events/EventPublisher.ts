import { Redis } from 'ioredis';
// En un sistema real masivo (Uber/911 scale), reemplazaríamos Redis Pub/Sub por Apache Kafka 
// o Google Cloud Pub/Sub para garantizar retención ("Exactly-Once").
// Para este ejemplo de infraestructura base, simulamos la capa de abstracción.

export class EventPublisher {
  private publisher: Redis;

  constructor() {
    this.publisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    console.log('⚡ [EventPublisher] Conectado al Message Broker');
  }

  /**
   * INGESTA (Fast Route)
   * Recibe el payload en ráfaga (posiblemente miles por segundo tras un reconecte offline)
   * y lo inyecta a la cola sin bloquear el Event Loop procesando datos en DB.
   */
  async appendToStream(topic: string, eventId: string, payload: any): Promise<void> {
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
      
    } catch (error) {
      console.error(`🚨 [EventPublisher] Falla crítica inyectando al topic ${topic}:`, error);
      throw new Error('Broker Unavailable');
    }
  }

  /**
   * BROADCAST DIRECTO (Baja Latencia)
   * Usado por el Worker de Prioridad para disparar las pantallas de comandos de Autoridades 
   * en menos de 50ms desde la ingesta.
   */
  async broadcastCriticalAlert(alertPayload: any): Promise<void> {
    await this.publisher.publish('SYSTEM_ALERTS_LIVE', JSON.stringify(alertPayload));
  }
}

export const globalEventPublisher = new EventPublisher();
