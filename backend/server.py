from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import fitz
from docx import Document
import io
import olefile
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from emergentintegrations.llm.chat import LlmChat, UserMessage
import re
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

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
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

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

class JobPostingInput(BaseModel):
    job_title: str
    company: str
    job_description: str
    user_profile: Optional[Dict] = None

class AutoFixRequest(BaseModel):
    resume_id: str

class ImproveRequest(BaseModel):
    resume_id: str
    section: str = "all"

# Helper Functions
# Helper Functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

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

def extract_text_from_doc(file_bytes: bytes) -> str:
    """Extract text from older .doc format using olefile"""
    try:
        ole = olefile.OleFileIO(file_bytes)
        
        # Try to extract text from WordDocument stream
        if ole.exists('WordDocument'):
            data = ole.openstream('WordDocument').read()
            # Simple text extraction (may not be perfect for all .doc files)
            text = data.decode('latin-1', errors='ignore')
            # Clean up the text
            import re
            text = re.sub(r'[^\x20-\x7E\n]', '', text)
            return text
        else:
            raise HTTPException(status_code=400, detail="Invalid .doc file format")
    except Exception as e:
        logger.error(f"DOC extraction error: {str(e)}")
        # Fallback: try to read as plain text
        try:
            text = file_bytes.decode('latin-1', errors='ignore')
            import re
            text = re.sub(r'[^\x20-\x7E\n]', '', text)
            return text
        except:
            raise HTTPException(status_code=400, detail="Failed to extract text from DOC")

def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract text from plain text files"""
    try:
        # Try UTF-8 first, then fall back to latin-1
        try:
            return file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return file_bytes.decode('latin-1', errors='ignore')
    except Exception as e:
        logger.error(f"TXT extraction error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to extract text from TXT")

def extract_text_from_rtf(file_bytes: bytes) -> str:
    """Extract text from RTF files (basic extraction)"""
    try:
        text = file_bytes.decode('latin-1', errors='ignore')
        # Remove RTF control codes
        import re
        # Remove RTF header
        text = re.sub(r'\\[a-z]+\d*\s?', ' ', text)
        text = re.sub(r'[{}]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    except Exception as e:
        logger.error(f"RTF extraction error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to extract text from RTF")

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

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hashed_password
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Create user object (exclude password)
    user = User(
        id=user_doc['id'],
        email=user_doc['email'],
        full_name=user_doc['full_name'],
        created_at=datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/resume/create")
async def create_resume(resume_data: ResumeData, current_user: User = Depends(get_current_user)):
    resume = Resume(
        user_id=current_user.id,
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
        filename_lower = file.filename.lower()
        
        # Determine file type and extract text
        if filename_lower.endswith('.pdf'):
            text = extract_text_from_pdf(file_bytes)
        elif filename_lower.endswith('.docx'):
            text = extract_text_from_docx(file_bytes)
        elif filename_lower.endswith('.doc'):
            text = extract_text_from_doc(file_bytes)
        elif filename_lower.endswith('.txt'):
            text = extract_text_from_txt(file_bytes)
        elif filename_lower.endswith('.rtf'):
            text = extract_text_from_rtf(file_bytes)
        else:
            raise HTTPException(
                status_code=400, 
                detail="Unsupported file format. Please upload PDF, DOC, DOCX, TXT, or RTF files."
            )
        
        if not text or len(text.strip()) < 50:
            raise HTTPException(
                status_code=400, 
                detail="Could not extract sufficient text from the file. Please ensure the file contains readable text."
            )
        
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
    """
    Search for current job postings - returns realistic mock data
    
    TODO: Replace with real job API integration (JSearch, Google Jobs API, or Adzuna)
    To integrate real API:
    1. Install httpx: pip install httpx
    2. Get API key from RapidAPI or provider
    3. Replace mock data with: async with httpx.AsyncClient() as client: ...
    4. Parse real API response into same format
    """
    
    # Realistic job data based on search query
    job_templates = {
        "software": [
            {
                "job_id": "tech_001",
                "title": f"{query} - Mid Level",
                "company": "Google",
                "location": location or "Mountain View, CA",
                "description": f"We're looking for a talented {query} to join our growing team. You'll work on cutting-edge technologies including Python, JavaScript, React, and cloud infrastructure. Responsibilities include developing scalable applications, collaborating with cross-functional teams, and contributing to our innovation culture. Requirements: 3+ years experience, strong problem-solving skills, excellent communication.",
                "employment_type": "Full-time",
                "salary_range": "$120,000 - $180,000",
                "posted_date": "2 days ago",
                "url": "https://careers.google.com/jobs/tech_001",
                "required_skills": ["Python", "JavaScript", "React", "AWS", "Docker"]
            },
            {
                "job_id": "tech_002",
                "title": f"Senior {query}",
                "company": "Microsoft",
                "location": location or "Seattle, WA (Remote Available)",
                "description": f"Join Microsoft's engineering team as a Senior {query}. Lead technical initiatives, mentor junior developers, and architect scalable solutions. Work with Azure, .NET, TypeScript, and modern DevOps practices. We're looking for someone with 5+ years of experience who can drive innovation and technical excellence.",
                "employment_type": "Full-time",
                "salary_range": "$150,000 - $220,000",
                "posted_date": "1 week ago",
                "url": "https://careers.microsoft.com/jobs/tech_002",
                "required_skills": ["C#", ".NET", "Azure", "TypeScript", "Kubernetes"]
            },
            {
                "job_id": "tech_003",
                "title": f"{query} (Remote)",
                "company": "Amazon Web Services",
                "location": "Remote - Worldwide",
                "description": f"AWS is hiring a {query} to build next-generation cloud services. You'll design and implement distributed systems at massive scale. Strong background in Python, Go, or Java required. Experience with microservices, containerization, and AWS services preferred. Competitive compensation including stock options.",
                "employment_type": "Full-time",
                "salary_range": "$140,000 - $200,000",
                "posted_date": "3 days ago",
                "url": "https://amazon.jobs/tech_003",
                "required_skills": ["Python", "Go", "AWS", "Microservices", "Terraform"]
            }
        ],
        "default": [
            {
                "job_id": f"{query.lower().replace(' ', '_')}_001",
                "title": f"{query} Professional",
                "company": "Tech Innovations Inc",
                "location": location or "San Francisco, CA",
                "description": f"Exciting opportunity for a {query} professional. Join a dynamic team working on innovative projects. We offer competitive salary, great benefits, and career growth opportunities. Requirements include relevant experience, strong communication skills, and passion for technology.",
                "employment_type": "Full-time",
                "salary_range": "$90,000 - $140,000",
                "posted_date": "5 days ago",
                "url": f"https://techinnov.com/jobs/{query.lower().replace(' ', '_')}_001",
                "required_skills": ["Problem Solving", "Communication", "Team Collaboration"]
            },
            {
                "job_id": f"{query.lower().replace(' ', '_')}_002",
                "title": f"Senior {query} Specialist",
                "company": "Digital Solutions Corp",
                "location": location or "New York, NY (Hybrid)",
                "description": f"We're seeking an experienced {query} specialist to lead key initiatives. You'll work with cutting-edge technology, mentor team members, and drive business impact. Requires 5+ years of experience and proven track record of success.",
                "employment_type": "Full-time",
                "salary_range": "$110,000 - $160,000",
                "posted_date": "1 week ago",
                "url": f"https://digitalsolutions.com/careers/{query.lower().replace(' ', '_')}_002",
                "required_skills": ["Leadership", "Technical Expertise", "Strategic Thinking"]
            },
            {
                "job_id": f"{query.lower().replace(' ', '_')}_003",
                "title": f"{query} - Contract Position",
                "company": "StartupXYZ",
                "location": location or "Remote",
                "description": f"Join our fast-growing startup as a {query} contractor. Work on exciting projects, flexible hours, and potential for full-time conversion. We're looking for self-motivated individuals who thrive in dynamic environments.",
                "employment_type": "Contract",
                "salary_range": "$80 - $120/hour",
                "posted_date": "2 days ago",
                "url": f"https://startupxyz.io/jobs/{query.lower().replace(' ', '_')}_003",
                "required_skills": ["Adaptability", "Self-Management", "Technical Skills"]
            }
        ]
    }
    
    # Determine which template set to use
    query_lower = query.lower()
    if any(word in query_lower for word in ["software", "engineer", "developer", "programmer"]):
        jobs = job_templates["software"]
    else:
        jobs = job_templates["default"]
    
    # Add more variety based on location
    if location:
        for job in jobs:
            if "Remote" not in job["location"]:
                job["location"] = location
    
    return jobs[:limit]

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

@api_router.post("/resume/generate-for-job")
async def generate_resume_for_job(job_input: JobPostingInput, current_user: User = Depends(get_current_user)):
    """Generate a tailored resume based on a job posting"""
    chat = await get_llm_chat()
    
    prompt = f"""You are an expert resume writer. Analyze this job posting and create a perfectly tailored resume.

