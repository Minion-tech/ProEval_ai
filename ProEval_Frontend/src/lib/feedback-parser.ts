/**
 * Utility to parse the structured AI mentorship report from a narrative string.
 * Handles the Markdown-based format with sections for Verdict, Guidance, Concerns, and Roadmap.
 */

export interface RoadmapItem {
  period: string;
  title: string;
  description: string;
}

export interface ParsedFeedback {
  verdict: {
    label: string;
    score: number;
    summary: string;
  };
  guidance: {
    title: string;
    description: string;
  }[];
  concerns: string[];
  roadmap: RoadmapItem[];
  clarificationAnswers: string[];
  ideatorReview: string;
  architectReview: string;
  raw: string;
}

/**
 * Aggressively removes Markdown symbols to make the text look "human-written"
 * and polished, preventing raw symbols like **, ##, or - from showing up.
 */
function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.*?)\*/g, "$1")     // Remove italics
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1") // Remove code blocks
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Remove links, keep text
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")         // Normalize spaces
    .trim();
}

/**
 * Minimal cleaning for long narrative blocks: keep bullets and paragraphs intact
 */
function cleanNarrative(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/&quot;/g, '"')
    // Remove lines that look like JSON keys or dumped objects
    .replace(/^\s*["']?[A-Za-z0-9 _-]+["']?\s*:\s*(\{|\[|\")?.*$/gm, "")
    // Remove leading hash signs and leftover heading markers
    .replace(/^\s*#+\s*/gm, "")
    .trim();
}

function parseRoadmapItems(section: string): RoadmapItem[] {
  if (!section) return [];
  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: RoadmapItem[] = [];
  for (const raw of lines) {
    // Remove leading bullets/numbers
    const line = raw.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
    // Capture bolded period like **Weeks 1-4**: rest
    const m = line.match(/^(?:\*\*(.*?)\*\*\s*[:\-]\s*)?(.*)$/);
    let period = m && m[1] ? cleanText(m[1]) : '';
    let rest = m && m[2] ? m[2].trim() : '';

    // Split rest into title and description using common separators
    let title = rest;
    let description = '';
    const sep = rest.match(/\s[—-]\s|\s:\s/);
    if (sep) {
      const parts = rest.split(/\s[—-]\s|\s:\s/);
      title = parts[0].trim();
      description = parts.slice(1).join(' - ').trim();
    }

    if (!period) {
      // Try to infer a period like 'Weeks 1-4' at start of title
      const p2 = title.match(/^(Weeks?\s*\d+[\-–]?\d*)\b/i);
      if (p2) {
        period = cleanText(p2[1]);
        title = title.replace(p2[0], '').trim().replace(/^[:\-\–\—]\s*/, '');
      }
    }

    items.push({ period: period || 'Phase', title: cleanText(title), description: cleanText(description) });
  }
  return items;
}

export function parseAiNarrative(text: string): ParsedFeedback {
  if (!text) {
    return {
      verdict: { label: "N/A", score: 0, summary: "No evaluation data available." },
      guidance: [],
      concerns: [],
      roadmap: [],
      clarificationAnswers: [],
      raw: ""
    };
  }

  const result: ParsedFeedback = {
    verdict: { label: "REFINE", score: 7, summary: "" },
    guidance: [],
    concerns: [],
    roadmap: [],
    clarificationAnswers: [],
    ideatorReview: "",
    architectReview: "",
    raw: text
  };

  const ideatorMatch = text.match(/## Ideator Mentorship\s*([\s\S]*?)(?=## Architect Review|$)/i);
  const architectMatch = text.match(/## Architect Review\s*([\s\S]*?)(?=###|$)/i);

  const scoreMatch = text.match(/Execution Score\s*[:\-]?\s*(\d{1,3})(?:\/100)?/i);
  if (scoreMatch) {
    result.verdict.score = Number(scoreMatch[1]);
  }

  const verdictMatch = text.match(/\*\*Verdict\*\*\s*[:\-]?\s*([A-Z]+)/i) || text.match(/\b(VREFINE|APPROVE|REVISE|REFINE|AT_RISK|PASS)\b/i);
  if (verdictMatch) {
    result.verdict.label = verdictMatch[1].toUpperCase();
  }

  const summaryEndIndex = text.search(/(?:Identified Strengths|Improvement Recommendations|🚩 Risk Signals|###|$)/i);
  const summaryText = summaryEndIndex > 0 ? text.slice(0, summaryEndIndex) : text;
  result.verdict.summary = cleanText(summaryText.replace(/\*\*Verdict\*\*\s*[:\-]?\s*[A-Z]+/i, "").replace(/Execution Score\s*[:\-]?\s*\d{1,3}(?:\/100)?/i, ""));

  const extractItems = (section: string): string[] => {
    if (!section) return [];
    const lines = section
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const items: string[] = [];
    for (const line of lines) {
      if (/^[-*•]\s+/.test(line)) {
        items.push(cleanText(line.replace(/^[-*•]\s+/, "")));
      } else if (/^\d+\./.test(line)) {
        items.push(cleanText(line.replace(/^\d+\./, "")));
      } else {
        items.push(cleanText(line));
      }
    }

    if (items.length === 1) {
      return items[0]
        .split(/(?:\.\s+)(?=[A-Z])/) 
        .map(cleanText)
        .filter((item) => item.length > 3);
    }

    return items.filter((item) => item.length > 3);
  };

  const strengthsSection = text.match(/(?:Identified Strengths|Strengths)\s*([\s\S]*?)(?=(?:Improvement Recommendations|Strategic Guidance|Common Project Guidance|🚩 Risk Signals|###|$))/i)?.[1];
  const improvementsSection = text.match(/(?:Improvement Recommendations|Strategic Guidance|Actionable Guidance|Common Project Guidance)\s*([\s\S]*?)(?=(?:🚩 Risk Signals|###|$))/i)?.[1];
  const riskSection = text.match(/🚩\s*Risk Signals\s*([\s\S]*?)(?=###|$)/i)?.[1];

  if (improvementsSection) {
    result.guidance = extractItems(improvementsSection).map((item) => ({ title: item, description: "" }));
  } else if (strengthsSection) {
    result.guidance = extractItems(strengthsSection).map((item) => ({ title: item, description: "" }));
  }

  if (riskSection) {
    result.concerns = extractItems(riskSection);
  } else {
    const concernsSection = text.match(/###\s*(Technical Concerns|Key Concerns|Critical Risks)\s*([\s\S]*?)(?=###|$)/i)?.[2];
    if (concernsSection) {
      result.concerns = extractItems(concernsSection);
    }
  }

  const roadmapSection = text.match(/###\s*(Implementation Roadmap|Execution Roadmap|Project Roadmap)\s*([\s\S]*?)(?=###|$)/i)?.[2];
  if (roadmapSection) {
    // Prefer structured parsing of roadmap lines (bolded weeks, titles, descriptions)
    result.roadmap = parseRoadmapItems(roadmapSection);
    // Fallback: if parse produced no items, fall back to simple extraction
    if (result.roadmap.length === 0) {
      const items = extractItems(roadmapSection);
      result.roadmap = items.map((item) => ({ period: "Phase", title: item, description: "" }));
    }
  }

  const answersSection = text.match(/###\s*Leader Clarification Answers Considered\s*([\s\S]*?)(?=###|$)/i)?.[1];
  if (answersSection) {
    result.clarificationAnswers = extractItems(answersSection).map((i) => i.replace(/^Answer\s*:\s*/i, "")).filter((i) => i.length > 5);
  }

  // Keep ideator/architect blocks more intact for richer display
  result.ideatorReview = cleanNarrative(ideatorMatch?.[1] || "");
  result.architectReview = cleanNarrative(architectMatch?.[1] || "");

  return result;
}
