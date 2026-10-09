import { Router, Request, Response } from 'express';
import { getPgPool } from '../../../infrastructure/database/connection';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: KPI
 *   description: Métricas operacionales y reportes del sistema
 */

/**
 * @swagger
 * /api/kpi/summary:
 *   get:
 *     summary: Resumen de KPIs operacionales del sistema
 *     tags: [KPI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas de emergencias, cámaras, operadores y equipos
 */
router.get('/summary', requireAuth, requireRole(['admin', 'supervisor']), async (_req: Request, res: Response) => {
  try {
    const pool = getPgPool();

    const [
      alertsRes,
      camerasRes,
      operatorsRes,
      teamsRes,
      usersRes,
      responseTimeRes,
      alertsByTypeRes,
      alertsByDayRes,
    ] = await Promise.all([
      // Alerts summary
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'reviewing') AS reviewing,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS today,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS this_week
        FROM public.alerts
      `).catch(() => ({ rows: [{ total: 0, pending: 0, reviewing: 0, resolved: 0, today: 0, this_week: 0 }] })),

      // Cameras summary
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'online') AS online,
          COUNT(*) FILTER (WHERE status = 'offline') AS offline
        FROM public.cameras
      `).catch(() => ({ rows: [{ total: 0, online: 0, offline: 0 }] })),

      // Operators summary
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'en_servicio') AS en_servicio,
          COUNT(*) FILTER (WHERE status = 'disponible') AS disponible,
          COUNT(*) FILTER (WHERE status = 'inactivo') AS inactivo
        FROM public.operators
      `).catch(() => ({ rows: [{ total: 0, en_servicio: 0, disponible: 0, inactivo: 0 }] })),

      // Teams summary
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'patrullando') AS patrullando,
          COUNT(*) FILTER (WHERE status = 'disponible') AS disponible,
          COUNT(*) FILTER (WHERE status = 'en_incidente') AS en_incidente,
          (SELECT COUNT(*) FROM public.team_members) AS total_members
        FROM public.teams
      `).catch(() => ({ rows: [{ total: 0, patrullando: 0, disponible: 0, en_incidente: 0, total_members: 0 }] })),

      // Users/Citizens summary
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE role = 'citizen') AS citizens,
          COUNT(*) FILTER (WHERE role = 'operator') AS operators,
          COUNT(*) FILTER (WHERE is_verified = true) AS verified,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS new_today
        FROM public.users
      `).catch(() => ({ rows: [{ total: 0, citizens: 0, operators: 0, verified: 0, new_today: 0 }] })),

      // Average response time (time from pending to reviewing in minutes)
      pool.query(`
        SELECT
          ROUND(AVG(EXTRACT(EPOCH FROM (ae2.created_at - ae1.created_at)) / 60)::numeric, 1) AS avg_response_minutes
        FROM public.alert_events ae1
        JOIN public.alert_events ae2 ON ae1.alert_id = ae2.alert_id
        WHERE ae1.event_type = 'created'
          AND ae2.event_type = 'status_change'
          AND ae2.new_status = 'reviewing'
          AND ae1.created_at >= NOW() - INTERVAL '30 days'
      `).catch(() => ({ rows: [{ avg_response_minutes: null }] })),

      // Alerts by type (last 30 days)
      pool.query(`
        SELECT type, COUNT(*) AS count
        FROM public.alerts
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY type
        ORDER BY count DESC
      `).catch(() => ({ rows: [] })),

      // Alerts per day (last 7 days)
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
          COUNT(*) AS count
        FROM public.alerts
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day ASC
      `).catch(() => ({ rows: [] })),
    ]);

    const alerts = alertsRes.rows[0];
    const cameras = camerasRes.rows[0];
    const operators = operatorsRes.rows[0];
    const teams = teamsRes.rows[0];
    const users = usersRes.rows[0];
    const avgResponse = responseTimeRes.rows[0];

    const resolutionRate = alerts.total > 0
      ? Math.round((parseInt(alerts.resolved) / parseInt(alerts.total)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        alerts: {
          total: parseInt(alerts.total),
          pending: parseInt(alerts.pending),
          reviewing: parseInt(alerts.reviewing),
          resolved: parseInt(alerts.resolved),
          today: parseInt(alerts.today),
          thisWeek: parseInt(alerts.this_week),
          resolutionRate,
        },
        cameras: {
          total: parseInt(cameras.total),
          online: parseInt(cameras.online),
          offline: parseInt(cameras.offline),
          uptimePercent: cameras.total > 0
            ? Math.round((parseInt(cameras.online) / parseInt(cameras.total)) * 100)
            : 0,
        },
        operators: {
          total: parseInt(operators.total),
          enServicio: parseInt(operators.en_servicio),
          disponible: parseInt(operators.disponible),
          inactivo: parseInt(operators.inactivo),
        },
        teams: {
          total: parseInt(teams.total),
          patrullando: parseInt(teams.patrullando),
          disponible: parseInt(teams.disponible),
          enIncidente: parseInt(teams.en_incidente),
          totalMembers: parseInt(teams.total_members),
        },
        users: {
          total: parseInt(users.total),
          citizens: parseInt(users.citizens),
          operators: parseInt(users.operators),
          verified: parseInt(users.verified),
          newToday: parseInt(users.new_today),
        },
        performance: {
          avgResponseMinutes: avgResponse.avg_response_minutes
            ? parseFloat(avgResponse.avg_response_minutes)
            : null,
        },
        charts: {
          alertsByType: alertsByTypeRes.rows.map((r: any) => ({
            type: r.type,
            count: parseInt(r.count),
          })),
          alertsByDay: alertsByDayRes.rows.map((r: any) => ({
            day: r.day,
            count: parseInt(r.count),
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Error generando KPI summary:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/kpi/alerts-timeline:
 *   get:
 *     summary: Timeline de alertas (últimas N horas o días)
 *     tags: [KPI]
 */
router.get('/alerts-timeline', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const pool = getPgPool();
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);

    const res2 = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('hour', created_at), 'YYYY-MM-DD"T"HH24:MI:SS') AS hour,
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE type = 'emergency') AS emergency,
        COUNT(*) FILTER (WHERE type = 'suspicious') AS suspicious,
        COUNT(*) FILTER (WHERE type = 'medical') AS medical,
        COUNT(*) FILTER (WHERE type = 'fire') AS fire
      FROM public.alerts
      WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour ASC
    `, [days]);

    res.json({
      success: true,
      data: res2.rows.map((r: any) => ({
        hour: r.hour,
        count: parseInt(r.count),
        emergency: parseInt(r.emergency),
        suspicious: parseInt(r.suspicious),
        medical: parseInt(r.medical),
        fire: parseInt(r.fire),
      })),
    });
  } catch (error: any) {
    console.error('Error obteniendo timeline de alertas:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export { router as kpiRouter };
