"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "../ui/progress";
import { CheckCircle, Download, Loader2 } from "lucide-react";

interface Question {
  id: string;
  section: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface UserInfo {
  email: string;
  mobile: string;
}

interface Response {
  questionId: string;
  answer: string;
  section: string;
}

const conciseQuestions: Question[] = [
  // Section 1: Academic Readiness (5 Questions)
  {
    id: "Q1",
    section: "Academic Readiness",
    question: "How would you describe your academic performance?",
    options: {
      A: "Consistently high (above 85%)",
      B: "Good (70–85%)",
      C: "Average (55–70%)",
      D: "Below average (below 55%)"
    }
  },
  {
    id: "Q2",
    section: "Academic Readiness", 
    question: "Have you attempted or planned standardized tests (IELTS/TOEFL, GRE/GMAT, SAT)?",
    options: {
      A: "Already taken and scored well",
      B: "Preparing actively",
      C: "Planned but not started",
      D: "Not considered yet"
    }
  },
  {
    id: "Q3",
    section: "Academic Readiness",
    question: "What is your English proficiency level?",
    options: {
      A: "Fluent in academic and conversational use",
      B: "Good, but need improvement in academic writing",
      C: "Understandable but limited",
      D: "Weak, needs strong improvement"
    }
  },
  {
    id: "Q4",
    section: "Academic Readiness",
    question: "Do you have exposure to research projects, internships, or presentations?",
    options: {
      A: "Strong experience",
      B: "Some exposure", 
      C: "Limited",
      D: "None"
    }
  },
  {
    id: "Q5",
    section: "Academic Readiness",
    question: "How do you usually prepare for exams?",
    options: {
      A: "Planned, consistent schedule",
      B: "Moderate preparation",
      C: "Last-minute study",
      D: "Unstructured, inconsistent"
    }
  },

  // Section 2: Career & Goal Alignment (4 Questions)
  {
    id: "Q6", 
    section: "Career & Goal Alignment",
    question: "Do you have clear long-term career goals?",
    options: {
      A: "Very clear",
      B: "Somewhat clear",
      C: "Vague",
      D: "No clarity"
    }
  },
  {
    id: "Q7",
    section: "Career & Goal Alignment", 
    question: "Is your intended course aligned with your career goals?",
    options: {
      A: "Strongly aligned",
      B: "Somewhat aligned",
      C: "Unclear",
      D: "Not aligned"
    }
  },
  {
    id: "Q8",
    section: "Career & Goal Alignment",
    question: "Have you researched universities and rankings?",
    options: {
      A: "Extensively",
      B: "Somewhat",
      C: "Minimal", 
      D: "Not at all"
    }
  },
  {
    id: "Q9",
    section: "Career & Goal Alignment",
    question: "What is your main motivation to study abroad?",
    options: {
      A: "Career growth/employability",
      B: "Research/academic excellence",
      C: "Lifestyle and exposure",
      D: "Migration/settlement"
    }
  },

  // Section 3: Financial Planning (4 Questions)
  {
    id: "Q10",
    section: "Financial Planning",
    question: "How prepared are you with tuition + living cost estimation?",
    options: {
      A: "Fully calculated",
      B: "Partially calculated",
      C: "Rough idea",
      D: "No idea"
    }
  },
  {
    id: "Q11",
    section: "Financial Planning",
    question: "What is your primary funding source?",
    options: {
      A: "Family savings",
      B: "Education loan", 
      C: "Scholarship/grants",
      D: "Not planned yet"
    }
  },
  {
    id: "Q12",
    section: "Financial Planning",
    question: "Do you have contingency/emergency funds planned?",
    options: {
      A: "Yes",
      B: "Somewhat",
      C: "Minimal",
      D: "None"
    }
  },
  {
    id: "Q13",
    section: "Financial Planning",
    question: "How aware are you of scholarship opportunities?",
    options: {
      A: "Very aware",
      B: "Somewhat aware",
      C: "Slightly aware",
      D: "Not aware"
    }
  },

  // Section 4: Personal & Cultural Readiness (4 Questions)
  {
    id: "Q14",
    section: "Personal & Cultural Readiness",
    question: "How adaptable are you to new cultures and lifestyles?",
    options: {
      A: "Very adaptable",
      B: "Adaptable",
      C: "Somewhat adaptable", 
      D: "Struggle to adapt"
    }
  },
  {
    id: "Q15",
    section: "Personal & Cultural Readiness",
    question: "How independent are you in daily living (cooking, budgeting, self-care)?",
    options: {
      A: "Fully independent",
      B: "Mostly independent",
      C: "Somewhat dependent",
      D: "Dependent"
    }
  },
  {
    id: "Q16",
    section: "Personal & Cultural Readiness",
    question: "How comfortable are you interacting with people from diverse cultures?",
    options: {
      A: "Very comfortable",
      B: "Comfortable",
      C: "Somewhat comfortable",
      D: "Uncomfortable"
    }
  },
  {
    id: "Q17",
    section: "Personal & Cultural Readiness",
    question: "How resilient are you in handling stress?",
    options: {
      A: "Very resilient",
      B: "Moderately resilient",
      C: "Sometimes struggle",
      D: "Easily overwhelmed"
    }
  },

  // Section 5: Practical Readiness (4 Questions)  
  {
    id: "Q18",
    section: "Practical Readiness",
    question: "How prepared are you with visa documentation?",
    options: {
      A: "Fully prepared",
      B: "Somewhat",
      C: "Minimal",
      D: "Not prepared"
    }
  },
  {
    id: "Q19",
    section: "Practical Readiness",
    question: "How comfortable are you with digital/online tools?",
    options: {
      A: "Very comfortable",
      B: "Comfortable", 
      C: "Somewhat comfortable",
      D: "Uncomfortable"
    }
  },
  {
    id: "Q20",
    section: "Practical Readiness",
    question: "Do you have valid health insurance/medical coverage plans?",
    options: {
      A: "Yes",
      B: "Partially",
      C: "Exploring",
      D: "None"
    }
  },
  {
    id: "Q21",
    section: "Practical Readiness",
    question: "How good are you at meeting deadlines?",
    options: {
      A: "Excellent",
      B: "Good",
      C: "Fair",
      D: "Poor"
    }
  },

  // Section 6: Support System (4 Questions)
  {
    id: "Q22",
    section: "Support System",
    question: "Do your parents/family fully support your study abroad decision?",
    options: {
      A: "Strongly support",
      B: "Support with concerns",
      C: "Unsure",
      D: "Do not support"
    }
  },
  {
    id: "Q23",
    section: "Support System",
    question: "How financially committed is your family?",
    options: {
      A: "Fully committed",
      B: "Somewhat",
      C: "Limited",
      D: "Not committed"
    }
  },
  {
    id: "Q24", 
    section: "Support System",
    question: "How aligned are your parents' expectations with yours?",
    options: {
      A: "Strongly aligned",
      B: "Somewhat aligned",
      C: "Slightly aligned",
      D: "Not aligned"
    }
  },
  {
    id: "Q25",
    section: "Support System", 
    question: "Have you openly discussed your goals with your parents?",
    options: {
      A: "Yes, extensively",
      B: "Somewhat",
      C: "Minimal",
      D: "Not at all"
    }
  }
];

export default function ConciseSurvey() {
  const [step, setStep] = useState<'info' | 'survey' | 'processing' | 'completed'>('info');
  const [userInfo, setUserInfo] = useState<UserInfo>({ email: '', mobile: '' });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const currentQuestion = conciseQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / conciseQuestions.length) * 100;

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInfo.email && userInfo.mobile) {
      setStep('survey');
    }
  };

  const calculateScores = (responses: Response[]) => {
    const sectionScores: { [key: string]: { correct: number; total: number } } = {};
    
    // Initialize section scores - MUST match the section names from questions
    const sections = [
      'Academic Readiness',
      'Career & Goal Alignment', 
      'Financial Planning',
      'Personal & Cultural Readiness',
      'Practical Readiness',
      'Support System'
    ];
    sections.forEach(section => {
      sectionScores[section] = { correct: 0, total: 0 };
    });
    
    // Calculate scores based on responses
    responses.forEach(response => {
      const section = response.section;
      if (sectionScores[section]) {
        sectionScores[section].total += 1;
        
        // Score based on answer choice (A=4, B=3, C=2, D=1)
        const answerScore = response.answer === 'A' ? 4 : response.answer === 'B' ? 3 : response.answer === 'C' ? 2 : 1;
        sectionScores[section].correct += answerScore;
      }
    });
    
    // Convert to percentage scores with more realistic scoring
    const topicScoresArray = Object.entries(sectionScores).map(([section, scores]) => {
      // Calculate percentage based on average score per question
      const averageScorePerQuestion = scores.total > 0 ? scores.correct / scores.total : 0;
      const percentage = Math.round((averageScorePerQuestion / 4) * 100); // 4 is max score per question
      
      return {
        name: section,
        correct: Math.max(0, Math.min(100, percentage)), // Clamp between 0-100
        total: 100
      };
    });

    const overallScore = topicScoresArray.length > 0 
      ? Math.round(topicScoresArray.reduce((sum, topic) => sum + topic.correct, 0) / topicScoresArray.length)
      : 0;

    return {
      userName: userInfo.email.split('@')[0],
      userEmail: userInfo.email,
      userPhone: userInfo.mobile,
      overallScore,
      topicScoresArray
    };
  };

  const handleAnswerSelect = (answer: string) => {
    setCurrentAnswer(answer);
  };

  const handleNext = async () => {
    if (currentAnswer) {
      const newResponse: Response = {
        questionId: currentQuestion.id,
        answer: currentAnswer,
        section: currentQuestion.section
      };

      const updatedResponses = [...responses, newResponse];
      setResponses(updatedResponses);

      if (currentQuestionIndex < conciseQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentAnswer('');
      } else {
        setStep('processing');
        
        try {
          const studentData = calculateScores(updatedResponses);
          
          // Create comprehensive data object with both scores and raw responses
          const comprehensiveData = {
            ...studentData,
            rawResponses: updatedResponses, // Include individual question-answer pairs
            questions: conciseQuestions // Include the actual questions
          };
          
          console.log('🔄 Calling LLM analysis for Concise Survey...');
          console.log('📊 Data being sent to LLM:', JSON.stringify(comprehensiveData, null, 2));
          
          // Save to localStorage for inspection
          localStorage.setItem('lastLLMPayload', JSON.stringify(comprehensiveData));
          console.log('💾 Data saved to localStorage as "lastLLMPayload"');
          
          // Attempt to save as downloadable file (browser API)
          try {
            const dataStr = JSON.stringify(comprehensiveData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `llm-payload-concise-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('📥 Downloaded JSON payload file for inspection');
          } catch (downloadError) {
            console.warn('⚠️ Could not auto-download file:', downloadError);
          }
          
          const response = await fetch('/api/analyze-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
          });

          if (response.ok) {
            const analysisResults = await response.json();
            console.log('✅ LLM analysis successful for Concise Survey');
            
            const surveyData = {
              userInfo,
              responses: updatedResponses,
              completedAt: new Date().toISOString(),
              testType: 'Focused Study Abroad Readiness Assessment',
              analysisResults
            };
            
            localStorage.setItem('conciseSurvey', JSON.stringify(surveyData));
            setStep('completed');
          } else {
            console.error('❌ LLM analysis failed for Concise Survey');
            const surveyData = {
              userInfo,
              responses: updatedResponses,
              completedAt: new Date().toISOString(),
              testType: 'Focused Study Abroad Readiness Assessment'
            };
            
            localStorage.setItem('conciseSurvey', JSON.stringify(surveyData));
            setStep('completed');
          }
        } catch (error) {
          console.error('❌ Error in Concise Survey analysis:', error);
          const surveyData = {
            userInfo,
            responses: updatedResponses,
            completedAt: new Date().toISOString(),
            testType: 'Focused Study Abroad Readiness Assessment'
          };
          
          localStorage.setItem('conciseSurvey', JSON.stringify(surveyData));
          setStep('completed');
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Find previous answer
      const prevResponse = responses.find(r => r.questionId === conciseQuestions[currentQuestionIndex - 1].id);
      setCurrentAnswer(prevResponse?.answer || '');
      // Remove the current question's response if it exists
      setResponses(responses.filter(r => r.questionId !== currentQuestion.id));
    }
  };

  if (step === 'processing') {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="mx-auto h-16 w-16 text-purple-600 animate-spin" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Analyzing Your Responses
              </h2>
              <p className="text-lg text-muted-foreground">
                Our AI is evaluating your assessment and preparing your personalized study abroad readiness report...
              </p>
              <div className="bg-black dark:bg-black border border-purple-500/30 p-4 rounded-lg">
                <p className="text-sm text-white">
                  <strong>Assessment Type:</strong> Focused Study Abroad Readiness Assessment<br />
                  <strong>Questions Completed:</strong> {conciseQuestions.length}<br />
                  <strong>Processing:</strong> AI Analysis in Progress
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'info') {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              Concise Study Abroad Assessment
            </CardTitle>
            <CardDescription className="text-center">
              A focused 25-question readiness assessment (10-12 minutes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={userInfo.mobile}
                  onChange={(e) => setUserInfo({...userInfo, mobile: e.target.value})}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              >
                Start Concise Assessment
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'completed') {
    const handleDownloadPDF = async () => {
      if (isDownloadingPDF) return;
      
      setIsDownloadingPDF(true);
      try {
        const surveyData = JSON.parse(localStorage.getItem('conciseSurvey') || '{}');
        if (surveyData.analysisResults) {
          console.log('🔄 Starting PDF generation for Concise Survey...');
          
          // Wait 25 seconds for PDF generation (no premature checks)
          console.log('⏳ Waiting 25 seconds for PDF generation to complete...');
          await new Promise(resolve => setTimeout(resolve, 25000));
          
          // Now make the request after waiting
          const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(surveyData.analysisResults)
          });

          if (response.ok) {
            console.log('✅ PDF generated successfully for Concise Survey');
            const blob = await response.blob();
            console.log('📄 Blob created, size:', blob.size, 'type:', blob.type);
            
            // Direct download without any size checks
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `concise-study-abroad-report-${userInfo.email.split('@')[0]}.pdf`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }, 1000);
            
            console.log('✅ PDF download initiated for Concise Survey');
          } else {
            console.error('❌ PDF generation failed:', response.status);
            alert('PDF generation failed. Please try again.');
          }
        } else {
          console.error('❌ No analysis results found for Concise Survey');
          alert('No analysis results found. Please complete the assessment again.');
        }
      } catch (error: any) {
        console.error('❌ Error downloading PDF for Concise Survey:', error);
        alert('Error downloading PDF. Please try again.');
      } finally {
        setIsDownloadingPDF(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Concise Assessment Completed!
              </h2>
              <p className="text-lg text-muted-foreground">
                Thank you for completing the Concise Study Abroad Readiness Assessment. Your responses have been saved.
              </p>
              <div className="bg-black dark:bg-black border border-purple-500/30 p-4 rounded-lg">
                <p className="text-sm text-white">
                  <strong>Total Questions:</strong> {conciseQuestions.length}<br />
                  <strong>Completed At:</strong> {new Date().toLocaleString()}<br />
                  <strong>Email:</strong> {userInfo.email}<br />
                  <strong>Assessment Type:</strong> Concise Track (25 Questions)
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className={`bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 ${isDownloadingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isDownloadingPDF ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Detailed Report
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  Take Another Assessment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{currentQuestion.section}</h2>
              <span className="text-sm text-muted-foreground">
                {currentQuestionIndex + 1} of {conciseQuestions.length}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              Concise Track • Estimated time: 10-12 minutes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {currentQuestion.id}. {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={currentAnswer} onValueChange={handleAnswerSelect}>
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                <Label 
                  htmlFor={`${currentQuestion.id}-${key}`} 
                  className="flex-1 cursor-pointer text-sm leading-relaxed"
                >
                  <span className="font-medium">{key})</span> {value}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          variant="outline"
        >
          Previous
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!currentAnswer}
          className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
        >
          {currentQuestionIndex === conciseQuestions.length - 1 ? 'Complete Assessment' : 'Next'}
        </Button>
      </div>
    </div>
  );
}