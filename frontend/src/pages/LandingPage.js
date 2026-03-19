import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Sparkles, Briefcase, ArrowRight, Upload, PenTool, CheckCircle, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

const LandingPage = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const features = [
    {
      icon: <PenTool className="w-8 h-8" />,
      title: "AI-Powered Resume Builder",
      description: "Create professional resumes from scratch with intelligent suggestions and formatting."
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Job-Tailored Resumes",
      description: "Paste a job posting and AI creates a perfectly matched resume optimized for that position."
    },
    {
      icon: <Upload className="w-8 h-8" />,
      title: "Smart Resume Analysis",
      description: "Upload your existing resume and get instant AI-powered improvements and optimization."
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Job Matching Engine",
      description: "Find jobs that match your skills and experience with our intelligent matching algorithm."
    }
  ];

  const steps = [
    { num: "01", title: "Create or Upload", desc: "Start from scratch or upload your existing resume" },
    { num: "02", title: "AI Enhancement", desc: "Get intelligent suggestions to improve your content" },
    { num: "03", title: "Find Jobs", desc: "Discover perfectly matched job opportunities" },
    { num: "04", title: "Apply", desc: "Export and apply with confidence" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">Resume works</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/templates">
              <Button variant="ghost" data-testid="nav-templates-btn" className="text-slate-300 hover:text-white">
                Templates
              </Button>
            </Link>
            {isAuthenticated ? (
              <>
                <span className="text-slate-300 text-sm">Hi, {user?.full_name}</span>
                <Button
                  onClick={logout}
                  variant="outline"
                  className="border-slate-700 text-slate-300"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setShowAuthModal(true)}
                  variant="ghost"
                  className="text-slate-300 hover:text-white"
                  data-testid="login-btn"
                >
                  <User className="w-4 h-4 mr-2" /> Sign In
                </Button>
                <Button
                  onClick={() => setShowAuthModal(true)}
                  data-testid="nav-get-started-btn"
                  className="bg-blue-600 hover:bg-blue-700 glow-button"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none mb-6">
                Craft Your Perfect
                <span className="block text-blue-500">Career Story</span>
              </h1>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                AI-powered resume builder that writes, perfects, and matches you with your dream job. 
                Stand out from the crowd with intelligent optimization.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/builder">
                  <Button data-testid="hero-build-resume-btn" size="lg" className="bg-blue-600 hover:bg-blue-700 glow-button text-lg px-8 py-6">
                    Build Resume <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/job-tailored">
                  <Button data-testid="hero-job-tailored-btn" size="lg" className="bg-emerald-600 hover:bg-emerald-700 glow-button text-lg px-8 py-6">
                    <Sparkles className="mr-2 w-5 h-5" /> Tailor for Job
                  </Button>
                </Link>
                <Link to="/upload">
                  <Button data-testid="hero-upload-resume-btn" size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 text-lg px-8 py-6">
                    Upload Existing
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1765371513492-264506c3ad09?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBvZmZpY2UlMjBtaW5pbWFsaXN0JTIwd29ya3NwYWNlfGVufDB8fHx8MTc3Mzk0Nzg4OXww&ixlib=rb-4.1.0&q=85"
                alt="Professional workspace"
                className="rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-400">Everything you need to land your dream job</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="bg-slate-900 border-slate-800 card-hover" data-testid={`feature-card-${idx}`}>
                <CardContent className="p-6">
                  <div className="text-blue-500 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-slate-400">Four simple steps to your next career move</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="text-center" data-testid={`step-${idx}`}>
                <div className="text-6xl font-bold text-blue-500/20 mb-4">{step.num}</div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Land Your Dream Job?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who've transformed their careers with Resume works
          </p>
          <Link to="/builder">
            <Button data-testid="cta-start-btn" size="lg" className="bg-white text-blue-600 hover:bg-slate-100 text-lg px-8 py-6">
              Start Building Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-white">Resume works</span>
          </div>
          <p className="mb-2">© 2026 Resume works. Powered by AI. Built for Success.</p>
          <p className="text-sm text-slate-500">
            Created by <span className="text-blue-400 font-semibold">D.D.Davis</span>
          </p>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default LandingPage;
