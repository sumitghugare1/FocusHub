'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)

    const response = await fetch('/api/auth/admin-sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setError(payload?.error ?? 'Unable to sign in as admin')
      setIsLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Shield className="h-3.5 w-3.5" />
          Admin Access Only
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin sign in</h1>
        <p className="text-muted-foreground">Use the dedicated admin credentials to access the admin panel.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Admin Email</FieldLabel>
            <Input id="email" name="email" type="email" placeholder="admin@example.com" required disabled={isLoading} />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin password"
                required
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </FieldGroup>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in as admin'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Need user access instead?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Go to user login
        </Link>
      </p>
    </div>
  )
}
