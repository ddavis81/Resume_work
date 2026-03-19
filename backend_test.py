#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, List, Tuple
import io

class ResumeBuilderAPITester:
    def __init__(self):
        self.base_url = "https://career-craft-42.preview.emergentagent.com/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resume_id = None
    
    def log_result(self, test_name: str, success: bool, details: str = "", error_msg: str = ""):
        """Log test result for tracking"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error_msg:
            print(f"   Error: {error_msg}")
    
    def test_api_health(self) -> bool:
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_result("API Health Check", True, f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}")
                return True
            else:
                self.log_result("API Health Check", False, error_msg=f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("API Health Check", False, error_msg=str(e))
            return False
    
    def test_create_resume(self) -> bool:
        """Test resume creation endpoint"""
        test_data = {
            "full_name": "John Test Doe",
            "email": "john.test@example.com",
            "phone": "+1 (555) 123-4567",
            "location": "San Francisco, CA",
            "title": "Senior Software Engineer",
            "summary": "Experienced software engineer with 5+ years in full-stack development",
            "skills": [
                {"name": "Python", "proficiency": "expert", "years": 5},
                {"name": "JavaScript", "proficiency": "advanced", "years": 4},
                {"name": "React", "proficiency": "advanced", "years": 3}
            ],
            "experience": [
                {
                    "title": "Senior Software Engineer",
                    "company": "TechCorp Inc",
                    "duration": "Jan 2020 - Present",
                    "description": "Lead development of web applications using Python and React"
                }
            ],
            "education": [
                {
                    "degree": "Bachelor of Science in Computer Science",
                    "institution": "University of California",
                    "year": "2018"
                }
            ]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/resume/create",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data:
                    self.created_resume_id = data['id']
                    self.log_result("Create Resume", True, f"Resume ID: {self.created_resume_id}")
                    return True
                else:
                    self.log_result("Create Resume", False, error_msg="No ID in response")
                    return False
            else:
                self.log_result("Create Resume", False, error_msg=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Create Resume", False, error_msg=str(e))
            return False
    
    def test_get_resume(self) -> bool:
        """Test getting resume by ID"""
        if not self.created_resume_id:
            self.log_result("Get Resume", False, error_msg="No resume ID available")
            return False
        
        try:
            response = requests.get(f"{self.base_url}/resume/{self.created_resume_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'data' in data and 'full_name' in data['data']:
                    self.log_result("Get Resume", True, f"Retrieved resume for: {data['data']['full_name']}")
                    return True
                else:
                    self.log_result("Get Resume", False, error_msg="Invalid response format")
                    return False
            elif response.status_code == 404:
                self.log_result("Get Resume", False, error_msg="Resume not found")
                return False
            else:
                self.log_result("Get Resume", False, error_msg=f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get Resume", False, error_msg=str(e))
            return False
    
    def test_resume_upload(self) -> bool:
        """Test resume upload endpoint with mock PDF"""
        # Create a simple text file to simulate resume upload
        mock_resume_text = """
John Doe
Senior Software Engineer
john.doe@email.com | (555) 123-4567 | San Francisco, CA

PROFESSIONAL SUMMARY
Experienced software engineer with expertise in Python, JavaScript, and cloud technologies.

SKILLS
- Python (5 years)
- JavaScript (4 years) 
- React (3 years)
- AWS (2 years)

WORK EXPERIENCE
Senior Software Engineer | TechCorp | 2020 - Present
- Developed scalable web applications
- Led a team of 5 engineers
- Improved system performance by 40%

