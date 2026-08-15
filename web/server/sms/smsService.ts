import { SmsConfig, SmsSendResult, SmsProviderRegistry, ISmsProvider } from "./providers.js";

// ============================================
// SMS SERVICE - Unified Interface
// ============================================

export class SmsService {
     private config: SmsConfig;
     private provider: ISmsProvider;

     constructor(config: SmsConfig) {
          this.config = config;
          this.provider = SmsProviderRegistry.getProvider(config.provider || "smsir");
     }

     /**
      * تست اتصال به پنل SMS
      */
     async testConnection(): Promise<SmsSendResult> {
          return this.provider.testConnection(this.config);
     }

     /**
      * ارسال پیامک معمولی
      */
     async sendSms(mobile: string, messageText: string): Promise<SmsSendResult> {
          return this.provider.sendSms(this.config, mobile, messageText);
     }

     /**
      * ارسال کد تایید
      */
     async sendVerificationCode(mobile: string, code: string): Promise<SmsSendResult> {
          return this.provider.sendVerificationCode(this.config, mobile, code);
     }

     /**
      * تولید و ارسال کد تایید تصادفی ۶ رقمی
      */
     async sendRandomCode(mobile: string): Promise<SmsSendResult> {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          return this.sendVerificationCode(mobile, code);
     }
}

// ============================================
// SINGLETON INSTANCE (برای استفاده در کل پروژه)
// ============================================

// تنظیمات پیش‌فرض (از .env یا دیتابیس بگیرید)
const defaultConfig: SmsConfig = {
     provider: process.env.SMS_PROVIDER || "smsir",
     apiKey: process.env.SMS_API_KEY || "gRpKugNF4Oqso8S7BCJR13GbDMiC98ZBBD6bEVhkvpQCHzWw1jIUK1xu78YVW4oV",
     templateId: process.env.SMS_TEMPLATE_ID || "797820",
     senderNumber: process.env.SMS_SENDER_NUMBER || "3000882868",
     isActive: true,
};

let smsServiceInstance: SmsService | null = null;

export function getSmsService(config?: Partial<SmsConfig>): SmsService {
     if (!smsServiceInstance) {
          const mergedConfig = { ...defaultConfig, ...config };
          smsServiceInstance = new SmsService(mergedConfig);
     }
     return smsServiceInstance;
}

// ============================================
// FUNCTIONAL EXPORT (برای استفاده ساده)
// ============================================

/**
 * ارسال کد تایید (ساده‌ترین روش استفاده)
 */
export async function sendVerificationCode(mobile: string, code: string): Promise<SmsSendResult> {
     const service = getSmsService();
     return service.sendVerificationCode(mobile, code);
}

/**
 * ارسال پیامک معمولی (ساده‌ترین روش استفاده)
 */
export async function sendSms(mobile: string, messageText: string): Promise<SmsSendResult> {
     const service = getSmsService();
     return service.sendSms(mobile, messageText);
}