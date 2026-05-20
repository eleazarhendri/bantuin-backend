"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const orders_controller_1 = require("./orders.controller");
const orders_service_1 = require("./orders.service");
const orders_gateway_1 = require("./orders.gateway");
const notifications_module_1 = require("../notifications/notifications.module");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                useFactory: () => ({
                    secret: process.env.JWT_SECRET ?? 'fallback-secret-change-in-production',
                    signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
                }),
            }),
            notifications_module_1.NotificationsModule,
        ],
        controllers: [orders_controller_1.OrdersController],
        providers: [orders_service_1.OrdersService, orders_gateway_1.OrdersGateway],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map