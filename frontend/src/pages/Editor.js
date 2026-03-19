import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Sparkles, ArrowLeft, Download, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [improving, setImproving] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    loadResume();
  }, [id]);

  const loadResume = async () => {
    try {
      const response = await axios.get(`${API}/resume/${id}`);
      setResume(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load resume");
    } finally {
      setLoading(false);
    }
  };

  const improveResume = async () => {
    setImproving(true);
    try {
      const response = await axios.post(`${API}/resume/improve`, {
        resume_id: id,
        section: "all"
      });
      setSuggestions(response.data.suggestions);
      toast.success("AI suggestions generated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate suggestions");
    } finally {
      setImproving(false);
    }
  };

  const findJobs = () => {
    navigate(`/jobs?resume_id=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (!resume) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header - Light Mode */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">CareerCraft</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={improveResume}
              disabled={improving}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="improve-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {improving ? "Analyzing..." : "AI Improve"}
            </Button>
            <Button
              onClick={findJobs}
              variant="outline"
              className="border-slate-300"
              data-testid="find-jobs-btn"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Find Jobs
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              data-testid="back-home-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Resume Preview - Light */}
          <div className="space-y-4" data-testid="resume-preview">
            <h2 className="text-2xl font-bold text-slate-900">Resume Preview</h2>
            <Card className="bg-white shadow-xl">
              <CardContent className="p-8 space-y-6">
                {/* Header */}
                <div className="text-center border-b pb-6">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">{resume.data.full_name}</h1>
                  <p className="text-xl text-blue-600 mb-3">{resume.data.title}</p>
                  <div className="flex justify-center gap-4 text-sm text-slate-600">
                    <span>{resume.data.email}</span>
                    <span>•</span>
                    <span>{resume.data.phone}</span>
                    <span>•</span>
                    <span>{resume.data.location}</span>
                  </div>
                </div>

                {/* Summary */}
                {resume.data.summary && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Professional Summary</h3>
                    <p className="text-slate-700 leading-relaxed">{resume.data.summary}</p>
                  </div>
                )}

                {/* Skills */}
                {resume.data.skills?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {resume.data.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                        >
                          {skill.name} ({skill.proficiency})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {resume.data.experience?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Work Experience</h3>
                    <div className="space-y-4">
                      {resume.data.experience.map((exp, idx) => (
                        <div key={idx} className="border-l-2 border-blue-500 pl-4">
                          <h4 className="font-bold text-slate-900">{exp.title}</h4>
                          <p className="text-blue-600 font-medium">{exp.company}</p>
                          <p className="text-sm text-slate-500 mb-2">{exp.duration}</p>
                          <p className="text-slate-700 text-sm">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {resume.data.education?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Education</h3>
                    <div className="space-y-2">
                      {resume.data.education.map((edu, idx) => (
                        <div key={idx}>
                          <h4 className="font-bold text-slate-900">{edu.degree}</h4>
                          <p className="text-slate-700">{edu.institution} - {edu.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestions - Light */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">AI Suggestions</h2>
            {suggestions ? (
              <Card className="bg-white shadow-lg" data-testid="suggestions-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Improvement Suggestions</h3>
                      <div className="prose prose-sm max-w-none text-slate-700">
                        <div className="whitespace-pre-wrap">{suggestions}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white shadow-lg">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Get AI-Powered Improvements</h3>
                  <p className="text-slate-600 mb-4">
                    Click "AI Improve" to get personalized suggestions to enhance your resume
                  </p>
                  <Button
                    onClick={improveResume}
                    disabled={improving}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="improve-cta-btn"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Improve My Resume
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Next Steps</h3>
                <Button
                  onClick={findJobs}
                  className="w-full bg-blue-600 hover:bg-blue-700 justify-start"
                  size="lg"
                  data-testid="find-jobs-action-btn"
                >
                  <Briefcase className="w-5 h-5 mr-3" />
                  Find Matching Jobs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-300"
                  size="lg"
                  data-testid="download-btn"
                >
                  <Download className="w-5 h-5 mr-3" />
                  Download Resume (PDF)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
