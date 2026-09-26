import sharp from 'sharp';
import { supabase } from '../../infrastructure/database/connection';
import { v4 as uuidv4 } from 'uuid';

export class MediaService {
  /**
   * Applies an overarching privacy blur to images before storing them.
   * This is a basic placeholder for a more complex ML-based face/license plate detection.
   */
  static async blurImage(buffer: Buffer): Promise<Buffer> {
    try {
      // In a real scenario, we'd use bounding boxes from a detection model
      // Here we apply a moderate blur to ensure privacy compliance while keeping context
      return await sharp(buffer)
        .blur(15) 
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Error applying privacy blur', error);
      throw error;
    }
  }

  /**
   * Process and upload evidence for an alert
   */
  static async uploadAlertEvidence(alertId: string, buffer: Buffer, _mimeType: string) {
    const sb = supabase();
    
    // Always blur citizen-submitted media by default for privacy
    const blurredBuffer = await this.blurImage(buffer);
    const fileName = `${alertId}/${uuidv4()}.jpg`;

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
