import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Briefcase, MapPin, ExternalLink, ArrowLeft, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Jobs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resume_id');

  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (resumeId) {
      findMatches();
    }
  }, [resumeId]);

  const findMatches = async () => {
    if (!resumeId) {
      toast.error("No resume selected");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/jobs/match`, null, {
        params: { resume_id: resumeId, query, location }
      });
      setMatches(response.data);
      toast.success(`Found ${response.data.length} matching jobs!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to find job matches");
    } finally {
      setLoading(false);
    }
  };

  const searchJobs = async () => {
    if (!query) {
      toast.error("Please enter a job title or keyword");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/jobs/search`, {
        params: { query, location }
      });
      
      const jobMatches = response.data.map((job, idx) => ({
        job_id: job.job_id,
        title: job.title,
        company: job.company,
        location: job.location,
        match_score: 0.7 - (idx * 0.05),
        matching_skills: [],
        missing_skills: [],
        match_percentage: 70 - (idx * 5),
        url: job.url
      }));

      setMatches(jobMatches);
      toast.success(`Found ${jobMatches.length} jobs!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to search jobs");
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (percentage) => {
    if (percentage >= 75) return "bg-emerald-500";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-amber-500";
  };

  const getMatchText = (percentage) => {
    if (percentage >= 75) return "Excellent Match";
    if (percentage >= 50) return "Good Match";
    return "Potential Match";
  };

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
        {/* Search Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Find Your Dream Job</h1>
          <p className="text-xl text-slate-400 mb-8">
            {resumeId ? "Jobs matched to your resume" : "Search for jobs that match your skills"}
          </p>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Job title or keyword (e.g., Software Engineer)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white h-12"
                    data-testid="search-query-input"
                  />
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Location (optional)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white h-12"
                    data-testid="search-location-input"
                  />
                </div>
                <Button
                  onClick={resumeId ? findMatches : searchJobs}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 glow-button h-12 px-8"
                  data-testid="search-jobs-btn"
                >
                  {loading ? (
                    "Searching..."
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      {resumeId ? "Find Matches" : "Search Jobs"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Finding the best matches for you...</p>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-4" data-testid="job-results">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {matches.length} Job{matches.length !== 1 ? 's' : ''} Found
              </h2>
              {resumeId && (
                <Badge className="bg-blue-600 text-white px-4 py-2 text-sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Sorted by Match Score
                </Badge>
              )}
            </div>

            {matches.map((match, idx) => (
              <Card
                key={match.job_id}
                className="bg-slate-900 border-slate-800 card-hover"
                data-testid={`job-card-${idx}`}
              >
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Match Score Circle */}
                    {resumeId && (
                      <div className="flex-shrink-0">
                        <div className="relative w-20 h-20">
                          <svg className="transform -rotate-90 w-20 h-20">
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-slate-800"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 32}`}
                              strokeDashoffset={`${2 * Math.PI * 32 * (1 - match.match_score)}`}
                              className={getMatchColor(match.match_percentage)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{match.match_percentage}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 text-center mt-2">{getMatchText(match.match_percentage)}</p>
                      </div>
                    )}

                    {/* Job Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{match.title}</h3>
                          <p className="text-blue-400 font-semibold">{match.company}</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open(match.url, '_blank')}
                          data-testid={`apply-btn-${idx}`}
                        >
                          Apply <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {match.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          Full-time
                        </span>
                      </div>

                      {resumeId && match.matching_skills.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-slate-400 mb-2">Matching Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {match.matching_skills.map((skill, skillIdx) => (
                              <Badge key={skillIdx} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {resumeId && match.missing_skills.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-400 mb-2">Skills to Learn:</p>
                          <div className="flex flex-wrap gap-2">
                            {match.missing_skills.slice(0, 5).map((skill, skillIdx) => (
                              <Badge key={skillIdx} className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Jobs Yet</h3>
              <p className="text-slate-400 mb-6">
                {resumeId
                  ? "Click 'Find Matches' to discover jobs that match your resume"
                  : "Enter a job title or keyword to start searching"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Jobs;
