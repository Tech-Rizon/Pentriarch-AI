'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Shield, Zap, Brain, Target, Activity, Users, Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/lib/supabase'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const user = await getCurrentUser()
      setIsLoggedIn(!!user)
    } catch (error) {
      console.error('Failed to check user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
                <Image
                  src="/logo_64x64.png"
                  alt="Pentriarch AI Logo"
                  width={40}
                  height={40}
                  className="rounded-md"
                />
                <h1 className="text-2xl font-bold text-white">Pentriarch AI</h1>
              </div>

            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Premium
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            {!isLoggedIn ? (
              <>
                <Button
                  variant="ghost"
                  className="text-slate-300 hover:text-white"
                  onClick={() => router.push('/auth')}
                  disabled={isLoading}
                >
                  Sign In
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => router.push('/auth')}
                  disabled={isLoading}
                >
                  Get Started
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-slate-300 hover:text-white"
                  onClick={() => router.push('/dashboard')}
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="text-slate-300 hover:text-white"
                  onClick={() => router.push('/dashboard')}
                >
                  Console
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-white mb-6">
            AI-Powered Penetration Testing
            <span className="text-emerald-400"> Made Simple</span>
          </h2>
          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
            Transform your security testing with advanced AI that interprets natural language prompts
            and executes professional penetration testing workflows in secure containers.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4"
              onClick={() => router.push(isLoggedIn ? '/dashboard' : '/auth')}
              disabled={isLoading}
            >
              <Zap className="mr-2 h-5 w-5" />
              {isLoggedIn ? 'Open Console' : 'Start Free Scan'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-4"
              onClick={() => router.push('/dashboard')}
              disabled={isLoading}
            >
              <Brain className="mr-2 h-5 w-5" />
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all">
            <CardHeader>
              <Brain className="h-12 w-12 text-emerald-400 mb-4" />
              <CardTitle className="text-white">Advanced AI Models</CardTitle>
              <CardDescription className="text-slate-400">
                GPT-4, Claude Sonnet, and DeepSeek V2 for intelligent command generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Model Selection</span>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">Auto</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Fallback Logic</span>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">✓</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Context Awareness</span>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">✓</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all">
            <CardHeader>
              <Target className="h-12 w-12 text-blue-400 mb-4" />
              <CardTitle className="text-white">Security Tools Arsenal</CardTitle>
              <CardDescription className="text-slate-400">
                Comprehensive suite of industry-standard penetration testing tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Nmap, Nikto, SQLMap</span>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400">Ready</Badge>
                </div>
                <div className="flex justify-between">
                  <span>WPScan, Gobuster</span>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400">Ready</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Custom Commands</span>
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">Pro</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all">
            <CardHeader>
              <Activity className="h-12 w-12 text-purple-400 mb-4" />
              <CardTitle className="text-white">Real-time Monitoring</CardTitle>
              <CardDescription className="text-slate-400">
                Live scan progress, logs, and instant vulnerability reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Live Progress</span>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400">WebSocket</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Audit Trail</span>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Complete</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Export Reports</span>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">PDF</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Plans Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-white mb-4">Choose Your Security Level</h3>
          <p className="text-slate-400 text-lg">From hobbyist to enterprise-grade security testing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* PentRizon - Free/Pro */}
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">PentRizon</CardTitle>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400">Starter</Badge>
              </div>
              <CardDescription className="text-slate-400">
                Perfect for small projects, startups, and learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-white">Free - Pro</div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-green-400 mr-2" />
                    GPT-4 Mini & Claude Haiku
                  </div>
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-green-400 mr-2" />
                    Basic Security Tools
                  </div>
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-green-400 mr-2" />
                    5 Scans/Day (Free)
                  </div>
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-green-400 mr-2" />
                    Token-based Billing
                  </div>
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => router.push('/auth')}
                  disabled={isLoading}
                >
                  Start Free
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pentriarch - Enterprise */}
          <Card className="bg-slate-800/50 border-emerald-600/50 hover:bg-slate-800/70 transition-all relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-emerald-600 text-white px-4 py-1">Most Popular</Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Pentriarch</CardTitle>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">Premium</Badge>
              </div>
              <CardDescription className="text-slate-400">
                Enterprise-grade AI for large organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-white">Enterprise</div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-emerald-400 mr-2" />
                    GPT-4, Claude Sonnet & DeepSeek V2
                  </div>
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-emerald-400 mr-2" />
                    Advanced Reasoning Models
                  </div>
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-emerald-400 mr-2" />
                    Unlimited Scans
                  </div>
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-emerald-400 mr-2" />
                    Priority Support
                  </div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => router.push('/auth')}
                  disabled={isLoading}
                >
                  Contact Sales
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Custom Enterprise */}
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Custom</CardTitle>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">Enterprise</Badge>
              </div>
              <CardDescription className="text-slate-400">
                Tailored solutions for complex environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-white">Custom</div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-purple-400 mr-2" />
                    Dedicated Infrastructure
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-purple-400 mr-2" />
                    Custom AI Training
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-purple-400 mr-2" />
                    White-label Options
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-purple-400 mr-2" />
                    24/7 Support
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/20"
                  onClick={() => router.push('/auth')}
                  disabled={isLoading}
                >
                  Contact Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Image
                src="/logo_64x64.png"
                alt="Pentriarch Footer Logo"
                width={24}
                height={24}
                className="rounded-sm"
              />
              <span className="text-white font-semibold">Pentriarch AI</span>
              <span className="text-slate-400">by TechRizon</span>
            </div>
            <div className="flex items-center space-x-6 text-slate-400">
              <a href="/docs" className="hover:text-white transition-colors">Documentation</a>
              <a href="/security" className="hover:text-white transition-colors">Security</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/support" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 text-center text-slate-500">
            <p>&copy; 2025 TechRizon. Built with ❤️ for cybersecurity automation.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
