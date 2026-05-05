import { Module } from '@nestjs/common';
import { NaqlClient } from './naql.client';
import { NaqlController } from './naql.controller';

@Module({
  controllers: [NaqlController],
  providers: [NaqlClient],
  exports: [NaqlClient],
})
export class NaqlModule {}
