import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityService } from './security.service';
import { rateLimit } from 'express-rate-limit';

// Extender Request para incluir propiedades personalizadas
interface SecurityRequest extends Request {
  securityToken?: string;
  clientIP?: string;
  isSecure?: boolean;
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly rateLimiter;

  constructor(private securityService: SecurityService) {
    // Configurar rate limiting
    this.rateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por ventana por IP
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 900, // 15 minutos en segundos
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Rate limiting más estricto para endpoints sensibles
      skip: (req: Request) => {
        // Aplicar rate limiting más estricto a endpoints de formularios
        if (
          req.path.includes('/contact') ||
          req.path.includes('/samples') ||
          req.path.includes('/chat')
        ) {
          return false; // No skip, aplicar rate limiting
        }
        return false;
      },
      keyGenerator: (req: Request) => {
        // Usar IP + User-Agent para generar clave única
        const ip = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';
        return `${ip}-${userAgent.substring(0, 50)}`;
      },
      handler: (req: Request, res: Response) => {
        const ip = this.getClientIP(req);
        this.securityService.logSecurityEvent(
          'RATE_LIMIT_EXCEEDED',
          {
            ip,
            path: req.path,
            userAgent: req.get('User-Agent'),
            method: req.method,
          },
          'high',
        );
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 900,
        });
      },
    });
  }

  use(req: SecurityRequest, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = this.securityService.generateSecureToken();

    // Agregar ID de request para tracking
    req.securityToken = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Obtener IP del cliente
    req.clientIP = this.getClientIP(req);

    // Log de request entrante
    this.logger.log(
      `🔍 [${requestId}] ${req.method} ${req.path} from ${req.clientIP}`,
    );

    // Verificar IP en lista negra
    if (this.securityService.isBlacklistedIP(req.clientIP)) {
      this.securityService.logSecurityEvent(
        'BLACKLISTED_IP_ACCESS',
        { ip: req.clientIP, path: req.path },
        'high',
      );
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    // Validar headers de seguridad
    if (
      !this.securityService.validateSecurityHeaders(
        req.headers as Record<string, string>,
      )
    ) {
      this.securityService.logSecurityEvent(
        'INVALID_SECURITY_HEADERS',
        {
          ip: req.clientIP,
          path: req.path,
          headers: this.sanitizeHeaders(req.headers),
        },
        'medium',
      );
      throw new HttpException(
        'Invalid request headers',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Aplicar rate limiting
    this.rateLimiter(req, res, (err?: any) => {
      if (err) {
        this.logger.warn(
          `🚫 [${requestId}] Rate limit exceeded for ${req.clientIP}`,
        );
        throw new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Validar tamaño del body para prevenir ataques de payload grande
      this.validateRequestSize(req);

      // Sanitizar query parameters
      this.sanitizeQueryParams(req);

      // Marcar request como seguro
      req.isSecure = true;

      // Continuar con el siguiente middleware
      next();

      // Log de respuesta (después de que se complete el request)
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const statusEmoji =
          statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';

        this.logger.log(
          `${statusEmoji} [${requestId}] ${req.method} ${req.path} - ${statusCode} (${duration}ms)`,
        );

        // Log eventos de seguridad para respuestas de error
        if (statusCode >= 400) {
          this.securityService.logSecurityEvent(
            'ERROR_RESPONSE',
            {
              ip: req.clientIP,
              path: req.path,
              method: req.method,
              statusCode,
              duration,
            },
            statusCode >= 500 ? 'high' : 'medium',
          );
        }
      });
    });
  }

  private getClientIP(req: Request): string {
    // Obtener IP real del cliente considerando proxies
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  private validateRequestSize(req: Request): void {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    const maxSize = 10 * 1024 * 1024; // 10MB máximo

    if (contentLength > maxSize) {
      this.securityService.logSecurityEvent(
        'OVERSIZED_REQUEST',
        {
          ip: this.getClientIP(req),
          size: contentLength,
          maxSize,
          path: req.path,
        },
        'high',
      );
      throw new HttpException(
        'Request too large',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  private sanitizeQueryParams(req: Request): void {
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = this.securityService.sanitizeInput(value);
        }
      }
    }
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    // Remover headers sensibles del log
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }
}

// Rate limiter específico para endpoints críticos
export const createStrictRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 requests por ventana para endpoints críticos
    message: {
      error: 'Too many requests to sensitive endpoint',
      message: 'Rate limit exceeded for this endpoint. Please try again later.',
      retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiter para chat (más permisivo pero controlado)
export const createChatRateLimiter = () => {
  return rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20, // máximo 20 mensajes de chat por 5 minutos
    message: {
      error: 'Too many chat messages',
      message: 'Please wait before sending more messages.',
      retryAfter: 300,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
