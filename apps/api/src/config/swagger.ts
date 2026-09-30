import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Red Ciudadana API',
      version: '1.0.0',
      description: `
# Red Ciudadana — API Documentation

Backend de la plataforma de seguridad ciudadana en tiempo real.

## Autenticación
Todos los endpoints protegidos requieren un JWT en el header \`Authorization: Bearer <token>\`.
Obtén el token haciendo \`POST /api/auth/login\`.

## Roles
- **citizen**: Acceso básico (app móvil)
- **operator**: Despacho de alertas en el Command Center
- **supervisor**: Supervisión de operadores + analytics
- **admin**: Control total incluyendo gestión de usuarios
      `,
      contact: {
        name: 'Equipo Red Ciudadana',
        email: 'dev@red-ciudadana.local',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de Desarrollo Local',
      },
      {
        url: 'https://api.red-ciudadana.com',
        description: 'Servidor de Producción',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-...' },
            fullName: { type: 'string', example: 'Juan Pérez' },
            cedula: { type: 'string', example: '1020304050' },
            email: { type: 'string', format: 'email', example: 'juan@example.com' },
            role: { type: 'string', enum: ['citizen', 'operator', 'supervisor', 'admin'] },
            phone: { type: 'string', example: '+573001234567', nullable: true },
            ciudad: { type: 'string', example: 'Bogotá', nullable: true },
            isVerified: { type: 'boolean', example: false },
            facialVerificationStatus: {
              type: 'string',
              enum: ['pending', 'verified', 'under_review', 'rejected'],
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['emergency', 'suspicious', 'medical', 'fire', 'robo', 'other'] },
            status: { type: 'string', enum: ['pending', 'reviewing', 'verified', 'resolved', 'discarded'] },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 4.6097 },
                longitude: { type: 'number', example: -74.0817 },
                address: { type: 'string', example: 'Calle 13 # 4-20, Bogotá' },
              },
            },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Camera: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Cámara Parque Central' },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                address: { type: 'string' },
              },
            },
            streamUrl: { type: 'string', format: 'uri' },
            status: { type: 'string', enum: ['active', 'inactive', 'maintenance'] },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error interno del servidor' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/modules/*/presentation/routes.ts',
    './src/modules/*/presentation/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
