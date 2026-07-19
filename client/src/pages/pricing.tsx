import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLine, Check } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      features: [
        "10 stock lookups per month",
        "Basic stock analysis",
        "Essential metrics",
        "Email support",
        "Mobile access"
      ],
      popular: false
    },
    {
      name: "Starter",
      price: "$5.99",
      period: "/month",
      features: [
        "30 stock lookups per month",
        "Advanced analysis features",
        "Technical indicators",
        "Priority email support",
        "Historical data access",
        "Mobile app access"
      ],
      popular: true
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "/month",
      features: [
        "60 stock lookups per month",
        "AI-powered insights & recommendations",
        "Advanced risk assessment",
        "Real-time alerts",
        "Portfolio tracking",
        "Advanced charting tools",
        "Priority support",
        "Export capabilities"
      ],
      popular: false
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Select the perfect plan for your investment analysis needs. 
            All plans include our core features with varying limits and premium options.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`bg-slate-800 border-slate-700 relative ${
                  plan.popular ? 'ring-2 ring-green-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-white text-2xl mb-4">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-white mb-2">
                    {plan.price}
                    <span className="text-lg font-normal text-slate-400">{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href="/login">
                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-slate-700 hover:bg-slate-600'
                      } text-white`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 bg-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-slate-400">
                Yes, you can upgrade or downgrade your plan at any time. 
                Changes will be reflected in your next billing cycle.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-slate-400">
                We offer a 7-day free trial for all new users. 
                No credit card required to get started.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-400">
                We accept all major credit cards, PayPal, and bank transfers 
                for Enterprise customers.
              </p>
            </div>
          </div>
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