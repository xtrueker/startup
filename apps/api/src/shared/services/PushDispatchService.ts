import { getPgPool } from '../../infrastructure/database/connection';
import { logger } from '../utils/logger';

export interface RegisterPushTokenInput {
  userId: string;
  expoPushToken: string;
  platform: string;
  role: string;
}

export interface EmergencyPushPayload {
  alertId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class PushDispatchService {
  /**
   * Registra o actualiza el token Push (Expo / FCM / APNs) de un dispositivo autenticado.
   */
  static async registerToken(input: RegisterPushTokenInput): Promise<void> {
    if (!input.expoPushToken || input.expoPushToken.length < 10) {
      throw new Error('Token Push inválido');
    }

    const pool = getPgPool();
    await pool.query(
      `INSERT INTO public.user_push_tokens (user_id, expo_push_token, platform, role, is_active, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       ON CONFLICT (expo_push_token)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         role = EXCLUDED.role,
         is_active = true,
         updated_at = NOW()`,
      [input.userId, input.expoPushToken, input.platform || 'unknown', input.role || 'citizen']
    );
  }

  static async deactivateToken(expoPushToken: string): Promise<void> {
    const pool = getPgPool();
    await pool.query(
      `UPDATE public.user_push_tokens SET is_active = false, updated_at = NOW() WHERE expo_push_token = $1`,
      [expoPushToken]
    );
  }

  /**
   * Despierta mediante Push de prioridad máxima a todas las unidades policiales y operadores activos.
   */
  static async broadcastEmergencyToResponders(payload: EmergencyPushPayload): Promise<number> {
    try {
      const pool = getPgPool();
      const res = await pool.query(
        `SELECT expo_push_token FROM public.user_push_tokens
         WHERE is_active = true AND role IN ('police', 'operator', 'supervisor', 'admin')`
      );

      const tokens: string[] = res.rows.map((r) => r.expo_push_token);
      if (tokens.length === 0) return 0;

      return await this.sendExpoPushBatch(tokens, payload);
    } catch (err: any) {
      logger.warn(`Aviso en PushDispatchService.broadcastEmergencyToResponders: ${err.message}`);
      return 0;
    }
  }

  /**
   * Despierta el teléfono de un oficial específico (o de todo el escuadrón si no se indica officerId).
   */
  static async notifyOfficerDispatch(
    officerId: string | undefined,
    payload: EmergencyPushPayload
  ): Promise<number> {
    try {
      const pool = getPgPool();
      const res = officerId
        ? await pool.query(
            `SELECT expo_push_token FROM public.user_push_tokens
             WHERE is_active = true AND (user_id::text = $1 OR role = 'police')`,
            [officerId]
          )
        : await pool.query(
            `SELECT expo_push_token FROM public.user_push_tokens
             WHERE is_active = true AND role IN ('police', 'operator')`
          );

      const tokens: string[] = res.rows.map((r) => r.expo_push_token);
      if (tokens.length === 0) return 0;

      return await this.sendExpoPushBatch(tokens, payload);
    } catch (err: any) {
      logger.warn(`Aviso en PushDispatchService.notifyOfficerDispatch: ${err.message}`);
      return 0;
    }
  }

  private static async sendExpoPushBatch(
    tokens: string[],
    payload: EmergencyPushPayload
  ): Promise<number> {
    const validExpoTokens = tokens.filter(
      (t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
    );
    if (validExpoTokens.length === 0) return 0;

    const messages = validExpoTokens.map((to) => ({
      to,
      sound: 'default',
      priority: 'high',
      channelId: 'rc-emergency-siren',
      title: payload.title,
      body: payload.body,
      data: {
        alertId: payload.alertId,
        ...payload.data,
      },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      logger.warn(`Expo Push gateway respondió HTTP ${response.status}`);
      return 0;
    }

    logger.info(
      `📲 Push de emergencia enviado a ${messages.length} terminal(es) activa(s) [Alerta: ${payload.alertId}]`
    );
    return messages.length;
  }
}
