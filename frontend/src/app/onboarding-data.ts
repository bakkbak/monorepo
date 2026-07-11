export type InterestCategory = 'campus_life' | 'academics' | 'social' | 'entertainment' | 'career';

export type InterestOption = {
  id: string;
  label: string;
  emoji: string;
  category: InterestCategory;
};

export const INTEREST_CATEGORIES: { id: InterestCategory; label: string }[] = [
  { id: 'campus_life', label: 'Campus Life' },
  { id: 'academics', label: 'Academics' },
  { id: 'social', label: 'Social' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'career', label: 'Career' },
];

export const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'confessions', label: 'Confessions', emoji: '🤫', category: 'campus_life' },
  { id: 'relationships', label: 'Relationships', emoji: '💕', category: 'campus_life' },
  { id: 'memes', label: 'Memes', emoji: '😂', category: 'campus_life' },
  { id: 'campus_drama', label: 'Campus Drama', emoji: '🎭', category: 'campus_life' },
  { id: 'hot_takes', label: 'Hot Takes', emoji: '🔥', category: 'campus_life' },

  { id: 'engineering', label: 'Engineering', emoji: '⚙️', category: 'academics' },
  { id: 'business', label: 'Business', emoji: '📊', category: 'academics' },
  { id: 'law', label: 'Law', emoji: '⚖️', category: 'academics' },
  { id: 'medicine', label: 'Medicine', emoji: '🩺', category: 'academics' },
  { id: 'design', label: 'Design', emoji: '🎨', category: 'academics' },

  { id: 'parties', label: 'Parties', emoji: '🎉', category: 'social' },
  { id: 'events', label: 'Events', emoji: '📅', category: 'social' },
  { id: 'clubs', label: 'Clubs', emoji: '🎯', category: 'social' },
  { id: 'fashion', label: 'Fashion', emoji: '👗', category: 'social' },
  { id: 'photography', label: 'Photography', emoji: '📸', category: 'social' },

  { id: 'movies', label: 'Movies', emoji: '🎬', category: 'entertainment' },
  { id: 'anime', label: 'Anime', emoji: '🎌', category: 'entertainment' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', category: 'entertainment' },
  { id: 'music', label: 'Music', emoji: '🎵', category: 'entertainment' },
  { id: 'cricket', label: 'Cricket', emoji: '🏏', category: 'entertainment' },
  { id: 'football', label: 'Football', emoji: '⚽', category: 'entertainment' },

  { id: 'internships', label: 'Internships', emoji: '💼', category: 'career' },
  { id: 'coding', label: 'Coding', emoji: '💻', category: 'career' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', emoji: '🚀', category: 'career' },
  { id: 'finance', label: 'Finance', emoji: '💰', category: 'career' },
  { id: 'consulting', label: 'Consulting', emoji: '🤝', category: 'career' },
];

export const UNIVERSITY_OPTIONS = [
  { id: 'rvu', label: 'RV University', emoji: '🎓' },
  { id: 'opj', label: 'OP Jindal Global University', emoji: '🏫' },
  { id: 'rvce', label: 'RV College of Engineering', emoji: '⚙️' },
  { id: 'other', label: 'Other', emoji: '🏛️' },
] as const;

export const AGE_OPTIONS = [
  { id: 'under_18', label: 'Under 18' },
  { id: '18', label: '18' },
  { id: '19', label: '19' },
  { id: '20', label: '20' },
  { id: '21', label: '21' },
  { id: '22', label: '22' },
  { id: '23', label: '23' },
  { id: '24_plus', label: '24+' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'non_binary', label: 'Non-binary' },
  { id: 'self_describe', label: 'Prefer to self-describe' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const ACADEMIC_YEAR_OPTIONS = [
  { id: 'first', label: 'First Year' },
  { id: 'second', label: 'Second Year' },
  { id: 'third', label: 'Third Year' },
  { id: 'fourth', label: 'Fourth Year' },
  { id: 'graduate', label: 'Graduate Student' },
  { id: 'other', label: 'Other' },
] as const;

export const FIRST_EXPERIENCE_OPTIONS = [
  { id: 'browse_trending', label: 'See What\'s Brewing', emoji: '🔥', desc: 'Browse trending conversations' },
  { id: 'discover_events', label: 'Discover Events', emoji: '📅', desc: 'Explore upcoming campus events' },
  { id: 'explore_circles', label: 'Explore Circles', emoji: '🔍', desc: 'See what communities are discussing' },
  { id: 'make_first_post', label: 'Make Your First Post', emoji: '✍️', desc: 'Start participating immediately' },
] as const;

export const INTEREST_TO_CIRCLE_MAP: Record<string, string[]> = {
  cricket: ['ipl', 'rcb'],
  football: ['premier-league'],
  gaming: ['gaming'],
  music: ['music', 'swifties'],
  movies: ['bollywood'],
  anime: ['pokemon'],
};
