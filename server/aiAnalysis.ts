import { LinkupClient } from 'linkup-sdk';

const client = new LinkupClient({ 
  apiKey: process.env.LINKUP_API_KEY || "89b5595b-5320-4127-878d-15cb5151dce2" 
});

interface AIAnalysisResponse {
  companyOverview: string;
  catalysts: {
    positive: string[];
    negative: string[];
  };
  technicalAnalysis: {
    shortTerm: string;
    mediumTerm: string;
  };
  events: {
    nextEarnings: string;
    analystActivity: string;
  };
  sentiment: {
    summary: string;
    recommendation: 'Bullish' | 'Bearish' | 'Hold';
  };
  rawResponse: string;
  lastUpdated: string;
}

// In-memory cache for AI analysis results
const aiAnalysisCache = new Map<string, { data: AIAnalysisResponse; timestamp: number }>();
const CACHE_DURATION = 16 * 60 * 60 * 1000; // 16 hours in milliseconds

function parseAIResponse(rawResponse: string): Omit<AIAnalysisResponse, 'rawResponse' | 'lastUpdated'> {
  // Default structure in case parsing fails
  const defaultResponse = {
    companyOverview: "Analysis unavailable",
    catalysts: { positive: [] as string[], negative: [] as string[] },
    technicalAnalysis: { shortTerm: "No data available", mediumTerm: "No data available" },
    events: { nextEarnings: "Unknown", analystActivity: "No recent activity" },
    sentiment: { summary: "Neutral outlook", recommendation: 'Hold' as 'Bullish' | 'Bearish' | 'Hold' }
  };

  try {
    const lines = rawResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection = '';
    const result = { ...defaultResponse };
    const tempCatalysts: { positive: string[]; negative: string[] } = { positive: [], negative: [] };
    
    for (const line of lines) {
      // Detect sections
      if (line.match(/^0\.\s*Company Overview/i)) {
        currentSection = 'overview';
        continue;
      } else if (line.match(/^1\.\s*News & Catalysts/i)) {
        currentSection = 'catalysts';
        continue;
      } else if (line.match(/^2\.\s*Technical Analysis/i)) {
        currentSection = 'technical';
        continue;
      } else if (line.match(/^3\.\s*Events & Sentiment/i)) {
        currentSection = 'events';
        continue;
      } else if (line.match(/^4\.\s*Final Sentiment Summary/i)) {
        currentSection = 'sentiment';
        continue;
      }

      // Parse content based on current section
      switch (currentSection) {
        case 'overview':
          if (!line.match(/^0\./)) {
            result.companyOverview = line;
          }
          break;

        case 'catalysts':
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
            const bulletPoint = line.replace(/^[•\-*]\s*/, '');
            // Simple heuristic: if we haven't hit negative section yet, it's positive
            if (rawResponse.indexOf(line) < rawResponse.toLowerCase().indexOf('negative') || 
                rawResponse.indexOf(line) < rawResponse.toLowerCase().indexOf('headwind')) {
              tempCatalysts.positive.push(bulletPoint);
            } else {
              tempCatalysts.negative.push(bulletPoint);
            }
          }
          break;

        case 'technical':
          if (line.toLowerCase().includes('short term') || line.toLowerCase().includes('1 week') || line.toLowerCase().includes('1 month')) {
            result.technicalAnalysis.shortTerm = line.replace(/.*?:\s*/, '');
          } else if (line.toLowerCase().includes('medium term') || line.toLowerCase().includes('1–6 months') || line.toLowerCase().includes('6 months')) {
            result.technicalAnalysis.mediumTerm = line.replace(/.*?:\s*/, '');
          } else if (!line.match(/^2\./)) {
            // If we don't have specific sections, combine into short term
            if (result.technicalAnalysis.shortTerm === "No data available") {
              result.technicalAnalysis.shortTerm = line;
            } else {
              result.technicalAnalysis.mediumTerm = line;
            }
          }
          break;

        case 'events':
          if (line.toLowerCase().includes('earnings')) {
            result.events.nextEarnings = line.replace(/.*?:\s*/, '');
          } else if (line.toLowerCase().includes('analyst') || line.toLowerCase().includes('insider') || line.toLowerCase().includes('options')) {
            result.events.analystActivity = line.replace(/.*?:\s*/, '');
          }
          break;

        case 'sentiment':
          if (line.toLowerCase().includes('recommendation:')) {
            const recommendation = line.toLowerCase().replace(/.*recommendation:\s*/, '').trim();
            if (recommendation.includes('bullish')) {
              result.sentiment.recommendation = 'Bullish';
            } else if (recommendation.includes('bearish')) {
              result.sentiment.recommendation = 'Bearish';
            } else {
              result.sentiment.recommendation = 'Hold';
            }
          } else if (!line.match(/^4\./) && !line.toLowerCase().includes('recommendation:')) {
            result.sentiment.summary = line;
          }
          break;
      }
    }

    // Only update catalysts if we found some
    if (tempCatalysts.positive.length > 0 || tempCatalysts.negative.length > 0) {
      result.catalysts = tempCatalysts;
    }

    return result;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return defaultResponse;
  }
}

