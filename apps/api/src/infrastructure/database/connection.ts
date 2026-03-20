import mongoose from 'mongoose';

// Esta clase maneja la conexión a MongoDB
// Usa el patrón Singleton: solo existe UNA conexión en toda la app
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  // Constructor privado: nadie puede crear instancias directamente
  private constructor() {}

  // Método para obtener la única instancia
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  // Conectar a la base de datos
  public async connect(uri: string): Promise<void> {
    // Si ya estamos conectados, no hacer nada
    if (this.isConnected) {
      console.log('Ya conectado a MongoDB');
      return;
    }

    try {
      // Opciones de conexión
      const options = {
        maxPoolSize: 10,        // Máximo 10 conexiones simultáneas
        serverSelectionTimeoutMS: 5000, // Esperar 5 segundos máximo
      };

      // Intentar conectar
      await mongoose.connect(uri, options);
      
      this.isConnected = true;
      console.log('✅ Conectado a MongoDB');

      // Escuchar errores después de conectar
      mongoose.connection.on('error', (err) => {
        console.error('Error en MongoDB:', err);
      });

    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error; // Lanzar error para que lo maneje quien llamó
    }
  }

  // Desconectar (útil para tests)
  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    
    await mongoose.disconnect();
    this.isConnected = false;
    console.log('Desconectado de MongoDB');
  }
}

// Exportar instancia única para usar en toda la app
export const dbConnection = DatabaseConnection.getInstance();