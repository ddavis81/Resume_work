import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, Check, Briefcase, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Templates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCareer, setSelectedCareer] = useState("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const careers = ["all", ...new Set(templates.map(t => t.career))];

  const filteredTemplates = selectedCareer === "all" 
    ? templates 
    : templates.filter(t => t.career === selectedCareer);

  const templateImages = {
    "tech-modern": "https://images.unsplash.com/photo-1693045181224-9fc2f954f054?w=800",
    "healthcare-clean": "https://images.unsplash.com/photo-1693045181178-d5d83fb070c8?w=800",
    "business-executive": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
    "creative-portfolio": "https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=800",
    "sales-results": "https://images.unsplash.com/photo-1586281380614-8f85e1b6e5c0?w=800",
    "education-academic": "https://images.unsplash.com/photo-1586281380923-0c3c3a5c87e0?w=800",
    "legal-formal": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    "engineering-technical": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800"
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
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="back-home-btn" className="text-slate-300 hover:text-white">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Career-Specific Resume Templates</h1>
          <p className="text-xl text-slate-400">
            Choose a template optimized for your industry and career path
          </p>
        </div>

        {/* Career Filter */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="text-slate-300 font-semibold">Filter by Career:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {careers.map((career) => (
              <Button
                key={career}
                onClick={() => setSelectedCareer(career)}
                variant={selectedCareer === career ? "default" : "outline"}
                className={selectedCareer === career 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }
                data-testid={`filter-${career}`}
              >
                {career === "all" ? "All Templates" : career}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading templates...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, idx) => (
              <Card
                key={template.id}
                className="bg-slate-900 border-slate-800 card-hover overflow-hidden"
                data-testid={`template-card-${idx}`}
              >
                <div className="relative h-64 bg-slate-800">
                  <img
                    src={templateImages[template.id]}
                    alt={template.name}
                    className="w-full h-full object-cover opacity-75"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className="text-white px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: template.color }}
                    >
                      {template.career}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <Briefcase className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{template.name}</h3>
                      <p className="text-slate-400 text-sm">{template.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.features.map((feature, featureIdx) => (
                      <span
                        key={featureIdx}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs border border-blue-500/30"
                      >
                        <Check className="w-3 h-3" />
                        {feature}
                      </span>
                    ))}
                  </div>

                  <Button
                    onClick={() => navigate("/builder")}
                    className="w-full bg-blue-600 hover:bg-blue-700 glow-button"
                    data-testid={`use-template-btn-${idx}`}
                  >
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredTemplates.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No templates found for this career</p>
          </div>
        )}

        {/* Additional Info */}
        <Card className="bg-slate-900 border-slate-800 mt-12">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">All Templates Include</h3>
              <div className="grid md:grid-cols-4 gap-6 mt-6">
                <div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">ATS Optimized</h4>
                  <p className="text-sm text-slate-400">Pass through applicant tracking systems</p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">AI-Enhanced</h4>
                  <p className="text-sm text-slate-400">Intelligent content suggestions</p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Easy Export</h4>
                  <p className="text-sm text-slate-400">Download as PDF instantly</p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Customizable</h4>
                  <p className="text-sm text-slate-400">Tailor to your industry</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Templates;
