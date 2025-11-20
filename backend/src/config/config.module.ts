import { Global, Module } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

@Global()
@Module({
  providers: [],
  exports: [],
})
export class ConfigModule {}
