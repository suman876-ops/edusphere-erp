import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CampusCtx, Roles } from '../common/decorators';
import { CreateInvoiceDto, CreatePaymentDto, ListInvoicesQuery } from './dto';
import { FeesService } from './fees.service';

@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get('invoices')
  listInvoices(@CampusCtx() campusId: string | null, @Query() query: ListInvoicesQuery) {
    return this.fees.listInvoices(campusId, query);
  }

  @Roles('SA', 'CA', 'ACC')
  @Post('invoices')
  createInvoice(@CampusCtx() campusId: string | null, @Body() dto: CreateInvoiceDto) {
    return this.fees.createInvoice(campusId, dto);
  }

  @Roles('SA', 'CA', 'ACC')
  @Post('invoices/:id/payments')
  addPayment(
    @CampusCtx() campusId: string | null,
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.fees.addPayment(campusId, id, dto);
  }

  @Get('ledger/:studentId')
  ledger(@CampusCtx() campusId: string | null, @Param('studentId') studentId: string) {
    return this.fees.ledger(campusId, studentId);
  }
}
