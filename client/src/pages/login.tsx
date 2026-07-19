import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ChartLine, ArrowLeft } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { Link } from "wouter";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { loginSchema, insertUserSchema, type LoginUser, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

const registerSchemaExtended = z.object({
  firstName: z.string().min(1, "Please tell us what to call you"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => {
  // If either password field is empty, don't show mismatch error
  if (!data.password || !data.confirmPassword) {
    return true;
  }
  return data.password === data.confirmPassword;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = { firstName: string; email: string; password: string; confirmPassword: string };

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchemaExtended),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = async (data: LoginUser) => {
    try {
      await loginMutation.mutateAsync(data);
      setShowSuccess(true);
      // Quick redirect after success message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const onRegisterSubmit = async (data: RegisterForm) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await registerMutation.mutateAsync(registerData);
      
      // Show success toast
      toast({
        title: "Account Created Successfully!",
        description: "Please sign in with your new account",
        variant: "default",
      });
      
      // Clear the registration form
      registerForm.reset();
      
      // Switch to login form after a brief delay
      setTimeout(() => {
        setIsRegistering(false);
      }, 500);
      
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "There was an error creating your account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Redirect to the OAuth endpoint
    const providerMap: { [key: string]: string } = {
      "Google": "/api/auth/google",
      "Facebook": "/api/auth/facebook"
    };
    
    const endpoint = providerMap[provider];
    if (endpoint) {
      window.location.href = endpoint;
    } else {
      toast({
        title: "Social Login",
        description: `${provider} login is not yet configured`,
        variant: "destructive",
      });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <ChartLine className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-primary">Should I buy this stock</h1>
            </div>
          </Link>

          {/* Back to Home */}
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-muted animate-gradient"></div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full space-y-8">
            {/* Logo and Branding */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4">
                <ChartLine className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-primary mb-2">Should I buy this stock</h1>
              <p className="text-muted-foreground">Financial intelligence at your fingertips</p>
            </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-bullish/20 border border-bullish rounded-lg p-4 text-bullish text-center">
              <ChartLine className="h-5 w-5 inline mr-2" />
              {isRegistering ? "Account created" : "Login"} successful! Redirecting...
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-card border-border text-foreground hover:bg-card-hover hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
              onClick={() => handleSocialLogin("Google")}
            >
              <FaGoogle className="mr-3 h-4 w-4 text-red-400" />
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-card border-border text-foreground hover:bg-card-hover hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
              onClick={() => handleSocialLogin("Facebook")}
            >
              <FaFacebook className="mr-3 h-4 w-4 text-blue-500" />
              Continue with Facebook
            </Button>
          </div>

          {/* OR Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">OR</span>
            </div>
          </div>

          {/* Toggle between Login and Register */}
          <div className="flex justify-center mb-6">
            <div className="bg-card p-1 rounded-lg border border-border">
              <Button
                type="button"
                variant={!isRegistering ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsRegistering(false)}
                className={!isRegistering ? "btn-premium" : "text-muted-foreground hover:text-primary"}
              >
                Sign In
              </Button>
              <Button
                type="button"
                variant={isRegistering ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsRegistering(true)}
                className={isRegistering ? "btn-premium" : "text-muted-foreground hover:text-primary"}
              >
                Sign Up
              </Button>
            </div>
          </div>

          {/* Login/Register Form */}
          {!isRegistering ? (
            <form className="space-y-6" onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-secondary mb-2">
                  Email address
                </Label>
                <Input
                  {...loginForm.register("email")}
                  type="email"
                  className="bg-card border-border text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring"
                  placeholder="Enter your email"
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    {...loginForm.register("password")}
                    type={showPassword ? "text" : "password"}
                    className="bg-card border-border text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring pr-12"
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-primary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me" />
                  <Label htmlFor="remember-me" className="text-sm text-secondary">
                    Remember me
                  </Label>
                </div>
                <Button type="button" variant="link" className="text-primary hover:text-primary-hover p-0">
                  Forgot your password?
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full btn-premium"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign in to your account"
                )}
              </Button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
              <div>
                <Label htmlFor="firstName" className="block text-sm font-medium text-secondary mb-2">
                  What do we call you
                </Label>
                <Input
                  {...registerForm.register("firstName")}
                  className="bg-card border-border text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring"
                  placeholder="e.g. John"
                />
                {registerForm.formState.errors.firstName && (
                  <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-secondary mb-2">
                  Email address
                </Label>
                <Input
                  {...registerForm.register("email")}
                  type="email"
                  className="bg-card border-border text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring"
                  placeholder="Enter your email"
                />
                {registerForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
                  Password
                </Label>
                <Input
                  {...registerForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  className="bg-card border-border text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring"
                  placeholder="Create a password"
                />
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary mb-2">
                  Confirm Password
                </Label>
                <Input
                  {...registerForm.register("confirmPassword")}
                  type={showPassword ? "text" : "password"}
                  className="bg-card border-border text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring"
                  placeholder="Confirm your password"
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full btn-premium"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating account...
                  </>
                ) : (
                  "Create your account"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <ChartLine className="h-5 w-5 text-white" />
              </div>
              <span className="text-primary font-semibold">Should I buy this stock</span>
            </div>
            <div className="text-muted-foreground text-sm">
              © 2025 Should I buy this stock. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
