import { SmsProviderRegistry } from "../sms/providers.js";

export let smsConfig = {
  provider: process.env.SMS_PROVIDER || "smsir",
  apiKey: process.env.SMS_API_KEY || "",
  secretKey: process.env.SMS_SECRET_KEY || "",
  senderNumber: process.env.SMS_SENDER_NUMBER || "30000000",
  templateId: process.env.SMS_TEMPLATE_ID || "",
  timeout: Number(process.env.SMS_TIMEOUT) || 10,
  isActive: true,
  username: process.env.SMS_USERNAME || "",
  password: process.env.SMS_PASSWORD || "",
};

export function updateSmsConfig(newConfig: Partial<typeof smsConfig>) {
  smsConfig = { ...smsConfig, ...newConfig };
  return smsConfig;
}

export async function testSmsConnection(override?: Partial<typeof smsConfig>) {
  const config = { ...smsConfig, ...override };
  const provider = SmsProviderRegistry.getProvider(config.provider);
  return await provider.testConnection(config);
}

export async function sendSmsNotification(mobile: string, message: string, override?: Partial<typeof smsConfig>) {
  const config = { ...smsConfig, ...override };
  const provider = SmsProviderRegistry.getProvider(config.provider);
  return await provider.sendSms(config, mobile, message);
}
