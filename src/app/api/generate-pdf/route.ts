import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const results = await request.json()
    console.log('📄 PDF Generation - Received data:', JSON.stringify(results, null, 2))
    
    // Validate required fields
    if (!results['Student Name'] && !results.studentName) {
      console.error('❌ Missing Student Name in PDF data')
      return NextResponse.json({ error: 'Missing student name' }, { status: 400 })
    }
    
    // Launch Chromium in a serverless-friendly way on Vercel, and use Puppeteer locally
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
    let browser: any

    if (isServerless) {
      // Vercel / Lambda: use puppeteer-core + @sparticuz/chromium
      const chromium = (await import('@sparticuz/chromium')).default
      const puppeteerCore = (await import('puppeteer-core')).default

  // Prefer chromium's bundled executable path for serverless; fall back to env if needed
  const chromiumPath = await chromium.executablePath()
  const executablePath = chromiumPath || process.env.PUPPETEER_EXECUTABLE_PATH

      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath,
        headless: true,
        timeout: 30000,
      })
    } else {
      // Local dev: use full puppeteer (downloads Chrome on install)
      const puppeteer = (await import('puppeteer')).default
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
        timeout: 30000
      })
    }
    
    const page = await browser.newPage()
    
    // Set page timeout
    page.setDefaultTimeout(30000) // 30 second timeout
    page.setDefaultNavigationTimeout(30000)
    
    // Generate HTML content for the PDF
    const htmlContent = generateHTMLContent(results)
    console.log('📄 Generated HTML content length:', htmlContent.length)
    
    // Set viewport size to A4 dimensions
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
    });

    // Enable print and background colors
    await page.emulateMediaType('print');

    // Set content with better wait conditions
    await page.setContent(htmlContent, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 30000 
    });

    // Additional time for CSS animations and renders
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('📄 Page content loaded successfully');
    
    // Wait for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Generate PDF - no fallback, errors will be returned to user
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      timeout: 30000, // 30 second timeout for PDF generation
      scale: 1.0, // Ensure 100% scale
      landscape: false
    });
    
    console.log('📄 PDF generated, buffer size:', pdfBuffer.length)
    
    // Validate PDF buffer
    if (pdfBuffer.length === 0) {
      console.error('❌ PDF buffer is empty');
      await browser.close();
      return NextResponse.json({ error: 'PDF generation failed - empty buffer' }, { status: 500 });
    }
    
  await browser.close()
    
    console.log('📄 Returning PDF response with size:', pdfBuffer.length)
    
    // Return PDF as response - use Response constructor for binary data
    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="psychometric-report-${(results['Student Name'] || results.studentName).replace(/\s+/g, '-').toLowerCase()}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function generateHTMLContent(results: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Get data from LLM format - no fallbacks, use actual data only
  const studentName = results['Student Name'] || results.studentName;
  const studentEmail = results['Student Email'] || results.studentEmail || results.userEmail || '';
  const studentPhone = results['Student Phone'] || results.studentPhone || results.userPhone || '';
  
  // Validate required fields
  if (!studentName) {
    throw new Error('Student Name is required');
  }
  
  // Get scores object - validate it exists
  const scoresRaw = results.scores || results.Scores || results['Scores'];
  if (!scoresRaw) {
    throw new Error('Scores data is required');
  }
  
  // Extract individual scores
  const scores = {
    'Financial Planning': scoresRaw['Financial Planning'] ?? 0,
    'Academic Readiness': scoresRaw['Academic Readiness'] ?? 0,
    'Career Alignment': scoresRaw['Career Alignment'] ?? 0,
    'Personal & Cultural': scoresRaw['Personal & Cultural'] ?? 0,
    'Practical Readiness': scoresRaw['Practical Readiness'] ?? 0,
    'Support System': scoresRaw['Support System'] ?? 0
  };
  
  // Validate required scores exist
  const overallIndex = results['Overall Readiness Index'] || results.overallIndex;
  if (overallIndex === undefined) {
    throw new Error('Overall Readiness Index is required');
  }
  
  const readinessLevel = results['Readiness Level'] || results.readinessLevel;
  if (!readinessLevel) {
    throw new Error('Readiness Level is required');
  }
  
  const strengths = results.Strengths;
  if (!strengths) {
    throw new Error('Strengths analysis is required');
  }
  
  const gaps = results.Gaps;
  if (!gaps) {
    throw new Error('Gaps analysis is required');
  }
  
  const recommendations = results.Recommendations;
  if (!recommendations) {
    throw new Error('Recommendations are required');
  }
  
  const countryFit = results['Country Fit (Top 3)'] || [];

  // Helper to format text into bullet points
  const formatToBulletPoints = (text: string | string[] | undefined) => {
    if (!text) {
      return `<li class="bullet-item">Information not available</li>`;
    }

    // Handle array input
    if (Array.isArray(text)) {
      return text.map(item => `<li class="bullet-item">${item.trim()}</li>`).join('');
    }

    // Handle string input
    if (typeof text === 'string') {
      if (text === 'No strengths identified' || text === 'No gaps identified' || text === 'No recommendations provided') {
        return `<li class="bullet-item">Information not available</li>`;
      }

      // Split by common delimiters and create bullet points
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const points = sentences.length > 1 ? sentences : text.split(/[,;]+/).filter(s => s.trim().length > 0);

      return points.map(point => {
        const cleanPoint = point.trim().replace(/^\d+\.?\s*/, ''); // Remove leading numbers
        return `<li class="bullet-item">${cleanPoint}</li>`;
      }).join('');
    }

    // Handle any other type
    return `<li class="bullet-item">Invalid input format</li>`;
  };

  // Helper to get weight for a framework
  const getFrameworkWeight = (framework: string) => {
    switch (framework) {
      case 'Financial Planning': return '25%';
      case 'Academic Readiness': return '20%';
      case 'Career Alignment': return '20%';
      case 'Personal & Cultural': return '15%';
      case 'Practical Readiness': return '10%';
      case 'Support System': return '10%';
      default: return '0%';
    }
  };

  // Helper to generate compact score card
  const generateScoreCard = (label: string, score: number, weight: string) => {
    const percentage = Math.round(score);
    const barClass = percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 40 ? 'average' : 'weak';
    
    return `
      <div class="score-card">
        <h4>${label}</h4>
        <div class="score-value">${percentage}%</div>
        <div class="score-bar">
          <div class="score-fill ${barClass}" style="width: ${percentage}%"></div>
        </div>
        <div style="font-size: 0.7em; color: #666; margin-top: 4px;">Weight: ${weight}</div>
      </div>
    `;
  };

  // Helper to generate radar chart
  const generateRadarChart = (scores: any) => {
    const categories = [
      { name: 'Financial Planning', score: scores['Financial Planning'] || 0 },
      { name: 'Academic Readiness', score: scores['Academic Readiness'] || 0 },
      { name: 'Career Alignment', score: scores['Career Alignment'] || 0 },
      { name: 'Personal & Cultural', score: scores['Personal & Cultural'] || 0 },
      { name: 'Practical Readiness', score: scores['Practical Readiness'] || 0 },
      { name: 'Support System', score: scores['Support System'] || 0 }
    ];
    
    return categories.map(category => `
      <div class="radar-item">
        <div class="radar-label">${category.name}</div>
        <div class="radar-score">${category.score}%</div>
      </div>
    `).join('');
  };

  // Helper to generate trend chart
  const generateTrendChart = (scores: any) => {
    const categories = [
      { name: 'Financial', score: scores['Financial Planning'] || 0 },
      { name: 'Academic', score: scores['Academic Readiness'] || 0 },
      { name: 'Career', score: scores['Career Alignment'] || 0 },
      { name: 'Cultural', score: scores['Personal & Cultural'] || 0 },
      { name: 'Practical', score: scores['Practical Readiness'] || 0 },
      { name: 'Support', score: scores['Support System'] || 0 }
    ];
    
    return categories.map(category => `
      <div class="trend-bar">
        <div class="trend-label">${category.name}</div>
        <div class="trend-progress">
          <div class="trend-fill" style="width: ${category.score}%"></div>
        </div>
        <div class="trend-value">${category.score}%</div>
      </div>
    `).join('');
  };

  // Helper to generate country matrix - now supports both string and object formats
  const generateCountryMatrix = (countries: any[]) => {
    return countries.map((countryData, index) => {
      // Handle both old format (string) and new format (object)
      const country = typeof countryData === 'string' ? countryData : countryData.country;
      const matchScore = typeof countryData === 'string' ? Math.round(100 - (index * 15)) : countryData.match || 100;
      const description = typeof countryData === 'string' ? 'Well-suited destination for study abroad' : (countryData.reasoning || 'Good study destination');
      
      return `
        <div class="country-matrix-item">
          <div class="country-matrix-rank">#${index + 1}</div>
          <div class="country-matrix-name">${country}</div>
          <div class="country-matrix-score">${matchScore}% Match</div>
          <div class="country-matrix-desc">${description}</div>
        </div>
      `;
    }).join('');
  };

  // Helper to generate compact country card with country map SVG - now supports both formats
  const generateCountryCard = (countryData: any, index: number) => {
    // Handle both old format (string) and new format (object)
    const country = typeof countryData === 'string' ? countryData : countryData.country;
    const matchScore = typeof countryData === 'string' ? Math.round(100 - (index * 15)) : countryData.match || 100;
    
    const countryMaps: { [key: string]: string } = {
      'Singapore': `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="60" fill="#e74c3c" rx="8"/><text x="50" y="35" text-anchor="middle" fill="white" font-size="12" font-weight="bold">SG</text></svg>`,
      'Ireland': `<svg viewBox="0 0 100 60" class="country-map"><rect width="33" height="60" fill="#009639"/><rect x="33" width="34" height="60" fill="white"/><rect x="67" width="33" height="60" fill="#ff7900"/><text x="50" y="35" text-anchor="middle" fill="black" font-size="10" font-weight="bold">IE</text></svg>`,
      'Netherlands': `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="20" fill="#c8102e"/><rect y="20" width="100" height="20" fill="white"/><rect y="40" width="100" height="20" fill="#003da5"/><text x="50" y="35" text-anchor="middle" fill="black" font-size="10" font-weight="bold">NL</text></svg>`,
      'Canada': `<svg viewBox="0 0 100 60" class="country-map"><rect width="25" height="60" fill="#ff0000"/><rect x="25" width="50" height="60" fill="white"/><rect x="75" width="25" height="60" fill="#ff0000"/><text x="50" y="35" text-anchor="middle" fill="red" font-size="10" font-weight="bold">🍁</text></svg>`,
      'Australia': `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="60" fill="#012169"/><rect width="50" height="30" fill="#012169"/><text x="70" y="45" text-anchor="middle" fill="white" font-size="10" font-weight="bold">AU</text></svg>`,
      'United Kingdom': `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="60" fill="#012169"/><path d="M0,0 L100,60 M100,0 L0,60" stroke="white" stroke-width="6"/><path d="M50,0 L50,60 M0,30 L100,30" stroke="white" stroke-width="10"/><path d="M0,0 L100,60 M100,0 L0,60" stroke="#c8102e" stroke-width="4"/><path d="M50,0 L50,60 M0,30 L100,30" stroke="#c8102e" stroke-width="6"/></svg>`,
      'Germany': `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="20" fill="#000000"/><rect y="20" width="100" height="20" fill="#dd0000"/><rect y="40" width="100" height="20" fill="#ffce00"/><text x="50" y="35" text-anchor="middle" fill="white" font-size="10" font-weight="bold">DE</text></svg>`,
      'United States': `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="60" fill="#b22234"/><rect y="0" width="100" height="5" fill="white"/><rect y="10" width="100" height="5" fill="white"/><rect y="20" width="100" height="5" fill="white"/><rect y="30" width="100" height="5" fill="white"/><rect y="40" width="100" height="5" fill="white"/><rect y="50" width="100" height="5" fill="white"/><rect width="40" height="35" fill="#3c3b6e"/><text x="70" y="45" text-anchor="middle" fill="white" font-size="10" font-weight="bold">US</text></svg>`,
      'India': `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="20" fill="#ff9933"/><rect y="20" width="100" height="20" fill="white"/><rect y="40" width="100" height="20" fill="#138808"/><circle cx="50" cy="30" r="8" fill="none" stroke="#000080" stroke-width="1"/><text x="50" y="35" text-anchor="middle" fill="#000080" font-size="8" font-weight="bold">☸</text></svg>`,
      'United Arab Emirates': `<svg viewBox="0 0 100 60" class="country-map"><rect width="25" height="60" fill="#ce1126"/><rect x="25" width="75" height="20" fill="#009639"/><rect x="25" y="20" width="75" height="20" fill="white"/><rect x="25" y="40" width="75" height="20" fill="#000000"/><text x="60" y="35" text-anchor="middle" fill="red" font-size="10" font-weight="bold">AE</text></svg>`
    };
    
    const countryMap = countryMaps[country] || `<svg viewBox="0 0 100 60" class="country-map"><rect width="100" height="60" fill="#3498db" rx="8"/><text x="50" y="35" text-anchor="middle" fill="white" font-size="10" font-weight="bold">🌍</text></svg>`;
    
    return `
      <div class="country-card">
        <div class="country-rank">#${index + 1}</div>
        <div class="country-flag">${countryMap}</div>
        <div class="country-name">${country}</div>
        <div class="country-score">${matchScore}% Match</div>
      </div>
    `;
  };

  // Helper to generate recommendation sections
  const generateRecommendationSection = (title: string, items: string[], icon: string) => `
    <div class="recommendation-section">
      <div class="recommendation-header">
        <span class="recommendation-icon">${icon}</span>
        <h4>${title}</h4>
      </div>
      <div class="recommendation-content">
        ${items.map((item, index) => `
          <div class="recommendation-item">
            <span class="item-number">${index + 1}</span>
            <span class="item-text">${item}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>D-Vivid Consultant - Study Abroad Assessment Report</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Poppins', sans-serif;
                line-height: 1.5;
                color: #333;
                background: #ffffff;
                margin: 0;
                padding: 0;
                font-size: 16px;
            }
            
            .page {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: #ffffff;
                position: relative;
                padding: 0;
            }
            
            .page-break {
                page-break-before: always;
                break-before: page;
            }
            
            .country-page {
                min-height: calc(297mm - 160px);
                padding: 25px 30px 120px 30px;
                background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
            }
            
            .header {
                background: linear-gradient(135deg, #003B8C 0%, #1e40af 25%, #5BE49B 75%, #22c55e 100%);
                color: white;
                padding: 20px 30px;
                text-align: center;
                position: relative;
                overflow: hidden;
                height: 110px;
                min-height: 110px;
                box-shadow: 0 4px 15px rgba(0, 59, 140, 0.3);
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 200%;
                height: 100%;
                background: linear-gradient(45deg, 
                    transparent 30%, 
                    rgba(255,255,255,0.1) 50%, 
                    transparent 70%);
                animation: headerShine 4s ease-in-out infinite;
            }
            
            @keyframes headerShine {
                0% { left: -100%; }
                50% { left: 100%; }
                100% { left: -100%; }
            }
            
            .header-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 100%;
            }
            
            .logo-section {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .logo {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #ffffff, #f8f9fa);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                border: 3px solid rgba(255,255,255,0.3);
                position: relative;
                z-index: 2;
            }
            
            .logo img {
                max-width: 80%;
                max-height: 80%;
            }
            
            .company-info h1 {
                font-family: 'Montserrat', sans-serif;
                font-size: 2.0em;
                font-weight: 900;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
                line-height: 1.1;
                position: relative;
                z-index: 2;
                letter-spacing: 0.5px;
            }
            
            .company-info p {
                font-size: 1.0em;
                opacity: 0.95;
                margin: 4px 0 0 0;
                font-weight: 600;
                line-height: 1.2;
                position: relative;
                z-index: 2;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            
            .report-title {
                text-align: center;
                flex: 1;
            }
            
            .report-title h2 {
                font-size: 1.5em;
                font-weight: 800;
                margin: 0;
                line-height: 1.2;
                padding: 0 10px;
                text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
                position: relative;
                z-index: 2;
                letter-spacing: 0.5px;
            }
            
            .report-title p {
                font-size: 0.9em;
                opacity: 0.95;
                margin: 4px 0 0 0;
                padding: 0 10px;
                position: relative;
                z-index: 2;
                font-weight: 500;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
            }
            
            .footer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #003B8C 0%, #5BE49B 100%);
                color: white;
                padding: 8px 20px;
                text-align: center;
                font-size: 0.9em;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .disclaimer {
                position: absolute;
                bottom: 50px;
                left: 20px;
                right: 20px;
                background: linear-gradient(135deg, #fff9e6, #fff3cd);
                border: 2px solid #ffeaa7;
                border-left: 5px solid #fdcb6e;
                padding: 15px 25px;
                font-size: 0.9em;
                line-height: 1.5;
                color: #6c5ce7;
                font-weight: 600;
                text-align: center;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .footer-logo {
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-right: 8px;
            }
            
            .footer-logo img {
                max-width: 70%;
                max-height: 70%;
            }
            
            .content {
                padding: 25px 30px;
                min-height: calc(297mm - 170px);
                display: flex;
                flex-direction: column;
                gap: 20px;
                background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
                padding-bottom: 50px;
            }
            
            .student-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 25px;
                padding: 20px;
                background: linear-gradient(135deg, #ffffff, #f8fafb);
                border-radius: 12px;
                border: 2px solid #e9ecef;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            
            .info-item {
                background: linear-gradient(135deg, #ffffff, #f8f9fa);
                padding: 18px;
                border-radius: 10px;
                border-left: 5px solid #5BE49B;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.2s ease;
            }
            
            .info-item:hover {
                transform: translateY(-2px);
            }
            
            .info-label {
                font-weight: 700;
                color: #495057;
                margin-bottom: 8px;
                font-size: 0.9em;
                text-transform: uppercase;
                letter-spacing: 1px;
                display: flex;
                align-items: center;
            }
            
            .info-label::before {
                content: '●';
                color: #5BE49B;
                margin-right: 8px;
                font-size: 1.2em;
            }
            
            .info-value {
                font-size: 1.4em;
                font-weight: 800;
                color: #003B8C;
                word-break: break-word;
            }
            
            .overall-score {
                text-align: center;
                margin: 25px 0;
                padding: 30px;
                background: linear-gradient(135deg, #003B8C 0%, #1e40af 25%, #5BE49B 75%, #22c55e 100%);
                color: white;
                border-radius: 16px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 8px 25px rgba(0, 59, 140, 0.3);
            }
            
            .overall-score::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    rgba(255,255,255,0.1) 10px,
                    rgba(255,255,255,0.1) 20px
                );
                animation: shimmer 3s ease-in-out infinite;
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%) translateY(-100%); }
                50% { transform: translateX(0%) translateY(0%); }
                100% { transform: translateX(100%) translateY(100%); }
            }
            
            .overall-score h3 {
                font-size: 4.5em;
                margin-bottom: 12px;
                font-weight: 900;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                position: relative;
                z-index: 1;
            }
            
            .overall-score p {
                font-size: 1.6em;
                opacity: 0.95;
                font-weight: 700;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
                position: relative;
                z-index: 1;
                margin-top: 8px;
            }
            
            .scores-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 18px;
                margin: 25px 0;
                padding: 20px;
                background: linear-gradient(135deg, #f8f9fa, #ffffff);
                border-radius: 16px;
                border: 2px solid #e9ecef;
            }
            
            .score-card {
                background: linear-gradient(135deg, #ffffff, #f8fafb);
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #e9ecef;
                text-align: center;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            .score-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #003B8C, #5BE49B);
            }
            
            .score-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            }
            
            .score-card h4 {
                font-size: 1.1em;
                color: #003B8C;
                font-weight: 700;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .score-value {
                font-size: 2.8em;
                font-weight: 900;
                color: #003B8C;
                margin-bottom: 10px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            
            .score-bar {
                height: 12px;
                background: linear-gradient(90deg, #e9ecef, #f8f9fa);
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 8px;
                position: relative;
            }
            
            .score-bar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, 
                    rgba(255,255,255,0.2) 25%, 
                    transparent 25%, 
                    transparent 50%, 
                    rgba(255,255,255,0.2) 50%, 
                    rgba(255,255,255,0.2) 75%, 
                    transparent 75%);
                background-size: 8px 8px;
            }
            
            .score-fill {
                height: 100%;
                border-radius: 6px;
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            
            .score-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shine 2s infinite;
            }
            
            @keyframes shine {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            
            .score-fill.excellent { background: linear-gradient(90deg, #22C55E, #16A34A); }
            .score-fill.good { background: linear-gradient(90deg, #3B82F6, #2563EB); }
            .score-fill.average { background: linear-gradient(90deg, #F59E0B, #D97706); }
            .score-fill.weak { background: linear-gradient(90deg, #EF4444, #DC2626); }
            
            .analysis-section {
                background: linear-gradient(135deg, #ffffff, #f8fafb);
                padding: 25px;
                border-radius: 12px;
                border: 2px solid #e9ecef;
                border-left: 6px solid #003B8C;
                margin: 20px 0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                position: relative;
                overflow: hidden;
            }
            
            .analysis-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, #003B8C, #5BE49B, #003B8C);
            }
            
            .analysis-section h4 {
                font-size: 1.4em;
                color: #003B8C;
                margin-bottom: 15px;
                font-weight: 800;
                display: flex;
                align-items: center;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .analysis-section h4::after {
                content: '';
                flex: 1;
                height: 2px;
                background: linear-gradient(90deg, #003B8C, transparent);
                margin-left: 15px;
            }
            
            .analysis-section p {
                line-height: 1.8;
                color: #495057;
                font-size: 1.1em;
                text-align: justify;
                text-indent: 20px;
                margin-bottom: 0;
            }
            
            .bullet-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .bullet-item {
                position: relative;
                padding-left: 25px;
                margin-bottom: 12px;
                line-height: 1.6;
                color: #495057;
                font-size: 1.05em;
            }
            
            .bullet-item::before {
                content: '●';
                position: absolute;
                left: 0;
                top: 0;
                color: #5BE49B;
                font-size: 1.2em;
                font-weight: bold;
            }
            
            .strengths .bullet-item::before {
                content: '✓';
                color: #22c55e;
                font-weight: 900;
            }
            
            .gaps .bullet-item::before {
                content: '⚠';
                color: #f59e0b;
            }
            
            .recommendations .bullet-item::before {
                content: '→';
                color: #3b82f6;
                font-weight: bold;
            }
            
            .country-fit {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 18px;
                margin: 25px 0 50px 0;
                padding: 20px;
                background: linear-gradient(135deg, #f8f9fa, #ffffff);
                border-radius: 16px;
                border: 2px solid #e9ecef;
            }
            
            .country-card {
                background: linear-gradient(135deg, #ffffff, #f8fafb);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                border: 2px solid #e9ecef;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
                transition: transform 0.3s ease;
            }
            
            .country-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #003B8C, #5BE49B);
            }
            
            .country-card:hover {
                transform: translateY(-2px);
            }
            
            .country-rank {
                background: linear-gradient(45deg, #003B8C, #5BE49B);
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 8px auto;
                font-weight: 800;
                font-size: 1.1em;
            }
            
            .country-flag {
                margin-bottom: 10px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .country-map {
                width: 50px;
                height: 30px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                border: 1px solid #dee2e6;
            }
            
            .country-name {
                font-size: 1.2em;
                font-weight: 700;
                color: #003B8C;
                margin-bottom: 5px;
            }
            
            .country-score {
                background: linear-gradient(45deg, #5BE49B, #4ade80);
                color: white;
                padding: 4px 8px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 1.0em;
            }
            
            .charts-section {
                margin: 30px 0;
                background: linear-gradient(135deg, #ffffff, #f8fafb);
                padding: 30px;
                border-radius: 16px;
                border: 3px solid #003B8C;
                box-shadow: 0 8px 25px rgba(0, 59, 140, 0.15);
                position: relative;
                overflow: hidden;
            }
            
            .charts-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 5px;
                background: linear-gradient(90deg, #003B8C, #5BE49B, #003B8C);
            }
            
            .charts-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .chart-container {
                background: linear-gradient(135deg, #ffffff, #f8fafb);
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #e9ecef;
                box-shadow: 0 4px 15px rgba(0,0,0,0.12);
                position: relative;
                overflow: hidden;
            }
            
            .chart-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #003B8C, #5BE49B);
            }
            
            .chart-container.full-width {
                grid-column: 1 / -1;
            }
            
            .chart-container h4 {
                color: #003B8C;
                font-size: 1.3em;
                font-weight: 800;
                margin-bottom: 20px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
                position: relative;
                padding-bottom: 10px;
            }
            
            .chart-container h4::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 2px;
                background: linear-gradient(90deg, #003B8C, #5BE49B);
            }
            
            .radar-chart {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .radar-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #ffffff, #f8f9fa);
                border-radius: 8px;
                border-left: 5px solid #5BE49B;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                transition: transform 0.2s ease;
            }
            
            .radar-item:hover {
                transform: translateX(5px);
            }
            
            .radar-label {
                font-weight: 600;
                color: #333;
                font-size: 0.9em;
            }
            
            .radar-score {
                font-weight: 700;
                color: #003B8C;
                font-size: 1.1em;
            }
            
            .trend-chart {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .trend-bar {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .trend-label {
                width: 120px;
                font-size: 0.9em;
                font-weight: 600;
                color: #555;
            }
            
            .trend-progress {
                flex: 1;
                height: 24px;
                background: linear-gradient(90deg, #e9ecef, #f8f9fa);
                border-radius: 12px;
                overflow: hidden;
                position: relative;
                border: 1px solid #dee2e6;
            }
            
            .trend-progress::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 4px,
                    rgba(255,255,255,0.3) 4px,
                    rgba(255,255,255,0.3) 8px
                );
                z-index: 1;
            }
            
            .trend-fill {
                height: 100%;
                border-radius: 12px;
                background: linear-gradient(135deg, #003B8C, #1e40af, #5BE49B);
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                z-index: 2;
            }
            
            .trend-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
                animation: progressShine 2.5s infinite;
                z-index: 3;
            }
            
            @keyframes progressShine {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            
            .trend-value {
                font-weight: 700;
                color: #003B8C;
                font-size: 0.9em;
                min-width: 40px;
                text-align: right;
            }
            
            .country-matrix {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .country-matrix-item {
                background: linear-gradient(135deg, #ffffff, #f8fafb);
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #e9ecef;
                text-align: center;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            .country-matrix-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 5px;
                background: linear-gradient(90deg, #003B8C, #5BE49B);
            }
            
            .country-matrix-item:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            }
            
            .country-matrix-rank {
                background: linear-gradient(45deg, #003B8C, #5BE49B);
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 10px auto;
                font-weight: 800;
                font-size: 1.0em;
            }
            
            .country-matrix-name {
                font-size: 1.1em;
                font-weight: 700;
                color: #003B8C;
                margin-bottom: 8px;
            }
            
            .country-matrix-score {
                background: linear-gradient(45deg, #5BE49B, #4ade80);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 0.9em;
                display: inline-block;
            }
            
            .country-matrix-desc {
                font-size: 0.8em;
                color: #666;
                margin-top: 8px;
                line-height: 1.4;
            }
            
            @media print {
                body { 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                    margin: 0;
                    padding: 0;
                }
                .page { 
                    box-shadow: none; 
                    border: none;
                    margin: 0;
                    page-break-after: always;
                }
                .page:last-child {
                    page-break-after: auto;
                }
                .page-break {
                    page-break-before: always;
                    break-before: page;
                }
                .header, .footer, .disclaimer { 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .header {
                    background: linear-gradient(135deg, #003B8C 0%, #1e40af 25%, #5BE49B 75%, #22c55e 100%) !important;
                }
                .footer {
                    background: linear-gradient(135deg, #003B8C 0%, #5BE49B 100%) !important;
                }
                .disclaimer {
                    background: linear-gradient(135deg, #fff9e6, #fff3cd) !important;
                    border-color: #fdcb6e !important;
                }
                * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <div class="header-content">
                    <div class="logo-section">
                        <div class="logo">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xMiAxNkgxNlYyNEgxMlYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNCAxNkgyOFYyNEgyNFYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNiAxMkgyNFYxNkgxNlYxMloiIGZpbGw9IndoaXRlIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF9saW5lYXJfMV8xIiB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMDNCOEMiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUJFOEI5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+" alt="D-Vivid Logo"/>
                        </div>
                        <div class="company-info">
                            <h1>D-Vivid Consultant</h1>
                            <p>Strategic Counselling Circle</p>
                        </div>
                    </div>
                    <div class="report-title">
                        <h2>Study Abroad Assessment Report</h2>
                        <p>Comprehensive Readiness Index (CRI)</p>
                    </div>
                </div>
            </div>
            
            <div class="content">
                <div class="student-info">
                    <div class="info-item">
                        <div class="info-label">Student Email</div>
                        <div class="info-value">${studentEmail}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Phone Number</div>
                        <div class="info-value">${studentPhone}</div>
                    </div>
                </div>
                
                <div class="overall-score">
                    <h3>${overallIndex}%</h3>
                    <p>Overall Readiness Index: ${readinessLevel}</p>
                </div>
                
                <div class="scores-grid">
                    ${generateScoreCard('Financial Planning', scores['Financial Planning'], getFrameworkWeight('Financial Planning'))}
                    ${generateScoreCard('Academic Readiness', scores['Academic Readiness'], getFrameworkWeight('Academic Readiness'))}
                    ${generateScoreCard('Career Alignment', scores['Career Alignment'], getFrameworkWeight('Career Alignment'))}
                    ${generateScoreCard('Personal & Cultural', scores['Personal & Cultural'], getFrameworkWeight('Personal & Cultural'))}
                    ${generateScoreCard('Practical Readiness', scores['Practical Readiness'], getFrameworkWeight('Practical Readiness'))}
                    ${generateScoreCard('Support System', scores['Support System'], getFrameworkWeight('Support System'))}
                </div>

            </div>
            
            <div class="footer">
                <div style="display: flex; align-items: center;">
                    <div class="footer-logo">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xMiAxNkgxNlYyNEgxMlYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNCAxNkgyOFYyNEgyNFYxNloiIGZpbGw9IndoaXRlIi/+CjxwYXRoIGQ9Ik0xNiAxMkgyNFYxNkgxNlYxMloiIGZpbGw9IndoaXRlIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF9saW5lYXJfMV8xIiB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMDNCOEMiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUJFOEI5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+" alt="D-Vivid Logo"/>
                    </div>
                    <span>D-Vivid Consultant - Strategic Counselling Circle</span>
                </div>
                <div>Report Generated: ${currentDate}</div>
            </div>
        </div>
        
        <!-- Page 2: Country Analysis -->
        ${countryFit.length > 0 ? `
        <div class="page page-break">
            <div class="header">
                <div class="header-content">
                    <div class="logo-section">
                        <div class="logo">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xMiAxNkgxNlYyNEgxMlYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNCAxNkgyOFYyNEgyNFYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNiAxMkgyNFYxNkgxNlYxMloiIGZpbGw9IndoaXRlIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF9saW5lYXJfMV8xIiB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMDNCOEMiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUJFOEI5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+" alt="D-Vivid Logo"/>
                        </div>
                        <div class="company-info">
                            <h1>D-Vivid Consultant</h1>
                            <p>Strategic Counselling Circle</p>
                        </div>
                    </div>
                    <div class="report-title">
                        <h2>Country Analysis & Recommendations</h2>
                        <p>Personalized Study Destinations</p>
                    </div>
                </div>
            </div>
            
            <div class="country-page">
                <!-- 📊 DETAILED READINESS ANALYSIS -->
                <div class="charts-section">
                    <h3 style="text-align: center; color: #003B8C; margin: 25px 0; font-size: 1.8em; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; position: relative; padding-bottom: 15px;">📊 Detailed Readiness Analysis</h3>
                    <div style="width: 100px; height: 4px; background: linear-gradient(90deg, #003B8C, #5BE49B); margin: 0 auto 25px auto; border-radius: 2px;"></div>
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4>🎯 Readiness Radar Chart</h4>
                            <div class="radar-chart">
                                ${generateRadarChart(scores)}
                            </div>
                        </div>
                        <div class="chart-container">
                            <h4>📈 Performance Trends</h4>
                            <div class="trend-chart">
                                ${generateTrendChart(scores)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 💪 KEY STRENGTHS -->
                <div class="analysis-section strengths">
                    <h4>💪 Key Strengths</h4>
                    <ul class="bullet-list">
                        ${formatToBulletPoints(strengths)}
                    </ul>
                </div>
                
                <!-- ⚠️ AREAS FOR DEVELOPMENT -->
                <div class="analysis-section gaps">
                    <h4>⚠️ Areas for Development</h4>
                    <ul class="bullet-list">
                        ${formatToBulletPoints(gaps)}
                    </ul>
                </div>
                
                <!-- 🎯 STRATEGIC RECOMMENDATIONS -->
                <div class="analysis-section recommendations">
                    <h4>🎯 Strategic Recommendations</h4>
                    <ul class="bullet-list">
                        ${formatToBulletPoints(recommendations)}
                    </ul>
                </div>
                
                <!-- 🌍 COUNTRY READINESS MATRIX -->
                <div class="chart-container full-width" style="margin: 40px 0;">
                    <h4>🌍 Country Readiness Matrix</h4>
                    <div class="country-matrix">
                        ${generateCountryMatrix(countryFit)}
                    </div>
                </div>
                
                <!-- 🎓 RECOMMENDED STUDY DESTINATIONS -->
                <div class="country-fit">
                    <h4 style="grid-column: 1/-1; text-align: center; color: #003B8C; margin-bottom: 15px; font-size: 1.4em; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; position: relative; padding-bottom: 10px;">� Recommended Study Destinations</h4>
                    <div style="grid-column: 1/-1; width: 80px; height: 3px; background: linear-gradient(90deg, #003B8C, #5BE49B); margin: 0 auto 20px auto; border-radius: 2px;"></div>
                    ${countryFit.map((countryData: any, index: number) => generateCountryCard(countryData, index)).join('')}
                </div>
            </div>
            
            <div class="disclaimer">
                <strong>⚠️ DISCLAIMER:</strong> Results are based on your inputs and benchmark data. The analysis is intended as guidance and should be interpreted as advisory, not definitive or prescriptive. This assessment provides general recommendations and should be used in conjunction with professional counseling for study abroad planning.
            </div>
            
            <div class="footer">
                <div style="display: flex; align-items: center;">
                    <div class="footer-logo">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xMiAxNkgxNlYyNEgxMlYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNCAxNkgyOFYyNEgyNFYxNloiIGZpbGw9IndoaXRlIi/+CjxwYXRoIGQ9Ik0xNiAxMkgyNFYxNkgxNlYxMloiIGZpbGw9IndoaXRlIi/+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF9saW5lYXJfMV8xIiB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMDNCOEMiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUJFOEI5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+" alt="D-Vivid Logo"/>
                    </div>
                    <span>D-Vivid Consultant - Strategic Counselling Circle</span>
                </div>
                <div>Report Generated: ${currentDate}</div>
            </div>
        </div>
        ` : ''}
    </body>
    </html>
  `;
}