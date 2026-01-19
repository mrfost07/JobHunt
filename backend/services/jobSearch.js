import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const JSEARCH_API_URL = 'https://api.openwebninja.com/jsearch/search';

export async function searchJobs(query = 'Software Engineer', numPages = 10) {
    try {
        const response = await axios.get(JSEARCH_API_URL, {
            params: {
                query: query,
                num_pages: numPages
            },
            headers: {
                'x-api-key': process.env.JSEARCH_API_KEY
            }
        });

        return response.data.data || [];
    } catch (error) {
        console.error('Error searching jobs:', error.response?.data || error.message);
        throw error;
    }
}
