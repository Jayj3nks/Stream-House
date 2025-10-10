import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

class StorageAdapter {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || "us-east-1";
    this.bucketName = process.env.S3_BUCKET_NAME || "stream-house-uploads";

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        size: file.length,
        contentType,
      };
    } catch (error) {
      console.error("Storage upload error:", error);
      throw new Error("Failed to upload file to storage");
    }
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error("Storage signed URL error:", error);
      throw new Error("Failed to generate signed upload URL");
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error("Storage delete error:", error);
      throw new Error("Failed to delete file from storage");
    }
  }

  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    return `${prefix}/${timestamp}_${randomString}_${sanitizedFilename}`;
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

// Singleton instance
export const storageAdapter = new StorageAdapter();

// Mock storage for development/testing
export class MockStorageAdapter {
  async uploadFile(
    file: Buffer | Uint8Array,
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    // In development, return a mock URL
    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(key)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    return {
      url,
      key,
      size: file.length,
      contentType,
    };
  }

  async deleteFile(key: string): Promise<void> {
    console.log("Mock: Deleted file with key:", key);
  }

  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${prefix}/${timestamp}_${randomString}_${filename}`;
  }

  getPublicUrl(key: string): string {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(key)}`;
  }
}

// Export appropriate adapter based on environment
export const storage =
  process.env.NODE_ENV === "production" && process.env.AWS_ACCESS_KEY_ID
    ? storageAdapter
    : new MockStorageAdapter();
