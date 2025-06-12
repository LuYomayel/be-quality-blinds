import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SecurityService } from './common/security/security.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Obtener servicios de seguridad
  const securityService = app.get(SecurityService);
  const configService = app.get(ConfigService);

  // Configurar Helmet con configuración de seguridad
  app.use(helmet(securityService.getHelmetConfig()));

  // Global validation pipe con configuración estricta
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
      validateCustomDecorators: true,
    }),
  );

  // Configurar CORS con SecurityService
  app.enableCors(securityService.getCorsConfig());

  // Configurar límites de request
  app.use((req: any, res: any, next: any) => {
    // Límite de tamaño de JSON
    if (req.headers['content-type']?.includes('application/json')) {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > 1024 * 1024) {
        // 1MB para JSON
        return res.status(413).json({ error: 'Request too large' });
      }
    }
    next();
  });

  const port = configService.get('PORT') || 3001;
  const nodeEnv = configService.get('NODE_ENV') || 'development';

  logger.log(`🚀 Quality Blinds Backend starting...`);
  logger.log(`🔧 Environment: ${nodeEnv}`);
  logger.log(`🌐 Port: ${port}`);
  logger.log(`🔒 Security: ENABLED`);
  logger.log(`🛡️ CORS: Configured with SecurityService`);
  logger.log(`⚡ Rate Limiting: ACTIVE`);

  await app.listen(port);

  logger.log(`✅ Quality Blinds Backend is running on port ${port}`);
  logger.log(`📱 Frontend URL: https://qualityblinds.netlify.app`);
  logger.log(`🔐 Security measures: ACTIVE`);
}
bootstrap();
