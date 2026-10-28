import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CampusCtx, Roles } from '../common/decorators';
import { CreateStudentDto, ListStudentsQuery, UpdateStudentDto } from './dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@CampusCtx() campusId: string | null, @Query() query: ListStudentsQuery) {
    return this.students.list(campusId, query);
  }

  @Get(':id')
  getOne(@CampusCtx() campusId: string | null, @Param('id') id: string) {
    return this.students.getOne(campusId, id);
  }

  @Roles('SA', 'CA', 'AO')
  @Post()
  create(@CampusCtx() campusId: string | null, @Body() dto: CreateStudentDto) {
    return this.students.create(campusId, dto);
  }

  @Roles('SA', 'CA', 'AO')
  @Patch(':id')
  update(
    @CampusCtx() campusId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(campusId, id, dto);
  }
}
