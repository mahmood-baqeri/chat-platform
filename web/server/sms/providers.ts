import http from "http";
import https from "https";
import axios, { AxiosResponse } from "axios";

// ============================================
// TYPES & INTERFACES
// ============================================

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
  sendVerificationCode(config: SmsConfig, mobile: string, code: string): Promise<SmsSendResult>;
}

// ============================================
// SMS.ir PROVIDER (با کد شما)
// ============================================

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
      const response = await axios.get("https://api.sms.ir/v1/credit", {
        headers: {
          "X-API-KEY": config.apiKey,
          "Accept": "application/json",
        },
      });

      const data = response.data;

      if (response.status === 200 && data.status === 1) {
        return {
          success: true,
          message: `ارتباط با پنل SMS.ir با موفقیت برقرار شد.`,
          details: data,
        };
      } else {
        return {
          success: false,
          message: `خطای سامانه SMS.ir: ${data.message || "کلید API نامعتبر است."}`,
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

  // متد ارسال پیامک معمولی
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
      const bulkBody = {
        lineNumber: config.senderNumber ? config.senderNumber.trim() : "30000000",
        messageText: messageText,
        mobiles: [cleanMobile],
        sendDateTime: null
      };

      const response = await axios.post("https://api.sms.ir/v1/send/bulk", bulkBody, {
        headers: {
          "X-API-KEY": config.apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });

      const data = response.data;

      if (response.status === 200 && (data.status === 1 || data.status === 200)) {
        return {
          success: true,
          message: `پیامک با موفقیت توسط SMS.ir به شماره ${cleanMobile} ارسال شد.`,
          messageId: data.data?.packId || "OK",
          details: data
        };
      } else {
        return {
          success: false,
          message: `خطای ارسال در SMS.ir: ${data.message || "اطلاعات فرستنده یا متن پیام نامعتبر است."}`,
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

  // متد ارسال کد تایید (با استفاده از کد شما)
  async sendVerificationCode(config: SmsConfig, mobile: string, code: string): Promise<SmsSendResult> {
    if (!config.apiKey) {
      return {
        success: false,
        message: "کلید API برای سامانه SMS.ir تنظیم نشده است.",
      };
    }

    if (!config.templateId) {
      return {
        success: false,
        message: "Template ID برای ارسال کد تایید تنظیم نشده است.",
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
      const data = JSON.stringify({
        mobile: cleanMobile,
        templateId: config.templateId,
        parameters: [
          { name: 'code', value: code }
        ]
      });

      const response = await axios.post("https://api.sms.ir/v1/send/verify", data, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
          'x-api-key': config.apiKey
        }
      });

      if (response.status === 200 && (response.data?.status === 1 || response.data?.status === 200)) {
        return {
          success: true,
          message: `کد تایید با موفقیت توسط SMS.ir به شماره ${cleanMobile} ارسال شد.`,
          messageId: response.data?.data?.messageId || "OK",
          details: response.data
        };
      } else {
        return {
          success: false,
          message: `خطا در ارسال کد تایید SMS.ir: ${response.data?.message || "خطای ناشناخته"}`,
          details: response.data
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `خطا در ارتباط با SMS.ir: ${err.response?.data?.message || err.message || "مشکل شبکه"}`,
        details: err.response?.data
      };
    }
  }
}

// ============================================
// KAVENEGAR PROVIDER
// ============================================

export class KavenegarProvider implements ISmsProvider {
  name = "کاوه نگار";

  async testConnection(config: SmsConfig): Promise<SmsSendResult> {
    if (!config.apiKey) {
      return { success: false, message: "کلید API کاوه نگار وارد نشده است." };
    }
    try {
      const response = await axios.get(`https://api.kavenegar.com/v1/${config.apiKey}/account/info.json`);
      const data = response.data;
      if (response.status === 200 && data.return?.status === 200) {
        return {
          success: true,
          message: `ارتباط با کاوه نگار برقرار شد.`,
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
      const response = await axios.get(url);
      const data = response.data;
      if (response.status === 200 && data.return?.status === 200) {
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

  async sendVerificationCode(config: SmsConfig, mobile: string, code: string): Promise<SmsSendResult> {
    // کاوه نگار متد مجزا برای کد تایید ندارد، از همان sendSms استفاده می‌کنیم
    const messageText = `کد تایید شما: ${code}`;
    return this.sendSms(config, mobile, messageText);
  }
}

// ============================================
// PROVIDER REGISTRY
// ============================================

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