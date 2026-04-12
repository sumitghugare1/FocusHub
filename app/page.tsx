import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Timer,
  Users,
  BarChart3,
  Trophy,
  Target,
  Brain,
  Clock,
  ArrowRight,
  Check,
  Star,
  Github,
  Twitter,
  Flame,
} from 'lucide-react'

const features = [
  {
    icon: Timer,
    title: 'Pomodoro Timer',
    description: 'Stay focused with customizable work sessions. Track your progress with detailed statistics.',
  },
  {
    icon: Users,
    title: 'Virtual Study Rooms',
    description: 'Join or create study rooms. Study together with peers from around the world.',
  },
  {
    icon: BarChart3,
    title: 'Detailed Analytics',
    description: 'Track your study habits with comprehensive charts and insights over time.',
  },
  {
    icon: Trophy,
    title: 'Gamification',
    description: 'Earn badges, maintain streaks, and compete on leaderboards for extra motivation.',
  },
  {
    icon: Target,
    title: 'Goal Setting',
    description: 'Set daily and weekly study goals. Get reminders to stay on track.',
  },
  {
    icon: Brain,
    title: 'Focus Mode',
    description: 'Eliminate distractions with our immersive focus mode and ambient sounds.',
  },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Computer Science Student',
    avatar: '/avatars/sarah.jpg',
    content: 'FocusHub transformed my study habits. The Pomodoro timer and study rooms keep me accountable and motivated.',
  },
  {
    name: 'Mike Rodriguez',
    role: 'Medical Student',
    avatar: '/avatars/mike.jpg',
    content: 'The analytics feature helped me understand my peak productivity hours. Now I study smarter, not harder.',
  },
  {
    name: 'Emma Wilson',
    role: 'Graduate Student',
    content: 'I love the gamification aspects! The badges and streaks make studying feel rewarding.',
  },
]

const stats = [
  { value: '50K+', label: 'Active Students' },
  { value: '2M+', label: 'Study Hours' },
  { value: '10K+', label: 'Study Rooms' },
  { value: '99%', label: 'Satisfaction' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/gemini-svg.svg"
              alt="FocusHub"
              width={250}
              height={58}
              className="h-11 w-auto"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-foreground/80 hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#testimonials" className="text-sm text-foreground/80 hover:text-primary transition-colors">
              Testimonials
            </Link>
            <Link href="#pricing" className="text-sm text-foreground/80 hover:text-primary transition-colors">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5">
              <Flame className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
              Join 50,000+ students studying smarter
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Study Together,{' '}
              <span className="text-primary">Achieve More</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground lg:text-xl text-balance">
              Transform your study sessions with virtual study rooms, Pomodoro timers,
              and detailed analytics. Stay motivated with gamification and compete on leaderboards.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/register">
                  Start Studying Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/rooms">
                  Browse Study Rooms
                </Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="mt-12 flex items-center justify-center gap-4">
              <div className="flex -space-x-2">
                {['S', 'M', 'E', 'J'].map((initial, i) => (
                  <Avatar key={i} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                Loved by 10,000+ students
              </span>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-16 lg:mt-24">
            <div className="relative mx-auto max-w-5xl">
              <div className="rounded-xl border border-border bg-card p-2 shadow-2xl shadow-primary/10">
                <div className="rounded-lg bg-muted/50 p-4 lg:p-8">
                  {/* Mock Dashboard Preview */}
                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* Timer Card */}
                    <Card className="lg:col-span-1">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center">
                          <div className="relative h-32 w-32">
                            <div className="absolute inset-0 rounded-full border-4 border-muted" />
                            <div
                              className="absolute inset-0 rounded-full border-4 border-primary"
                              style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% 75%, 0 75%)',
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl font-bold text-foreground">18:45</span>
                            </div>
                          </div>
                          <p className="mt-4 text-sm text-muted-foreground">Focus Session</p>
                          <Badge className="mt-2">Session 2 of 4</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stats Preview */}
                    <Card className="lg:col-span-2">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Today&apos;s Progress</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">2h 15m</p>
                            <p className="text-xs text-muted-foreground">Study Time</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-2xl font-bold text-foreground">5</p>
                            <p className="text-xs text-muted-foreground">Sessions</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-2xl font-bold text-primary">12</p>
                            <p className="text-xs text-muted-foreground">Day Streak</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <div className="absolute -left-4 top-1/4 hidden lg:block">
                <Card className="w-48 shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">3 studying now</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">Deep Work Zone</p>
                  </CardContent>
                </Card>
              </div>
              <div className="absolute -right-4 bottom-1/4 hidden lg:block">
                <Card className="w-44 shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-foreground">Badge Earned!</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Focus Master</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl font-bold text-primary lg:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
              Everything you need to study effectively
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful tools designed to boost your productivity and keep you motivated.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Get started in 3 simple steps
            </h2>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {[
              { step: '01', title: 'Create an Account', description: 'Sign up for free in seconds. No credit card required.' },
              { step: '02', title: 'Join a Study Room', description: 'Browse available rooms or create your own and invite friends.' },
              { step: '03', title: 'Start Focusing', description: 'Use the Pomodoro timer and track your progress with analytics.' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-primary/10">{item.step}</div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
                {index < 2 && (
                  <div className="absolute right-0 top-8 hidden lg:block">
                    <ArrowRight className="h-6 w-6 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Loved by students worldwide
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50 bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-foreground">&ldquo;{testimonial.content}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback>{testimonial.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/30 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start for free. Upgrade when you need more.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {/* Free Plan */}
            <Card className="border-border/50">
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold text-foreground">Free</h3>
                <p className="mt-2 text-sm text-muted-foreground">Perfect for getting started</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {['Basic Pomodoro timer', 'Join 3 rooms/day', 'Weekly analytics', '5 friends'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-8 w-full" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary bg-card shadow-lg shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-3">Most Popular</Badge>
              </div>
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold text-foreground">Pro</h3>
                <p className="mt-2 text-sm text-muted-foreground">For serious students</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-foreground">$9</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {['Advanced timer modes', 'Unlimited rooms', 'Detailed analytics', 'Unlimited friends', 'Priority support', 'Custom themes'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" asChild>
                  <Link href="/register">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Team Plan */}
            <Card className="border-border/50">
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold text-foreground">Team</h3>
                <p className="mt-2 text-sm text-muted-foreground">For study groups</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-foreground">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {['Everything in Pro', 'Up to 50 members', 'Team analytics', 'Admin dashboard', 'Custom branding', 'API access'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-8 w-full" asChild>
                  <Link href="/register">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 lg:px-16 lg:py-24">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                Ready to boost your productivity?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                Join thousands of students who are already studying smarter with FocusHub.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/register">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center">
                <Image
                  src="/gemini-svg.svg"
                  alt="FocusHub"
                  width={250}
                  height={58}
                  className="h-11 w-auto"
                />
              </Link>
              <p className="mt-4 text-sm text-foreground/75">
                Transform your study sessions with virtual rooms and productivity tools.
              </p>
              <div className="mt-4 flex gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <a href="#" aria-label="Twitter">
                    <Twitter className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#" aria-label="GitHub">
                    <Github className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="mt-4 space-y-3">
                {['Features', 'Pricing', 'Study Rooms', 'Analytics'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Company</h4>
              <ul className="mt-4 space-y-3">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="mt-4 space-y-3">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FocusHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
