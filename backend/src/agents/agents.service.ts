import { Injectable } from '@nestjs/common';

@Injectable()
export class AgentsService {
  reviewAction(payload: unknown) {
    return { ok: true, mode: 'review', payload };
  }

  coachPlan(payload: unknown) {
    return { ok: true, mode: 'coach', payload };
  }
}
