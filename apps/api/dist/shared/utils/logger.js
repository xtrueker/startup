"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("../../config/env");
const isProduction = env_1.env.NODE_ENV === 'production';
let canUsePretty = !isProduction;
if (canUsePretty) {
    try {
        require.resolve('pino-pretty');
    }
    catch {
        canUsePretty = false;
    }
}
exports.logger = (0, pino_1.default)({
    level: isProduction ? 'info' : 'debug',
    transport: canUsePretty
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
//# sourceMappingURL=logger.js.map