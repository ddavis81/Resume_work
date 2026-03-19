import { useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Templates = () => {
  const navigate = useNavigate();

  const templates = [
    {
      id: "modern",
      name: "Modern Professional",
      description: "Clean, contemporary design perfect for tech and creative roles",
      preview: "https://images.unsplash.com/photo-1693045181224-9fc2f954f054?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwzfHxjbGVhbiUyMHJlc3VtZSUyMGN2JTIwZGVzaWduJTIwbGF5b3V0JTIwcGFwZXJ8ZW58MHx8fHwxNzczOTQ3ODkxfDA&ixlib=rb-4.1.0&q=85",
      features: ["ATS-Friendly", "Two-Column Layout", "Bold Typography"]
    },
    {
      id: "classic",
      name: "Classic Elegant",
      description: "Traditional format ideal for corporate and finance positions",
      preview: "https://images.unsplash.com/photo-1693045181178-d5d83fb070c8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHw0fHxjbGVhbiUyMHJlc3VtZSUyMGN2JTIwZGVzaWduJTIwbGF5b3V0JTIwcGFwZXJ8ZW58MHx8fHwxNzczOTQ3ODkxfDA&ixlib=rb-4.1.0&q=85",
      features: ["Professional", "Single Column", "Timeless Design"]
    },
    {
      id: "minimal",
      name: "Minimal Clean",
      description: "Minimalist approach emphasizing content over decoration",
      preview: "https://images.unsplash.com/photo-1693045181224-9fc2f954f054?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwzfHxjbGVhbiUyMHJlc3VtZSUyMGN2JTIwZGVzaWduJTIwbGF5b3V0JTIwcGFwZXJ8ZW58MHx8fHwxNzczOTQ3ODkxfDA&ixlib=rb-4.1.0&q=85",
      features: ["Ultra-Clean", "Maximum Whitespace", "Scannable"]
    },
    {
      id: "creative",
      name: "Creative Bold",
      description: "Eye-catching design for designers and creative professionals",
      preview: "https://images.unsplash.com/photo-1693045181178-d5d83fb070c8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHw0fHxjbGVhbiUyMHJlc3VtZSUyMGN2JTIwZGVzaWduJTIwbGF5b3V0JTIwcGFwZXJ8ZW58MHx8fHwxNzczOTQ3ODkxfDA&ixlib=rb-4.1.0&q=85",
      features: ["Unique Layout", "Color Accents", "Portfolio-Ready"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">CareerCraft</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="back-home-btn" className="text-slate-300 hover:text-white">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Resume Templates</h1>
          <p className="text-xl text-slate-400">
            Choose a professional template optimized for ATS systems
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {templates.map((template, idx) => (
            <Card
              key={template.id}
              className="bg-slate-900 border-slate-800 card-hover overflow-hidden"
              data-testid={`template-card-${idx}`}
            >
              <div className="relative h-80 bg-slate-800">
                <img
                  src={template.preview}
                  alt={template.name}
                  className="w-full h-full object-cover opacity-75"
                />
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Popular
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-2">{template.name}</h3>
                <p className="text-slate-400 mb-4">{template.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {template.features.map((feature, featureIdx) => (
                    <span
                      key={featureIdx}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30"
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
