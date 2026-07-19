import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Crown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface UsageData {
  tier: 'free' | 'premium';
  tickersUsed: number;
  tickerLimit: number;
  remainingLimit: number;
  isLimitReached: boolean;
  usageResetDate?: string;
  freeTickers: string[];
  tickerList: string[]; // Should be array of ticker symbols
  // Alternative field names for API compatibility
  usageCount?: number;
}

export function UsageTracker() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to get next reset time (midnight in user's timezone)
  const getNextResetTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Set to midnight
    return tomorrow.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const { data: usage, isLoading } = useQuery<UsageData>({
    queryKey: ['/api/user/usage'],
    queryFn: async () => {
      const response = await fetch('/api/user/usage', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch usage data');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/upgrade', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to upgrade account');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Upgrade Successful!',
        description: 'You now have premium access with daily limits.',
      });
    },
    onError: () => {
      toast({
        title: 'Upgrade Failed',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || !usage) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = (usage.tickersUsed / usage.tickerLimit) * 100;
  const isNearLimit = progressPercentage >= 80;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ticker Usage
          </span>
          <Badge variant={usage.tier === 'premium' ? 'default' : 'secondary'}>
            {usage.tier === 'premium' ? (
              <>
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </>
            ) : (
              'Free'
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{usage.tickersUsed || usage.usageCount || 0} of {usage.tickerLimit || 10} tickers used</span>
            <span>
              {usage.remainingLimit || 0} remaining
              {usage.tier === 'premium' ? ' today' : ''}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className={`h-2 ${isNearLimit ? 'text-destructive' : ''}`}
          />
        </div>

        {/* Free Tickers Info */}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Always free:</span> {(usage.freeTickers || ['NVDA', 'TSLA', 'AAPL']).join(', ')}
        </div>

        {/* Warning when near/at limit */}
        {isNearLimit && (
          <Alert className={`${usage.isLimitReached ? 'border-destructive' : 'border-orange-500'}`}>
            <AlertCircle className={`h-4 w-4 ${usage.isLimitReached ? 'text-destructive' : 'text-orange-500'}`} />
            <AlertDescription className={`text-xs ${usage.isLimitReached ? 'text-destructive' : 'text-orange-600'}`}>
              {usage.isLimitReached ? (
                usage.tier === 'free' ? (
                  'Free limit reached! Upgrade for daily resets.'
                ) : (
                  'Daily limit reached. Resets tomorrow.'
                )
              ) : (
                `Only ${usage.remainingLimit} ticker${usage.remainingLimit === 1 ? '' : 's'} remaining${usage.tier === 'premium' ? ' today' : ''}!`
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Upgrade Button for Free Users */}
        {usage.tier === 'free' && (
          <Button
            onClick={() => upgradeMutation.mutate()}
            disabled={upgradeMutation.isPending}
            className="w-full text-xs h-8 bg-primary hover:bg-primary/90"
            size="sm"
          >
            {upgradeMutation.isPending ? (
              'Upgrading...'
            ) : (
              <>
                <Crown className="h-3 w-3 mr-1" />
                Upgrade to Premium ($5.99/month)
              </>
            )}
          </Button>
        )}

        {/* Premium Reset Info */}
        {usage.tier === 'premium' && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="text-center">
              Daily limit resets: {usage.usageResetDate && new Date().toDateString() === new Date(usage.usageResetDate).toDateString() ? 'Today' : 'Tomorrow'}
            </div>
            <div className="text-center">
              Your ticker count resets at {getNextResetTime()}
            </div>
          </div>
        )}

        {/* Recently Used Tickers */}
        {(usage.tickerList || []).length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Recent tickers:</div>
            <div className="flex flex-wrap gap-1">
              {(usage.tickerList || []).slice(0, 8).map((ticker, index) => (
                <Badge key={`${ticker}-${index}`} variant="outline" className="text-xs px-1 py-0">
                  {ticker}
                </Badge>
              ))}
              {(usage.tickerList || []).length > 8 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{(usage.tickerList || []).length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
