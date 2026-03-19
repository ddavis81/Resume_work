import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Minus, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Builder = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    summary: "",
    skills: [{ name: "", proficiency: "intermediate", years: 0 }],
    experience: [{ title: "", company: "", duration: "", description: "" }],
    education: [{ degree: "", institution: "", year: "" }]
  });

  const addSkill = () => {
    setFormData({
      ...formData,
      skills: [...formData.skills, { name: "", proficiency: "intermediate", years: 0 }]
    });
  };

  const removeSkill = (index) => {
    const newSkills = formData.skills.filter((_, i) => i !== index);
    setFormData({ ...formData, skills: newSkills });
  };

  const updateSkill = (index, field, value) => {
    const newSkills = [...formData.skills];
    newSkills[index][field] = value;
    setFormData({ ...formData, skills: newSkills });
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [...formData.experience, { title: "", company: "", duration: "", description: "" }]
    });
  };

  const removeExperience = (index) => {
    const newExp = formData.experience.filter((_, i) => i !== index);
    setFormData({ ...formData, experience: newExp });
  };

  const updateExperience = (index, field, value) => {
    const newExp = [...formData.experience];
    newExp[index][field] = value;
    setFormData({ ...formData, experience: newExp });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree: "", institution: "", year: "" }]
    });
  };

  const removeEducation = (index) => {
    const newEdu = formData.education.filter((_, i) => i !== index);
    setFormData({ ...formData, education: newEdu });
  };

  const updateEducation = (index, field, value) => {
    const newEdu = [...formData.education];
    newEdu[index][field] = value;
    setFormData({ ...formData, education: newEdu });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/resume/create`, formData);
      toast.success("Resume created successfully!");
      navigate(`/editor/${response.data.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create resume");
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
            <span className="text-2xl font-bold text-white">CareerCraft</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="back-home-btn" className="text-slate-300 hover:text-white">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-500' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600' : 'bg-slate-700'}`}>1</div>
              <span className="font-semibold">Personal</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-500' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`}>2</div>
              <span className="font-semibold">Skills</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-slate-700'}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-500' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600' : 'bg-slate-700'}`}>3</div>
              <span className="font-semibold">Experience</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 4 ? 'bg-blue-600' : 'bg-slate-700'}`} />
            <div className={`flex items-center gap-2 ${step >= 4 ? 'text-blue-500' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-blue-600' : 'bg-slate-700'}`}>4</div>
              <span className="font-semibold">Education</span>
            </div>
          </div>
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <Card className="bg-slate-900 border-slate-800 animate-scale" data-testid="personal-info-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-slate-300">Full Name</Label>
                <Input
                  id="full_name"
                  data-testid="input-full-name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-slate-300">Phone</Label>
                  <Input
                    id="phone"
                    data-testid="input-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location" className="text-slate-300">Location</Label>
                <Input
                  id="location"
                  data-testid="input-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                  placeholder="San Francisco, CA"
                />
              </div>
              <div>
                <Label htmlFor="title" className="text-slate-300">Professional Title</Label>
                <Input
                  id="title"
                  data-testid="input-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                  placeholder="Senior Software Engineer"
                />
              </div>
              <div>
                <Label htmlFor="summary" className="text-slate-300">Professional Summary</Label>
                <Textarea
                  id="summary"
                  data-testid="input-summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white min-h-32"
                  placeholder="Experienced software engineer with expertise in..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Skills */}
        {step === 2 && (
          <Card className="bg-slate-900 border-slate-800 animate-scale" data-testid="skills-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.skills.map((skill, index) => (
                <div key={index} className="flex gap-4 items-end" data-testid={`skill-item-${index}`}>
                  <div className="flex-1">
                    <Label className="text-slate-300">Skill</Label>
                    <Input
                      value={skill.name}
                      onChange={(e) => updateSkill(index, 'name', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="Python"
                      data-testid={`skill-name-${index}`}
                    />
                  </div>
                  <div className="w-40">
                    <Label className="text-slate-300">Proficiency</Label>
                    <Select value={skill.proficiency} onValueChange={(val) => updateSkill(index, 'proficiency', val)}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white" data-testid={`skill-proficiency-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label className="text-slate-300">Years</Label>
                    <Input
                      type="number"
                      value={skill.years}
                      onChange={(e) => updateSkill(index, 'years', parseFloat(e.target.value) || 0)}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="3"
                      data-testid={`skill-years-${index}`}
                    />
                  </div>
                  {formData.skills.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSkill(index)}
                      className="text-red-400 hover:text-red-300"
                      data-testid={`remove-skill-${index}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={addSkill} variant="outline" className="w-full border-slate-700 text-blue-400" data-testid="add-skill-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Skill
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Experience */}
        {step === 3 && (
          <Card className="bg-slate-900 border-slate-800 animate-scale" data-testid="experience-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Work Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.experience.map((exp, index) => (
                <div key={index} className="space-y-4 p-4 rounded-lg bg-slate-950 border border-slate-800" data-testid={`experience-item-${index}`}>
                  <div className="flex justify-between items-start">
                    <h4 className="text-lg font-semibold text-white">Experience {index + 1}</h4>
                    {formData.experience.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExperience(index)}
                        className="text-red-400 hover:text-red-300"
                        data-testid={`remove-experience-${index}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Job Title</Label>
                      <Input
                        value={exp.title}
                        onChange={(e) => updateExperience(index, 'title', e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white"
                        placeholder="Software Engineer"
                        data-testid={`exp-title-${index}`}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => updateExperience(index, 'company', e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white"
                        placeholder="TechCorp"
                        data-testid={`exp-company-${index}`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Duration</Label>
                    <Input
                      value={exp.duration}
                      onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="Jan 2020 - Present"
                      data-testid={`exp-duration-${index}`}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white min-h-24"
                      placeholder="Key responsibilities and achievements..."
                      data-testid={`exp-description-${index}`}
                    />
                  </div>
                </div>
              ))}
              <Button onClick={addExperience} variant="outline" className="w-full border-slate-700 text-blue-400" data-testid="add-experience-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Experience
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Education */}
        {step === 4 && (
          <Card className="bg-slate-900 border-slate-800 animate-scale" data-testid="education-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.education.map((edu, index) => (
                <div key={index} className="flex gap-4 items-end" data-testid={`education-item-${index}`}>
                  <div className="flex-1">
                    <Label className="text-slate-300">Degree</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="Bachelor of Science in Computer Science"
                      data-testid={`edu-degree-${index}`}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-slate-300">Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="University Name"
                      data-testid={`edu-institution-${index}`}
                    />
                  </div>
                  <div className="w-32">
                    <Label className="text-slate-300">Year</Label>
                    <Input
                      value={edu.year}
                      onChange={(e) => updateEducation(index, 'year', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="2020"
                      data-testid={`edu-year-${index}`}
                    />
                  </div>
                  {formData.education.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEducation(index)}
                      className="text-red-400 hover:text-red-300"
                      data-testid={`remove-education-${index}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={addEducation} variant="outline" className="w-full border-slate-700 text-blue-400" data-testid="add-education-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Education
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            variant="outline"
            className="border-slate-700 text-white"
            data-testid="prev-step-btn"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Previous
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep(Math.min(4, step + 1))}
              className="bg-blue-600 hover:bg-blue-700 glow-button"
              data-testid="next-step-btn"
            >
              Next <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 glow-button"
              data-testid="create-resume-btn"
            >
              {loading ? "Creating..." : "Create Resume"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Builder;
