import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function getAuthHeader() {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) {
        throw new Error('PAYMONGO_SECRET_KEY not configured');
    }
    return {
        'Authorization': `Basic ${Buffer.from(key + ':').toString('base64')}`,
        'Content-Type': 'application/json'
    };
}

// Create GCash payment source
export async function createGCashPayment(email, successUrl, failedUrl) {
    const amount = parseInt(process.env.PRO_PRICE_CENTS) || 10000; // ₱100 in centavos

    console.log('Creating GCash payment:', { email, amount, successUrl, failedUrl });

    try {
        const response = await axios.post(`${PAYMONGO_API}/sources`, {
            data: {
                attributes: {
                    amount: amount,
                    type: 'gcash',
                    currency: 'PHP',
                    redirect: {
                        success: successUrl,
                        failed: failedUrl
                    },
                    billing: {
                        name: email.split('@')[0],
                        email: email
                    }
                }
            }
        }, { headers: getAuthHeader() });

        console.log('PayMongo response:', response.data);

        return {
            id: response.data.data.id,
            checkoutUrl: response.data.data.attributes.redirect.checkout_url,
            status: response.data.data.attributes.status
        };
    } catch (error) {
        console.error('PayMongo error details:', JSON.stringify(error.response?.data, null, 2));
        console.error('PayMongo error status:', error.response?.status);
        throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment');
    }
}

// Check payment status
export async function checkPaymentStatus(sourceId) {
    try {
        const response = await axios.get(`${PAYMONGO_API}/sources/${sourceId}`, {
            headers: getAuthHeader()
        });

        return {
            id: response.data.data.id,
            status: response.data.data.attributes.status,
            amount: response.data.data.attributes.amount
        };
    } catch (error) {
        console.error('Status check error:', error.response?.data || error.message);
        throw new Error('Failed to check payment status');
    }
}

// Create payment from source (required to complete the payment)
export async function createPaymentFromSource(sourceId, amount) {
    try {
        const response = await axios.post(`${PAYMONGO_API}/payments`, {
            data: {
                attributes: {
                    amount: amount,
                    currency: 'PHP',
                    source: {
                        id: sourceId,
                        type: 'source'
                    }
                }
            }
        }, { headers: getAuthHeader() });

        return {
            id: response.data.data.id,
            status: response.data.data.attributes.status
        };
    } catch (error) {
        console.error('Payment creation error:', error.response?.data || error.message);
        throw new Error('Failed to process payment');
    }
}
