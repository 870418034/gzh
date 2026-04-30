import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthController } from './health/health.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AiConnectionsModule } from './ai-connections/ai-connections.module';
import { PrismaModule } from './prisma/prisma.module';
import { RouterModule } from './router/router.module';
import { PersonasModule } from './personas/personas.module';
import { TasksModule } from './tasks/tasks.module';
import { CopywritingModule } from './copywriting/copywriting.module';
import { StoryboardModule } from './storyboard/storyboard.module';
import { DigitalHumanModule } from './digital-human/digital-human.module';
import { IndustryPopularModule } from './industry-popular/industry-popular.module';
import { MvpUserMiddleware } from './common/mvp-user.middleware';
import { LicenseModule } from './license/license.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LicenseModule,
    AuthModule,
    AiConnectionsModule,
    RouterModule,
    PersonasModule,
    TasksModule,
    CopywritingModule,
    StoryboardModule,
    DigitalHumanModule,
    IndustryPopularModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, MvpUserMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MvpUserMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'auth/register', method: RequestMethod.ALL },
        { path: 'auth/login', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
