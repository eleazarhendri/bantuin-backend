import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // Serve static files — foto profil bisa diakses via /uploads/<filename>
  app.useStaticAssets(join(process.cwd(), 'public'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS terbuka — sesuaikan di production
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(process.env.PORT) || 3000;
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

  // Listen di 0.0.0.0 agar bisa diakses dari HP/emulator di jaringan yang sama
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server berjalan di ${baseUrl}/api`);
  console.log(`📁 Upload folder: ${baseUrl}/uploads/`);
  console.log(`🔌 WebSocket tersedia di ${baseUrl}/orders`);
}

bootstrap();
