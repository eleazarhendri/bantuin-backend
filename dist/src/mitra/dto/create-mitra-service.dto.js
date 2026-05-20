"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMitraServiceDto = void 0;
const class_validator_1 = require("class-validator");
class CreateMitraServiceDto {
}
exports.CreateMitraServiceDto = CreateMitraServiceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'categoryId tidak boleh kosong' }),
    (0, class_validator_1.IsIn)(['jastip', 'servis', 'les', 'beberes', 'desain', 'pindahan', 'joki', 'curhat'], { message: 'categoryId tidak valid' }),
    __metadata("design:type", String)
], CreateMitraServiceDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama jasa tidak boleh kosong' }),
    (0, class_validator_1.MaxLength)(80, { message: 'Nama jasa maksimal 80 karakter' }),
    __metadata("design:type", String)
], CreateMitraServiceDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Deskripsi tidak boleh kosong' }),
    (0, class_validator_1.MaxLength)(500, { message: 'Deskripsi maksimal 500 karakter' }),
    __metadata("design:type", String)
], CreateMitraServiceDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Harga harus berupa angka' }),
    (0, class_validator_1.Min)(0, { message: 'Harga tidak boleh negatif' }),
    __metadata("design:type", Number)
], CreateMitraServiceDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['jam', 'item', 'sesi', 'hari', 'proyek'], {
        message: 'priceUnit harus salah satu dari: jam, item, sesi, hari, proyek',
    }),
    __metadata("design:type", String)
], CreateMitraServiceDto.prototype, "priceUnit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMitraServiceDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-mitra-service.dto.js.map