export interface MoodInfo {
  emoji: string;
  color: string;
  valence: number;
}

// j-hartmann/emotion-english-distilroberta-base's 7 output labels.
// Valence is a rough -1..1 positivity score, used to plot a mood trend line.
export const MOODS: Record<string, MoodInfo> = {
  joy: { emoji: "😊", color: "#d97706", valence: 1 },
  surprise: { emoji: "😲", color: "#7c3aed", valence: 0.3 },
  neutral: { emoji: "😐", color: "#78716c", valence: 0 },
  sadness: { emoji: "😢", color: "#2563eb", valence: -0.7 },
  fear: { emoji: "😨", color: "#4338ca", valence: -0.6 },
  disgust: { emoji: "🤢", color: "#15803d", valence: -0.6 },
  anger: { emoji: "😠", color: "#b91c1c", valence: -0.9 },
};

export function getMoodInfo(mood: string | null | undefined): MoodInfo {
  if (!mood) return { emoji: "❔", color: "#a8a29e", valence: 0 };
  return MOODS[mood] ?? { emoji: "❔", color: "#a8a29e", valence: 0 };
}
