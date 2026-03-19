from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import fitz
from docx import Document
import io
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from emergentintegrations.llm.chat import LlmChat, UserMessage
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Resume works - Resume & Job Matching API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class SkillInput(BaseModel):
    name: str
    proficiency: Optional[str] = "intermediate"
    years: Optional[float] = 0

class Experience(BaseModel):
    title: str
    company: str
    duration: str
    description: str

class Education(BaseModel):
    degree: str
    institution: str
    year: str

class ResumeData(BaseModel):
    full_name: str
    email: str
    phone: str
    location: str
    title: str
    summary: str
    skills: List[SkillInput]
    experience: List[Experience]
    education: List[Education]

class Resume(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    data: ResumeData
    template: str = "modern"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobPosting(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    description: str
    employment_type: Optional[str] = None
    url: str
    required_skills: List[str] = []

class JobMatch(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    match_score: float
    matching_skills: List[str]
    missing_skills: List[str]
    match_percentage: float
    url: str

class AutoFixRequest(BaseModel):
    resume_id: str

class ImproveRequest(BaseModel):
    resume_id: str
    section: str = "all"

# Helper Functions
async def get_llm_chat():
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    return LlmChat(
        api_key=api_key,
        session_id=f"resume_{uuid.uuid4()}",
        system_message="You are an expert career coach and resume writer. Provide professional, ATS-friendly advice."
    ).with_model("openai", "gpt-5.2")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in pdf:
            text += page.get_text()
        return text
    except Exception as e:
        logger.error(f"PDF extraction error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to extract text from PDF")

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        logger.error(f"DOCX extraction error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to extract text from DOCX")

async def parse_resume_with_ai(text: str) -> Dict[str, Any]:
    chat = await get_llm_chat()
    
    prompt = f"""Extract structured information from this resume text and return it as a JSON object with these fields:
- full_name
- email
- phone
- location
- title (job title/role)
- summary (professional summary)
- skills (array of skill objects with name, proficiency (optional), years (optional))
- experience (array with title, company, duration, description)
- education (array with degree, institution, year)

Important: For skills, if proficiency or years are not mentioned, omit those fields or set them as empty.

Resume text:
{text}

Respond with ONLY valid JSON, no markdown formatting."""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    try:
        import json
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        parsed = json.loads(response_text.strip())
        
        # Clean up skills data - remove None values
        if 'skills' in parsed and isinstance(parsed['skills'], list):
            cleaned_skills = []
            for skill in parsed['skills']:
                if isinstance(skill, dict) and skill.get('name'):
                    cleaned_skill = {'name': skill['name']}
                    if skill.get('proficiency'):
                        cleaned_skill['proficiency'] = skill['proficiency']
                    else:
                        cleaned_skill['proficiency'] = 'intermediate'
                    if skill.get('years') is not None:
                        cleaned_skill['years'] = float(skill['years'])
                    else:
                        cleaned_skill['years'] = 0
                    cleaned_skills.append(cleaned_skill)
            parsed['skills'] = cleaned_skills
        
        return parsed
    except Exception as e:
        logger.error(f"JSON parsing error: {str(e)}, response: {response}")
        raise HTTPException(status_code=500, detail="Failed to parse resume data")

async def improve_resume_section(resume_data: Dict, section: str) -> str:
    chat = await get_llm_chat()
    
    if section == "summary":
        prompt = f"""Improve this professional summary to be more impactful and ATS-friendly:

Current: {resume_data.get('summary', '')}

Role: {resume_data.get('title', '')}

Provide ONLY the improved summary text, no explanations."""
    elif section == "experience":
        exp_text = "\n\n".join([f"{e.get('title')} at {e.get('company')}\n{e.get('description')}" for e in resume_data.get('experience', [])])
        prompt = f"""Improve these work experience descriptions using action verbs and quantifiable achievements:

{exp_text}

Provide improved descriptions maintaining the same structure."""
    else:
        prompt = f"""Analyze this resume and provide 3-5 specific, actionable suggestions to improve it for ATS systems and recruiters:

{str(resume_data)}

Provide clear, bullet-pointed suggestions."""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    return response

def calculate_skill_match(user_skills: List[SkillInput], job_description: str) -> tuple:
    user_skill_names = [s.name.lower() for s in user_skills]
    user_text = " ".join(user_skill_names)
    
    common_skills = [
        "Python", "JavaScript", "Java", "C++", "React", "Node.js", "SQL",
        "AWS", "Docker", "Kubernetes", "Git", "TypeScript", "MongoDB",
        "FastAPI", "Django", "Flask", "Vue", "Angular", "PostgreSQL", "Redis"
    ]
    
    found_skills = []
    job_desc_lower = job_description.lower()
    for skill in common_skills:
        if skill.lower() in job_desc_lower:
            found_skills.append(skill)
    
    matching = [s for s in user_skill_names if s in [sk.lower() for sk in found_skills]]
    missing = [s for s in found_skills if s.lower() not in user_skill_names]
    
    if not found_skills:
        return 0.5, matching, missing
    
    overlap_ratio = len(matching) / max(len(found_skills), 1)
    
    try:
        vectorizer = TfidfVectorizer()
        vectors = vectorizer.fit_transform([user_text, job_desc_lower])
        similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
    except:
        similarity = 0.5
    
    final_score = (overlap_ratio * 0.6) + (similarity * 0.4)
    return float(np.clip(final_score, 0, 1)), matching, missing

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Resume works API", "version": "1.0.0"}

@api_router.post("/resume/create")
async def create_resume(resume_data: ResumeData, user_id: str = "default"):
    resume = Resume(
        user_id=user_id,
        data=resume_data
    )
    
    doc = resume.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.resumes.insert_one(doc)
    return {"id": resume.id, "message": "Resume created successfully"}

@api_router.post("/resume/upload")
async def upload_resume(file: UploadFile = File(...), user_id: str = Form("default")):
    try:
        file_bytes = await file.read()
        
        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(file_bytes)
        elif file.filename.endswith('.docx'):
            text = extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
        
        if not text or len(text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Could not extract sufficient text from the file")
        
        parsed_data = await parse_resume_with_ai(text)
        
        # Ensure required fields exist with defaults
        parsed_data.setdefault('full_name', 'Unknown')
        parsed_data.setdefault('email', '')
        parsed_data.setdefault('phone', '')
        parsed_data.setdefault('location', '')
        parsed_data.setdefault('title', 'Professional')
        parsed_data.setdefault('summary', '')
        parsed_data.setdefault('skills', [])
        parsed_data.setdefault('experience', [])
        parsed_data.setdefault('education', [])
        
        resume_data = ResumeData(**parsed_data)
        resume = Resume(user_id=user_id, data=resume_data)
        
        doc = resume.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.resumes.insert_one(doc)
        return {"id": resume.id, "data": parsed_data, "message": "Resume uploaded and parsed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")

@api_router.get("/resume/{resume_id}")
async def get_resume(resume_id: str):
    resume = await db.resumes.find_one({"id": resume_id}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@api_router.get("/resume/user/{user_id}")
async def get_user_resumes(user_id: str):
    resumes = await db.resumes.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return resumes

@api_router.post("/resume/improve")
async def improve_resume(request: ImproveRequest):
    resume = await db.resumes.find_one({"id": request.resume_id}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    suggestions = await improve_resume_section(resume['data'], request.section)
    return {"suggestions": suggestions}

@api_router.post("/resume/autofix")
async def autofix_resume(request: AutoFixRequest):
    resume = await db.resumes.find_one({"id": request.resume_id}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    chat = await get_llm_chat()
    
    # Get improved summary
    summary_prompt = f"""Rewrite this professional summary to be more impactful, ATS-friendly, and achievement-focused. 
Current summary: {resume['data'].get('summary', '')}
Role: {resume['data'].get('title', '')}

Provide ONLY the improved summary text, maximum 3-4 sentences."""
    
    summary_msg = UserMessage(text=summary_prompt)
    improved_summary = await chat.send_message(summary_msg)
    
    # Get improved experience descriptions
    improved_experiences = []
    for exp in resume['data'].get('experience', []):
        exp_prompt = f"""Rewrite this job description using strong action verbs and quantifiable achievements:

Job Title: {exp.get('title')}
Company: {exp.get('company')}
Current Description: {exp.get('description')}

Provide ONLY the improved description in 2-3 bullet points."""
        
        exp_msg = UserMessage(text=exp_prompt)
        improved_desc = await chat.send_message(exp_msg)
        
        improved_experiences.append({
            "title": exp.get('title'),
            "company": exp.get('company'),
            "duration": exp.get('duration'),
            "description": improved_desc.strip()
        })
    
    # Update resume with improvements
    resume['data']['summary'] = improved_summary.strip()
    resume['data']['experience'] = improved_experiences
    resume['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Save to database
    await db.resumes.update_one(
        {"id": request.resume_id},
        {"$set": {
            "data.summary": improved_summary.strip(),
            "data.experience": improved_experiences,
            "updated_at": resume['updated_at']
        }}
    )
    
    return {
        "message": "Resume auto-fixed successfully",
        "improved_summary": improved_summary.strip(),
        "improved_count": len(improved_experiences) + 1
    }

@api_router.get("/jobs/search")
async def search_jobs(query: str, location: str = "", limit: int = 10):
    # Using mock data for demo - integrate with real job API
    mock_jobs = [
        {
            "job_id": "job-1",
            "title": f"{query} Engineer",
            "company": "TechCorp",
            "location": location or "Remote",
            "description": f"We are seeking an experienced {query} professional with strong technical skills in Python, JavaScript, React, and cloud technologies. Join our innovative team!",
            "employment_type": "Full-time",
            "url": "https://example.com/job1"
        },
        {
            "job_id": "job-2",
            "title": f"Senior {query} Developer",
            "company": "Innovation Labs",
            "location": location or "San Francisco, CA",
            "description": f"Senior {query} role requiring expertise in modern web technologies, AWS, Docker, and agile methodologies. Competitive salary and benefits.",
            "employment_type": "Full-time",
            "url": "https://example.com/job2"
        },
        {
            "job_id": "job-3",
            "title": f"{query} Specialist",
            "company": "Digital Solutions",
            "location": location or "New York, NY",
            "description": f"Looking for a {query} specialist with Node.js, TypeScript, MongoDB experience. Great team culture and remote work options.",
            "employment_type": "Contract",
            "url": "https://example.com/job3"
        }
    ]
    
    return mock_jobs[:limit]

@api_router.post("/jobs/match")
async def match_jobs(resume_id: str, query: str = "", location: str = "", limit: int = 10):
    resume = await db.resumes.find_one({"id": resume_id}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    search_query = query or resume['data']['title']
    jobs = await search_jobs(search_query, location, limit * 2)
    
    matches = []
    for job in jobs:
        score, matching, missing = calculate_skill_match(
            [SkillInput(**s) for s in resume['data']['skills']],
            job['description']
        )
        
        match = JobMatch(
            job_id=job['job_id'],
            title=job['title'],
            company=job['company'],
            location=job['location'],
            match_score=score,
            matching_skills=matching,
            missing_skills=missing,
            match_percentage=round(score * 100, 1),
            url=job['url']
        )
        matches.append(match)
    
    matches.sort(key=lambda x: x.match_score, reverse=True)
    return matches[:limit]

@api_router.get("/templates")
async def get_templates():
    return [
        {
            "id": "tech-modern",
            "name": "Tech Professional",
            "career": "Technology & Software",
            "description": "Modern template optimized for software engineers, developers, and tech roles",
            "features": ["Skills-first layout", "Project showcase", "GitHub integration ready"],
            "color": "#3B82F6",
            "preview": "/templates/tech.png"
        },
        {
            "id": "healthcare-clean",
            "name": "Healthcare Professional",
            "career": "Healthcare & Medical",
            "description": "Clean, professional format for doctors, nurses, and medical professionals",
            "features": ["Certifications prominent", "Clinical experience focus", "License display"],
            "color": "#10B981",
            "preview": "/templates/healthcare.png"
        },
        {
            "id": "business-executive",
            "name": "Business Executive",
            "career": "Business & Finance",
            "description": "Executive format for business leaders, managers, and finance professionals",
            "features": ["Achievement metrics", "Leadership emphasis", "MBA-optimized"],
            "color": "#6366F1",
            "preview": "/templates/business.png"
        },
        {
            "id": "creative-portfolio",
            "name": "Creative Professional",
            "career": "Design & Creative",
            "description": "Eye-catching design for designers, artists, and creative professionals",
            "features": ["Portfolio links", "Visual hierarchy", "Unique layout"],
            "color": "#EC4899",
            "preview": "/templates/creative.png"
        },
        {
            "id": "sales-results",
            "name": "Sales & Marketing",
            "career": "Sales & Marketing",
            "description": "Results-driven format highlighting achievements and revenue impact",
            "features": ["Quota attainment", "Revenue metrics", "Campaign results"],
            "color": "#F59E0B",
            "preview": "/templates/sales.png"
        },
        {
            "id": "education-academic",
            "name": "Education Professional",
            "career": "Education & Teaching",
            "description": "Academic format for teachers, professors, and education professionals",
            "features": ["Publications section", "Teaching philosophy", "Curriculum vitae style"],
            "color": "#8B5CF6",
            "preview": "/templates/education.png"
        },
        {
            "id": "legal-formal",
            "name": "Legal Professional",
            "career": "Legal & Law",
            "description": "Formal, traditional layout for lawyers, paralegals, and legal professionals",
            "features": ["Bar admission", "Case experience", "Traditional format"],
            "color": "#0F172A",
            "preview": "/templates/legal.png"
        },
        {
            "id": "engineering-technical",
            "name": "Engineering Professional",
            "career": "Engineering",
            "description": "Technical format for mechanical, civil, and electrical engineers",
            "features": ["Technical skills", "Project details", "PE license section"],
            "color": "#0891B2",
            "preview": "/templates/engineering.png"
        }
    ]

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
