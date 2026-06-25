import { NestLocalBuilder } from '@workflow/nest/builder';
import { join } from 'node:path';

const builder = new NestLocalBuilder({
  workingDir: process.cwd(),
  outDir: join(process.cwd(), '.nestjs', 'workflow'),
  moduleType: 'commonjs',
  distDir: 'dist',
});

await builder.build();
