    import { NextRequest, NextResponse } from 'next/server'
    import OpenAI from 'openai'

    interface StudentData {
      userName: string
      userEmail?: string
      userPhone?: string
      overallScore: number
      topicScoresArray: Array<{
        name: string
        correct: number
        weighted: number
        weight: number
        total: number
      }>
    }

    // Removed LLMResponse interface - we now return data in the format expected by generate-pdf
    // The LLM is instructed to return JSON with fields matching the PDF generation requirements:
    // - "Student Name", "Student Email", "Student Phone"
    // - "Scores" object with framework names as keys
    // - "Overall Readiness Index", "Readiness Level"
    // - "Strengths", "Gaps", "Recommendations" (strings or arrays)
    // - "Country Fit (Top 3)" array

    export async function POST(request: NextRequest) {
      try {
        console.log('🔍 Analyze-results API called');
        const studentData: StudentData = await request.json()
        console.log('📥 Received student data:', JSON.stringify(studentData, null, 2));
        
        // Validate required fields
        if (!studentData.userName) {
          console.error('❌ Missing userName in student data')
          return NextResponse.json({ error: 'Missing user name' }, { status: 400 })
        }
        
        // Check if API key is available
        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (!apiKey) {
          console.error('❌ PERPLEXITY_API_KEY not found in environment variables');
          throw new Error('PERPLEXITY_API_KEY not configured');
        }
        console.log('✅ PERPLEXITY_API_KEY found:', apiKey.substring(0, 10) + '...');
        console.log('🔑 Full API key length:', apiKey.length);
        
        // Prepare the prompts - Enhanced with comprehensive evaluation philosophy
          const systemPrompt = `You are an expert psychometric evaluator specializing in study-abroad readiness assessment for Indian students.
    
    You analyze psychometric test responses using the Comprehensive Study Abroad Assessment Framework, which uses a weighted multi-factor scoring model.
    
    EVALUATION PHILOSOPHY:
    Every multiple-choice answer maps to latent constructs:
    - Financial planning ability, budgeting confidence, risk management, cost awareness
    - Academic readiness: GPA consistency, test prep, language skills
    - Career clarity: goal alignment, program relevance, decision maturity
    - Personal & cultural readiness: adaptability, independence, social integration
    - Practical readiness: visa/document prep, tech skills, safety planning
    - Support system: family consensus, emotional resilience, backup plans
    
    SCORING METHODOLOGY:
    Each response uses a 5-point scale:
    - Response A (Strongly Agree/Very Confident) = 5 (Excellent readiness)
    - Response B (Agree/Confident) = 4 (Above average readiness)
    - Response C (Neutral/Unsure) = 3 (Moderate readiness)
    - Response D (Disagree/Weak) = 2 (Below readiness threshold)
    - Response E (Strongly Disagree/Not Ready) = 1 (Significant gap)
    
    Each dimension contributes to one of six readiness dimensions with specific weights:
    1. Financial Planning - 25% weight (Budgeting, funding confidence, risk management, cost awareness)
    2. Academic Readiness - 20% weight (GPA consistency, test prep, language skills)
    3. Career & Goal Alignment - 20% weight (Career clarity, program relevance, decision maturity)
    4. Personal & Cultural Readiness - 15% weight (Adaptability, independence, social integration)
    5. Practical Readiness - 10% weight (Visa/document prep, tech skills, safety planning)
    6. Support System - 10% weight (Family consensus, emotional resilience, backup plan)
    
    COMPREHENSIVE READINESS INDEX (CRI) CALCULATION:
    CRI = Σ(Score_i × Weight_i) for all 6 dimensions
    The CRI ranges from 0-100, providing an overall readiness assessment.
    
    READINESS LEVELS:
    90-100: Excellent (Ready to apply immediately, 0-3 months prep)
    80-89: Very Good (Minor preparation needed, 3-6 months prep)
    70-79: Good (Prepare before next cycle, 6-9 months prep)
    60-69: Satisfactory (Strengthen weak areas, 9-12 months prep)
    50-59: Needs Improvement (Major readiness gaps, 12-18 months prep)
    <50: Low Readiness (Reassess plan/delay, >18 months prep)
    
    COUNTRY-FIT MATRIX LOGIC:
    Evaluate countries based on CRI level, financial affordability, course-career alignment, cultural adaptability, and visa risk.
    Consider: Canada, Australia, UK, Germany, USA, Singapore, Ireland, Netherlands, UAE.
    
    You must provide:
    1. Detailed analysis of each dimension's specific constructs
    2. Concrete, actionable recommendations tailored to Indian study-abroad context
    3. Country-specific fit assessment based on student's profile
    4. Timeline-based preparation roadmap
    
    Output ONLY valid JSON in the specified format. Be specific, data-driven, and practical.`

          const userPrompt = `DETAILED PSYCHOMETRIC ASSESSMENT REQUEST

    STUDENT INFORMATION:
    Name: ${studentData.userName}
    Email: ${studentData.userEmail || 'Not provided'}
    Phone: ${studentData.userPhone || 'Not provided'}

    TEST PERFORMANCE BY DIMENSION:
    ${studentData.topicScoresArray.map(topic => {
      const frameworkMapping: { [key: string]: { name: string; weight: number; constructs: string[] } } = {
        // Original survey section names (for backward compatibility)
        'Academic Readiness': { 
          name: 'Academic Readiness', 
          weight: 20, 
          constructs: ['GPA consistency', 'Standardized test prep', 'English language proficiency', 'Subject mastery'] 
        },
        'Cultural Adaptability': { 
          name: 'Personal & Cultural Readiness', 
          weight: 15, 
          constructs: ['Cultural openness', 'Cross-cultural communication', 'Independence', 'Emotional resilience'] 
        },
        'Career Clarity': { 
          name: 'Career & Goal Alignment', 
          weight: 20, 
          constructs: ['Career goal clarity', 'Program relevance', 'Decision maturity', 'Long-term planning'] 
        },
        'Study Abroad Readiness': { 
          name: 'Practical Readiness', 
          weight: 10, 
          constructs: ['Visa process understanding', 'Document preparation', 'Technology skills', 'Safety awareness'] 
        },
        // Actual section names from Ultra Quick Survey questions
        'Career & Goal Alignment': { 
          name: 'Career & Goal Alignment', 
          weight: 20, 
          constructs: ['Career goal clarity', 'Program relevance', 'Decision maturity', 'Long-term planning'] 
        },
        'Personal & Cultural Readiness': { 
          name: 'Personal & Cultural Readiness', 
          weight: 15, 
          constructs: ['Cultural openness', 'Cross-cultural communication', 'Independence', 'Emotional resilience'] 
        },
        'Practical Readiness': { 
          name: 'Practical Readiness', 
          weight: 10, 
          constructs: ['Visa process understanding', 'Document preparation', 'Technology skills', 'Safety awareness'] 
        },
        'Support System': { 
          name: 'Support System', 
          weight: 10, 
          constructs: ['Family consensus', 'Financial backing', 'Emotional support', 'Backup plans'] 
        },
        'Financial Planning': { 
          name: 'Financial Planning', 
          weight: 25, 
          constructs: ['Budgeting skills', 'Funding sources', 'Loan awareness', 'Cost management'] 
        }
      };
      
      const dimension = frameworkMapping[topic.name] || { name: topic.name, weight: 0, constructs: [] };
      const score = Math.round((topic.correct/topic.total)*100);
      return `• ${dimension.name} (Weight: ${dimension.weight}%): ${score}%\n  Constructs: ${dimension.constructs.join(', ')}\n  Interpretation: ${score >= 90 ? 'Excellent' : score >= 80 ? 'Very Good' : score >= 70 ? 'Good' : score >= 60 ? 'Satisfactory' : 'Needs Improvement'}`;
    }).join('\n\n')}

    AGGREGATE PERFORMANCE:
    Raw Overall Score: ${studentData.overallScore}/100
    
    CRITICAL ANALYSIS REQUIREMENTS:
    
    1. DIMENSION-BY-DIMENSION BREAKDOWN:
    For each of the 6 dimensions, provide:
    - Specific strengths observed (cite the constructs that scored well)
    - Specific gaps identified (cite the constructs that need improvement)
    - Realistic risk assessment for that dimension in international education context
    
    2. COMPREHENSIVE READINESS INDEX (CRI) CALCULATION:
    Calculate: CRI = (Financial Planning × 0.25) + (Academic Readiness × 0.20) + (Career Alignment × 0.20) + (Personal & Cultural × 0.15) + (Practical Readiness × 0.10) + (Support System × 0.10)
    This gives the weighted CRI score (0-100 range).
    
    3. READINESS LEVEL & TIMELINE:
    Based on CRI, determine:
    - Specific readiness level (Excellent/Very Good/Good/Satisfactory/Needs Improvement/Low)
    - Recommended preparation timeline
    - Key milestones to achieve before applying
    
    4. COUNTRY-FIT ANALYSIS:
    For top 3 countries, provide:
    - Match percentage (0-100%)
    - Specific reasons why this country fits the student's profile
    - Potential challenges for this student in that country
    - Specific universities or programs to consider
    
    5. ACTIONABLE RECOMMENDATIONS:
    Provide specific, actionable steps:
    - Immediate actions (next 1-3 months)
    - Short-term goals (3-6 months)
    - Medium-term preparation (6-12 months)
    - Long-term development (12+ months)
    
    OUTPUT FORMAT (JSON only):
    {
      "Student Name": "${studentData.userName}",
      "Student Email": "${studentData.userEmail || ''}",
      "Student Phone": "${studentData.userPhone || ''}",
      "Scores": {
        "Financial Planning": <calculate actual score>,
        "Academic Readiness": <calculate actual score>,
        "Career Alignment": <calculate actual score>,
        "Personal & Cultural": <calculate actual score>,
        "Practical Readiness": <calculate actual score>,
        "Support System": <calculate actual score>
      },
      "Overall Readiness Index": <calculated CRI score>,
      "Readiness Level": "<determined level>",
      "Preparation Timeline": "<timeline estimate>",
      "Strengths": "<detailed paragraph citing specific constructs>",
      "Gaps": "<detailed paragraph citing specific weaknesses and risks>",
      "Recommendations": "<3-5 specific, actionable recommendations with timeline>",
      "Country Fit (Top 3)": [
        {"country": "<name>", "match": <percentage>, "reasoning": "<detailed>", "challenges": "<specific>"},
        {"country": "<name>", "match": <percentage>, "reasoning": "<detailed>", "challenges": "<specific>"},
        {"country": "<name>", "match": <percentage>, "reasoning": "<detailed>", "challenges": "<specific>"}
      ]
    }`

        console.log('🌐 Calling Perplexity API...');
          const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.perplexity.ai",
            timeout: 60000, // 60 second timeout
            maxRetries: 2,
          });

          // Use Perplexity Sonar models (sonar-pro as primary)
        const models = ["sonar-pro", "sonar"];
          
          let completion: any = null;
        let lastError: any = null;
        
          for (const model of models) {
            try {
              console.log(`🔄 Trying model: ${model}`);
              
              const modelPromise = openai.chat.completions.create({
                model: model,
                messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 2048
              });
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Model timeout')), 45000)
              );
              
              completion = await Promise.race([modelPromise, timeoutPromise]);
              console.log(`✅ Success with model: ${model}`);
              break;
            } catch (modelError: any) {
            console.error(`❌ Model ${model} failed:`, modelError.message);
            lastError = modelError;
              continue;
            }
          }
          
          if (!completion) {
          throw new Error(`All models failed. Last error: ${lastError?.message || 'Unknown error'}`);
        }

        const generatedText = completion.choices[0]?.message?.content || '';
        if (!generatedText) {
          throw new Error('Empty response from LLM');
        }
        
        console.log('✅ LLM API success!');
          console.log('📝 Generated text length:', generatedText.length);
          console.log('📝 Generated text preview:', generatedText.substring(0, 200) + '...');
          
        // Parse the JSON response from LLM
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in LLM response');
        }
        
        const llmResult = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed LLM response:', JSON.stringify(llmResult, null, 2));
        
        // Validate that essential fields exist
        if (!llmResult['Student Name'] && !llmResult['studentName']) {
          throw new Error('LLM response missing required field: Student Name');
        }
        if (!llmResult['Scores'] && !llmResult['scores']) {
          throw new Error('LLM response missing required field: Scores');
        }
        if (!llmResult['Overall Readiness Index']) {
          throw new Error('LLM response missing required field: Overall Readiness Index');
        }
        if (!llmResult['Readiness Level']) {
          throw new Error('LLM response missing required field: Readiness Level');
        }
        if (!llmResult['Strengths']) {
          throw new Error('LLM response missing required field: Strengths');
        }
        if (!llmResult['Gaps']) {
          throw new Error('LLM response missing required field: Gaps');
        }
        if (!llmResult['Recommendations']) {
          throw new Error('LLM response missing required field: Recommendations');
        }

        console.log('📤 Returning LLM result:', JSON.stringify(llmResult, null, 2))
        return NextResponse.json(llmResult)
        
      } catch (error: any) {
        console.error('❌ Error in analyze-results API:', error)
        console.error('❌ Error message:', error.message)
        console.error('❌ Error stack:', error.stack)
        return NextResponse.json({ 
          error: 'Failed to analyze results',
          details: error.message,
          stack: error.stack
        }, { status: 500 })
      }
    }
