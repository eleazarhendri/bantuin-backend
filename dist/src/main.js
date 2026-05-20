"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'public'));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    const port = Number(process.env.PORT) || 3000;
    const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Server berjalan di ${baseUrl}/api`);
    console.log(`📁 Upload folder: ${baseUrl}/uploads/`);
    console.log(`🔌 WebSocket tersedia di ${baseUrl}/orders`);
}
bootstrap();
//# sourceMappingURL=main.js.map