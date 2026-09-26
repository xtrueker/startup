"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cameraScanner = exports.CameraScanner = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const net = __importStar(require("net"));
const logger_1 = require("../../shared/utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// MAC address de tu cámara
const CAMERA_MAC = 'BC:2B:02:A5:40:CF';
// Rango de IPs a escanear
const TARGET_IP = '10.239.254.223'; // IP de la cámara remota para pruebas
class CameraScanner {
    constructor() {
        this.currentIP = null;
        this.lastScan = null;
    }
    /**
     * Escanea la red buscando la cámara por MAC
     */
    async scanForCamera() {
        logger_1.logger.info('🔍 Escaneando red en busca de cámara...');
        try {
            // Método 1: Usar ARP para encontrar la MAC
            const ip = await this.scanWithARP();
            if (ip) {
                this.currentIP = ip;
                this.lastScan = new Date();
                logger_1.logger.info(`✅ Cámara encontrada en: ${ip}`);
                return ip;
            }
            // Método 2: Escanear puerto RTSP comunes
            const ipRTSP = await this.scanRTSPPorts();
            if (ipRTSP) {
                this.currentIP = ipRTSP;
                this.lastScan = new Date();
                logger_1.logger.info(`✅ Cámara RTSP encontrada en: ${ipRTSP}`);
                return ipRTSP;
            }
            logger_1.logger.warn('❌ Cámara no encontrada en la red');
            return null;
        }
        catch (error) {
            logger_1.logger.error(error, 'Error escaneando red:');
            return this.currentIP; // Retornar última IP conocida
        }
    }
    /**
     * Escanea usando tabla ARP (más rápido)
     */
    async scanWithARP() {
        try {
            // Ejecutar ARP -a en Windows
            const { stdout } = await execAsync('arp -a');
            const lines = stdout.split('\n');
            for (const line of lines) {
                // Buscar línea que contenga la MAC de la cámara
                if (line.toLowerCase().includes(CAMERA_MAC.toLowerCase())) {
                    // Extraer IP (formato: 192.168.1.xxx)
                    const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
                    if (ipMatch) {
                        return ipMatch[1];
                    }
                }
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error(error, 'Error en ARP scan:');
            return null;
        }
    }
    /**
     * Intenta conectarse a la IP y puerto remoto para la prueba
     */
    async scanRTSPPorts() {
        const remotePort = 8080;
        const ip = TARGET_IP;
        const result = await this.checkRTSPPort(ip, [remotePort]);
        return result;
    }
    /**
     * Verifica si un IP tiene puerto RTSP abierto
     */
    async checkRTSPPort(ip, ports) {
        for (const port of ports) {
            const isPortOpen = await new Promise((resolve) => {
                const socket = new net.Socket();
                socket.setTimeout(2000);
                socket.on('connect', () => {
                    socket.destroy();
                    resolve(true);
                });
                socket.on('timeout', () => {
                    socket.destroy();
                    resolve(false);
                });
                socket.on('error', () => {
                    socket.destroy();
                    resolve(false);
                });
                socket.connect(port, ip);
            });
            if (isPortOpen) {
                // Verificar que sea realmente RTSP haciendo un ping de aplicación
                const isRTSP = await this.verifyRTSPService(ip, port);
                if (isRTSP) {
                    return `${ip}:${port}`;
                }
            }
        }
        return null;
    }
    /**
     * Verifica si el servicio es realmente RTSP
     */
    async verifyRTSPService(ip, port) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            let dataBuffer = '';
            socket.on('connect', () => {
                // En una IP HTTP regular probamos pedir la raíz a ver si responde
                socket.write(`GET / HTTP/1.1\r\nHost: ${ip}:${port}\r\n\r\n`);
            });
            socket.on('data', (data) => {
                dataBuffer += data.toString();
                // Aceptamos cualquier respuesta HTTP positiva (200 OK, 401 Unauthorized, RTSP, etc) para saber que está vivo
                if (dataBuffer.includes('RTSP/1.0') || dataBuffer.includes('200 OK') || dataBuffer.includes('401') || dataBuffer.includes('403') || dataBuffer.includes('HTTP/')) {
                    socket.destroy();
                    resolve(true);
                }
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('close', () => {
                if (!dataBuffer.includes('RTSP/1.0') && !dataBuffer.includes('HTTP/')) {
                    resolve(false);
                }
            });
            socket.connect(port, ip);
        });
    }
    /**
     * Obtiene la IP actual de la cámara (de caché o escaneando)
     */
    async getCameraIP() {
        // Si tenemos IP y el scan fue hace menos de 5 minutos, usar caché
        if (this.currentIP && this.lastScan) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (this.lastScan > fiveMinutesAgo) {
                return this.currentIP;
            }
        }
        // Escanear de nuevo
        return this.scanForCamera();
    }
    /**
     * Fuerza un nuevo escaneo
     */
    async forceRescan() {
        this.currentIP = null;
        return this.scanForCamera();
    }
}
exports.CameraScanner = CameraScanner;
// Exportar instancia única
exports.cameraScanner = new CameraScanner();
//# sourceMappingURL=CameraScanner.js.map