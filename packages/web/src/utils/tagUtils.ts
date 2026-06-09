/**
 * Utility functions for parsing and serializing tags inside transaction description
 * and managing user-created tags in localStorage.
 */

export interface ParsedTx {
  description: string;
  tags: string[];
}

/**
 * Parses description to separate the actual notes and tags array.
 * Supports format: "Beli kopi [tags: kantor, kopi]" or "#kantor #kopi" tags.
 */
export function parseDescriptionAndTags(fullDesc: string = ""): ParsedTx {
  if (!fullDesc) return { description: "", tags: [] };
  
  // 1. Try to parse bracket tags: [tags: tag1, tag2]
  const bracketMatch = fullDesc.match(/^(.*)\s*\[tags:\s*([^\]]+)\]$/i);
  if (bracketMatch) {
    const description = bracketMatch[1].trim();
    const tags = bracketMatch[2]
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return { description, tags };
  }

  // 2. Fallback: Parse hashtags at the end of the text
  const tags: string[] = [];
  const words = fullDesc.split(/\s+/);
  const cleanWords: string[] = [];
  
  // Go from left to right, identifying words that are hashtag words
  words.forEach((word) => {
    if (word.startsWith("#") && word.length > 1) {
      // Clean up punctuation from hashtag
      const tag = word.substring(1).replace(/[^a-zA-Z0-9_-]/g, "");
      if (tag) {
        tags.push(tag);
      }
    } else {
      cleanWords.push(word);
    }
  });

  // If we found hashtags, return them with the text cleaned of hashtags
  if (tags.length > 0) {
    return {
      description: cleanWords.join(" ").trim(),
      tags,
    };
  }

  return { description: fullDesc, tags: [] };
}

/**
 * Serializes notes and tags array into a single description string.
 */
export function serializeDescriptionAndTags(desc: string, tags: string[]): string {
  const cleanDesc = (desc || "").trim();
  if (!tags || tags.length === 0) return cleanDesc;
  
  // Clean tag values to avoid brackets
  const cleanTags = tags
    .map((t) => t.trim().replace(/[\[\]]/g, ""))
    .filter((t) => t.length > 0);
    
  if (cleanTags.length === 0) return cleanDesc;
  
  return `${cleanDesc} [tags: ${cleanTags.join(", ")}]`;
}

const DEFAULT_TAGS = ["Penting", "Bulanan", "Harian", "Pribadi", "Keluarga"];

/**
 * Get user-created tags from localStorage.
 */
export function getUserTags(userId: string): string[] {
  if (typeof window === "undefined") return DEFAULT_TAGS;
  try {
    const key = `karsafin_tags_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to load user tags:", err);
  }
  return DEFAULT_TAGS;
}

/**
 * Save user tag to localStorage.
 */
export function addUserTag(userId: string, newTag: string): string[] {
  const current = getUserTags(userId);
  const cleanTag = newTag.trim();
  if (!cleanTag) return current;
  
  // Check case-insensitive duplicate
  if (current.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) {
    return current;
  }
  
  const updated = [...current, cleanTag];
  if (typeof window !== "undefined") {
    try {
      const key = `karsafin_tags_${userId}`;
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save user tags:", err);
    }
  }
  return updated;
}
