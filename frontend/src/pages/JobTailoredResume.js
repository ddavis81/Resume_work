import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Sparkles, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const JobTailoredResume = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  const [formData, setFormData] = useState({
    job_title: '',
    company: '',
    job_description: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated || !token) {
      toast.error('Please sign in to generate a tailored resume');
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/resume/generate-for-job`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('AI-tailored resume generated successfully!');
      navigate(`/editor/${response.data.id}`);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) {
        toast.error('Please sign in again - session expired');
        navigate('/');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to generate resume');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">Resume works</span>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-home-btn" className="text-slate-300 hover:text-white">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI-Tailored Resume for Job Posting
          </h1>
          <p className="text-xl text-slate-400">
            Paste a job posting and our AI will create a perfectly matched resume
          </p>
          {showAuthPrompt && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg inline-block">
              <p className="text-amber-400 text-sm">
                ⚠️ Please <button onClick={() => navigate('/')} className="underline font-semibold">sign in</button> to use this feature
              </p>
            </div>
          )}
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-500" />
              Job Posting Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="job_title" className="text-slate-300">Job Title *</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                    placeholder="e.g., Senior Software Engineer"
                    data-testid="job-title-input"
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="text-slate-300">Company Name *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                    placeholder="e.g., TechCorp Inc."
                    data-testid="company-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="job_description" className="text-slate-300">
                  Job Description / Requirements *
                </Label>
                <Textarea
                  id="job_description"
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  required
                  className="bg-slate-950 border-slate-800 text-white min-h-64"
                  placeholder="Paste the complete job posting here including requirements, responsibilities, qualifications, etc..."
                  data-testid="job-description-input"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Tip: Include the full job description for best results. The AI will extract key skills and requirements.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-semibold mb-2">How it works:</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• AI analyzes the job posting to identify key requirements</li>
                      <li>• Generates experience and skills matching the position</li>
                      <li>• Creates ATS-optimized content with relevant keywords</li>
                      <li>• Tailors your professional summary for this specific role</li>
                      <li>• You can edit and refine the generated resume</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 glow-button"
                data-testid="generate-resume-btn"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                    Generating Tailored Resume...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Tailored Resume
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <h4 className="text-white font-semibold mb-2">✨ Better Matching</h4>
              <p className="text-sm text-slate-400">
                Include complete job descriptions for more accurate skill matching and keyword optimization
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <h4 className="text-white font-semibold mb-2">🎯 ATS-Friendly</h4>
              <p className="text-sm text-slate-400">
                Generated resumes use industry-standard formatting that passes through ATS systems
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <h4 className="text-white font-semibold mb-2">✏️ Fully Editable</h4>
              <p className="text-sm text-slate-400">
                Review and customize the generated resume to add your personal touch
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobTailoredResume;
