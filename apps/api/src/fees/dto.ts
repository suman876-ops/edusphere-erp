import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { InvoiceStatus, PaymentMode } from '@prisma/client';

export class ListInvoicesQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @IsOptional() @IsString() term?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}

export class CreateInvoiceDto {
  @IsUUID() studentId!: string;
  @IsString() term!: string;
  @IsOptional() @IsIn(['Tuition', 'Hostel', 'Transport', 'Library', 'Exam']) head?: string;
  @IsDateString() dueDate!: string;
  /** Amount in paise, e.g. 4500000 = INR 45,000. */
  @Type(() => Number) @IsInt() @Min(100) amount!: number;
}

export class CreatePaymentDto {
  /** Amount in paise. */
  @Type(() => Number) @IsInt() @Min(100) amount!: number;
  @IsEnum(PaymentMode) mode!: PaymentMode;
  @IsOptional() @IsString() reference?: string;
}
