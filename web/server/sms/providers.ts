import http from "http";
import https from "https";

export interface SmsConfig {
  provider: string;
  apiKey: string;
  secretKey?: string;
  senderNumber?: string;
  templateId?: string;
  timeout?: number;
  isActive?: boolean;
  username?: string;
  password?: string;
}

export interface SmsSendResult {
  success: boolean;
  message: string;
  messageId?: string | number;
  details?: any;
}

export interface ISmsProvider {
  name: string;
  testConnection(config: SmsConfig): Promise<SmsSendResult>;
  sendSms(config: SmsConfig, mobile: string, messageText: string): Promise<SmsSendResult>;
}

/**
 * SMS.ir Provider Implementation using official REST API v1
 */
export class SmsIrProvider implements ISmsProvider {
  name = "SMS.ir";

  async testConnection(config: SmsConfig): Promise<SmsSendResult> {
    if (!config.apiKey) {
      return {
        success: false,
        message: "کلید API برای سامانه SMS.ir وارد نشده است.",
      };
    }

    try {
      // Test credentials using SMS.ir GET /v1/credit endpoint
      const response = await fetch("https://api.sms.ir/v1/credit", {
        method: "GET",
        headers: {
          "X-API-KEY": config.apiKey,
          "Accept": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.status === 1) {
        return {
          success: true,
          message: `ارتباط با پنل SMS.ir با موفقیت برقرار شد. میزان اعتبار موجود: ${data.data ?? "فعال"} ریال`,
          details: data,
        };
      } else {
        return {
          success: false,
          message: `خطای سامانه SMS.ir (${data.status || response.status}): ${data.message || "کلید API نامعتبر است."}`,
          details: data,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `خطای شبکه در اتصال به SMS.ir: ${err.message || "پاسخی از سرور دریافت نشد."}`,
      };
    }
  }

  async sendSms(config: SmsConfig, mobile: string, messageText: string): Promise<SmsSendResult> {
    if (!config.apiKey) {
      return {
        success: false,
        message: "کلید API برای سامانه SMS.ir تنظیم نشده است.",
      };
    }

    const cleanMobile = mobile.trim();
    if (!cleanMobile) {
      return {
        success: false,
        message: "شماره گیرنده وارد نشده است.",
      };
    }

    try {
      // If templateId is provided, use SMS.ir Verify endpoint
      if (config.templateId && config.templateId.trim()) {
        const verifyBody = {
          mobile: cleanMobile,
          templateId: Number(config.templateId.trim()),
          parameters: [
            { name: "Code", value: messageText },
            { name: "Text", value: messageText }
          ]
        };

        const response = await fetch("https://api.sms.ir/v1/send/verify", {
          method: "POST",
          headers: {
            "X-API-KEY": config.apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(verifyBody)
        });

        const data = await response.json();
        if (response.ok && (data.status === 1 || data.status === 200)) {
          return {
            success: true,
            message: `پیامک الگویی با موفقیت توسط SMS.ir به شماره ${cleanMobile} ارسال شد. شناسه: ${data.data?.messageId || "ارسال شد"}`,
            messageId: data.data?.messageId,
            details: data
          };
        } else {
          return {
            success: false,
            message: `خطا در ارسال پیامک الگویی SMS.ir: ${data.message || JSON.stringify(data)}`,
            details: data
          };
        }
      }

      // Standard Bulk/Single SMS sending via SMS.ir /v1/send/bulk
      const bulkBody = {
        lineNumber: config.senderNumber ? config.senderNumber.trim() : "30000000",
        messageText: messageText,
        mobiles: [cleanMobile],
        sendDateTime: null
      };

      const response = await fetch("https://api.sms.ir/v1/send/bulk", {
        method: "POST",
        headers: {
          "X-API-KEY": config.apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(bulkBody)
      });

      const data = await response.json();

      if (response.ok && (data.status === 1 || data.status === 200)) {
        return {
          success: true,
          message: `پیامک با موفقیت توسط SMS.ir به شماره ${cleanMobile} ارسال شد.`,
          messageId: data.data?.packId || "OK",
          details: data
        };
      } else {
        return {
          success: false,
          message: `خطای ارسال در SMS.ir (${data.status}): ${data.message || "اطلاعات فرستنده یا متن پیام نامعتبر است."}`,
          details: data
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `خطا در ارتباط با SMS.ir: ${err.message || "مشکل شبکه"}`,
      };
    }
  }
}

/**
 * Kavenegar Provider Implementation
 */
export class KavenegarProvider implements ISmsProvider {
  name = "کاوه نگار";

  async testConnection(config: SmsConfig): Promise<SmsSendResult> {
    if (!config.apiKey) {
      return { success: false, message: "کلید API کاوه نگار وارد نشده است." };
    }
    try {
      const res = await fetch(`https://api.kavenegar.com/v1/${config.apiKey}/account/info.json`);
      const data = await res.json();
      if (res.ok && data.return?.status === 200) {
        return {
          success: true,
          message: `ارتباط با کاوه نگار برقرار شد. اعتبار: ${data.entries?.remaincredit || 0} ریال`,
          details: data,
        };
      }
      return {
        success: false,
        message: `خطای کاوه نگار: ${data.return?.message || "کلید API نامعتبر است."}`,
      };
    } catch (err: any) {
      return { success: false, message: `خطای شبکه کاوه نگار: ${err.message}` };
    }
  }

  async sendSms(config: SmsConfig, mobile: string, messageText: string): Promise<SmsSendResult> {
    if (!config.apiKey) return { success: false, message: "کلید API تنظیم نشده است." };
    try {
      const url = `https://api.kavenegar.com/v1/${config.apiKey}/sms/send.json?receptor=${encodeURIComponent(mobile)}&message=${encodeURIComponent(messageText)}&sender=${encodeURIComponent(config.senderNumber || "")}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.return?.status === 200) {
        return {
          success: true,
          message: `پیامک کاوه نگار با موفقیت به ${mobile} ارسال شد.`,
          details: data,
        };
      }
      return { success: false, message: `خطای ارسال کاوه نگار: ${data.return?.message || "ارسال نشد"}` };
    } catch (err: any) {
      return { success: false, message: `خطای ارتباط کاوه نگار: ${err.message}` };
    }
  }
}

/**
 * Modular SMS Provider Registry Factory
 */
export class SmsProviderRegistry {
  private static providers: Record<string, ISmsProvider> = {
    smsir: new SmsIrProvider(),
    kavenegar: new KavenegarProvider(),
  };

  static getProvider(providerKey: string): ISmsProvider {
    const key = providerKey ? providerKey.toLowerCase().trim() : "smsir";
    return this.providers[key] || this.providers["smsir"];
  }

  static registerProvider(key: string, provider: ISmsProvider) {
    this.providers[key.toLowerCase().trim()] = provider;
  }
}
