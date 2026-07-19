import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChartLine, Users, Target, Shield } from "lucide-react";

export default function AboutPage() {
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
            About Our Platform
          </h1>
          <p className="text-xl text-slate-300 mb-12">
            We're on a mission to democratize smart investing by providing professional-grade 
            stock analysis tools to everyone.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                Traditional investment research has been the domain of Wall Street professionals 
                with access to expensive tools and data. We believe that every investor deserves 
                access to the same quality of analysis and insights.
              </p>
              <p className="text-slate-300 text-lg leading-relaxed">
                Our platform combines artificial intelligence, comprehensive market data, and 
                intuitive design to help you make informed investment decisions with confidence.
              </p>
            </div>
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500 mb-2">10k+</div>
                  <div className="text-slate-400 text-sm">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500 mb-2">500k+</div>
                  <div className="text-slate-400 text-sm">Analyses Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-500 mb-2">99.9%</div>
                  <div className="text-slate-400 text-sm">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500 mb-2">24/7</div>
                  <div className="text-slate-400 text-sm">Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-20 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Our Core Values
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Accuracy First</h3>
              <p className="text-slate-400">
                We prioritize data accuracy and analysis quality above all else. 
                Our algorithms are constantly refined to provide the most reliable insights.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">User-Centric</h3>
              <p className="text-slate-400">
                Every feature we build is designed with our users in mind. 
                We listen to feedback and continuously improve the platform based on your needs.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Transparency</h3>
              <p className="text-slate-400">
                We believe in transparent methodologies and clear explanations. 
                You'll always understand how we arrive at our analysis and recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Built by Finance & Technology Experts
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-12">
            Our team combines decades of experience in financial markets, quantitative analysis, 
            and software engineering. We've worked at leading investment firms, fintech companies, 
            and technology giants to bring you institutional-quality analysis tools.
          </p>
          
          <div className="bg-slate-800 p-8 rounded-lg border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4">Our Expertise Spans</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-slate-300">Quantitative Finance</div>
              <div className="text-slate-300">Machine Learning</div>
              <div className="text-slate-300">Market Analysis</div>
              <div className="text-slate-300">Risk Management</div>
              <div className="text-slate-300">Software Engineering</div>
              <div className="text-slate-300">Data Science</div>
              <div className="text-slate-300">UI/UX Design</div>
              <div className="text-slate-300">Financial Research</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 bg-slate-800/50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Thousands of Smart Investors
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Start making better investment decisions today with our comprehensive analysis platform.
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