export async function getAIAnalysis(ticker: string): Promise<AIAnalysisResponse> {
  // Check cache first
  const cached = aiAnalysisCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`🎯 Returning cached AI analysis for ${ticker}`);
    return cached.data;
  }

  console.log(`🤖 Fetching fresh AI analysis for ${ticker}...`);

  try {
    const prompt = `You are a financial research assistant. Generate a clear, beginner-friendly stock analysis report for the ticker ${ticker} using only up-to-date, reputable web sources. Structure your response with the following numbered sections:

0. Company Overview
- In 1–2 sentences, explain what the company does, its primary products/services, and its industry.

1. News & Catalysts
- List 3–5 key positive catalysts (tailwinds) as concise bullet points.
- List 3–5 key negative factors (headwinds) as concise bullet points.

2. Technical Analysis
- For the short term (1 week–1 month): Summarize trend direction, support/resistance levels, and notable indicators (e.g., RSI, moving averages, volume trends).
- For the medium term (1–6 months): Summarize trend direction, key levels, and any major technical patterns.

3. Events & Sentiment
- State the next earnings date or any upcoming significant company events.
- Note any recent analyst rating changes, insider trading activity, or unusual options activity.

4. Final Sentiment Summary
- In 1–2 sentences, synthesize the overall outlook, referencing catalysts, technicals, and risks.
- End with a single line: Recommendation: Bullish OR Recommendation: Bearish OR Recommendation: Hold (choose one only).

Formatting & Output Instructions:
- Use the exact section numbers and order above.
- Present tailwinds and headwinds as bullet points.
- Ensure the final line contains only one word after 'Recommendation:'.
- Maintain a neutral, factual tone and avoid financial advice or subjective opinions.`;

    const response = await client.search({
      query: prompt,
      depth: "standard",
      outputType: "sourcedAnswer",
      includeImages: false,
    });

    if (!response.answer) {
      throw new Error('No response from AI service');
    }

    // Parse the response
    const parsedData = parseAIResponse(response.answer);
    
    const aiAnalysisResult: AIAnalysisResponse = {
      ...parsedData,
      rawResponse: response.answer,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    aiAnalysisCache.set(ticker, { data: aiAnalysisResult, timestamp: Date.now() });
    console.log(`✅ AI analysis cached for ${ticker} (expires in 16 hours)`);

    return aiAnalysisResult;
  } catch (error) {
    console.error(`❌ Error fetching AI analysis for ${ticker}:`, error);
    
    // Return a fallback response
    return {
      companyOverview: `Unable to fetch current analysis for ${ticker}. Please try again later.`,
      catalysts: { positive: [], negative: [] },
      technicalAnalysis: { 
        shortTerm: "Analysis unavailable", 
        mediumTerm: "Analysis unavailable" 
      },
      events: { 
        nextEarnings: "Unknown", 
        analystActivity: "No data available" 
      },
      sentiment: { 
        summary: "Analysis temporarily unavailable", 
        recommendation: 'Hold' 
      },
      rawResponse: '',
      lastUpdated: new Date().toISOString(),
    };
  }
}
