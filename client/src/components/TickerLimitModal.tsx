import React from 'react';
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Zap, TrendingUp } from "lucide-react";
import { useLogout } from "@/hooks/use-auth";

interface TickerLimitModalProps {
  isOpen: boolean;
  onUpgrade: () => void;
}

export function TickerLimitModal({ isOpen, onUpgrade }: TickerLimitModalProps) {
  const logoutMutation = useLogout();

  const handleSignOut = () => {
    logoutMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#1E2227] border border-[#2A2F36] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 via-transparent to-accent-blue/10" />
        
        <div className="relative py-8 px-6 text-center">
          {/* Icon */}
          <div className="relative mb-6">
            <Crown className="h-20 w-20 mx-auto text-accent-purple drop-shadow-lg" />
            <Zap className="h-8 w-8 absolute -top-2 -right-2 text-accent-amber animate-pulse" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Ticker Limit Reached
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-6 leading-relaxed">
            You've reached your limit of 10 free tickers. Upgrade to premium for unlimited access 
            to all tickers, AI analysis, and advanced features.
          </p>

          {/* Features */}
          <div className="mb-8">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Crown className="h-4 w-4 text-accent-purple" />
                <span>Unlimited ticker access</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Zap className="h-4 w-4 text-accent-amber" />
                <span>AI-powered analysis</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-accent-blue" />
                <span>Advanced sentiment analysis</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/90 hover:to-accent-blue/90 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Premium
            </Button>
            
            <Button 
              onClick={handleSignOut}
              variant="outline" 
              className="w-full border-[#2A2F36] text-muted-foreground hover:text-foreground hover:bg-[#2A2F36] py-3"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Trust indicator */}
          <p className="text-xs text-muted-foreground mt-4">
            Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
