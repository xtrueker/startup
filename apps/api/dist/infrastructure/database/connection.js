"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnection = exports.DatabaseConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Esta clase maneja la conexión a MongoDB
// Usa el patrón Singleton: solo existe UNA conexión en toda la app
class DatabaseConnection {
    // Constructor privado: nadie puede crear instancias directamente
    constructor() {
        this.isConnected = false;
    }
    // Método para obtener la única instancia
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    // Conectar a la base de datos
    async connect(uri) {
        // Si ya estamos conectados, no hacer nada
        if (this.isConnected) {
            console.log('Ya conectado a MongoDB');
            return;
        }
        try {
            // Opciones de conexión
            const options = {
                maxPoolSize: 10, // Máximo 10 conexiones simultáneas
                serverSelectionTimeoutMS: 5000, // Esperar 5 segundos máximo
            };
            // Intentar conectar
            await mongoose_1.default.connect(uri, options);
            this.isConnected = true;
            console.log('✅ Conectado a MongoDB');
            // Escuchar errores después de conectar
            mongoose_1.default.connection.on('error', (err) => {
                console.error('Error en MongoDB:', err);
            });
        }
        catch (error) {
            console.error('❌ Error conectando a MongoDB:', error);
            throw error; // Lanzar error para que lo maneje quien llamó
        }
    }
    // Desconectar (útil para tests)
    async disconnect() {
        if (!this.isConnected)
            return;
        await mongoose_1.default.disconnect();
        this.isConnected = false;
        console.log('Desconectado de MongoDB');
    }
}
exports.DatabaseConnection = DatabaseConnection;
// Exportar instancia única para usar en toda la app
exports.dbConnection = DatabaseConnection.getInstance();
//# sourceMappingURL=connection.js.map