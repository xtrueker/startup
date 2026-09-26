"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const connection_1 = require("../../infrastructure/database/connection");
const uuid_1 = require("uuid");
class MediaService {
    /**
     * Applies an overarching privacy blur to images before storing them.
     * This is a basic placeholder for a more complex ML-based face/license plate detection.
     */
    static async blurImage(buffer) {
        try {
            // In a real scenario, we'd use bounding boxes from a detection model
            // Here we apply a moderate blur to ensure privacy compliance while keeping context
            return await (0, sharp_1.default)(buffer)
                .blur(15)
                .jpeg({ quality: 80 })
                .toBuffer();
        }
        catch (error) {
            console.error('Error applying privacy blur', error);
            throw error;
        }
    }
    /**
     * Process and upload evidence for an alert
     */
    static async uploadAlertEvidence(alertId, buffer, _mimeType) {
        const sb = (0, connection_1.supabase)();
        // Always blur citizen-submitted media by default for privacy
        const blurredBuffer = await this.blurImage(buffer);
        const fileName = `${alertId}/${(0, uuid_1.v4)()}.jpg`;
        const { error } = await sb.storage
            .from('evidence')
            .upload(fileName, blurredBuffer, {
            contentType: 'image/jpeg',
            upsert: false
        });
        if (error) {
            throw error;
        }
        // Get public URL
        const { data: publicUrlData } = sb.storage.from('evidence').getPublicUrl(fileName);
        return publicUrlData.publicUrl;
    }
}
exports.MediaService = MediaService;
//# sourceMappingURL=MediaService.js.map