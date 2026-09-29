const express = require('express');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY || 'dev-secret-key'; // set API_KEY in your host's env vars
const GST_RATE = 18; // percent

// Simple API key auth (set AUTH_OFF=true to make it open)
app.use('/api', (req, res, next) => {
  if (process.env.AUTH_OFF === 'true') return next();
  if (req.header('x-api-key') !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing x-api-key' });
  }
  next();
});

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// POST /api/premium
// body: { "idv": 500000, "rate": 3.2, "addons": [ { "name": "Zero Dep", "amount": 4500 } ] }
app.post('/api/premium', (req, res) => {
  const { idv, rate, addons = [] } = req.body || {};

  if (typeof idv !== 'number' || idv <= 0)
    return res.status(400).json({ error: 'idv must be a positive number' });
  if (typeof rate !== 'number' || rate <= 0)
    return res.status(400).json({ error: 'rate must be a positive number (percent)' });
  if (!Array.isArray(addons) || addons.some(a => typeof a.amount !== 'number' || a.amount < 0))
    return res.status(400).json({ error: 'addons must be an array of { name, amount }' });

  const basicPremium = round2(idv * rate / 100);
  const addonTotal = round2(addons.reduce((s, a) => s + a.amount, 0));
  const netPremium = round2(basicPremium + addonTotal);
  const gstAmount = round2(netPremium * GST_RATE / 100);
  const premiumWithGst = round2(netPremium + gstAmount);

  res.json({
    idv, rate, addons,
    basicPremium,
    addonTotal,
    netPremium,
    gstRate: GST_RATE,
    gstAmount,
    premiumWithGst
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Premium API running on port ${PORT}`));
