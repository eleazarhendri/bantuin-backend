"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const prisma_module_1 = require("./prisma/prisma.module");
const mitra_module_1 = require("./mitra/mitra.module");
const admin_module_1 = require("./admin/admin.module");
const orders_module_1 = require("./orders/orders.module");
const chat_module_1 = require("./chat/chat.module");
const notifications_module_1 = require("./notifications/notifications.module");
const reviews_module_1 = require("./reviews/reviews.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            mitra_module_1.MitraModule,
            admin_module_1.AdminModule,
            orders_module_1.OrdersModule,
            chat_module_1.ChatModule,
            notifications_module_1.NotificationsModule,
            reviews_module_1.ReviewsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map