import { Injectable } from '@nestjs/common';

@Injectable()
export class PlansService {
  findAll() {
    return [];
  }

  generateDraft() {
    return { id: 'draft_plan_id', status: 'draft' };
  }
}
