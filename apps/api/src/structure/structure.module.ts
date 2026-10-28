import { Module } from '@nestjs/common';
import { StructureController } from './structure.controller';

@Module({ controllers: [StructureController] })
export class StructureModule {}
