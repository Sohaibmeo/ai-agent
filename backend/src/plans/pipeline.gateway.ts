import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server as WSServer, WebSocket } from 'ws';
import type { AgentPipelineSummary } from '../agents/pipeline.types';

@WebSocketGateway({
  path: '/ws/pipeline',
})
export class PipelineGateway {
  @WebSocketServer()
  private server?: WSServer;

  private logger = new Logger(PipelineGateway.name);

  broadcastPipeline(summary: AgentPipelineSummary) {
    if (!this.server) return;
    const payload = JSON.stringify({ type: 'pipeline', data: summary });
    this.server.clients?.forEach((client: WebSocket) => {
      if ((client as any).readyState === 1) {
        try {
          client.send(payload);
        } catch (err: any) {
          this.logger.warn(`Failed to send pipeline update: ${err?.message || err}`);
        }
      }
    });
  }
}
