import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityMiddleware } from './security.middleware';

@Module({
  providers: [SecurityService, SecurityMiddleware],
  exports: [SecurityService, SecurityMiddleware],
})
export class SecurityModule {}
