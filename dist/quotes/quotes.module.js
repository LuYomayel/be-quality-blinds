"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotesModule = void 0;
const common_1 = require("@nestjs/common");
const quotes_controller_1 = require("./quotes.controller");
const quotes_service_1 = require("./quotes.service");
const email_service_1 = require("../common/services/email.service");
const antispam_service_1 = require("../common/services/antispam.service");
let QuotesModule = class QuotesModule {
};
exports.QuotesModule = QuotesModule;
exports.QuotesModule = QuotesModule = __decorate([
    (0, common_1.Module)({
        controllers: [quotes_controller_1.QuotesController],
        providers: [quotes_service_1.QuotesService, email_service_1.EmailService, antispam_service_1.AntiSpamService],
    })
], QuotesModule);
//# sourceMappingURL=quotes.module.js.map