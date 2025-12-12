import { Module, forwardRef } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [forwardRef(() => PlansModule), UsersModule, ProfileModule],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
