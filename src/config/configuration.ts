export default () => ({
  mural: {
    apiKey: process.env.MURAL_API_KEY,
    apiBaseUrl: process.env.MURAL_API_BASE_URL || 'https://api.muralpay.com',
    webhookPublicKey: process.env.MURAL_WEBHOOK_PUBLIC_KEY,
  },
  database: {
    url: process.env.POSTGRES_URL,
  },
});
