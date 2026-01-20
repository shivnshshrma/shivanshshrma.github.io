// Competitive Programming Statistics API Integration

// Replace with your usernames
const CODECHEF_USERNAME = 'shivanshshrma'; // Replace with your CodeChef username
const CODEFORCES_USERNAME = 'shivnshshrma'; // Replace with your CodeForces username

// API endpoints
const CODECHEF_API = 'https://codechef-api.vercel.app';
const CODEFORCES_API = 'https://codeforces.com/api';

// Helper function to show/hide loading states
function showCPLoading(show, platform) {
    const loading = document.getElementById(`${platform}-loading`);
    const content = document.getElementById(`${platform}-content`);
    const error = document.getElementById(`${platform}-error`);
    
    if (show) {
        loading.style.display = 'flex';
        content.style.display = 'none';
        error.style.display = 'none';
    } else {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

function showCPError(platform) {
    document.getElementById(`${platform}-loading`).style.display = 'none';
    document.getElementById(`${platform}-content`).style.display = 'none';
    document.getElementById(`${platform}-error`).style.display = 'flex';
}

// Format number with commas
function formatCPNumber(num) {
    if (!num && num !== 0) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// CodeChef API Integration
async function loadCodeChefStats() {
    if (!CODECHEF_USERNAME || CODECHEF_USERNAME === 'shivanshshrma') {
        showCPError('codechef');
        return;
    }

    showCPLoading(true, 'codechef');
    
    try {
        // Using CodeChef API (unofficial)
        const response = await fetch(`${CODECHEF_API}/${CODECHEF_USERNAME}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch CodeChef data');
        }
        
        const data = await response.json();
        
        // Update stats
        document.getElementById('cc-rating').textContent = formatCPNumber(data.currentRating || 0);
        document.getElementById('cc-rank').textContent = formatCPNumber(data.globalRank || '-');
        document.getElementById('cc-max-rating').textContent = formatCPNumber(data.highestRating || 0);
        
        // Calculate total problems solved
        const problemsSolved = (data.solvedProblems?.length || 0) + 
                              (data.partiallySolvedProblems?.length || 0);
        document.getElementById('cc-problems').textContent = formatCPNumber(problemsSolved);
        
        showCPLoading(false, 'codechef');
    } catch (error) {
        console.error('Error loading CodeChef stats:', error);
        
        // Fallback: Try alternative API or scraping method
        try {
            // Alternative: Direct fetch from CodeChef profile (may require CORS proxy)
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = `https://www.codechef.com/users/${CODECHEF_USERNAME}`;
            
            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
            const html = await response.text();
            
            // Parse HTML to extract data (basic regex-based parsing)
            const ratingMatch = html.match(/rating-number[^>]*>(\d+)/);
            const rankMatch = html.match(/rating-ranks[^>]*>.*?(\d+)/);
            const problemsMatch = html.match(/problems-solved[^>]*>.*?(\d+)/);
            
            if (ratingMatch) {
                document.getElementById('cc-rating').textContent = formatCPNumber(parseInt(ratingMatch[1]));
            }
            if (rankMatch) {
                document.getElementById('cc-rank').textContent = formatCPNumber(parseInt(rankMatch[1]));
            }
            if (problemsMatch) {
                document.getElementById('cc-problems').textContent = formatCPNumber(parseInt(problemsMatch[1]));
            }
            
            showCPLoading(false, 'codechef');
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            showCPError('codechef');
        }
    }
}

// CodeForces API Integration
async function loadCodeForcesStats() {
    if (!CODEFORCES_USERNAME) {
        showCPError('codeforces');
        return;
    }

    showCPLoading(true, 'codeforces');
    
    try {
        // Fetch user info
        const userResponse = await fetch(`${CODEFORCES_API}/user.info?handles=${CODEFORCES_USERNAME}`);
        
        if (!userResponse.ok) {
            throw new Error('Failed to fetch CodeForces user data');
        }
        
        const userData = await userResponse.json();
        
        if (userData.status !== 'OK' || !userData.result || userData.result.length === 0) {
            throw new Error('Invalid CodeForces response');
        }
        
        const user = userData.result[0];
        
        // Update basic stats
        document.getElementById('cf-rating').textContent = formatCPNumber(user.rating || 0);
        document.getElementById('cf-rank').textContent = user.rank || 'Unrated';
        document.getElementById('cf-max-rating').textContent = formatCPNumber(user.maxRating || 0);
        
        // Fetch contest participation
        try {
            const ratingResponse = await fetch(`${CODEFORCES_API}/user.rating?handle=${CODEFORCES_USERNAME}`);
            
            if (ratingResponse.ok) {
                const ratingData = await ratingResponse.json();
                if (ratingData.status === 'OK') {
                    document.getElementById('cf-contests').textContent = formatCPNumber(ratingData.result.length);
                }
            }
        } catch (e) {
            console.error('Error fetching contest data:', e);
            document.getElementById('cf-contests').textContent = '-';
        }
        
        // Apply rank color
        const rankColors = {
            'newbie': '#808080',
            'pupil': '#008000',
            'specialist': '#03A89E',
            'expert': '#0000FF',
            'candidate master': '#AA00AA',
            'master': '#FF8C00',
            'international master': '#FF8C00',
            'grandmaster': '#FF0000',
            'international grandmaster': '#FF0000',
            'legendary grandmaster': '#FF0000'
        };
        
        const rankElement = document.getElementById('cf-rank');
        if (user.rank && rankColors[user.rank.toLowerCase()]) {
            rankElement.style.color = rankColors[user.rank.toLowerCase()];
            rankElement.style.fontWeight = 'bold';
        }
        
        showCPLoading(false, 'codeforces');
    } catch (error) {
        console.error('Error loading CodeForces stats:', error);
        showCPError('codeforces');
    }
}

// Alternative method using third-party APIs
async function loadCodeChefStatsAlternative() {
    // You can also use these alternative APIs:
    // 1. https://competitive-coding-api.herokuapp.com/api/codechef/{username}
    // 2. Build your own backend API that scrapes CodeChef
    
    try {
        const response = await fetch(`https://competitive-coding-api.herokuapp.com/api/codechef/${CODECHEF_USERNAME}`);
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        
        document.getElementById('cc-rating').textContent = formatCPNumber(data.rating || 0);
        document.getElementById('cc-rank').textContent = formatCPNumber(data.global_rank || '-');
        document.getElementById('cc-max-rating').textContent = formatCPNumber(data.highest_rating || 0);
        document.getElementById('cc-problems').textContent = formatCPNumber(data.fully_solved || 0);
        
        showCPLoading(false, 'codechef');
    } catch (error) {
        console.error('Alternative API failed:', error);
        throw error;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Load stats for both platforms
    loadCodeChefStats();
    loadCodeForcesStats();
    
    // Add refresh buttons (optional)
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Stats';
    refreshButton.className = 'refresh-btn';
    refreshButton.onclick = () => {
        loadCodeChefStats();
        loadCodeForcesStats();
    };
});

/*
NOTE: To use these APIs, you need to:

1. For CodeChef:
   - Replace CODECHEF_USERNAME with your actual username
   - The APIs used here might be unofficial and may break
   - Alternative: Build a backend service that scrapes CodeChef profile page
   - You can deploy a simple Node.js/Python backend on Vercel/Heroku

2. For CodeForces:
   - Replace CODEFORCES_USERNAME with your actual username
   - CodeForces has official API, so it's more reliable
   - No additional setup needed

3. Building your own API:
   If third-party APIs don't work, you can create a simple backend:
   
   - Create a serverless function (Vercel/Netlify Functions)
   - Use Puppeteer or Cheerio to scrape the profile pages
   - Return JSON data to your frontend
   
   Example backend structure:
   /api/codechef/[username].js  -> Scrapes and returns CodeChef data
   /api/codeforces/[username].js -> Fetches from CF API

4. CORS Issues:
   If you encounter CORS errors, you can:
   - Use a CORS proxy (like allorigins.win)
   - Build your own backend API
   - Deploy functions on serverless platforms
*/
