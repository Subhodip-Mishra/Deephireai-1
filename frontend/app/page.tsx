"use client";

import { useState, useEffect } from "react";
import {
  ArrowRight,
  Upload,
  Shield,
  Zap,
  Target,
  Users,
  Bot,
  CheckCircle2,
  Mail,
  Star,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Play,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Award,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

// ModeToggle Component
function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { name: "light", icon: Sun },
    { name: "dark", icon: Moon },
  ];

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-1">
      {themes.map(({ name, icon: Icon }) => (
        <button
          key={name}
          onClick={() => setTheme(name)}
          className={`p-1.5 rounded-full transition-all duration-200 ease-in-out ${theme === name
              ? "bg-blue-500 text-white"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          aria-label={`Switch to ${name} theme`}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNewsletterSubmit = (e: any) => {
    e.preventDefault();
    alert(`Subscribed with ${email}`);
    setEmail("");
  };

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Question Generation",
      description: "Advanced algorithms analyze your resume and generate personalized interview questions tailored to your experience and target role.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Performance Analytics",
      description: "Get instant feedback on communication skills, technical depth, confidence levels, and areas for improvement with detailed metrics.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Shield,
      title: "Enterprise-Grade Security",
      description: "Your personal data is protected with military-grade encryption, SOC 2 compliance, and strict privacy protocols.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Bot,
      title: "Natural Voice Interaction",
      description: "Practice with our advanced AI interviewer that understands context, tone, and provides human-like conversational flow.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Award,
      title: "Industry-Specific Training",
      description: "Specialized mock interviews for tech, finance, healthcare, consulting, and more with role-specific question banks.",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Clock,
      title: "Flexible Practice Sessions",
      description: "Train anytime, anywhere with sessions ranging from quick 15-minute practices to comprehensive hour-long interviews.",
      color: "from-teal-500 to-blue-500",
    },
  ];

  const steps = [
    {
      step: 1,
      title: "Upload & Analyze",
      description: "Upload your resume and job description. Our AI performs deep analysis to understand your background and target role.",
      icon: Upload,
      details: ["PDF parsing", "Skills extraction", "Experience mapping", "Role matching"],
    },
    {
      step: 2,
      title: "Practice & Engage",
      description: "Engage in realistic mock interviews with AI-generated questions via voice or text in a pressure-free environment.",
      icon: Bot,
      details: ["Voice recognition", "Natural conversation", "Adaptive questioning", "Real-time responses"],
    },
    {
      step: 3,
      title: "Analyze & Improve",
      description: "Receive comprehensive feedback with actionable insights, performance metrics, and personalized improvement plans.",
      icon: TrendingUp,
      details: ["Performance scoring", "Improvement areas", "Progress tracking", "Success strategies"],
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Senior Software Engineer at Google",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b566?w=150",
      quote: "DeepHireAI transformed my interview preparation. The AI-generated questions were incredibly realistic and helped me land my dream role at Google. The feedback was spot-on and actionable.",
      rating: 5,
      company: "Google",
    },
    {
      name: "Michael Rodriguez",
      role: "Product Manager at Microsoft",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      quote: "The voice interaction feature made practice sessions feel authentic. I went from nervous to confident in just two weeks. Highly recommend for anyone serious about interview prep.",
      rating: 5,
      company: "Microsoft",
    },
    {
      name: "Emily Thompson",
      role: "Data Scientist at Netflix",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      quote: "The industry-specific questions and performance analytics gave me the edge I needed. DeepHireAI is a game-changer for technical interviews.",
      rating: 5,
      company: "Netflix",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for exploring our platform and basic interview preparation.",
      features: [
        "3 mock interviews per month",
        "Basic AI feedback",
        "Text-based interaction",
        "Standard question bank",
        "Performance summary",
      ],
      cta: "Start Free Trial",
      popular: false,
      color: "from-gray-400 to-gray-600",
    },
    {
      name: "Professional",
      price: "$29",
      originalPrice: "$49",
      description: "Comprehensive interview preparation for serious job seekers.",
      features: [
        "Unlimited mock interviews",
        "Advanced AI feedback & analytics",
        "Voice & text interaction",
        "Industry-specific questions",
        "Progress tracking dashboard",
        "Resume optimization tips",
        "Priority email support",
      ],
      cta: "Start Pro Trial",
      popular: true,
      color: "from-blue-500 to-purple-600",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Tailored solutions for teams, universities, and organizations.",
      features: [
        "Custom interview scenarios",
        "Team analytics dashboard",
        "Bulk user management",
        "API access & integrations",
        "Dedicated account manager",
        "Custom branding options",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
      popular: false,
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 text-gray-900 dark:text-white relative overflow-hidden scroll-smooth">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-cyan-300/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-700/50"
            : "bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">DeepHireAI</h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">AI Interview Mastery</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-white transition-colors">
                Process
              </a>
              <a href="#pricing" className="text-gray-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-white transition-colors">
                Pricing
              </a>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl">
                Get Started
              </button>
              <ModeToggle />
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-full px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-600 dark:text-slate-300">AI-Powered Interview Success Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
              Master Your Interviews with{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                DeepHireAI
              </span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your interview performance with AI-driven preparation. Upload your resume, practice with realistic scenarios, and receive expert feedback to land your dream job.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-blue-500/25 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center group">
                <Link href="/resume">Start Free Trial</Link>
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:border-gray-400 dark:hover:border-slate-500 transition-all duration-300 flex items-center">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500 dark:text-blue-400 mb-2">95%</div>
                <p className="text-gray-500 dark:text-slate-400">Success Rate</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-500 dark:text-purple-400 mb-2">50K+</div>
                <p className="text-gray-500 dark:text-slate-400">Interviews Practiced</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-500 dark:text-cyan-400 mb-2">500+</div>
                <p className="text-gray-500 dark:text-slate-400">Companies</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Why Choose <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">DeepHireAI</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              Advanced AI technology meets proven interview strategies to give you the competitive edge you need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl p-8 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${feature.color} mb-6`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Simple <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">3-Step Process</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              Our streamlined approach gets you interview-ready in minutes, not hours.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transform -translate-y-1/2"></div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {steps.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl p-8 text-center relative z-10 hover:shadow-lg transition-all duration-300">
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {step.step}
                    </div>

                    <div className="mt-8 mb-6">
                      <step.icon className="h-12 w-12 mx-auto text-blue-500 dark:text-blue-400 mb-4" />
                      <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{step.title}</h3>
                      <p className="text-gray-600 dark:text-slate-300 mb-6">{step.description}</p>
                    </div>

                    <div className="space-y-2">
                      {step.details.map((detail, i) => (
                        <div key={i} className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Success <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Stories</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              Join thousands of professionals who've transformed their careers with DeepHireAI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl p-8 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center mb-6">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{testimonial.role}</p>
                  </div>
                </div>

                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                <p className="text-gray-600 dark:text-slate-300 mb-4 italic">"{testimonial.quote}"</p>

                <div className="text-xs text-gray-500 dark:text-slate-500 font-medium">
                  Hired at {testimonial.company}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Choose Your <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Success Plan</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              Flexible pricing options designed to fit your career goals and budget.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm border rounded-2xl p-8 transition-all duration-300 hover:scale-105 ${plan.popular
                    ? "border-blue-500/50 shadow-2xl shadow-blue-500/20"
                    : "border-gray-200 dark:border-slate-700/50 hover:border-gray-300 dark:hover:border-slate-600/50"
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    {plan.originalPrice && (
                      <span className="text-lg text-gray-500 dark:text-slate-500 line-through mr-2">${plan.originalPrice}</span>
                    )}
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price === "Custom" ? plan.price : `$${plan.price}`}
                    </span>
                    {plan.price !== "Custom" && plan.price !== "Free" && (
                      <span className="text-gray-500 dark:text-slate-400">/month</span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-slate-400">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-600 dark:text-slate-300">
                      <CheckCircle2 className="h-5 w-5 mr-3 text-green-500 dark:text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-full font-semibold transition-all duration-300 ${plan.popular
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
                      : "border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-gray-400 dark:hover:border-slate-500"
                    }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
            Ready to <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Transform</span> Your Career?
          </h2>
          <p className="text-xl text-gray-600 dark:text-slate-300 mb-10">
            Join thousands of successful professionals who've mastered their interviews with DeepHireAI. Start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-4 rounded-full font-semibold text-lg shadow-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center group">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-10 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-all duration-300">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">DeepHireAI</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">AI Interview Mastery</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm">
                Empowering professionals worldwide with AI-driven interview preparation and career success tools.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                {["Features", "Pricing", "API", "Enterprise"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resources</h4>
              <ul className="space-y-2">
                {["Blog", "Help Center", "Privacy", "Terms"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stay Connected</h4>
              <form onSubmit={handleNewsletterSubmit} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="flex-1 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-full px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                </div>
              </form>
              <div className="flex space-x-3">
                {[Twitter, Linkedin, Facebook, Instagram].map((Icon, idx) => (
                  <a
                    key={idx}
                    href="#"
                    className="text-gray-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-800 mt-8 pt-8 text-center text-gray-500 dark:text-slate-400 text-sm">
            © {new Date().getFullYear()} DeepHireAI. All rights reserved. Built with enterprise-grade security and privacy.
          </div>
        </div>
      </footer>
    </div>
  );
}