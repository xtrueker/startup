import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import { logger } from '../../shared/utils/logger';

const execAsync = promisify(exec);

// MAC address de tu cámara
const CAMERA_MAC = 'BC:2B:02:A5:40:CF';
// Rango de IPs a escanear
const TARGET_IP = '10.239.254.223'; // IP de la cámara remota para pruebas

export class CameraScanner {
  private currentIP: string | null = null;
  private lastScan: Date | null = null;

  /**
   * Escanea la red buscando la cámara por MAC
   */
  async scanForCamera(): Promise<string | null> {
    logger.info('🔍 Escaneando red en busca de cámara...');
    
    try {
      // Método 1: Usar ARP para encontrar la MAC
      const ip = await this.scanWithARP();
      if (ip) {
        this.currentIP = ip;
        this.lastScan = new Date();
        logger.info(`✅ Cámara encontrada en: ${ip}`);
        return ip;
      }

      // Método 2: Escanear puerto RTSP comunes
      const ipRTSP = await this.scanRTSPPorts();
      if (ipRTSP) {
        this.currentIP = ipRTSP;
        this.lastScan = new Date();
        logger.info(`✅ Cámara RTSP encontrada en: ${ipRTSP}`);
        return ipRTSP;
      }

      logger.warn('❌ Cámara no encontrada en la red');
      return null;

    } catch (error) {
      logger.error('Error escaneando red:', error);
      return this.currentIP; // Retornar última IP conocida
    }
  }

  /**
   * Escanea usando tabla ARP (más rápido)
   */
  private async scanWithARP(): Promise<string | null> {
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
    } catch (error) {
      logger.error('Error en ARP scan:', error);
      return null;
    }
  }

  /**
   * Intenta conectarse a la IP y puerto remoto para la prueba
   */
  private async scanRTSPPorts(): Promise<string | null> {
    const remotePort = 8080;
    const ip = TARGET_IP;

    const result = await this.checkRTSPPort(ip, [remotePort]);
    return result;
  }

  /**
   * Verifica si un IP tiene puerto RTSP abierto
   */
  private async checkRTSPPort(ip: string, ports: number[]): Promise<string | null> {
    for (const port of ports) {
      const isPortOpen = await new Promise<boolean>((resolve) => {
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
  private async verifyRTSPService(ip: string, port: number): Promise<boolean> {
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
   * Ejecuta promesas en lotes para no saturar la red
   */
  private async runInBatches<T>(
    promises: Promise<T>[],
    batchSize: number
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Obtiene la IP actual de la cámara (de caché o escaneando)
   */
  async getCameraIP(): Promise<string | null> {
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
  async forceRescan(): Promise<string | null> {
    this.currentIP = null;
    return this.scanForCamera();
  }
}

// Exportar instancia única
export const cameraScanner = new CameraScanner();