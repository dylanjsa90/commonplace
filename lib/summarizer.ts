// Rank source sentences by weighted term frequency and title overlap; never invent facts.
const STOP = new Set("a an the and or but as at by for from in into of on to with without is are was were be been being it its this that these those you your we our they their he she his her i me my us them not no can could will would should may might also more most some any all each very just than then there here what how why when where who which about over under after before between through have has had do does did new one two such use used using get make like really people time even now out up so if only other many much http https www com org home menu share read reading click copyright privacy cookies subscribe newsletter site page content article skip contact login sign search learn information follow next previous published updated said says way first last well back think know want good day years year today find available terms enable javascript please browser access required robot cloudflare security verification loading checking human blocked request error forbidden denied challenge".split(" "));
function words(text: string) { return text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []; }
const TAXONOMY: Record<string, string[]> = {
  "Design": ["design", "designer", "designers", "typography", "architecture", "aesthetic", "ux", "interface", "creative", "craft", "art", "visual"],
  "Technology": ["software", "technology", "programming", "code", "coding", "developer", "developers", "internet", "computer", "web", "digital", "artificial", "algorithm", "data"],
  "Science": ["science", "scientific", "research", "physics", "quantum", "universe", "space", "galaxy", "nasa", "biology", "experiment", "astronomy"],
  "Mindful living": ["mindfulness", "meditation", "mindful", "wellbeing", "attention", "patience", "nature", "forest", "mental", "habits", "slow"],
  "Culture": ["culture", "cultural", "history", "literature", "music", "cinema", "society", "artist", "artists", "philosophy", "book", "books"],
  "Business": ["business", "startup", "company", "companies", "management", "leadership", "entrepreneur", "strategy", "marketing", "economy"],
  "Food & cooking": ["food", "recipe", "recipes", "cooking", "cook", "ingredients", "kitchen", "baking", "restaurant"],
  "Travel": ["travel", "destination", "tourism", "trip", "itinerary", "hotel", "hiking", "adventure"],
  "Health": ["health", "exercise", "fitness", "nutrition", "medical", "medicine", "sleep", "disease", "patient"],
  "Environment": ["climate", "environment", "sustainability", "biodiversity", "conservation", "ecology", "renewable", "wildlife"],
};
export function summarize(text: string, title: string, description: string, keywords = "") {
  const frequencies = new Map<string, number>();
  for (const w of words(`${title} ${title} ${title} ${description} ${keywords} ${text.slice(0, 35000)}`)) if (!STOP.has(w)) frequencies.set(w, (frequencies.get(w) ?? 0) + 1);
  const titleWords = new Set(words(`${title} ${description}`));
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) ?? [];
  const ranked = sentences.map((sentence, index) => {
    const ws = words(sentence); const unique = [...new Set(ws.filter(w => !STOP.has(w)))];
    const score = unique.reduce((n, w) => n + Math.log(1 + (frequencies.get(w) ?? 0)) + (titleWords.has(w) ? 2 : 0), 0) / Math.sqrt(Math.max(ws.length, 1));
    return { sentence: sentence.trim(), index, score: score + (index < 4 ? .3 : 0), length: ws.length };
  }).filter(s => s.length >= 9 && s.length <= 85 && !/cookie|subscribe|all rights reserved|sign in|enable javascript|verify you are human/i.test(s.sentence));
  const chosen = ranked.sort((a,b) => b.score - a.score).slice(0, 2).sort((a,b) => a.index - b.index);
  const summary = (chosen.map(s => s.sentence).join(" ") || description || text.slice(0, 350)).slice(0, 850);
  const scoredTopics = Object.entries(TAXONOMY).map(([name, keys]) => ({ name,
    score: keys.reduce((n,w) => n + Math.log(1 + (frequencies.get(w) ?? 0)), 0), hits: keys.filter(w => frequencies.has(w)).length,
  })).filter(t => t.hits >= 2 || t.score >= 2).sort((a,b) => b.score - a.score);
  const threshold = Math.max(2.2, (scoredTopics[0]?.score ?? 0) * .25);
  const topics = scoredTopics.filter(t => t.score >= threshold).slice(0, 3).map(t => t.name);
  if (!topics.length) for (const [word, count] of [...frequencies].sort((a,b) => b[1] - a[1])) {
    if (count >= 3 && word.length > 3) topics.push(word[0].toUpperCase() + word.slice(1)); if (topics.length === 2) break;
  }
  return { summary, topics: topics.length ? topics : ["Uncategorized"] };
}
