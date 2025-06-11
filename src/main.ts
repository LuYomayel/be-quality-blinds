import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [
      frontendUrl,
      'https://www.qualityblinds.com.au',
      'http://localhost:3000',
      frontendUrl, // Add it again to ensure it's included
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  console.log(`Backend running on port ${port}`);
  console.log(
    `CORS enabled for origins: ${frontendUrl}, https://www.qualityblinds.com.au, http://localhost:3000, ${frontendUrl}`,
  );
  await app.listen(port);
}
bootstrap();
