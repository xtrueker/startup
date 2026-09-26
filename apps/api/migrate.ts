import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import { env } from './src/config/env';

// Traductor de ObjectId a UUID
function objectIdToUuid(objectId: any): string {
  if (!objectId) return '00000000-0000-0000-0000-000000000000';
  const hex = objectId.toString();
  if (hex.length !== 24) {
    if (hex.length === 36 && hex.includes('-')) return hex;
    return '00000000-0000-0000-0000-000000000000';
  }
  const part1 = '00000000';
  const part2 = hex.substring(0, 4);
  const part3 = hex.substring(4, 8);
  const part4 = hex.substring(8, 12);
  const part5 = hex.substring(12, 24);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

async function ensureUserExists(supabaseClient: any, uuid: string) {
  const { data } = await supabaseClient.from('users').select('id').eq('id', uuid).maybeSingle();
  if (!data) {
    console.log(`⚠️ Generando usuario ficticio para mantener integridad referencial: UUID ${uuid}`);
    const { error } = await supabaseClient.from('users').insert({
      id: uuid,
      full_name: 'Usuario Ficticio (Migración)',
      cedula: '999' + Math.random().toString().substring(2, 7), // cédula única ficticia
      email: `migrado_${uuid.substring(9, 13)}@redciudadana.org`,
      password: '$2a$10$UnH5v.d5B2a39gLd7p.WaeC6hYF8aZ1h0u1a9c3b8t8.z5v3c4b5e',
      role: 'citizen'
    });
    if (error) {
      console.error(`❌ Error creando usuario ficticio:`, error.message);
    }
  }
}

async function migrate() {
  console.log('🔄 Iniciando migración de datos de MongoDB a Supabase...');
  
  // 1. Conectar a MongoDB
  console.log('🔌 Conectando a MongoDB local...');
  const mongo = await mongoose.connect('mongodb://127.0.0.1:27017/red-ciudadana');
  const db = mongo.connection.db;
  if (!db) {
    throw new Error('No se pudo conectar a la base de datos de MongoDB');
  }
  
  // 2. Conectar a Supabase
  console.log('🔌 Conectando a Supabase...');
  const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

  // 3. Migrar Usuarios
  console.log('👥 Migrando usuarios...');
  const mongoUsers = await db.collection('users').find({}).toArray();
  console.log(`Encontrados ${mongoUsers.length} usuarios en MongoDB.`);
  for (const user of mongoUsers) {
    const uuid = objectIdToUuid(user._id);
    const { error } = await supabaseClient.from('users').upsert({
      id: uuid,
      full_name: user.fullName || user.full_name || 'Usuario Migrado',
      cedula: user.cedula || '000000',
      email: (user.email || '').toLowerCase(),
      password: user.password || '$2a$10$UnH5v.d5B2a39gLd7p.WaeC6hYF8aZ1h0u1a9c3b8t8.z5v3c4b5e', // default hash
      role: user.role || 'citizen',
      is_verified: user.isVerified || user.is_verified || false,
      facial_verification_status: user.facialVerificationStatus || user.facial_verification_status || 'pending',
      created_at: user.createdAt || user.created_at || new Date(),
      updated_at: user.updatedAt || user.updated_at || new Date()
    });
    if (error) {
      console.error(`❌ Error migrando usuario ${user.email}:`, error.message);
    } else {
      console.log(`✅ Usuario migrado: ${user.email} -> UUID: ${uuid}`);
    }
  }

  // 4. Migrar Cámaras
  console.log('🎥 Migrando cámaras...');
  const mongoCameras = await db.collection('cameras').find({}).toArray();
  console.log(`Encontradas ${mongoCameras.length} cámaras en MongoDB.`);
  for (const camera of mongoCameras) {
    const uuid = objectIdToUuid(camera._id);
    const authUuid = camera.authorityId ? objectIdToUuid(camera.authorityId) : null;
    
    if (authUuid) {
      await ensureUserExists(supabaseClient, authUuid);
    }
    
    // Obtener coordenadas
    let lat = 0;
    let lng = 0;
    let address = '';
    if (camera.location) {
      lng = camera.location.coordinates[0];
      lat = camera.location.coordinates[1];
      address = camera.location.address || '';
    }

    const { error } = await supabaseClient.from('cameras').upsert({
      id: uuid,
      name: camera.name || 'Cámara Migrada',
      latitude: lat,
      longitude: lng,
      address: address,
      stream_url: camera.streamUrl || camera.stream_url || '',
      status: camera.status || 'offline',
      coverage_radius: camera.coverageRadius || camera.coverage_radius || 100,
      is_public: camera.isPublic ?? camera.is_public ?? false,
      authority_id: authUuid,
      created_at: camera.createdAt || camera.created_at || new Date(),
      updated_at: camera.updatedAt || camera.updated_at || new Date()
    });
    if (error) {
      console.error(`❌ Error migrando cámara ${camera.name}:`, error.message);
    } else {
      console.log(`✅ Cámara migrada: ${camera.name} -> UUID: ${uuid}`);
    }
  }

  // 5. Migrar Alertas
  console.log('🚨 Migrando alertas...');
  const mongoAlerts = await db.collection('alerts').find({}).toArray();
  console.log(`Encontradas ${mongoAlerts.length} alertas en MongoDB.`);
  for (const alert of mongoAlerts) {
    const uuid = objectIdToUuid(alert._id);
    const userUuid = alert.userId ? objectIdToUuid(alert.userId) : null;
    
    if (userUuid) {
      await ensureUserExists(supabaseClient, userUuid);
    }
    
    let lat = 0;
    let lng = 0;
    let address = '';
    if (alert.location) {
      lng = alert.location.coordinates[0];
      lat = alert.location.coordinates[1];
      address = alert.location.address || '';
    }

    const { error } = await supabaseClient.from('alerts').upsert({
      id: uuid,
      user_id: userUuid,
      type: alert.type || 'emergency',
      status: alert.status || 'active',
      latitude: lat,
      longitude: lng,
      address: address,
      description: alert.description || '',
      direction: alert.direction || null,
      escape_routes: alert.escapeRoutes || alert.escape_routes || null,
      created_at: alert.createdAt || alert.created_at || new Date(),
      updated_at: alert.updatedAt || alert.updated_at || new Date()
    });
    if (error) {
      console.error(`❌ Error migrando alerta ${alert._id}:`, error.message);
    } else {
      console.log(`✅ Alerta migrada: ${alert._id} -> UUID: ${uuid}`);
    }
  }

  // 6. Migrar Incidentes Históricos
  console.log('📜 Migrando incidentes históricos...');
  const collections = await db.listCollections().toArray();
  const histColName = collections.find(c => c.name.toLowerCase().includes('historical'))?.name || 'historicalincidents';
  
  const mongoIncidents = await db.collection(histColName).find({}).toArray();
  console.log(`Encontrados ${mongoIncidents.length} incidentes históricos en colección "${histColName}".`);
  for (const inc of mongoIncidents) {
    const uuid = objectIdToUuid(inc._id);
    
    let lat = 0;
    let lng = 0;
    if (inc.location) {
      lng = inc.location.coordinates[0];
      lat = inc.location.coordinates[1];
    }

    const { error } = await supabaseClient.from('historical_incidents').upsert({
      id: uuid,
      original_alert_id: inc.originalAlertId ? objectIdToUuid(inc.originalAlertId) : '00000000-0000-0000-0000-000000000000',
      type: inc.type || 'emergency',
      latitude: lat,
      longitude: lng,
      reported_at: inc.reportedAt || inc.reported_at || new Date(),
      resolved_at: inc.resolvedAt || inc.resolved_at || new Date(),
      created_at: inc.createdAt || inc.created_at || new Date(),
      updated_at: inc.updatedAt || inc.updated_at || new Date()
    });
    if (error) {
      console.error(`❌ Error migrando incidente histórico ${inc._id}:`, error.message);
    } else {
      console.log(`✅ Incidente histórico migrado: ${inc._id} -> UUID: ${uuid}`);
    }
  }

  console.log('🎉 Migración completada con éxito.');
  await mongo.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error fatal en migración:', err);
  process.exit(1);
});
