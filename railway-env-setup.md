# Railway Environment Variables Setup

## Required Environment Variables

Go to your Railway project dashboard > Variables tab and add:

### Essential Variables:
```
FRED_API_KEY=your_32_character_fred_api_key
TREASURY_ADMIN_KEY=your_secure_random_admin_key
```

### Optional Configuration:
```
TREASURY_CACHE_HOURS=24
TREASURY_STALE_DAYS=3
NODE_ENV=production
```

## How to Get Your FRED API Key:
1. Visit: https://fredaccount.stlouisfed.org/apikey
2. Create free account
3. Generate API key (32 characters)
4. Copy key to Railway environment variables

## Generate Admin Key:
```bash
# Generate secure random key
openssl rand -hex 32
```

## After Setting Variables:
1. Railway will automatically redeploy
2. Your app will be live at: https://your-app-name.railway.app
3. Test Treasury cache: https://your-app-name.railway.app/api/treasury-rates
4. Update Treasury data once live (see next section)

## First Treasury Update After Deployment:
```bash
curl -X POST https://your-app-name.railway.app/api/admin/update-treasury-rates \
  -H "X-Admin-Key: your_admin_key_here"
```

## Verify Deployment:
- Visit: https://your-app-name.railway.app
- Bond calculator should work immediately
- No FRED API key required for users!