'use client';

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { RootState } from '@/lib/store/store';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 }
  },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();

  const handleGetStarted = () => {
    if (user) {
      const roleMap: Record<string, string> = {
        SUPER_ADMIN: '/dashboard/super-admin',
        SCHOOL_ADMIN: '/dashboard/school',
        TEACHER: '/dashboard/teacher',
        STUDENT: '/dashboard/student',
      };
      router.push(roleMap[user.role] || '/dashboard');
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
      <LandingNavbar />

      {/* Hero Section - Full Viewport with Video */}
      <section className="relative overflow-hidden min-h-screen flex items-center justify-center">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-105"
            style={{ minHeight: '100%', minWidth: '100%' }}
            onError={(e) => {
              const video = e.currentTarget;
              video.style.display = 'none';
            }}
          >
            <source src="/course-video.mp4" type="video/mp4" />
          </video>
          {/* Gradient Overlay - More sophisticated */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-indigo-900/30" />
        </div>
        
        {/* Floating Particles/Shapes for Depth */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center"
          >
            {/* Logo and Brand */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center justify-center gap-3 mb-8"
            >
              <div className="h-16 w-20 bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 shadow-2xl" />
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white drop-shadow-2xl tracking-tight">
                Agora
              </h1>
            </motion.div>
            
            {/* Main Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-2xl md:text-3xl lg:text-4xl text-white mb-6 font-bold drop-shadow-xl"
            >
              Digital Education Identity Platform
            </motion.p>
            
            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-lg md:text-xl text-white/95 max-w-4xl mx-auto mb-12 leading-relaxed drop-shadow-lg"
            >
              A Chain-of-Trust Registry for lifelong Digital Education Identity in Africa.
              Every student gets a permanent, verifiable academic record that follows them
              throughout their educational journey.
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button 
                size="md" 
                onClick={handleGetStarted}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl hover:shadow-blue-500/50 transition-all duration-300"
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
              </Button>
              <Link href="#how-it-works">
                <Button 
                  variant="outline" 
                  size="md"
                  className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm shadow-xl"
                >
                  Learn More
                </Button>
              </Link>
            </motion.div>
            
            {/* Trust Indicators / Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16"
            >
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">100+</div>
                <div className="text-white/80 text-sm md:text-base">Schools</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">50K+</div>
                <div className="text-white/80 text-sm md:text-base">Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">1M+</div>
                <div className="text-white/80 text-sm md:text-base">Records</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">100%</div>
                <div className="text-white/80 text-sm md:text-base">Secure</div>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
          >
            <Link href="#how-it-works" className="flex flex-col items-center text-white/80 hover:text-white transition-colors">
              <span className="text-sm mb-2">Scroll to explore</span>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* What is Agora Section */}
      <section id="how-it-works" className="py-24 bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] relative overflow-hidden">
        {/* Decorative gradient elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 dark:bg-blue-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/30 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        </div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }} />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              What is Agora?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Agora is not just another Learning Management System. We're building
              <span className="font-semibold text-blue-600 dark:text-blue-400"> Infrastructure-as-a-Service </span>
              for education—a Chain-of-Trust Registry where schools verify teachers,
              teachers verify data, and parents claim their children's digital identities.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 border-blue-100 dark:border-blue-900 hover:border-blue-400 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-[var(--light-card)] dark:bg-[var(--dark-surface)]">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl dark:text-white">Chain-of-Trust</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Schools verify Teachers → Teachers verify Data → Parents claim the Data.
                    Every record is cryptographically signed and immutable once claimed.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 border-blue-100 dark:border-blue-900 hover:border-blue-400 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-[var(--light-card)] dark:bg-[var(--dark-surface)]">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl dark:text-white">Shadow Profiles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Students exist as unclaimed "Shadow Records" uploaded by schools.
                    Parents verify and claim these profiles using OTP, creating a secure
                    handshake that locks the identity.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 border-blue-100 dark:border-blue-900 hover:border-blue-400 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-[var(--light-card)] dark:bg-[var(--dark-surface)]">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl dark:text-white">Lifelong Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Each student receives a Universal ID (UID) that follows them
                    throughout their academic journey, even when transferring between schools.
                    Complete academic history, verified and portable.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-24 bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 dark:bg-blue-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Who is Agora For?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Built for the entire education ecosystem in Africa
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <motion.div variants={fadeInUp}>
              <Card className="h-full text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border-0 shadow-lg">
                <CardHeader>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl dark:text-white mb-3">For Schools</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    White-label portals to capture student data at the source.
                    Manage enrollments, teachers, and academic records with
                    complete control and verification.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border-0 shadow-lg">
                <CardHeader>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl dark:text-white mb-3">For Parents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Claim and access your children's digital education identity.
                    View academic records, grades, and attendance in one secure place.
                    Transfer requests made simple.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border-0 shadow-lg">
                <CardHeader>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl dark:text-white mb-3">For Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Your lifelong digital education identity. Access your complete
                    academic history, verified grades, and credentials that follow
                    you from primary school to university.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border-0 shadow-lg">
                <CardHeader>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl dark:text-white mb-3">For Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Record grades and attendance with cryptographic signatures.
                    Your verification creates trusted academic records that
                    cannot be tampered with.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-24 bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Key Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to manage and verify education identities
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="flex gap-6 p-6 rounded-2xl hover:bg-[var(--light-card)] dark:hover:bg-[var(--dark-surface)] transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Multi-Tenant Architecture
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Each school gets its own white-label portal with complete data isolation.
                  Perfect for school districts, private networks, and government systems.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="flex gap-6 p-6 rounded-2xl hover:bg-[var(--light-card)] dark:hover:bg-[var(--dark-surface)] transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Secure & Immutable
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Once a parent claims a student profile, it becomes locked and immutable.
                  Prevents identity fraud and ensures academic records remain trustworthy.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="flex gap-6 p-6 rounded-2xl hover:bg-[var(--light-card)] dark:hover:bg-[var(--dark-surface)] transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Seamless Transfers
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Transfer students between schools with complete academic history.
                  Debt checking ensures clean transfers, and all records remain
                  signed by the original school.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="flex gap-6 p-6 rounded-2xl hover:bg-[var(--light-card)] dark:hover:bg-[var(--dark-surface)] transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Offline-First
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Works offline with local data persistence. Sync when connection
                  is restored. Perfect for areas with unreliable internet connectivity.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to Transform Education in Africa?
            </h2>
            <p className="text-xl text-blue-50 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join schools, parents, and students building the future of
              digital education identity.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl hover:shadow-white/50 transition-all duration-300 text-lg px-10 py-6 font-semibold hover:scale-105"
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
              </Button>
              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/90 text-white hover:bg-white/10 backdrop-blur-sm shadow-xl text-lg px-10 py-6 font-semibold hover:scale-105 transition-all duration-300"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white text-xl font-bold mb-4">Agora</h3>
              <p className="text-gray-400">
                Digital Education Identity Platform for Africa
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#how-it-works" className="hover:text-white">Features</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/login" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/auth/login" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 Agora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
