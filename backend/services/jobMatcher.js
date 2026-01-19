import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export async function matchJob(job, parsedResume, expectedSalary) {
    const systemPrompt = `You are an expert job matching AI. Analyze how well this candidate matches the job listing.

## CANDIDATE RESUME:
${parsedResume}

## CANDIDATE MINIMUM SALARY REQUIREMENT: $${expectedSalary}

## JOB LISTING:
${JSON.stringify(job, null, 2)}

---

## YOUR TASK:
Analyze the match between the candidate and job by evaluating these factors:

### 1. SALARY ANALYSIS
- Extract the job's salary from job_max_salary, job_min_salary, or the salary text field
- If hourly rate, multiply by 2080 for annual
- Compare to candidate's minimum requirement ($${expectedSalary})
- Salary Score: +2 points if job salary >= candidate requirement, +1 if within 10%, 0 if below

### 2. SKILLS MATCH
- Compare candidate's technical skills with job requirements
- Score each matching core skill: +1 point per major skill match (max 5)
- Penalize missing critical requirements: -1 point per critical missing skill

### 3. EXPERIENCE MATCH
- Compare years of experience with job requirements
- +2 if meets or exceeds, +1 if close, 0 if significantly under

### 4. EDUCATION MATCH
- Compare education level with requirements
- +1 if matches or exceeds requirement

### FINAL SCORE CALCULATION:
Total the points (max 10). Scores above 10 cap at 10, below 0 cap at 0.

---

## OUTPUT:
Return ONLY a valid JSON object with these exact fields:

{
  "job_title": "extracted job title",
  "job_description": "brief summary under 80 words",
  "company": "company name",
  "employment_type": "Full-time/Part-time/Contract",
  "remote": "Yes or No",
  "salary": "salary as string (e.g., '$80,000 - $120,000')",
  "benefits": "key benefits if mentioned",
  "responsibilities": "key responsibilities, semicolon separated",
  "qualifications": "key qualifications, semicolon separated",
  "apply_link": "HTML links in format <a href='URL'>Source</a>, max 4 links",
  "match_score": 0,
  "match_reason": "Detailed analysis: [SALARY: explanation] [SKILLS: matched X, missing Y] [EXPERIENCE: explanation] [OVERALL: summary]"
}

IMPORTANT:
- match_score MUST be an integer 0-10
- match_reason MUST explain both salary AND skills analysis
- Be accurate and honest in your assessment`;

    try {
        const response = await axios.post(
            MISTRAL_API_URL,
            {
                model: 'mistral-small-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Analyze this job match and return the JSON.' }
                ],
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const content = response.data.choices[0].message.content;
        const parsed = JSON.parse(content);

        // Validate and ensure score is a number
        if (typeof parsed.match_score !== 'number' || isNaN(parsed.match_score)) {
            parsed.match_score = 0;
        }
        parsed.match_score = Math.max(0, Math.min(10, Math.round(parsed.match_score)));

        return parsed;
    } catch (error) {
        console.error('Error matching job:', error.response?.data || error.message);
        throw error;
    }
}

export async function matchJobs(jobs, parsedResume, expectedSalary, limit = 30, progressCallback = null, cancelCheck = null) {
    const limitedJobs = jobs.slice(0, limit);
    const results = [];
    const total = limitedJobs.length;

    console.log(`Starting to match ${total} jobs...`);

    for (let i = 0; i < limitedJobs.length; i++) {
        // Check for cancellation
        if (cancelCheck && cancelCheck()) {
            console.log('Job matching cancelled');
            break;
        }

        const job = limitedJobs[i];

        // Report progress
        if (progressCallback) {
            progressCallback(i + 1, total, `Analyzing job ${i + 1} of ${total}...`);
        }

        try {
            console.log(`Matching job ${i + 1}/${total}: ${job.job_title || 'Unknown'}`);
            const match = await matchJob(job, parsedResume, expectedSalary);
            console.log(`  -> Score: ${match.match_score}`);
            results.push(match);
            // Rate limiting - wait between API calls
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
            console.error(`Error matching job ${i + 1}:`, error.message);
            // Add job with fallback data so it's not lost
            results.push({
                job_title: job.job_title || 'Unknown Title',
                company: job.employer_name || 'Unknown Company',
                employment_type: job.job_employment_type || 'Not Specified',
                remote: job.job_is_remote ? 'Yes' : 'No',
                salary: job.job_min_salary && job.job_max_salary
                    ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
                    : 'Not Specified',
                benefits: '',
                responsibilities: '',
                qualifications: job.job_required_skills?.join('; ') || '',
                apply_link: job.job_apply_link ? `<a href="${job.job_apply_link}">Apply</a>` : '',
                match_score: 0,
                match_reason: `Error during analysis: ${error.message}`
            });
        }
    }

    console.log(`Finished matching. Results: ${results.length} jobs processed.`);
    return results;
}
