import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export async function parseResume(resumeText) {
    const systemPrompt = `You will receive text extracted from a PDF resume. Extract all the important information typically found in resume, including:

- Full name and contact (phone, email, portfolio, address if available)
- Professional summary or objective
- Work Experience (Job titles, company name (or freelance), location, dates, and key responsibilities, achievements if available)
- Language (English & Tagalog/Filipino)
- Education Background (degree, expected graduate)
- Skills (Technical skills that are listed there, Frontend, Backend, Database, Cloud & DevOps, and soft skills if available)
- Certificates & Awards (if available)
- Additional relevant information (Projects, or others if available)

Organize the extracted information clearly with descriptive headings and simple lists. Format the output for easy readability and processing by another AI, avoid unnecessary formatting or escape characters.`;

    try {
        const response = await axios.post(
            MISTRAL_API_URL,
            {
                model: 'mistral-small-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: resumeText }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error parsing resume:', error.response?.data || error.message);
        throw error;
    }
}
