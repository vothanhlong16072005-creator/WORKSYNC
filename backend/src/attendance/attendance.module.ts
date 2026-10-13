import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { WfhService } from './wfh.service.js';
import { LeaveService } from './leave.service.js';
import { IpValidationService } from './ip-validation.service.js';
import { GeoValidationService } from './geo-validation.service.js';
import { LeaveBalanceService } from './leave-balance.service.js';
import { AutoApproveService } from './auto-approve.service.js';
import { ExportService } from './export.service.js';
import { EarlyLeaveService } from './early-leave.service.js';
import { OvertimeService } from './overtime.service.js';
import { BreakService } from './break.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    WfhService,
    LeaveService,
    IpValidationService,
    GeoValidationService,
    LeaveBalanceService,
    AutoApproveService,
    ExportService,
    EarlyLeaveService,
    OvertimeService,
    BreakService,
  ],
  exports: [
    AttendanceService,
    WfhService,
    LeaveService,
    AutoApproveService,
    ExportService,
    EarlyLeaveService,
    OvertimeService,
    BreakService,
  ],
})
export class AttendanceModule {}
