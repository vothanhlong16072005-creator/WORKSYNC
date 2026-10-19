import { z } from 'zod';
import { ItemKind } from '../types/timeline.types.js';

const parseArrayOrSingle = (val: unknown) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.includes(',') ? val.split(',').map((s) => s.trim()) : [val.trim()];
  }
  return undefined;
};

export const CalendarQuerySchema = z.object({
  from: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid from date' }),
  to: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid to date' }),
  scope: z.enum(['mine', 'department', 'company']).default('mine'),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  types: z.preprocess(
    parseArrayOrSingle,
    z.array(z.enum(['task', 'sprint', 'meeting', 'leave', 'wfh', 'overtime'])).optional(),
  ),
  status: z.preprocess(parseArrayOrSingle, z.array(z.string()).optional()),
  priority: z.preprocess(
    parseArrayOrSingle,
    z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])).optional(),
  ),
  query: z.string().optional(),
});

export type CalendarQueryDto = z.infer<typeof CalendarQuerySchema>;
