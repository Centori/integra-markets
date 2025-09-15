/**
 * Utility functions for news processing
 */

/**
 * Check if a news item should be considered "breaking" based on various criteria
 */
export const isBreakingNews = (newsItem) => {
  // High impact keywords in title/content
  const breakingKeywords = [
    'breaking',
    'urgent',
    'alert',
    'flash',
    'just in',
    'emergency',
    'critical'
  ];
  
  // Convert text to lowercase for matching
  const title = (newsItem.title || '').toLowerCase();
  const content = (newsItem.content || '').toLowerCase();
  const description = (newsItem.description || '').toLowerCase();
  
  // Check for breaking keywords
  const hasBreakingKeywords = breakingKeywords.some(keyword => 
    title.includes(keyword) || 
    content.includes(keyword) ||
    description.includes(keyword)
  );
  
  // Check recency (within last hour)
  const isRecent = newsItem.published && 
    (new Date() - new Date(newsItem.published)) <= 60 * 60 * 1000;
  
  // Check market impact
  const hasHighImpact = newsItem.market_impact === 'HIGH';
  
  // Breaking criteria:
  // 1. Has breaking keywords OR
  // 2. Is very recent AND has high market impact
  return hasBreakingKeywords || (isRecent && hasHighImpact);
};

/**
 * Sort news items with breaking news first
 */
export const sortNewsWithBreaking = (newsItems) => {
  return [...newsItems].sort((a, b) => {
    // First sort by breaking status
    const aIsBreaking = isBreakingNews(a);
    const bIsBreaking = isBreakingNews(b);
    
    if (aIsBreaking && !bIsBreaking) return -1;
    if (!aIsBreaking && bIsBreaking) return 1;
    
    // Then sort by date
    const aDate = new Date(a.published || 0);
    const bDate = new Date(b.published || 0);
    return bDate - aDate;
  });
};

/**
 * Format relative time for display
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const publishedDate = new Date(date);
  const diffInMinutes = Math.floor((now - publishedDate) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};