Job Title: {job_input.job_title}
Company: {job_input.company}
Job Description:
{job_input.job_description}

Create a professional resume optimized for this specific job. Return a JSON object with:
- full_name: "{current_user.full_name}"
- email: "{current_user.email}"
- phone: ""
- location: ""
- title: (A professional title matching this job)
- summary: (A compelling 3-4 sentence summary highlighting relevant experience for THIS job)
- skills: (Array of 8-12 skills directly relevant to this job posting, each with name, proficiency level, and years)
- experience: (3-4 relevant work experiences with strong action verbs and quantifiable achievements matching the job requirements)
- education: (Relevant education entries)

Make the resume ATS-friendly and specifically highlight qualifications matching the job description.
Respond with ONLY valid JSON, no markdown."""
    
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
        
        # Clean up skills data
        if 'skills' in parsed and isinstance(parsed['skills'], list):
            cleaned_skills = []
            for skill in parsed['skills']:
                if isinstance(skill, dict) and skill.get('name'):
                    cleaned_skill = {'name': skill['name']}
                    cleaned_skill['proficiency'] = skill.get('proficiency', 'intermediate')
                    cleaned_skill['years'] = float(skill.get('years', 0))
                    cleaned_skills.append(cleaned_skill)
            parsed['skills'] = cleaned_skills
        
        # Set defaults for missing fields
        parsed.setdefault('phone', '')
        parsed.setdefault('location', '')
        parsed.setdefault('skills', [])
        parsed.setdefault('experience', [])
        parsed.setdefault('education', [])
        
        # Create resume
        resume_data = ResumeData(**parsed)
        resume = Resume(user_id=current_user.id, data=resume_data)
        
        doc = resume.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        doc['job_posting'] = {
            'title': job_input.job_title,
            'company': job_input.company,
            'description': job_input.job_description
        }
        
        await db.resumes.insert_one(doc)
        
        return {
            "id": resume.id,
            "data": parsed,
            "message": f"Resume tailored for {job_input.job_title} at {job_input.company}"
        }
    
    except Exception as e:
        logger.error(f"Resume generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate resume: {str(e)}")

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
