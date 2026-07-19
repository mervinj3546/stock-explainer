# Tier System Implementation Plan

## Current Status
✅ Admin system working with unlimited access
✅ Premium system working with daily resets
✅ Basic free tier working

## Proposed Changes for 3-Tier System

### 1. Unlogged Users
- **Access**: Only TSLA, NVDA, AAPL
- **Features**: Basic stock data only
- **Restrictions**: No AI analysis, no sentiment, basic technical only
- **Implementation**: New `canUnloggedUserAccessTicker()` function

### 2. Free Logged Users  
- **Access**: 10 tickers total (lifetime limit)
- **AI Analysis**: ❌ Disabled
- **Sentiment**: ✅ Limited (Professional + r/stocks + StockTwits only)
- **Technical**: ✅ Basic indicators, premium ones blurred
- **Implementation**: Update existing free tier logic

### 3. Premium Users
- **Access**: 10 tickers/day with daily reset  
- **AI Analysis**: ✅ Full access
- **Sentiment**: ✅ Full (5 subreddits + StockTwits + Professional)
- **Technical**: ✅ All indicators unlocked
- **Implementation**: Existing premium tier

## Code Changes Required

### 1. Update Storage Constants
```typescript
private readonly UNLOGGED_TICKERS = ['NVDA', 'TSLA', 'AAPL'];
private readonly FREE_TICKER_LIMIT = 10;
```

### 2. Add New Access Control Functions
```typescript
canUnloggedUserAccessTicker(tickerSymbol: string): boolean
canUserAccessFeature(userId: string, feature: 'ai-analysis' | 'full-sentiment' | 'advanced-technical'): boolean
```

### 3. Update API Routes
- Add authentication checks
- Return feature flags based on user tier
- Blur/disable premium features for free users

### 4. Frontend Changes
- Show upgrade prompts for locked features
- Blur premium content
- Display remaining ticker limits clearly

## Benefits
- Clear upgrade path
- Value demonstration at each tier  
- Maintains good free experience
- Encourages premium subscriptions

## Economics Impact
- Unlogged users: $0 cost (no AI, limited data)
- Free users: ~$0.50/month (limited sentiment only)
- Premium users: ~$1.50/month (full AI + sentiment)
- Much more sustainable model!
