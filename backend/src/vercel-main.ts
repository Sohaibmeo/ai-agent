import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import bodyParser from 'body-parser';

let app: INestApplication | undefined;

async function bootstrap(): Promise<INestApplication> {
  dotenv.config();

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

  const nestApp = await NestFactory.create(AppModule);
  nestApp.enableCors(corsOptions);
  nestApp.use(bodyParser.json({ limit: '10mb' }));
  nestApp.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  await nestApp.init(); // ❗ no app.listen() in serverless
  return nestApp;
}

// This is what Vercel will actually call
export default async function handler(req: any, res: any) {
  if (!app) {
    app = await bootstrap();
  }
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}
