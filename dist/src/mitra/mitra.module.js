"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MitraModule = void 0;
const common_1 = require("@nestjs/common");
const mitra_controller_1 = require("./mitra.controller");
const mitra_service_1 = require("./mitra.service");
const auth_module_1 = require("../auth/auth.module");
let MitraModule = class MitraModule {
};
exports.MitraModule = MitraModule;
exports.MitraModule = MitraModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
        ],
        controllers: [mitra_controller_1.MitraController],
        providers: [mitra_service_1.MitraService],
        exports: [mitra_service_1.MitraService],
    })
], MitraModule);
//# sourceMappingURL=mitra.module.js.map