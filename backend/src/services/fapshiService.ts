import axios from 'axios';

const BASE_URL = process.env.FAPSHI_BASE_URL ?? 'https://sandbox.fapshi.com';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        apiuser: process.env.FAPSHI_API_USER ?? '',
        apikey:  process.env.FAPSHI_API_KEY  ?? '',
        'Content-Type': 'application/json',
    },
    timeout: 20_000,
});

export interface DirectPayPayload {
    amount: number;
    phone: string;
    medium?: string;
    externalId?: string;
    message?: string;
    name?: string;
}

export interface FapshiStatus {
    statusCode: number;
    transId: string;
    status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
    amount: number;
    medium: string;
    phone?: string;
    externalId?: string;
    message?: string;
}

export const directPay = async (payload: DirectPayPayload) => {
    const { data } = await client.post('/direct-pay', payload);
    return data as { statusCode: number; message: string; transId: string };
};

export const getPaymentStatus = async (transId: string): Promise<FapshiStatus> => {
    const { data } = await client.get(`/payment-status/${transId}`);
    return data;
};

export const expirePayment = async (transId: string) => {
    const { data } = await client.post('/expire-pay', { transId });
    return data;
};
