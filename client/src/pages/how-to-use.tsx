import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLine, Search, BarChart3, Brain, TrendingUp } from "lucide-react";

export default function HowToUsePage() {
  const steps = [
    {
      icon: Search,
      title: "Search for a Stock",
      description: "Enter any stock ticker symbol (like AAPL, TSLA, MSFT) in our search bar to get started with your analysis."
    },
    {
      icon: BarChart3,
      title: "View Primary Details",
      description: "Get an overview of recent news, price movements, and key events that are driving the stock's current performance."
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Our AI analyzes market data, technical indicators, and sentiment to provide you with intelligent insights and price targets."
    },
    {
      icon: TrendingUp,
      title: "Make Informed Decisions",
      description: "Use our comprehensive fundamentals, technical analysis, and sentiment data to decide whether to buy, hold, or avoid the stock."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer">
              <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <ChartLine className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Should I buy this stock</h1>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center space-x-6">
            <Link href="/pricing">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Pricing
              </Button>
            </Link>
            <Link href="/how-to-use">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                How to use this site
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                About us
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            How to Use Our Platform
          </h1>
          <p className="text-xl text-slate-300 mb-12">
            Learn how to analyze any stock in just 4 simple steps and make smarter investment decisions.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-green-500 font-medium">Step {index + 1}</div>
                      <CardTitle className="text-white">{step.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="py-20 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            What You'll Get in Each Analysis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Primary Details</h3>
              <p className="text-slate-400 text-sm">
                Latest news, market movements, and key events affecting the stock today.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Analysis</h3>
              <p className="text-slate-400 text-sm">
                Machine learning insights, risk assessment, and intelligent price targets.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fundamentals</h3>
              <p className="text-slate-400 text-sm">
                Financial metrics, valuation analysis, and company health indicators.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Technical Analysis</h3>
              <p className="text-slate-400 text-sm">
                Chart patterns, support/resistance levels, and technical indicators.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sentiment Analysis</h3>
              <p className="text-slate-400 text-sm">
                Retail vs professional investor sentiment and market psychology.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Watchlist</h3>
              <p className="text-slate-400 text-sm">
                Save and track your favorite stocks for ongoing analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Analyzing?
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Sign up now and get instant access to comprehensive stock analysis tools.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center space-x-4 cursor-pointer">
                <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <ChartLine className="h-5 w-5 text-white" />
                </div>
                <span className="text-white font-semibold">Should I buy this stock</span>
              </div>
            </Link>
            <div className="text-slate-400 text-sm">
              © 2025 Should I buy this stock. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}