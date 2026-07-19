# Should I Buy This Stock? 📈

> **Archived project** — this is an early predecessor of my current trading-analysis platform (Kronos). It's preserved here as a working snapshot, not actively maintained.

A full-stack web app that answers one question for retail traders: *"should I buy this stock?"* Type in a ticker and get a plain-English breakdown of the company's fundamentals, technicals, news, and crowd sentiment — all in one dashboard.

## What it does

- **Ticker search & dashboard** — search any US stock, get an at-a-glance summary with an overall buy/hold/avoid style badge
- **Fundamentals, explained for beginners** — key financials translated into plain English instead of raw ratios
- **Technical analysis** — SMA, MACD, RSI and a technical recommendation, with interactive charts (TradingView widget)
- **Retail vs. professional sentiment** — retail mood scraped from subreddits (via the Reddit API) side-by-side with professional tone from financial news RSS feeds (Nasdaq/Yahoo Finance)
- **AI analysis** — an LLM-generated narrative summary of the overall picture
- **News aggregation** — latest headlines per ticker
- **Accounts & watchlists** — email or OAuth (Google/Facebook) login, favorites, search history, and a tiered usage system
- **Smart caching & rate limiting** — Polygon/Finnhub API calls are cached and rate-limited to stay inside free-tier quotas (see `POLYGON_RATE_LIMITING.md` and the cache docs)

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui (Radix), Vite |
| Backend | Express.js (TypeScript), Passport auth |
| Database | PostgreSQL with Drizzle ORM |
| Data sources | Polygon, Finnhub, Reddit API, Nasdaq/Yahoo RSS, Linkup |

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your own API keys (Polygon, Finnhub, Reddit, Linkup) and a local PostgreSQL `DATABASE_URL`
3. `npm run db:push` to create the schema
4. `npm run dev` and open `http://localhost:3001`

## Disclaimer

This app is an educational side project. Nothing it outputs is financial advice — do your own research before buying anything.

## License

[MIT](LICENSE)
