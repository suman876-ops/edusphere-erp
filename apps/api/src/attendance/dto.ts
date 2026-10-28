import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AttendanceMode, AttendanceStatus } from '@prisma/client';

export class CreateSessionDto {
  @IsUUID() courseId!: string;
  @IsUUID() sectionId!: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsEnum(AttendanceMode) mode?: AttendanceMode;
  @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() lng?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(25) radiusM?: number;
}

export class ScanDto {
  @IsString() token!: string;
  @IsOptional() @IsUUID() studentId?: string;
  @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() lng?: number;
  @IsOptional() @IsString() deviceId?: string;
}

export class ManualMarkDto {
  @IsUUID() studentId!: string;
  @IsEnum(AttendanceStatus) status!: AttendanceStatus;
}
