import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly allowedOrigins: string[];
  private readonly trustedDomains: string[];

  constructor(private configService: ConfigService) {
    // Configurar dominios permitidos
    this.allowedOrigins = [
      'https://qualityblinds.netlify.app',
      'https://quality-blinds.netlify.app',
      'https://www.qualityblinds.netlify.app',
      // Agregar dominio personalizado cuando esté disponible
      'https://qualityblinds.com.au',
      'https://www.qualityblinds.com.au',
    ];

    // Para desarrollo local
    if (this.configService.get('NODE_ENV') === 'development') {
      this.allowedOrigins.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      );
    }

    this.trustedDomains = [
      'qualityblinds.netlify.app',
      'quality-blinds.netlify.app',
      'qualityblinds.com.au',
    ];

    this.logger.log(
      `🔒 Security initialized with ${this.allowedOrigins.length} allowed origins`,
    );
    this.logger.log(`✅ Allowed origins: ${this.allowedOrigins.join(', ')}`);
  }

  /**
   * Verificar si el origen está permitido
   */
  isOriginAllowed(origin: string): boolean {
    if (!origin) return false;

    const isAllowed = this.allowedOrigins.includes(origin);

    if (!isAllowed) {
      this.logger.warn(
        `🚫 Blocked request from unauthorized origin: ${origin}`,
      );
    }

    return isAllowed;
  }

  /**
   * Verificar si el dominio es confiable
   */
  isTrustedDomain(domain: string): boolean {
    return this.trustedDomains.some((trusted) => domain.includes(trusted));
  }

  /**
   * Validar headers de seguridad
   */
  validateSecurityHeaders(headers: Record<string, string>): boolean {
    const requiredHeaders = ['user-agent', 'accept'];

    for (const header of requiredHeaders) {
      if (!headers[header]) {
        this.logger.warn(`🚫 Missing required header: ${header}`);
        return false;
      }
    }

    // Detectar bots maliciosos
    const userAgent = headers['user-agent']?.toLowerCase() || '';
    const suspiciousBots = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'postman',
    ];

    // Permitir algunos bots legítimos
    const allowedBots = [
      'googlebot',
      'bingbot',
      'slackbot',
      'facebookexternalhit',
    ];

    const isSuspicious = suspiciousBots.some((bot) => userAgent.includes(bot));
    const isAllowedBot = allowedBots.some((bot) => userAgent.includes(bot));

    if (isSuspicious && !isAllowedBot) {
      this.logger.warn(`🤖 Suspicious bot detected: ${userAgent}`);
      return false;
    }

    return true;
  }

  /**
   * Generar token de sesión seguro
   */
  generateSecureToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `qb_${timestamp}_${random}`;
  }

  /**
   * Validar formato de email
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar formato de teléfono australiano
   */
  isValidAustralianPhone(phone: string): boolean {
    // Formatos válidos: +61, 04, 02, 03, 07, 08
    const phoneRegex = /^(\+61|0)[2-9]\d{8}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Sanitizar entrada de texto
   */
  sanitizeInput(input: string): string {
    if (!input) return '';

    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+\s*=/gi, '') // Remover event handlers
      .substring(0, 5000); // Limitar longitud
  }

  /**
   * Verificar si la IP está en lista negra
   */
  isBlacklistedIP(ip: string): boolean {
    // IPs conocidas maliciosas (ejemplo)
    const blacklistedIPs = [
      '0.0.0.0',
      '127.0.0.1', // Solo en producción
    ];

    // En desarrollo, permitir localhost
    if (this.configService.get('NODE_ENV') === 'development') {
      return false;
    }

    return blacklistedIPs.includes(ip);
  }

  /**
   * Log de evento de seguridad
   */
  logSecurityEvent(
    event: string,
    details: any,
    severity: 'low' | 'medium' | 'high' = 'medium',
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
    };

    switch (severity) {
      case 'high':
        this.logger.error(`🚨 SECURITY ALERT: ${event}`, logData);
        break;
      case 'medium':
        this.logger.warn(`⚠️ Security Warning: ${event}`, logData);
        break;
      case 'low':
        this.logger.log(`ℹ️ Security Info: ${event}`, logData);
        break;
    }
  }

  /**
   * Obtener configuración CORS
   */
  getCorsConfig() {
    return {
      origin: (
        origin: string,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        // Permitir requests sin origin (apps móviles, Postman en desarrollo)
        if (!origin && this.configService.get('NODE_ENV') === 'development') {
          return callback(null, true);
        }

        if (this.isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          this.logSecurityEvent('CORS_VIOLATION', { origin }, 'high');
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
      maxAge: 86400, // 24 horas
    };
  }

  /**
   * Obtener configuración de Helmet
   */
  getHelmetConfig() {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: [
            "'self'",
            'https://api.openai.com',
            'https://api.resend.com',
          ],
        },
      },
      crossOriginEmbedderPolicy: false, // Para compatibilidad
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    };
  }
}
