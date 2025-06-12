import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { ContactModule } from './contact/contact.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SamplesModule } from './samples/samples.module';
import { QuotesModule } from './quotes/quotes.module';
import { SecurityModule } from './common/security/security.module';
import { SecurityMiddleware } from './common/security/security.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SecurityModule,
    ChatModule,
    ContactModule,
    ReviewsModule,
    SamplesModule,
    QuotesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar middleware de seguridad a todas las rutas
    consumer.apply(SecurityMiddleware).forRoutes('*');
  }
}
