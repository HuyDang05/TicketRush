export const CATEGORY_LABELS = {
  music: 'Âm nhạc',
  seminarsworkshops: 'Hội thảo',
  sport: 'Thể thao',
  theatersandart: 'Sân khấu',
  attractionsexperiences: 'Trải nghiệm',
  others: 'Khác',
};

export const CATEGORIES = [
  { slug: 'music', icon: '🎵', label: CATEGORY_LABELS.music, count: '124 sự kiện' },
  { slug: 'seminarsworkshops', icon: '🎤', label: CATEGORY_LABELS.seminarsworkshops, count: '47 sự kiện' },
  { slug: 'sport', icon: '⚽', label: CATEGORY_LABELS.sport, count: '36 sự kiện' },
  { slug: 'theatersandart', icon: '🎭', label: CATEGORY_LABELS.theatersandart, count: '58 sự kiện' },
  { slug: 'attractionsexperiences', icon: '🎪', label: CATEGORY_LABELS.attractionsexperiences, count: '21 sự kiện' },
  { slug: 'others', icon: '✨', label: CATEGORY_LABELS.others, count: '12 sự kiện' },
];

export function isValidCategory(slug) {
  return CATEGORIES.some((category) => category.slug === slug);
}