EDUCATION
Bachelor of Computer Science | UC Berkeley | 2018
        """
        
        try:
            # Simulate file upload
            files = {
                'file': ('test_resume.txt', io.StringIO(mock_resume_text), 'text/plain')
            }
            data = {'user_id': 'test_user'}
            
            # Note: This test expects the endpoint to handle text files gracefully
            # In real implementation, we'd use a proper PDF/DOCX file
            response = requests.post(
                f"{self.base_url}/resume/upload", 
                files=files, 
                data=data, 
                timeout=60
            )
            
            # We expect this to fail with unsupported format, which is expected behavior
            if response.status_code == 400 and "PDF and DOCX" in response.text:
                self.log_result("Resume Upload Validation", True, "Correctly rejected unsupported format")
                return True
            elif response.status_code == 200:
                data = response.json()
                if 'id' in data:
                    self.log_result("Resume Upload", True, f"Uploaded resume ID: {data['id']}")
                    return True
                else:
                    self.log_result("Resume Upload", False, error_msg="No ID in upload response")
                    return False
            else:
                self.log_result("Resume Upload", False, error_msg=f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
        except Exception as e:
            self.log_result("Resume Upload", False, error_msg=str(e))
            return False
    
    def test_improve_resume(self) -> bool:
        """Test AI resume improvement endpoint"""
        if not self.created_resume_id:
            self.log_result("Improve Resume", False, error_msg="No resume ID available")
            return False
        
        try:
            improve_data = {
                "resume_id": self.created_resume_id,
                "section": "all"
            }
            
            response = requests.post(
                f"{self.base_url}/resume/improve",
                json=improve_data,
                headers={"Content-Type": "application/json"},
                timeout=60  # AI calls can take longer
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'suggestions' in data and len(data['suggestions']) > 10:
                    self.log_result("Improve Resume", True, f"Got {len(data['suggestions'])} chars of suggestions")
                    return True
                else:
                    self.log_result("Improve Resume", False, error_msg="No suggestions in response")
                    return False
            elif response.status_code == 404:
                self.log_result("Improve Resume", False, error_msg="Resume not found for improvement")
                return False
            else:
                self.log_result("Improve Resume", False, error_msg=f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
        except Exception as e:
            self.log_result("Improve Resume", False, error_msg=str(e))
            return False
    
    def test_search_jobs(self) -> bool:
        """Test job search endpoint"""
        try:
            params = {
                "query": "Software Engineer",
                "location": "San Francisco",
                "limit": 5
            }
            
            response = requests.get(f"{self.base_url}/jobs/search", params=params, timeout=30)
            
            if response.status_code == 200:
                jobs = response.json()
                if isinstance(jobs, list) and len(jobs) > 0:
                    job = jobs[0]
                    required_fields = ['job_id', 'title', 'company', 'location', 'description']
                    if all(field in job for field in required_fields):
                        self.log_result("Search Jobs", True, f"Found {len(jobs)} jobs with proper format")
                        return True
                    else:
                        self.log_result("Search Jobs", False, error_msg="Jobs missing required fields")
                        return False
                else:
                    self.log_result("Search Jobs", False, error_msg="No jobs returned")
                    return False
            else:
                self.log_result("Search Jobs", False, error_msg=f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Search Jobs", False, error_msg=str(e))
            return False
    
    def test_match_jobs(self) -> bool:
        """Test job matching endpoint"""
        if not self.created_resume_id:
            self.log_result("Match Jobs", False, error_msg="No resume ID available")
            return False
        
        try:
            match_data = {
                "resume_id": self.created_resume_id,
                "query": "Software Engineer",
                "location": "San Francisco",
                "limit": 5
            }
            
            response = requests.post(f"{self.base_url}/jobs/match", params=match_data, timeout=60)
            
            if response.status_code == 200:
                matches = response.json()
                if isinstance(matches, list) and len(matches) > 0:
                    match = matches[0]
                    required_fields = ['job_id', 'title', 'company', 'match_score', 'match_percentage']
                    if all(field in match for field in required_fields):
                        self.log_result("Match Jobs", True, f"Found {len(matches)} matches with scores")
                        return True
                    else:
                        self.log_result("Match Jobs", False, error_msg="Matches missing required fields")
                        return False
                else:
                    self.log_result("Match Jobs", False, error_msg="No matches returned")
                    return False
            elif response.status_code == 404:
                self.log_result("Match Jobs", False, error_msg="Resume not found for matching")
                return False
            else:
                self.log_result("Match Jobs", False, error_msg=f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
        except Exception as e:
            self.log_result("Match Jobs", False, error_msg=str(e))
            return False
    
    def test_get_templates(self) -> bool:
        """Test templates endpoint"""
        try:
            response = requests.get(f"{self.base_url}/templates", timeout=10)
            
            if response.status_code == 200:
                templates = response.json()
                if isinstance(templates, list) and len(templates) > 0:
                    template = templates[0]
                    required_fields = ['id', 'name', 'preview']
                    if all(field in template for field in required_fields):
                        self.log_result("Get Templates", True, f"Found {len(templates)} templates")
                        return True
                    else:
                        self.log_result("Get Templates", False, error_msg="Templates missing required fields")
                        return False
                else:
                    self.log_result("Get Templates", False, error_msg="No templates returned")
                    return False
            else:
                self.log_result("Get Templates", False, error_msg=f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get Templates", False, error_msg=str(e))
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CareerCraft Resume Builder API Testing...")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test in order of dependency
        tests = [
            self.test_api_health,
            self.test_create_resume,
            self.test_get_resume,
            self.test_resume_upload,
            self.test_improve_resume,
            self.test_search_jobs,
            self.test_match_jobs,
            self.test_get_templates
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_result(test.__name__, False, error_msg=f"Test exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"📈 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📍 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return 0
        else:
            print("⚠️  SOME TESTS FAILED")
            return 1

def main():
    tester = ResumeBuilderAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)