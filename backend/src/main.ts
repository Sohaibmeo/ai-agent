import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { WsAdapter } from '@nestjs/platform-ws';
import * as bodyParser from 'body-parser';
import { serve } from 'inngest/express';
import { inngest } from './inngest/client';
import { createPlanGenerationFunctions } from './inngest/plan-generation.function';
import { PlansService } from './plans/plans.service';

dotenv.config();

async function bootstrap() {
  const allowedOrigins = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const corsOptions =
    allowedOrigins.length > 0
      ? {
          origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
          },
          credentials: true,
        }
      : true;

  const app = await NestFactory.create(AppModule, { cors: corsOptions });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.use(
    '/api/inngest',
    serve({
      client: inngest,
      functions: createPlanGenerationFunctions(app.get(PlansService)),
    }),
  );
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
}

bootstrap();
