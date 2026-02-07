import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MuralService } from './mural.service';
import { Wallet } from './entities/wallet.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Wallet])],
  providers: [MuralService],
  exports: [MuralService, TypeOrmModule],
})
export class MuralModule {}
