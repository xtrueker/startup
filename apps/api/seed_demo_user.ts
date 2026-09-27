import { dbConnection } from './src/infrastructure/database/connection';
import { User } from './src/infrastructure/database/models/User';
import bcrypt from 'bcryptjs';
import { supabase } from './src/infrastructure/database/connection';

async function main() {
  await dbConnection.connect();
  const email = 'demo@redciudadana.org';
  const existing = await User.findByEmail(email);

  if (existing) {
    console.log('El usuario demo ya existe. Actualizando contraseña a: password123');
    const hash = await bcrypt.hash('password123', 10);
    const { error } = await supabase().from('users').update({ password: hash }).eq('id', existing.id);
    if (error) console.error('Error actualizando:', error);
    else console.log('✅ Contraseña actualizada correctamente para:', email);
  } else {
    const user = await User.create({
      fullName: 'Ciudadano Demo',
      cedula: '1000000001',
      email: email,
      password: 'password123',
      role: 'citizen',
      isVerified: true
    });
    console.log('✅ Usuario demo creado exitosamente:', user);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
