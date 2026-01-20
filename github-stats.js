// GitHub Statistics API Integration
// Replace 'YOUR_USERNAME' with your actual GitHub username
const GITHUB_USERNAME = 'shivnshshrma';
const GITHUB_API_BASE = 'https://api.github.com';

// You can optionally add a GitHub Personal Access Token for higher rate limits
// Create one at: https://github.com/settings/tokens
const GITHUB_TOKEN = ''; // Leave empty if not using

const headers = GITHUB_TOKEN ? {
    'Authorization': `token ${GITHUB_TOKEN}`
} : {};

// Show/hide loading and content
function showLoading(show, section = 'github') {
    const loading = document.getElementById(`${section}-loading`);
    const content = document.getElementById(`${section}-content`);
    const error = document.getElementById(`${section}-error`);
    
    if (show) {
        loading.style.display = 'flex';
        content.style.display = 'none';
        error.style.display = 'none';
    } else {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

function showError(section = 'github') {
    document.getElementById(`${section}-loading`).style.display = 'none';
    document.getElementById(`${section}-content`).style.display = 'none';
    document.getElementById(`${section}-error`).style.display = 'flex';
}

// Fetch user data
async function fetchUserData() {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch user data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// Fetch all repositories
async function fetchRepositories() {
    try {
        const repos = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetch(
                `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?per_page=100&page=${page}&sort=updated`,
                { headers }
            );
            if (!response.ok) throw new Error('Failed to fetch repositories');
            
            const data = await response.json();
            repos.push(...data);
            
            hasMore = data.length === 100;
            page++;
        }

        return repos;
    } catch (error) {
        console.error('Error fetching repositories:', error);
        return [];
    }
}

// Fetch pull requests (searching for PRs created by the user)
async function fetchPullRequests() {
    try {
        const response = await fetch(
            `${GITHUB_API_BASE}/search/issues?q=author:${GITHUB_USERNAME}+type:pr&per_page=100`,
            { headers }
        );
        if (!response.ok) throw new Error('Failed to fetch pull requests');
        
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching pull requests:', error);
        return [];
    }
}

// Fetch recent events/activity
async function fetchRecentEvents() {
    try {
        const response = await fetch(
            `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/events/public?per_page=10`,
            { headers }
        );
        if (!response.ok) throw new Error('Failed to fetch events');
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

// Calculate contribution streak using commit activity
async function calculateStreak(repos) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let streak = 0;
        let currentDate = new Date(today);
        
        // Get all commit dates from user's repos (simplified version)
        const commitDates = new Set();
        
        for (const repo of repos.slice(0, 10)) { // Check last 10 repos for performance
            try {
                const response = await fetch(
                    `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${repo.name}/commits?author=${GITHUB_USERNAME}&per_page=100`,
                    { headers }
                );
                
                if (response.ok) {
                    const commits = await response.json();
                    commits.forEach(commit => {
                        const date = new Date(commit.commit.author.date);
                        date.setHours(0, 0, 0, 0);
                        commitDates.add(date.getTime());
                    });
                }
            } catch (err) {
                // Skip if error
                continue;
            }
        }
        
        // Calculate streak
        while (commitDates.has(currentDate.getTime())) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        return streak;
    } catch (error) {
        console.error('Error calculating streak:', error);
        return 0;
    }
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format event type to readable text
function formatEventType(type) {
    const eventTypes = {
        'PushEvent': 'Pushed code',
        'PullRequestEvent': 'Created pull request',
        'IssuesEvent': 'Opened issue',
        'WatchEvent': 'Starred repository',
        'ForkEvent': 'Forked repository',
        'CreateEvent': 'Created repository',
        'DeleteEvent': 'Deleted branch',
        'IssueCommentEvent': 'Commented on issue',
        'PullRequestReviewEvent': 'Reviewed pull request',
        'PullRequestReviewCommentEvent': 'Commented on PR'
    };
    return eventTypes[type] || type.replace('Event', '');
}

// Get relative time
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Display recent activity
function displayRecentEvents(events) {
    const container = document.getElementById('recent-events');
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="no-data">No recent activity found.</p>';
        return;
    }
    
    const html = events.slice(0, 5).map(event => {
        const repoName = event.repo.name.split('/')[1];
        return `
            <div class="event-item">
                <div class="event-icon"><i class="fas fa-circle"></i></div>
                <div class="event-content">
                    <div class="event-description">
                        <strong>${formatEventType(event.type)}</strong> in 
                        <a href="https://github.com/${event.repo.name}" target="_blank">${repoName}</a>
                    </div>
                    <div class="event-time">${getRelativeTime(event.created_at)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Main function to load all GitHub stats
async function loadGitHubStats() {
    showLoading(true, 'github');
    
    try {
        // Fetch all data in parallel
        const [userData, repos, pullRequests, events] = await Promise.all([
            fetchUserData(),
            fetchRepositories(),
            fetchPullRequests(),
            fetchRecentEvents()
        ]);
        
        if (!userData || !repos) {
            showError('github');
            return;
        }
        
        // Calculate stats
        const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
        const mergedPRs = pullRequests.filter(pr => pr.state === 'closed' && pr.pull_request?.merged_at).length;
        
        // Update DOM
        document.getElementById('total-repos').textContent = formatNumber(userData.public_repos || 0);
        document.getElementById('total-stars').textContent = formatNumber(totalStars);
        document.getElementById('total-prs').textContent = formatNumber(pullRequests.length);
        document.getElementById('merged-prs').textContent = formatNumber(mergedPRs);
        
        // Estimate total commits (this is approximate)
        const totalCommits = repos.reduce((sum, repo) => sum + (repo.size || 0), 0);
        document.getElementById('total-commits').textContent = formatNumber(Math.max(totalCommits, 100));
        
        // Calculate streak
        const streak = await calculateStreak(repos);
        document.getElementById('current-streak').textContent = formatNumber(streak);
        
        // Add contribution graph
        const contributionChart = document.getElementById('contribution-chart');
        contributionChart.src = `https://ghchart.rshah.org/${GITHUB_USERNAME}`;
        contributionChart.style.width = '100%';
        
        // Display recent events
        displayRecentEvents(events);
        
        showLoading(false, 'github');
    } catch (error) {
        console.error('Error loading GitHub stats:', error);
        showError('github');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadGitHubStats();
});
