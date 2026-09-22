import crypto from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../common/logger';
import { AppError } from '../../common/errors';

export interface CreateOrderParams {
  amountInr: number;
  receiptId: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

/**
 * Creates a Razorpay order server-side via REST API.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    logger.warn('Razorpay credentials not configured, operating in mock fallback mode');
    return {
      id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entity: 'order',
      amount: Math.round(params.amountInr * 100),
      amount_paid: 0,
      amount_due: Math.round(params.amountInr * 100),
      currency: 'INR',
      receipt: params.receiptId,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

  const payload = {
    amount: Math.round(params.amountInr * 100), // Amount in paise (e.g. ₹100 = 10000 paise)
    currency: 'INR',
    receipt: params.receiptId,
    notes: params.notes || {},
  };

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Razorpay order creation failed:', { status: response.status, body: errorText });
      throw AppError.internal('Failed to create payment order with payment gateway.');
    }

    const data = (await response.json()) as RazorpayOrderResponse;
    return data;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error('Razorpay order API exception:', { error: err.message || err });
    throw AppError.internal('Payment gateway service error.');
  }
}

/**
 * Verifies Razorpay checkout signature server-side using HMAC SHA256.
 */
export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const keySecret = env.RAZORPAY_KEY_SECRET;

  // In mock environment without secret set, accept mock signatures
  if (!keySecret) {
    return true;
  }

  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(params.razorpaySignature, 'utf-8')
  );
}

/**
 * Verifies Razorpay webhook signature header using HMAC SHA256.
 */
export function verifyWebhookSignature(params: {
  payloadBody: string;
  signatureHeader: string;
}): boolean {
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;

  if (!webhookSecret) return true;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(params.payloadBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(params.signatureHeader, 'utf-8')
    );
  } catch (err) {
    return false;
  }
}
