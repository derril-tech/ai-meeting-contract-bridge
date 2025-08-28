import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AuditAction, AuditLog } from '../database/entities/audit-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SecurityService {
    private encryptionKey: Buffer;
    private readonly algorithm = 'aes-256-gcm';

    constructor(
        private configService: ConfigService,
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) {
        const keyString = this.configService.get('ENCRYPTION_KEY');
        if (!keyString) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        this.encryptionKey = crypto.scryptSync(keyString, 'salt', 32);
    }

    // Encryption methods
    encrypt(text: string): { encryptedData: string; iv: string; tag: string } {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
        cipher.setAAD(Buffer.from('additional_authenticated_data'));

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
        };
    }

    decrypt(encryptedData: string, iv: string, tag: string): string {
        const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
        decipher.setAAD(Buffer.from('additional_authenticated_data'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    // Password hashing
    async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    // Rate limiting helpers
    generateRateLimitKey(identifier: string, action: string): string {
        return `${action}:${identifier}`;
    }

    // Audit logging
    async logAuditEvent(
        organizationId: string,
        userId: string | null,
        action: AuditAction,
        resourceType: string | null,
        resourceId: string | null,
        changes?: any,
        metadata?: any,
    ): Promise<void> {
        const auditLog = this.auditLogRepository.create({
            organizationId,
            userId,
            action,
            resourceType,
            resourceId,
            changes,
            metadata,
        });

        await this.auditLogRepository.save(auditLog);
    }

    // Token generation and validation
    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    generateIdempotencyKey(): string {
        return crypto.randomUUID();
    }

    // Input validation and sanitization
    sanitizeString(input: string): string {
        return input.replace(/[<>'"&]/g, '');
    }

    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    // File validation
    validateFileType(filename: string, allowedTypes: string[]): boolean {
        const extension = filename.split('.').pop()?.toLowerCase();
        return extension ? allowedTypes.includes(extension) : false;
    }

    validateFileSize(size: number, maxSize: number): boolean {
        return size <= maxSize;
    }

    // Content Security Policy helpers
    generateCSP(): string {
        return [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; ');
    }

    // CORS validation
    validateOrigin(origin: string, allowedOrigins: string[]): boolean {
        return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
    }

    // Security headers
    generateSecurityHeaders(): Record<string, string> {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        };
    }

    // Data classification and masking
    maskSensitiveData(data: string, visibleChars: number = 4): string {
        if (data.length <= visibleChars * 2) {
            return '*'.repeat(data.length);
        }
        const start = data.substring(0, visibleChars);
        const end = data.substring(data.length - visibleChars);
        const masked = '*'.repeat(data.length - visibleChars * 2);
        return `${start}${masked}${end}`;
    }

    // GDPR compliance helpers
    generateDataRetentionKey(dataType: string, organizationId: string): string {
        return `retention:${dataType}:${organizationId}`;
    }

    // Secure file handling
    generateSecureFilename(originalName: string): string {
        const timestamp = Date.now();
        const random = this.generateSecureToken(8);
        const extension = originalName.split('.').pop();
        return `${timestamp}-${random}.${extension}`;
    }

    // API key validation
    validateApiKey(apiKey: string, storedHash: string): boolean {
        // In production, use proper API key validation
        return apiKey === storedHash;
    }
}
