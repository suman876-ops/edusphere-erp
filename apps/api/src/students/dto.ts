import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { StudentStatus } from '@prisma/client';

export class ListStudentsQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsUUID() programId?: string;
  @IsOptional() @IsUUID() sectionId?: string;
  @IsOptional() @IsEnum(StudentStatus) status?: StudentStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}

export class CreateStudentDto {
  @IsString() @MinLength(2) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsString() @MinLength(3) enrollmentNo!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsUUID() programId!: string;
  @IsUUID() sectionId!: string;
  @Type(() => Number) @IsInt() admissionYear!: number;
  @IsOptional() @IsString() guardianName?: string;
  @IsOptional() @IsString() guardianPhone?: string;
}

export class UpdateStudentDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(StudentStatus) status?: StudentStatus;
  @IsOptional() @IsString() guardianName?: string;
  @IsOptional() @IsString() guardianPhone?: string;
}
