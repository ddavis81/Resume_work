import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { FileText, Upload as UploadIcon, ArrowLeft, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Upload = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'text/rtf': ['.rtf']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers = {
        'Content-Type': 'multipart/form-data'
      };
      
      // Add auth token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(`${API}/resume/upload`, formData, { headers });
      toast.success("Resume uploaded and analyzed!");
      navigate(`/editor/${response.data.id}`);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMsg = error.response?.data?.detail || error.message || "Failed to upload resume";
      toast.error(errorMsg);
      
      // Log more details for debugging
      if (error.response) {
        console.error("Error response:", error.response.status, error.response.data);
      }
    } finally {
      setUploading(false);
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
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="back-home-btn" className="text-slate-300 hover:text-white">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Upload Your Resume</h1>
          <p className="text-xl text-slate-400">Let our AI analyze and improve your existing resume</p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Upload Resume File</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800'
              }`}
              data-testid="dropzone"
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                {file ? (
                  <>
                    <FileCheck className="w-16 h-16 text-blue-500" />
                    <div>
                      <p className="text-white font-semibold text-lg">{file.name}</p>
                      <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="border-slate-700 text-slate-300"
                      data-testid="remove-file-btn"
                    >
                      Remove File
                    </Button>
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-16 h-16 text-slate-500" />
                    <div>
                      <p className="text-white font-semibold text-lg">
                        {isDragActive ? "Drop your resume here" : "Drag & drop your resume"}
                      </p>
                      <p className="text-slate-400 text-sm mt-2">or click to browse files</p>
                      <p className="text-slate-500 text-xs mt-2">Supports PDF, DOC, DOCX, TXT, RTF (max 10MB)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {file && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 glow-button px-8"
                  data-testid="upload-btn"
                >
                  {uploading ? "Analyzing..." : "Upload & Analyze"}
                </Button>
              </div>
            )}

            <div className="mt-8 p-4 rounded-lg bg-slate-950 border border-slate-800">
              <h4 className="text-white font-semibold mb-3">Supported File Formats</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-red-500/20 rounded flex items-center justify-center">
                    <span className="text-red-400 font-bold text-xs">PDF</span>
                  </div>
                  <span className="text-slate-400">PDF Files</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-xs">DOC</span>
                  </div>
                  <span className="text-slate-400">Word 97-03</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-xs">DOCX</span>
                  </div>
                  <span className="text-slate-400">Word Modern</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-slate-500/20 rounded flex items-center justify-center">
                    <span className="text-slate-400 font-bold text-xs">TXT</span>
                  </div>
                  <span className="text-slate-400">Plain Text</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-xs">RTF</span>
                  </div>
                  <span className="text-slate-400">Rich Text</span>
                </div>
              </div>
              <h4 className="text-white font-semibold mb-3">What happens next?</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Our AI will extract and analyze your resume content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Get intelligent suggestions to improve your resume</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Find job matches based on your skills and experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Export your improved resume in professional formats</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
