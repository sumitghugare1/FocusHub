import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-between p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20 backdrop-blur ring-1 ring-primary-foreground/30">
              <Image src="/gemini-svg.svg" alt="StudyHub logo" width={24} height={24} className="h-6 w-6" priority />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">FocusHub</span>
          </Link>

          {/* Content */}
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-primary-foreground leading-tight text-balance">
              Study Together,<br />Achieve More
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Join thousands of students who are transforming their study habits with virtual study rooms and Pomodoro timers.
            </p>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-3xl font-bold text-primary-foreground">50K+</p>
                <p className="text-sm text-primary-foreground/70">Active Students</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-foreground">2M+</p>
                <p className="text-sm text-primary-foreground/70">Study Hours</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-foreground">10K+</p>
                <p className="text-sm text-primary-foreground/70">Study Rooms</p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-primary-foreground/10 backdrop-blur rounded-xl p-6 max-w-md">
            <p className="text-primary-foreground/90 italic">
              &ldquo;FocusHub completely changed how I study. The Pomodoro timer and study rooms keep me focused and motivated.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">SC</span>
              </div>
              <div>
                <p className="text-sm font-medium text-primary-foreground">Sarah Chen</p>
                <p className="text-xs text-primary-foreground/70">Computer Science Student</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background ring-1 ring-border">
                <Image src="/gemini-svg.svg" alt="StudyHub logo" width={24} height={24} className="h-6 w-6" priority />
              </div>
              <span className="text-2xl font-bold text-foreground">FocusHub</span>
            </Link>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
}
