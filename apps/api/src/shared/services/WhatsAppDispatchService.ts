import { env } from '../../config/env';
import { logger } from '../utils/logger';
import { buildCitizenTrackingUrl } from '../utils/url';

export interface WhatsAppEmergencyInput {
  alertId: string;
  citizenName?: string;
  citizenPhone?: string | null;
  isVerified?: boolean;
  latitude: number;
  longitude: number;
  address?: string;
  triggerType?: string;
}

export class WhatsAppDispatchService {
  /**
   * Construye el mensaje operativo para cuadrantes, empresas de vigilancia y frentes comerciales,
   * y lo despacha vía Meta WhatsApp Cloud API (v21.0) y/o Webhook (n8n / Evolution API / Twilio).
   */
  static async sendEmergencyDispatch(input: WhatsAppEmergencyInput): Promise<{
    sent: boolean;
    channel: 'meta_cloud_api' | 'webhook' | 'dry_run';
    recipientsCount: number;
    trackingUrl: string;
    mapsUrl: string;
  }> {
    const trackingUrl = buildCitizenTrackingUrl(input.alertId);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${input.latitude},${input.longitude}`;

    const verifiedBadge = input.isVerified ? 'Identidad KYC Verificada' : 'Reporte Ciudadano';
    const modeTag =
      input.triggerType === 'ghost_mode'
        ? 'MODO SILENCIOSO ENCUBIERTO'
        : 'BOTÓN SOS DIRECTO';

    const messageText = [
      `*ALERTA RED CIUDADANA — ${modeTag}*`,
      `Ciudadano: ${input.citizenName || 'Usuario Registrado'} (${verifiedBadge})`,
      input.citizenPhone ? `Contacto: ${input.citizenPhone}` : null,
      `Ubicación: ${input.address || `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`}`,
      `Ruta GPS inmediata: ${mapsUrl}`,
      `Seguimiento en vivo: ${trackingUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;
    const rawRecipients = env.WHATSAPP_DISPATCH_RECIPIENTS;
    const webhookUrl = env.WHATSAPP_WEBHOOK_URL;

    const recipients = rawRecipients
      .split(',')
      .map((s) => s.replace(/[^\d]/g, '').trim())
      .filter((s) => s.length >= 10);

    // Canal 1: Meta WhatsApp Cloud API oficial
    if (phoneNumberId && accessToken && recipients.length > 0) {
      let delivered = 0;
      await Promise.all(
        recipients.map(async (to) => {
          try {
            const resp = await fetch(
              `${env.META_GRAPH_API_BASE_URL}/${phoneNumberId}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  recipient_type: 'individual',
                  to,
                  type: 'text',
                  text: {
                    preview_url: true,
                    body: messageText,
                  },
                }),
              }
            );
            if (resp.ok) delivered++;
          } catch (err: any) {
            logger.warn(`Fallo enviando WhatsApp a ${to}: ${err.message}`);
          }
        })
      );

      logger.info(
        `💬 WhatsApp Cloud API despachado (${delivered}/${recipients.length}) para alerta ${input.alertId}`
      );
      return {
        sent: delivered > 0,
        channel: 'meta_cloud_api',
        recipientsCount: delivered,
        trackingUrl,
        mapsUrl,
      };
    }

    // Canal 2: Webhook genérico (n8n / Evolution API / Make / Twilio)
    if (webhookUrl) {
      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'emergency.whatsapp_dispatch',
            alertId: input.alertId,
            citizenName: input.citizenName,
            citizenPhone: input.citizenPhone,
            isVerified: input.isVerified,
            latitude: input.latitude,
            longitude: input.longitude,
            address: input.address,
            mapsUrl,
            trackingUrl,
            messageText,
            timestamp: new Date().toISOString(),
          }),
        });
        return {
          sent: resp.ok,
          channel: 'webhook',
          recipientsCount: 1,
          trackingUrl,
          mapsUrl,
        };
      } catch (err: any) {
        logger.warn(`Fallo despachando WhatsApp Webhook: ${err.message}`);
      }
    }

    // Modo pre-producción sin credenciales: deja trazabilidad lista sin bloquear la emergencia
    logger.info(
      `💬 [WhatsApp Dispatch Ready] Alerta ${input.alertId} preparada -> ${trackingUrl}`
    );
    return {
      sent: false,
      channel: 'dry_run',
      recipientsCount: 0,
      trackingUrl,
      mapsUrl,
    };
  }
}
