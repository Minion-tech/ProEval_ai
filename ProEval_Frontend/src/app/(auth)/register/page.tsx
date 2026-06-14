"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const Page = () => {
  const router = useRouter()
  const { register: registerUser, verifyOTP, loading, isAuthenticated } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otp, setOtp] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    enrollment_no: '',
    programme: '',
    department: '',
    batch: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      await registerUser(formData)
      setSuccess('Registration successful! Please enter the OTP sent to your email.')
      setIsVerifying(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      await verifyOTP(formData.email, otp)
      router.push('/student/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{isVerifying ? 'Verify OTP' : 'Student Register'}</CardTitle>
              <CardDescription>
                {isVerifying 
                  ? `Enter the 6-digit code sent to ${formData.email}` 
                  : 'Create your account by filling in the details'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-100 text-green-700 rounded text-sm">
                  {success}
                </div>
              )}

              {!isVerifying ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} required />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@university.edu" value={formData.email} onChange={handleChange} required />
                  </div>

                  <div>
                    <Label htmlFor="enrollment_no">Enrollment No</Label>
                    <Input id="enrollment_no" placeholder="Enter enrollment number" value={formData.enrollment_no} onChange={handleChange} required />
                  </div>

                  <div>
                    <Label htmlFor="programme">Programme</Label>
                    <Input id="programme" placeholder="B.Tech / BCA / MCA..." value={formData.programme} onChange={handleChange} required />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" placeholder="CSE / IT / Mechanical..." value={formData.department} onChange={handleChange} required />
                  </div>

                  <div>
                    <Label htmlFor="batch">Batch</Label>
                    <Input id="batch" placeholder="2022 - 2026" value={formData.batch} onChange={handleChange} required />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Create password" 
                      value={formData.password} 
                      onChange={handleChange} 
                      required 
                      className={formData.password.length > 0 && formData.password.length < 8 ? "border-red-500" : ""}
                    />
                    <p className={`text-[10px] mt-1 ${formData.password.length >= 8 ? "text-green-600" : "text-gray-500"}`}>
                      {formData.password.length} / 8 characters minimum
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    type="submit" 
                    disabled={loading || formData.password.length < 8}
                  >
                    {loading ? 'Sending OTP...' : 'Register'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="otp">One-Time Password</Label>
                    <Input 
                      id="otp" 
                      placeholder="Enter 6-digit OTP" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value)} 
                      required 
                      maxLength={6}
                    />
                  </div>
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Complete'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setIsVerifying(false)}
                    disabled={loading}
                  >
                    Back to Registration
                  </Button>
                </form>
              )}
              
              <div className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{' '}
                <button 
                  onClick={() => router.push('/login')}
                  className="text-primary hover:underline font-medium"
                >
                  Login
                </button>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}

export default Page