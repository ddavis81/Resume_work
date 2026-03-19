import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";
import LandingPage from "./pages/LandingPage";
import Builder from "./pages/Builder";
import Upload from "./pages/Upload";
import Editor from "./pages/Editor";
import Jobs from "./pages/Jobs";
import Templates from "./pages/Templates";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/templates" element={<Templates />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
