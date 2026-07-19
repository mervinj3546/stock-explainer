import { Crown, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UpgradePromptProps {
  reason: string;
  remainingLimit: number;
  onUpgrade: () => void;
  onSignUp?: () => void;
  isUpgrading?: boolean;
  requiresAuth?: boolean;
  freeTickers?: string[];
}

export function UpgradePrompt({
  reason,
  remainingLimit,
  onUpgrade,
  onSignUp,
  isUpgrading = false,
  requiresAuth = false,
  freeTickers = ['NVDA', 'TSLA', 'AAPL']
}: UpgradePromptProps) {
  
  if (requiresAuth) {
    return (
      <Card className="bg-card border-border max-w-md mx-auto">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Sign Up for Full Access
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-300">
              This ticker requires a free account. Create one to analyze up to 10 tickers!
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="text-sm font-medium text-primary">
              With a free account, you get:
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                10 unique tickers to analyze
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Full technical analysis & sentiment
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Unlimited access to {freeTickers.join(', ')}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Save watchlists & search history
              </li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <span className="font-medium">Always free:</span> {freeTickers.join(', ')}
          </div>

          {onSignUp && (
            <Button
              onClick={onSignUp}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Sign Up Free
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-yellow-500" />
          Upgrade to Premium
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-300">
            {reason}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="text-center">
            <Badge variant="outline" className="text-lg px-3 py-1">
              $5.99/month
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-primary">
              Premium benefits:
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                10 tickers per day (resets daily)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Priority data updates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Advanced analytics (coming soon)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Email alerts (coming soon)
              </li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <span className="font-medium">Still free:</span> {freeTickers.join(', ')}
          </div>

          <Button
            onClick={onUpgrade}
            disabled={isUpgrading}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
          >
            {isUpgrading ? (
              'Upgrading...'
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            Cancel anytime • Instant activation
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
