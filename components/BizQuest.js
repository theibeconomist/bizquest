"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, Send, Pencil, CheckCircle2, AlertCircle, Sparkles, BookOpen, PlayCircle, Lock, Trophy, Award, Clock, RefreshCw, ChevronRight, ArrowLeft, Layers, Shuffle, ChevronLeft, RotateCw, Bot, MessageCircle, X, Building2, Factory, Lightbulb, TrendingUp } from "lucide-react";
import {
  emptyProfile,
  loadProfile,
  saveProfile,
  loadResponses,
  saveResponses,
  loadCompResponses,
  saveCompResponses,
  loadStudyProgress,
  saveStudyProgress,
  loadTermsReviewed,
  saveTermsReviewed,
} from "@/lib/db";

// ============================================================
// ⚠️ TEMPORARY TESTING FLAG — set back to false before real students use this.
// When true, every subunit on the Unit Map is unlocked regardless of whether
// prior subunits are complete, so all content can be checked freely. The
// underlying sequential-unlock logic is untouched below and takes over again
// as soon as this is set back to false.
// ============================================================
const TESTING_UNLOCK_ALL_SUBUNITS = true;

// ============================================================
// STUDY module data — inspired by a standard IB Business Management 1.1
// teaching deck; all explanatory text below is written independently.
// ============================================================
const SORT_ITEMS = [
  { label: "Labour", bucket: "input" },
  { label: "Raw materials", bucket: "input" },
  { label: "Equipment", bucket: "input" },
  { label: "Mixing", bucket: "process" },
  { label: "Kneading", bucket: "process" },
  { label: "Baking", bucket: "process" },
  { label: "Bread", bucket: "output" },
  { label: "Cakes", bucket: "output" },
  { label: "Pastries", bucket: "output" },
];

const FUNCTIONAL_AREAS = [
  { name: "Human resources", summary: "Manages the people of the organization.", detail: "Covers workforce planning, recruitment, training, appraisals, and — when needed — dismissals or redundancies. A well-run HR function makes sure the business has the right people, with the right skills, in the right roles." },
  { name: "Finance & accounts", summary: "Manages the organization's money.", detail: "Keeps accurate financial records, meets legal requirements like tax reporting, and informs stakeholders such as shareholders and potential investors about the business's financial position." },
  { name: "Marketing", summary: "Identifies and meets customer needs and wants.", detail: "Often organized around the \"7Ps\": Product, Price, Place, Promotion, People, Process and Physical evidence — the full set of decisions involved in getting the right offer to the right customer." },
  { name: "Operations management", summary: "Turns resources into finished goods or delivered services.", detail: "Responsible for the actual process of production — converting raw materials and components into finished products, or organizing how a service is delivered to customers." },
];

const CHAIN_OF_PRODUCTION = [
  { stage: "Farming cocoa beans", sector: "Primary", why: "Raw cocoa beans are harvested directly from the land — extracting a natural resource." },
  { stage: "Processing beans into cocoa butter & powder", sector: "Secondary", why: "The raw material is physically transformed into a new, more useful form — a manufacturing process." },
  { stage: "Manufacturing chocolate bars", sector: "Secondary", why: "Cocoa butter, powder, sugar and milk are combined and manufactured into a finished product." },
  { stage: "Selling chocolate bars in shops", sector: "Tertiary", why: "The finished good is sold directly to consumers — a service, not a manufacturing step." },
];

const ENTREPRENEURS = [
  {
    clues: [
      "Left a career in finance to pursue makeup artistry and beauty blogging.",
      "Launched her cosmetics brand with her sisters after struggling to find false eyelashes she liked.",
      "Her cosmetics company now generates roughly $250 million a year in sales.",
    ],
    name: "Huda Kattan",
    business: "Huda Beauty (cosmetics)",
  },
  {
    clues: [
      "Founded a business-to-business marketplace website in 1999 with a group of friends in an apartment in Hangzhou, China.",
      "The company grew into a multinational e-commerce, retail and technology giant.",
      "Its 2014 IPO raised about $21.8 billion — the largest IPO in history at the time.",
    ],
    name: "Jack Ma",
    business: "Alibaba (e-commerce & technology)",
  },
  {
    clues: [
      "Discovered as a teenager by a major music producer.",
      "Built a career as a musician before launching beauty and clothing lines.",
      "Became a billionaire in 2021 largely thanks to her cosmetics brand.",
    ],
    name: "Rihanna",
    business: "Fenty Beauty & Savage X Fenty (cosmetics & clothing)",
  },
  {
    clues: [
      "Born in Aden, in present-day Yemen.",
      "Left an MBA program at Stanford to return home and help run the family business.",
      "Leads a multinational conglomerate spanning energy, petrochemicals, retail and telecommunications.",
    ],
    name: "Mukesh Ambani",
    business: "Reliance Industries (conglomerate)",
  },
  {
    clues: [
      "Played professional tennis for nearly two decades, winning five Grand Slam singles titles.",
      "Launched a premium confectionery brand in 2012.",
      "That business reached roughly $20 million in sales by 2019.",
    ],
    name: "Maria Sharapova",
    business: "Sugarpova (confectionery)",
  },
  {
    clues: [
      "Born in South Africa.",
      "Co-founded an online payments company that became a household name.",
      "Now runs multibillion-dollar businesses spanning transportation on Earth and in space.",
    ],
    name: "Elon Musk",
    business: "Tesla & SpaceX",
  },
];

const GET_CASH = [
  { letter: "G", term: "Growth", explanation: "The value of the business's own assets (like land, buildings or equipment) can rise over time — this capital growth can end up worth far more than an owner's salary ever would." },
  { letter: "E", term: "Earnings", explanation: "Successful entrepreneurs can earn significantly more than they would in a salaried job working for someone else." },
  { letter: "T", term: "Transference", explanation: "Many entrepreneurs want to pass their business on to the next generation, securing their family's future." },
  { letter: "C", term: "Challenge", explanation: "Some people are simply drawn to the challenge of building something of their own from scratch." },
  { letter: "A", term: "Autonomy", explanation: "Running your own business means independence and freedom to make your own decisions, rather than following someone else's rules." },
  { letter: "S", term: "Security", explanation: "Being self-employed can offer a stronger sense of financial security and control over your own future." },
  { letter: "H", term: "Hobbies", explanation: "Some entrepreneurs simply want to turn a passion or hobby into a way of making a living." },
];

const SECTOR_SORT_ITEMS = [
  { label: "Fishing fleet", bucket: "primary" },
  { label: "Coffee farm", bucket: "primary" },
  { label: "Coal mine", bucket: "primary" },
  { label: "Clothing manufacturer", bucket: "secondary" },
  { label: "Car factory", bucket: "secondary" },
  { label: "Construction firm", bucket: "secondary" },
  { label: "Retail store", bucket: "tertiary" },
  { label: "Bank", bucket: "tertiary" },
  { label: "Hospital", bucket: "tertiary" },
  { label: "IT consultancy", bucket: "quaternary" },
  { label: "R&D lab", bucket: "quaternary" },
  { label: "Software developer", bucket: "quaternary" },
];

const STUDY_VIDEOS = {
  sectors: { id: "tFhj9fwAOzw", title: "The Sectors of the Economy", channel: "Quickonomics", length: "2:49" },
  chocolate: { id: "ZtMfiWDQHT8", title: "Milk Chocolate, From Scratch | How It's Made", channel: "Science Channel", length: "4:13" },
  gymshark: { id: "MpftE7RwQnM", title: "How I Started The UK's Fastest Growing Company — Ben Francis", channel: "Ben Francis", length: "13:46" },
};

// ============================================================
// SUBUNIT 1.2 — Types of business entities (data mirrors the 1.1 shape above)
// ============================================================
const STUDY_VIDEO_1_2_LIABILITY = { id: "ksdAC8CYF7A", title: "Why Should I Incorporate", channel: "The Company Corporation", length: "2:12" };

const SECTION_THEME = {
  vocab: { color: "#2E8B84", light: "#EAF5F4", label: "Stage 2 · Build", desc: "Master the key terminology of the subunit by defining all of the following terms — no example needed." },
  structured: { color: "#4A6FA5", light: "#EEF2F8", label: "Stage 3 · Apply", desc: "Put your knowledge into practice with structured short-answer questions on the case — in the style of Paper 1 Section A." },
  essay: { color: "#8B3A4A", light: "#F7ECEE", label: "Stage 4 · Master", desc: "Bring it all together in a full extended-response essay — in the style of Paper 1 Section B." },
};

// ============================================================
// Stage sequencing — one screen at a time, each gated on the previous
// ============================================================
const STAGE_ORDER = ["discover", "build", "apply", "master"];
const STAGE_LABELS = { discover: "Discover", build: "Build", apply: "Apply", master: "Master" };
const STAGE_COLORS = { discover: "#6B4C9A", build: "#2E8B84", apply: "#4A6FA5", master: "#8B3A4A" };

const STAGE_TO_SECTION = { build: "vocab", apply: "structured", master: "essay" };

function isStageComplete(stageKey, stats) {
  if (stageKey === "discover") return stats.compDone >= stats.compTotal;
  const sec = stats.bySection[STAGE_TO_SECTION[stageKey]];
  return sec.done >= sec.total;
}
function isStageLocked(stageKey, stats) {
  const idx = STAGE_ORDER.indexOf(stageKey);
  for (let i = 0; i < idx; i++) {
    if (!isStageComplete(STAGE_ORDER[i], stats)) return true;
  }
  return false;
}

function ContinueButton({ stageKey, onAdvance }) {
  const idx = STAGE_ORDER.indexOf(stageKey);
  const nextKey = STAGE_ORDER[idx + 1];
  if (!nextKey) return null;
  return (
    <FadeIn className="flex justify-end mt-2">
      <button
        onClick={() => onAdvance(nextKey)}
        className="inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: STAGE_COLORS[nextKey] }}
      >
        Continue to {STAGE_LABELS[nextKey]} <ChevronRight size={16} />
      </button>
    </FadeIn>
  );
}

// Persistent bottom bar so "Continue" is reachable without scrolling to the end of a long question list
// Sticky "stage complete" bar pinned to the bottom of the questions pane itself
// (not the viewport), so it only ever overlaps that pane's own content.
function PaneContinueBar({ stageKey, onAdvance }) {
  const idx = STAGE_ORDER.indexOf(stageKey);
  const nextKey = STAGE_ORDER[idx + 1];
  if (!nextKey) return null;
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 border-t bg-white/97 px-5 py-3" style={{ borderColor: "#e7e2d8" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-stone-600 flex items-center gap-1.5">
          <CheckCircle2 size={15} style={{ color: STAGE_COLORS[stageKey] }} />
          {STAGE_LABELS[stageKey]} complete
        </div>
        <button
          onClick={() => onAdvance(nextKey)}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: STAGE_COLORS[nextKey] }}
        >
          Continue to {STAGE_LABELS[nextKey]} <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function ReadingPanel({ caseText }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "#15396B" }}>
        <BookOpen size={14} /> Reading
      </div>
      {caseText.split("\n\n").map((para, i) => (
        <p key={i} className="text-[14.5px] leading-relaxed text-stone-700 mb-3 last:mb-0">
          {para}
        </p>
      ))}
    </div>
  );
}

const VIDEO_COLOR = "#6B4C9A";
const GOLD = "#C9A227";
const TIP_BLUE = "#2E5395";
const TIP_BLUE_BG = "#EAF2FB";

// Feedback tiers, reusing the same red/amber/green vocabulary as the video comprehension checks
function scoreTier(score, marks) {
  if (marks <= 0) return "mid";
  const fraction = score / marks;
  if (fraction >= 1) return "high";
  if (fraction >= 0.5) return "mid";
  return "low";
}
const TIER_STYLE = {
  low: { border: "#B3261E", bg: "#FCEEEE", text: "#8a2420" },
  mid: { border: "#B7791F", bg: "#FDF6E8", text: "#8A5A12" },
  high: { border: "#2F8F4E", bg: "#EAF7EE", text: "#1F6B39" },
};

// ============================================================
// GLOBAL LEARNER PROFILE — holistic across ALL units/subunits.
// Copy this entire section VERBATIM into every future subunit file
// so XP, levels and badges accumulate across the whole course.
// Storage key is NOT subunit-prefixed on purpose.
// ============================================================
const XP_PER_MARK = 3;
const XP_PER_COMPREHENSION = 5;
const XP_SUBUNIT_COMPLETE_BONUS = 25;
const XP_STUDY_COMPLETE_BONUS = 20;

const LEVELS = [
  { name: "Founding Member", threshold: 0 },
  { name: "Market Analyst", threshold: 30 },
  { name: "Strategic Consultant", threshold: 70 },
  { name: "Chief Strategist", threshold: 120 },
  { name: "Industry Visionary", threshold: 180 },
  { name: "Business Management Master", threshold: 260 },
];
const LEVEL_STEP_BEYOND = 150; // XP per additional tier once past the named levels
const MASTER_TIERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// NOTE: this curve is an initial estimate sized for a single subunit demo.
// Revisit thresholds once more subunits/units exist and real XP totals are known.
function getLevelInfo(xp) {
  let levelIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].threshold) levelIndex = i;
  const isBeyond = levelIndex === LEVELS.length - 1 && xp >= LEVELS[LEVELS.length - 1].threshold;
  let name = LEVELS[levelIndex].name;
  let currentThreshold = LEVELS[levelIndex].threshold;
  let nextThreshold = levelIndex < LEVELS.length - 1 ? LEVELS[levelIndex + 1].threshold : null;

  if (isBeyond && nextThreshold === null) {
    const extra = Math.floor((xp - LEVELS[LEVELS.length - 1].threshold) / LEVEL_STEP_BEYOND);
    name = `${LEVELS[LEVELS.length - 1].name} ${MASTER_TIERS[Math.min(extra, MASTER_TIERS.length - 1)]}`;
    currentThreshold = LEVELS[LEVELS.length - 1].threshold + extra * LEVEL_STEP_BEYOND;
    nextThreshold = currentThreshold + LEVEL_STEP_BEYOND;
  }
  const span = nextThreshold - currentThreshold;
  const percent = span > 0 ? Math.min(100, Math.round(((xp - currentThreshold) / span) * 100)) : 100;
  return { name, xp, currentThreshold, nextThreshold, percent };
}

const BADGES = [
  { id: "first-steps", name: "First Steps", desc: "Completed your first video comprehension check.", check: (p) => (p.videosCompleted || 0) >= 1 },
  { id: "wordsmith-1", name: "Wordsmith", desc: "Defined 7 key terms across your studies.", check: (p) => (p.vocabCompleted || 0) >= 7 },
  { id: "wordsmith-2", name: "Lexicon Master", desc: "Defined 25 key terms across your studies.", check: (p) => (p.vocabCompleted || 0) >= 25 },
  { id: "sharp-shooter", name: "Sharp Shooter", desc: "Scored full marks on 3 questions.", check: (p) => (p.perfectAnswers || 0) >= 3 },
  { id: "subunit-1-1", name: "1.1 Complete", desc: "Completed Unit 1.1 — What is a business?", check: (p) => (p.completedSubunits || []).includes("1.1") },
  { id: "study-1-1", name: "Well Rounded", desc: "Completed the 1.1 Study Guide.", check: (p) => (p.studyCompleted || []).includes("1.1") },
  { id: "rising-star", name: "Rising Star", desc: "Earned 50 XP.", check: (p) => (p.xp || 0) >= 50 },
  { id: "centurion", name: "Centurion", desc: "Earned 100 XP.", check: (p) => (p.xp || 0) >= 100 },
];

const VIDEO = {
  id: "DQh-1N_inMc",
  title: "The History of Apple, in 2 Minutes",
  source: "Fast Company",
};
const COMPREHENSION_QUESTIONS = [
  { id: "c1", prompt: "According to the video, in which US state did Steve Jobs and Steve Wozniak build Apple's first computers?",
    guidance: "Correct answer: California (the video places this in the Jobs family home/garage in the Cupertino/Los Altos area). Accept 'California' or a correctly named California city. This is a quick comprehension check, not a formal exam question — be encouraging and lenient with a 'partial' verdict for close-but-incomplete answers." },
  { id: "c2", prompt: "Name one item Jobs and Wozniak are said to have sold to help fund their first batch of computers.",
    guidance: "Correct answer: Steve Jobs's Volkswagen van, or Steve Wozniak's calculator (both are the commonly cited items sold to raise money for Apple's first production run). Accept either. This is a quick comprehension check, not a formal exam question — be encouraging and lenient with a 'partial' verdict for close-but-incomplete answers." },
];
const CASE_TEXT = `Apple was founded on 1 April 1976 in Los Altos, California, by Steve Jobs, Steve Wozniak and Ronald Wayne, initially to build and sell Wozniak's hand-assembled Apple I computer kit. Two of Apple's three founders, Jobs and Wozniak, are widely regarded as classic examples of entrepreneurs — individuals who identified an opportunity, took on personal financial risk (they raised money for their first production run partly by selling a Volkswagen van and a calculator), and built an organization from nothing. Their creation of Apple from a home-built hobby project into a company is a textbook case of entrepreneurship.

Apple operates across several sectors of economic activity. It designs and manufactures hardware (secondary sector, largely through contracted manufacturers), and generates a growing share of revenue from retail stores, technical support, the App Store, Apple Music, iCloud and other digital and knowledge-based services (tertiary and quaternary sectors). Further back in Apple's supply chain lie primary sector activities: raw materials such as cobalt and lithium used in iPhone and MacBook batteries are mined in countries including the Democratic Republic of Congo, Australia and Chile, before being processed and shipped to Apple's assembly partners.

In its 2025 fiscal year, Apple's total revenue was $416.16 billion, of which iPhone hardware sales made up $209.59 billion and Services revenue made up $109.16 billion (up 13.5% year on year) — a growing share of the total.`;
const MARKBANDS = `0 marks: The work does not reach a standard described below.
1–2 marks: Little understanding of the demands of the question. Little/no use of business management tools/theories, or used inaccurately. Little or no reference to the case study. No arguments made.
3–4 marks: Some understanding of the demands of the question. Some use of tools/theories, mostly lacking accuracy/relevance. Superficial use of case study. Arguments mostly unsubstantiated.
5–6 marks: Understanding of the demands of the question, but only partially addressed. Some relevant and accurate use of tools/theories. Some relevant use of case study that does not effectively support the argument. Arguments substantiated but mostly one-sided.
7–8 marks: Mostly addresses the demands of the question. Mostly relevant and accurate use of tools/theories. Case study generally used to support the argument. Arguments substantiated with some balance.
9–10 marks: Clear focus on addressing the demands of the question. Relevant and accurate use of tools/theories. Case study integrated effectively. Arguments substantiated and balanced, with an explanation of the limitations of the case study.`;
const FLASHCARD_TERMS = [
  { term: "Business", definition: "An organization that produces or provides goods and/or services to meet customer needs or wants." },
  { term: "Primary sector", definition: "Economic activity involving the extraction of raw materials or the harvesting of products from the earth, such as mining, farming, fishing and forestry." },
  { term: "Secondary sector", definition: "Economic activity involving the manufacturing of finished or semi-finished goods from raw materials." },
  { term: "Tertiary sector", definition: "Economic activity involving the provision of services, such as banking, retail, health care and hospitality." },
  { term: "Quaternary sector", definition: "Economic activity based on knowledge and the movement of information, such as information technology, consultancy, research and development." },
  { term: "Entrepreneur", definition: "An individual who organizes, operates and assumes the risk of a business venture." },
  { term: "Entrepreneurship", definition: "The process of designing, launching and running a new business, typically involving innovation and risk-taking." },
];
const QUESTIONS = [
  // ---- Vocabulary ----
  { id: "v1", section: "vocab", label: "Vocabulary", num: 1, prompt: "Define the term business.", marks: 2,
    rubric: `Award 1 mark for a limited/partial definition; 2 marks for an accurate, precise definition. NO credit for examples or application — this is a pure definition question. Model answer: "an organization that produces or provides goods and/or services to meet customer needs or wants."` },
  { id: "v2", section: "vocab", label: "Vocabulary", num: 2, prompt: "Define the term primary sector.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "economic activity involving the extraction of raw materials or the harvesting of products from the earth, such as mining, farming, fishing and forestry."` },
  { id: "v3", section: "vocab", label: "Vocabulary", num: 3, prompt: "Define the term secondary sector.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "economic activity involving the manufacturing of finished or semi-finished goods from raw materials."` },
  { id: "v4", section: "vocab", label: "Vocabulary", num: 4, prompt: "Define the term tertiary sector.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "economic activity involving the provision of services, such as banking, retail, health care and hospitality."` },
  { id: "v5", section: "vocab", label: "Vocabulary", num: 5, prompt: "Define the term quaternary sector.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "economic activity based on knowledge and the movement of information, such as information technology, consultancy, research and development."` },
  { id: "v6", section: "vocab", label: "Vocabulary", num: 6, prompt: "Define the term entrepreneur.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "an individual who organizes, operates and assumes the risk of a business venture."` },
  { id: "v7", section: "vocab", label: "Vocabulary", num: 7, prompt: "Define the term entrepreneurship.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "the process of designing, launching and running a new business, typically involving innovation and risk-taking."` },

  // ---- Structured ----
  { id: "s8", section: "structured", label: "Structured", num: 8, prompt: "State two sectors of the economy in which Apple operates.", marks: 2,
    rubric: `Award 1 mark per correctly named sector present in the case (secondary — hardware manufacturing; tertiary/quaternary — retail, App Store, digital services). No development needed, pure identification.` },
  { id: "s9", section: "structured", label: "Structured", num: 9, prompt: "Describe two reasons why Jobs and Wozniak can be considered entrepreneurs.", marks: 4,
    rubric: `Mark as 2+2. For each reason: award 1 mark for identifying it (e.g. personal financial risk; identifying an opportunity; building an organization from nothing) and 1 further mark for developing it with case detail (e.g. they sold a Volkswagen van and a calculator to fund their first production run).` },
  { id: "s10", section: "structured", label: "Structured", num: 10, prompt: "Explain two reasons why Apple's growing Services revenue represents a shift toward the tertiary and quaternary sectors.", marks: 6,
    rubric: `Mark as 3+3 per reason: 1 mark identify (e.g. Services includes App Store/iCloud — knowledge/service based, not manufacturing), 1 mark explain why this counts as tertiary/quaternary rather than secondary activity, 1 mark for accurate application of case figures (Services revenue $109.16 billion, up 13.5% year on year, out of total revenue $416.16 billion).` },

  // ---- Essay ----
  { id: "e11", section: "essay", label: "Extended response", num: 11, prompt: "Discuss whether it is still accurate to classify Apple primarily as a secondary-sector business.", marks: 10,
    rubric: `Mark using the official IB markbands (0 / 1–2 / 3–4 / 5–6 / 7–8 / 9–10), reproduced below. A strong answer weighs secondary-sector evidence (hardware design/manufacturing remains central to iPhone/Mac) against the growing tertiary/quaternary share (Services revenue $109.16bn, +13.5% year on year, out of $416.16bn total) and reaches a balanced, well-substantiated judgment. To reach 7–8, the answer must genuinely develop BOTH sides with reasoning, not just assert one side. To reach 9–10, the answer must explicitly name a specific limitation of the case study material actually provided (e.g. the case gives no full segment-by-segment revenue breakdown, no data on the size of the primary-sector supply chain, or only a single year's figures with no trend over time) — a generic "the case has limitations" comment does not qualify. Any figures or claims not present in the case study context must not be credited as valid application, regardless of real-world accuracy.\n\nMARKBANDS:\n${MARKBANDS}` },
];
const VIDEO_1_2 = {
  id: "lZZyBurzy5o",
  title: "Apple Went Public 38 Years Ago in 1980",
  source: "CNBC",
};
const COMPREHENSION_QUESTIONS_1_2 = [
  { id: "c1", prompt: "According to the video, roughly how much money did Apple's 1980 IPO raise, and at what share price?",
    guidance: "Correct answer: Apple's IPO raised approximately $100–101 million, selling shares at $22 each. Accept close approximations (e.g. 'around $100 million', '$22 a share'). This is a quick comprehension check, not a formal exam question — be encouraging and lenient with a 'partial' verdict for close-but-incomplete answers." },
  { id: "c2", prompt: "According to the video, what effect did the IPO have on many Apple employees?",
    guidance: "Correct answer: it made many of them instant millionaires (commonly cited as around 40 Apple employees, out of roughly 300 people overall who became millionaires that day). Accept any answer that captures 'created (instant) millionaires among employees'. This is a quick comprehension check, not a formal exam question — be encouraging and lenient with a 'partial' verdict for close-but-incomplete answers." },
];
const CASE_TEXT_1_2 = `Apple was founded as a general partnership. Jobs and Wozniak each held a 45% stake; Wayne, the eldest of the three and the only one with meaningful personal assets, took the remaining 10% and drafted the founding partnership agreement. Just twelve days later, Wayne sold his 10% stake back to Jobs and Wozniak for $800. His stated reason illustrates a key disadvantage of the partnership form of business entity: under a general partnership, each partner has unlimited liability for the business's debts, and Wayne — who had already been through one bankruptcy from an earlier venture — feared his house, car and savings could be seized if Apple failed to pay a supplier or a loan.

In January 1977, Apple was formally incorporated, with early investor Mike Markkula providing $250,000 in funding. Incorporation converted Apple into a separate legal entity with limited liability for its owners — removing the exact risk that had driven Wayne away. Between incorporation in 1977 and its stock market listing in 1980, Apple was itself a privately held company, with shares owned by only a small number of founders, employees and early investors. On 12 December 1980, Apple went public, listing on the NASDAQ exchange and selling 4.6 million shares at $22 each, raising roughly $101 million and valuing the company at about $1.8 billion. Apple is today one of the world's largest publicly held companies. As a company owned by private shareholders rather than the state, Apple operates in the private sector of the economy; by contrast, organizations owned and funded by government — such as public universities or state postal services — operate in the public sector.

Other real businesses illustrate entity types not shown by Apple's own history. Apple's very first commercial customer, the Byte Shop in Mountain View, California — a single independent electronics retailer owned by Paul Terrell — placed the first order for 50 Apple I computers in 1976; a business like this, owned and run by one person with unlimited liability, is a classic sole trader. Fairphone, a Dutch company, designs smartphones using ethically sourced minerals and modular, repairable parts, trading for profit while pursuing a stated social mission — a for-profit social enterprise structured as a private sector company. Systembolaget, Sweden's state-owned alcohol retailer, is 100% government-owned, trades commercially, but its mission — set by public health policy, not profit — is to reduce alcohol-related harm: a public sector company operating as a for-profit social enterprise. REI, a large American outdoor-equipment retailer, is owned by its millions of members, who help set its direction and share its profits — a cooperative. Oxfam, an international NGO, works to reduce global poverty; as a non-profit social enterprise it has no owners to pay profit to, reinvesting any surplus into its programmes instead.`;
const FLASHCARD_TERMS_1_2 = [
  { term: "Private sector", definition: "The part of the economy owned and run by private individuals or businesses, generally aiming to make a profit." },
  { term: "Public sector", definition: "The part of the economy owned and controlled by government." },
  { term: "Sole trader", definition: "A business owned and operated by one person with unlimited liability." },
  { term: "Partnership", definition: "A business owned by two or more people who share risks, costs and profits, typically with unlimited liability." },
  { term: "Deed of partnership", definition: "A legal document, drawn up when a partnership is formed, that formalizes agreements such as how profits and losses will be shared between partners." },
  { term: "Unlimited liability", definition: "Owners are personally responsible for all business debts, risking personal assets." },
  { term: "Limited liability", definition: "Owners' liability for business debts is limited to the amount they invested." },
  { term: "Incorporation", definition: "The legal process of forming a company as a separate legal entity from its owners." },
  { term: "Shareholder", definition: "A person or organization that owns shares in a company, providing capital in exchange for part-ownership." },
  { term: "Privately held company", definition: "A company whose shares are owned by a limited number of shareholders and not traded publicly." },
  { term: "Publicly held company", definition: "A company whose shares are traded on a stock exchange and can be bought by the public." },
  { term: "For-profit social enterprise", definition: "A business that trades to address a social or environmental problem while also generating a profit." },
  { term: "Private sector company (social enterprise)", definition: "A for-profit social enterprise owned by private individuals or investors." },
  { term: "Public sector company (social enterprise)", definition: "A for-profit social enterprise owned or controlled by government, pursuing a public-policy mission rather than profit-maximization." },
  { term: "Cooperative", definition: "A business owned and democratically controlled by its members." },
  { term: "NGO / non-profit social enterprise", definition: "An organization independent of government that addresses social, humanitarian or environmental issues, reinvesting any surplus rather than distributing profit." },
];
const QUESTIONS_1_2 = [
  // ---- Vocabulary ----
  { id: "v1", section: "vocab", label: "Vocabulary", num: 1, prompt: "Define the term private sector.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "the part of the economy owned and run by private individuals or businesses, generally aiming to make a profit."` },
  { id: "v2", section: "vocab", label: "Vocabulary", num: 2, prompt: "Define the term public sector.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "the part of the economy owned and controlled by government."` },
  { id: "v3", section: "vocab", label: "Vocabulary", num: 3, prompt: "Define the term sole trader.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a business owned and operated by one person with unlimited liability."` },
  { id: "v4", section: "vocab", label: "Vocabulary", num: 4, prompt: "Define the term partnership.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a business owned by two or more people who share risks, costs and profits, typically with unlimited liability."` },
  { id: "v5", section: "vocab", label: "Vocabulary", num: 5, prompt: "Define the term unlimited liability.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "owners are personally responsible for all business debts, risking personal assets."` },
  { id: "v6", section: "vocab", label: "Vocabulary", num: 6, prompt: "Define the term limited liability.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "owners' liability for business debts is limited to the amount they invested."` },
  { id: "v7", section: "vocab", label: "Vocabulary", num: 7, prompt: "Define the term incorporation.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "the legal process of forming a company as a separate legal entity from its owners."` },
  { id: "v8", section: "vocab", label: "Vocabulary", num: 8, prompt: "Define the term privately held company.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a company whose shares are owned by a limited number of shareholders and not traded publicly."` },
  { id: "v9", section: "vocab", label: "Vocabulary", num: 9, prompt: "Define the term publicly held company.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a company whose shares are traded on a stock exchange and can be bought by the public."` },
  { id: "v10", section: "vocab", label: "Vocabulary", num: 10, prompt: "Define the term for-profit social enterprise.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a business that trades to address a social/environmental problem while also generating a profit."` },
  { id: "v11", section: "vocab", label: "Vocabulary", num: 11, prompt: "Define the term private sector company, as a type of social enterprise.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a for-profit social enterprise owned by private individuals/investors."` },
  { id: "v12", section: "vocab", label: "Vocabulary", num: 12, prompt: "Define the term public sector company, as a type of social enterprise.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a for-profit social enterprise owned/controlled by government, pursuing a public-policy mission rather than profit-maximization."` },
  { id: "v13", section: "vocab", label: "Vocabulary", num: 13, prompt: "Define the term cooperative.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a business owned and democratically controlled by its members."` },
  { id: "v14", section: "vocab", label: "Vocabulary", num: 14, prompt: "Define the term NGO / non-profit social enterprise.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "an organization independent of government addressing social, humanitarian or environmental issues, reinvesting surplus rather than distributing profit."` },
  { id: "v15", section: "vocab", label: "Vocabulary", num: 15, prompt: "Define the term deed of partnership.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a legal document, drawn up when a partnership is formed, that formalizes agreements such as how profits and losses will be shared between partners."` },
  { id: "v16", section: "vocab", label: "Vocabulary", num: 16, prompt: "Define the term shareholder.", marks: 2,
    rubric: `Award 1 mark limited / 2 marks accurate. No credit for examples. Model: "a person or organization that owns shares in a company, providing capital in exchange for part-ownership."` },

  // ---- Structured ----
  { id: "s17", section: "structured", label: "Structured", num: 17, prompt: "State two features of a general partnership.", marks: 2,
    rubric: `Award 1 mark per correct feature (e.g. owned by two or more partners; typically unlimited liability; profits/losses/decisions shared; formalized by a deed of partnership; no separate legal identity from its owners). No development needed, pure identification.` },
  { id: "s18", section: "structured", label: "Structured", num: 18, prompt: "Describe one advantage and one disadvantage of unlimited liability for a business owner.", marks: 4,
    rubric: `Mark as 2+2. For the advantage: award 1 mark for identifying it (e.g. no separate legal registration needed; simpler business structure; owner keeps direct/full control) and 1 mark for developing it. For the disadvantage: award 1 mark for identifying it (e.g. personal assets — house, car, savings — are at risk if the business cannot pay its debts) and 1 mark for developing it, ideally referencing Wayne's decision to leave Apple's partnership for this exact reason.` },
  { id: "s19", section: "structured", label: "Structured", num: 19, prompt: "Explain two advantages Apple gained by converting from a partnership into an incorporated, publicly held company.", marks: 6,
    rubric: `Mark as 3+3 per advantage: 1 mark identify (e.g. limited liability for owners; access to significant capital via share sales), 1 mark explain the mechanism, 1 mark apply accurately to the case (e.g. the 1980 IPO raised roughly $101 million; limited liability directly removed the risk that drove Wayne away in 1976). No credit for advantages not grounded in the case.` },

  // ---- Paper 2–style mini-scenario ----
  { id: "s20a", section: "structured", label: "Structured", num: "20(a)", prompt: "State two features of a publicly held company.", marks: 2,
    rubric: `Award 1 mark per correct feature of a publicly held company (e.g. shares traded on a stock exchange; owned by many shareholders/the general public; no prior permission needed from other shareholders to sell shares; subject to greater regulation/disclosure).` },
  { id: "s20b", section: "structured", label: "Structured", num: "20(b)", prompt: "Using the case (Apple's IPO raised approximately $101 million and valued the company at approximately $1.8 billion immediately afterward), calculate the percentage of Apple's post-IPO valuation that was raised through the share sale. Show all your working.", marks: 3,
    rubric: `101 ÷ 1,800 × 100 ≈ 5.6%. Award 1 mark for correct method/setup, 1 mark for correct substitution of the case figures, 1 mark for a correct final answer expressed as a percentage. Accept a final answer in the range 5.5–5.7% with correct working shown. Award full marks for correct working even if the final % is mis-rounded, provided the method and substitution are both correct.` },
  { id: "s20c", section: "structured", label: "Structured", num: "20(c)", prompt: "Explain one advantage to Apple's early investors of the company becoming a publicly held company.", marks: 2,
    rubric: `Award 1 mark for identifying a valid advantage (e.g. ability to sell their shares on the stock exchange / exit their investment; increased company credibility/valuation; access to a liquid market for their shares) and 1 mark for developing it with reference to the case.` },

  // ---- Essay ----
  { id: "e21", section: "essay", label: "Extended response", num: 21, prompt: "Recommend whether the founders of a promising new technology start-up should structure their business as a partnership or move quickly toward incorporation.", marks: 10,
    rubric: `Mark using the official IB markbands (0 / 1–2 / 3–4 / 5–6 / 7–8 / 9–10), reproduced below. A strong answer weighs the simplicity and low cost of a partnership against the unlimited-liability risk it carries (illustrated by Wayne's exit from Apple's founding partnership over exactly this risk), against incorporation's benefits of limited liability and improved access to capital (illustrated by Apple raising ≈$250,000 from Mike Markkula upon incorporating, and later ≈$101 million at IPO) — and reaches a balanced, well-substantiated recommendation. To reach 7–8, the answer must genuinely develop BOTH sides with reasoning, not just assert one side. To reach 9–10, the answer must explicitly name a specific limitation of the case study material actually provided (e.g. the case gives no detail on incorporation's legal/administrative costs, no data on how much equity a founder would need to give up to secure funding, or only Apple's specific circumstances rather than start-ups in general) — a generic "the case has limitations" comment does not qualify. Any figures or claims not present in the case study context must not be credited as valid application, regardless of real-world accuracy.\n\nMARKBANDS:\n${MARKBANDS}` },
];

// ============================================================
// SUBUNIT REGISTRY — ties each subunit's data together. Practice/Terms
// components read from here (keyed by whichever subunit is active) instead
// of assuming 1.1's globals directly, so adding 1.3–1.6 later is just adding
// another entry here — no component code needs to change.
//
// NOTE: content is embedded directly here (not loaded from storage) because
// window.storage is scoped per-artifact — a separate "seeder" artifact can
// never share storage with this one, so there's no way to keep this file
// small by moving content elsewhere. If this file's size becomes a problem
// again as more subunits are added, the real fix is trimming code/comments
// or restructuring into genuinely separate artifacts (accepting that XP/
// profile would then need its own cross-artifact solution too) — not
// storage-based content loading, which cannot work here.
// ============================================================
const SUBUNIT_REGISTRY = {
  "1.1": {
    title: "What is a business?",
    video: VIDEO,
    comprehensionQuestions: COMPREHENSION_QUESTIONS,
    caseText: CASE_TEXT,
    questions: QUESTIONS,
    flashcardTerms: FLASHCARD_TERMS,
  },
  "1.2": {
    title: "Types of business entities",
    video: VIDEO_1_2,
    comprehensionQuestions: COMPREHENSION_QUESTIONS_1_2,
    caseText: CASE_TEXT_1_2,
    questions: QUESTIONS_1_2,
    flashcardTerms: FLASHCARD_TERMS_1_2,
  },
};
const SUBUNIT_TITLES = Object.fromEntries(Object.entries(SUBUNIT_REGISTRY).map(([id, s]) => [id, s.title]));
const SUBUNIT_CONTENT_IDS = Object.keys(SUBUNIT_REGISTRY);

function checkNewBadges(profile) {
  const have = new Set(profile.badgeIds || []);
  const newly = [];
  for (const b of BADGES) {
    if (!have.has(b.id) && b.check(profile)) { newly.push(b); have.add(b.id); }
  }
  return { newly, badgeIds: Array.from(have) };
}
// ============================================================
// END shared learner profile section
// ============================================================


// ============================================================
// Grading calls
// ============================================================
// Retries a fetch to the Anthropic API on rate-limit (429) or transient server errors
// (5xx), with a short exponential backoff — most rate limits are momentary, so a
// couple of automatic retries gives a request a real chance to succeed on its own
// before the user ever sees an error, instead of failing on the very first hiccup.
async function fetchWithRetry(body, { maxAttempts = 3 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = 1500 * Math.pow(2, attempt - 1); // 1.5s, then 3s
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Service temporarily unavailable (${response.status}).`);
        continue; // worth retrying
      }
      // Any other error (4xx besides 429) won't be fixed by retrying.
      throw new Error("Grading service returned an error.");
    } catch (err) {
      // The Claude.ai artifact sandbox itself (not the Anthropic API) can block this fetch
      // outright when the account/session has hit its own message/usage limit — this shows
      // up as a thrown error like "Message rate limit exceeded. Reload to continue." rather
      // than a normal 429 response. That's an account-level block, not a momentary server
      // hiccup, so retrying with backoff just delays showing the same unavoidable message —
      // fail immediately instead, with wording that points at the real fix (reload/wait).
      if (err && typeof err.message === "string" && /rate limit/i.test(err.message)) {
        throw new Error(err.message.includes("Reload") ? err.message : `${err.message} Try reloading the page in a moment.`);
      }
      lastError = err;
    }
  }
  throw lastError || new Error("Grading service returned an error.");
}

async function gradeComprehension(question, answerText, video) {
  const prompt = `You are a friendly IB Business Management teacher checking a student's understanding of a short video they just watched (this is a warm-up comprehension check, NOT a formal exam question — keep it low-stakes and encouraging).

VIDEO: "${video.title}" (${video.source}).

QUESTION: ${question.prompt}

GUIDANCE: ${question.guidance}

STUDENT'S ANSWER:
"""
${answerText || "(no answer given)"}
"""

Respond with ONLY a JSON object, no markdown fences, no preamble, in exactly this shape:
{"status": "correct" | "partial" | "incorrect", "feedback": "<one encouraging sentence confirming or correcting, in a friendly teacher voice>"}`;

  const response = await fetchWithRetry({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("No feedback text returned.");
  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!["correct", "partial", "incorrect"].includes(parsed.status) || typeof parsed.feedback !== "string") {
    throw new Error("Unexpected feedback format.");
  }
  return parsed;
}

async function gradeAnswer(question, answerText, caseText) {
  const isEssay = question.section === "essay";
  const prompt = `You are an experienced IB Business Management examiner marking one student's answer during practice (not a real exam). You are fair and encouraging in tone, but rigorous and strict in application of the marking guidance — accuracy of marking matters more than being generous.

CASE STUDY CONTEXT (Apple Inc., Unit 1) — this is the ONLY source of factual/case information the student may draw on:
${caseText}

QUESTION (worth ${question.marks} marks): ${question.prompt}

MARKING GUIDANCE FOR THIS QUESTION:
${question.rubric}

STRICT MARKING RULES (apply these without exception):
1. Application/case-material marks may ONLY be awarded for facts, figures, dates, or claims that actually appear in the CASE STUDY CONTEXT above. If the student states a statistic, fact or detail that is NOT in the case study context (including invented, misremembered, or outside-knowledge figures — even if factually true in the real world), do NOT credit it as valid application. Explicitly note in your feedback that this specific point could not be credited because it is not supported by the case study provided.
2. Do not award marks for vague gestures at "using the case" — the student must cite a specific, correct detail from the case study context above for application credit.
${isEssay ? `3. This is a 10-mark extended response marked on IB markbands. Apply these thresholds strictly:
   - Marks of 7–8 require the response to show REAL balance: both sides of the argument must be genuinely developed with supporting reasoning, not just one dominant side with a token sentence acknowledging the other view.
   - Marks of 9–10 additionally require an EXPLICIT, SPECIFIC discussion of the limitations of the case study material actually provided (e.g., naming what data is missing, dated, one-sided, or insufficient to fully answer the question). A generic, non-specific comment like "the case study has limitations" does NOT qualify — the student must say what the limitation actually is.
   - If the response only presents one side of the argument, cap the mark at 6 regardless of how well-written it is.
   - If the response does not explicitly discuss case study limitations with specifics, do not award 9 or 10, even if everything else is strong — cap at 8.` : "3. Application and analysis command terms (Explain, Describe) still require specific case detail, not just correct theory in the abstract."}

STUDENT'S ANSWER:
"""
${answerText || "(no answer given)"}
"""

Mark the answer strictly according to the marking guidance and rules above. Your feedback must always include a genuine note of encouragement calibrated to the score — celebrate strong work warmly; for low or zero scores, stay supportive and motivating (never harsh or discouraging) while still being precise and honest about what was missing, including explicitly flagging any fabricated or unsupported case claims. Respond with ONLY a JSON object and nothing else — no markdown fences, no preamble — in exactly this shape:
{"score": <integer 0 to ${question.marks}>, "feedback": "<2-3 sentences in examiner voice: an encouraging opening note, then state clearly what was awarded and why, explicitly noting any unsupported/fabricated claims that could not be credited>", "tip": "<one short, specific, actionable sentence — a single key takeaway or top tip the student can apply next time to improve, distinct from the feedback above>"}`;

  const response = await fetchWithRetry({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });
  if (!response.ok) throw new Error("Grading service returned an error.");
  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("No feedback text returned.");
  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.score !== "number" || typeof parsed.feedback !== "string") {
    throw new Error("Unexpected feedback format.");
  }
  return {
    score: Math.max(0, Math.min(question.marks, Math.round(parsed.score))),
    feedback: parsed.feedback,
    tip: typeof parsed.tip === "string" ? parsed.tip : "",
  };
}

// ============================================================
// Ruled-paper textarea
// ============================================================
function RuledTextarea({ value, onChange, disabled, rows, color }) {
  const lineHeight = 28;
  const textareaRef = useRef(null);

  // Auto-grow to fit content instead of scrolling internally. With no internal scroll,
  // there's nothing for the ruled-line background to fall out of sync with — it only
  // ever needs to be correct for the box's own full (unscrolled) height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const minHeight = rows * lineHeight;
    el.style.height = "auto";
    el.style.height = Math.max(minHeight, el.scrollHeight) + "px";
  }, [value, rows]);

  return (
    <div
      className="w-full rounded-md border overflow-hidden"
      style={{ borderColor: "#d6d0c4", paddingTop: 8, paddingLeft: 12, paddingRight: 12, paddingBottom: 0 }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        placeholder="Write your answer here…"
        className="block w-full bg-transparent text-[15px] text-stone-800 placeholder-stone-400 focus:outline-none disabled:text-stone-500"
        style={{
          lineHeight: `${lineHeight}px`,
          padding: 0,
          margin: 0,
          border: "none",
          boxShadow: "none",
          overflow: "hidden",
          resize: "none",
          // Padding is zero here (all inset is on the wrapper above) so there is no
          // padding-box/content-box ambiguity in where the ruled pattern starts.
          backgroundImage: `repeating-linear-gradient(white, white ${lineHeight - 1}px, #e4ded2 ${lineHeight - 1}px, #e4ded2 ${lineHeight}px)`,
        }}
        onFocus={(e) => (e.target.parentElement.style.boxShadow = `0 0 0 3px ${color}33`)}
        onBlur={(e) => (e.target.parentElement.style.boxShadow = "none")}
      />
    </div>
  );
}

function linesForMarks(marks) {
  const map = { 2: 3, 4: 4, 6: 6, 10: 12 };
  return map[marks] || 4;
}

// ============================================================
// Video + comprehension check (shown first, before graded questions)
// ============================================================
function ComprehensionCard({ question, state, onChangeAnswer, onSubmit, savedPulse }) {
  const st = state || { answer: "", status: "idle" };
  const isChecked = st.status === "checked";
  const isLoading = st.status === "loading";
  const isError = st.status === "error";

  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (!savedPulse) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [savedPulse]);

  const statusStyle = {
    correct: { bg: "#EAF7EE", border: "#2F8F4E", text: "#1F6B39", icon: CheckCircle2, label: "Correct" },
    partial: { bg: "#FDF6E8", border: "#B7791F", text: "#8A5A12", icon: AlertCircle, label: "Partially correct" },
    incorrect: { bg: "#FCEEEE", border: "#B3261E", text: "#8a2420", icon: AlertCircle, label: "Not quite" },
  };
  const verdict = isChecked ? statusStyle[st.verdict] : null;

  return (
    <div className="mb-4 rounded-lg border bg-white px-4 py-4" style={{ borderColor: "#e7e2d8" }}>
      <p className="text-[15px] text-stone-800 leading-snug mb-2">{question.prompt}</p>
      <RuledTextarea
        value={st.answer}
        onChange={(v) => onChangeAnswer(question.id, v)}
        disabled={isChecked || isLoading}
        rows={2}
        color={VIDEO_COLOR}
      />
      <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
        <div className="text-[12px] text-stone-400 flex items-center gap-1.5">
          Quick check — not a scored exam question.
          {showSaved && !isChecked && (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 size={12} /> Draft saved
            </span>
          )}
        </div>
        {!isChecked && (
          <button
            onClick={() => onSubmit(question)}
            disabled={isLoading || !st.answer || !st.answer.trim()}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40 transition"
            style={{ backgroundColor: isError ? "#B3261E" : VIDEO_COLOR }}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : isError ? <RefreshCw size={14} /> : <Send size={14} />}
            {isLoading ? "Checking…" : isError ? "Retry" : "Check answer"}
          </button>
        )}
      </div>
      {isError && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{st.errorMsg || "Something went wrong. Please try again."}</span>
        </div>
      )}
      {isChecked && verdict && (
        <div className="mt-3 flex items-start gap-2 rounded-md border px-3 py-2" style={{ backgroundColor: verdict.bg, borderColor: verdict.border }}>
          <verdict.icon size={16} style={{ color: verdict.border }} className="mt-0.5 shrink-0" />
          <div>
            <div className="text-[12px] font-semibold" style={{ color: verdict.text }}>{verdict.label}</div>
            <p className="text-[13.5px]" style={{ color: verdict.text }}>{st.feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoSection({ compState, onChangeAnswer, onSubmit, unlocked, savedPulses, video, comprehensionQuestions }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="mb-6" id="stage-discover">
      <div className="mb-3 rounded-md px-3 py-2 text-white" style={{ backgroundColor: VIDEO_COLOR }}>
        <div className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide">
          <PlayCircle size={15} /> Stage 1 · Discover
        </div>
        <div className="text-[11.5px] text-white/85">
          {unlocked
            ? "A short video for real-world context, then some quick comprehension checks."
            : "Watch the video, then answer both checks below to unlock the case study and questions."}
        </div>
      </div>

      <div className="mb-4 rounded-lg border bg-white p-3" style={{ borderColor: "#e7e2d8" }}>
        {playing ? (
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", backgroundColor: "#000" }}>
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
              title={video.title}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group block w-full text-left"
            style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", backgroundColor: "#000", display: "block" }}
          >
            <img
              src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
              alt={video.title}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" }}
              className="transition group-hover:bg-black/40"
            >
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-lg">
                <PlayCircle size={20} style={{ color: VIDEO_COLOR }} />
                <span className="text-[13px] font-semibold" style={{ color: VIDEO_COLOR }}>Play video</span>
              </div>
            </div>
          </button>
        )}
        <div className="mt-2 flex items-center justify-between flex-wrap gap-2 text-[12px] text-stone-500">
          <span>{video.title} · {video.source}</span>
        </div>
      </div>

      {comprehensionQuestions.map((q) => (
        <ComprehensionCard key={q.id} question={q} state={compState[q.id]} onChangeAnswer={onChangeAnswer} onSubmit={onSubmit} savedPulse={savedPulses?.["comp:" + q.id]} />
      ))}

      {!unlocked && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-[13px]" style={{ borderColor: VIDEO_COLOR, backgroundColor: "#F5F1FA", color: VIDEO_COLOR }}>
          <Lock size={15} className="shrink-0" />
          Answer both comprehension checks above to unlock the reading and practice questions below.
        </div>
      )}
      {unlocked && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-[13px]" style={{ borderColor: "#2F8F4E", backgroundColor: "#EAF7EE", color: "#1F6B39" }}>
          <CheckCircle2 size={15} className="shrink-0" />
          Nice work — the case study and practice questions are unlocked below.
        </div>
      )}
    </div>
  );
}



// ============================================================
// BM AI Bot — a small per-question follow-up chat attached to feedback,
// so students can ask "why?" instead of just reading a verdict.
// ============================================================
const BOT_COLOR = "#2C6E8F";
const BOT_STARTERS = [
  "Why did I lose marks?",
  "Show me a full-mark example",
  "Explain this in simpler terms",
];

function FeedbackChat({ question, answerText, score, feedback, tip, caseText }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const askBot = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || loading) return;
    const history = messages.map((m) => `${m.role === "user" ? "Student" : "BM AI Bot"}: ${m.text}`).join("\n");
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const prompt = `You are "BM AI Bot", a friendly, encouraging IB Business Management tutor helping a student understand feedback they just received on a practice question. Be concise (2-4 sentences unless they explicitly ask for more detail), warm, and precise — grounded only in the case study context and marking guidance below; never invent facts not in the case. If asked for a "full mark" example answer, give a short model-style one consistent with the marking guidance.

CASE STUDY CONTEXT (Apple Inc., Unit 1):
${caseText}

QUESTION (worth ${question.marks} marks): ${question.prompt}
MARKING GUIDANCE: ${question.rubric}

STUDENT'S ORIGINAL ANSWER: """${answerText || "(no answer given)"}"""
SCORE AWARDED: ${score}/${question.marks}
FEEDBACK ALREADY GIVEN: ${feedback}
TIP ALREADY GIVEN: ${tip || "(none)"}

${history ? `CONVERSATION SO FAR:\n${history}\n\n` : ""}Student's new message: "${trimmed}"

Respond as BM AI Bot in plain conversational text (not JSON, no markdown headers) — 2 to 4 sentences, encouraging and precise.`;

      const response = await fetchWithRetry({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      });
      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      const botText = textBlock ? textBlock.text.trim() : "Sorry, I couldn't generate a response just now.";
      setMessages((m) => [...m, { role: "bot", text: botText }]);
    } catch (err) {
      setError(err.message || "Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium hover:underline"
        style={{ color: BOT_COLOR }}
      >
        <MessageCircle size={13} /> Ask BM AI Bot about this feedback
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border overflow-hidden" style={{ borderColor: BOT_COLOR }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: BOT_COLOR }}>
        <div className="flex items-center gap-1.5 text-white text-[12px] font-semibold">
          <Bot size={14} /> BM AI Bot
        </div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="bg-white p-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {BOT_STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => askBot(s)}
                className="text-[11.5px] px-2.5 py-1 rounded-full border hover:bg-stone-50"
                style={{ borderColor: BOT_COLOR, color: BOT_COLOR }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-2 mb-3" style={{ maxHeight: 260, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <span
                  className="inline-block px-3 py-1.5 rounded-lg text-[13px] leading-snug"
                  style={{
                    maxWidth: "85%",
                    backgroundColor: m.role === "user" ? "#EAF1F8" : "#F0F5F7",
                    color: "#33302a",
                    textAlign: "left",
                  }}
                >
                  {m.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-1.5 text-[12px] text-stone-400 mb-3">
            <Loader2 size={12} className="animate-spin" /> BM AI Bot is typing…
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[12.5px] text-red-700 mb-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") askBot(input); }}
            disabled={loading}
            placeholder="Ask a follow-up…"
            className="flex-1 rounded-md border px-3 py-1.5 text-[13px] focus:outline-none focus-visible:ring-2 disabled:bg-stone-50"
            style={{ borderColor: "#d6d0c4", "--tw-ring-color": BOT_COLOR }}
          />
          <button
            onClick={() => askBot(input)}
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: BOT_COLOR }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ question, state, onChangeAnswer, onSubmit, onEditAgain, savedPulse, caseText }) {
  const theme = SECTION_THEME[question.section];
  const st = state || { answer: "", status: "idle" };
  const isGraded = st.status === "graded";
  const isLoading = st.status === "loading";
  const isError = st.status === "error";

  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (!savedPulse) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [savedPulse]);

  return (
    <div
      className="mb-5 rounded-lg border bg-white overflow-hidden"
      style={{ borderColor: "#e7e2d8" }}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <div
          className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full text-[13px] font-semibold text-white shrink-0"
          style={{ backgroundColor: theme.color, fontFamily: "'Lora', serif" }}
        >
          {question.num}
        </div>
        <div className="flex-1">
          <p className="text-[15px] text-stone-800 leading-snug">
            {question.prompt}{" "}
            <span
              className="ml-1 rounded px-1.5 py-0.5 text-[12px] font-semibold text-white align-middle"
              style={{ backgroundColor: theme.color, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
            >
              [{question.marks}]
            </span>
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <RuledTextarea
          value={st.answer}
          onChange={(v) => onChangeAnswer(question.id, v)}
          disabled={isGraded || isLoading}
          rows={linesForMarks(question.marks)}
          color={theme.color}
        />

        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
          <div className="text-[12px] text-stone-400 flex items-center gap-1.5">
            {isGraded ? "Answer locked — edit to try again." : "Answer, then submit for feedback."}
            {showSaved && !isGraded && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 size={12} /> Draft saved
              </span>
            )}
          </div>
          {!isGraded && (
            <button
              onClick={() => onSubmit(question)}
              disabled={isLoading || !st.answer || !st.answer.trim()}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40 transition"
              style={{ backgroundColor: isError ? "#B3261E" : theme.color }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : isError ? <RefreshCw size={14} /> : <Send size={14} />}
              {isLoading ? "Marking…" : isError ? "Retry" : "Submit for feedback"}
            </button>
          )}
          {isGraded && (
            <button
              onClick={() => onEditAgain(question.id)}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium border transition hover:bg-stone-50"
              style={{ borderColor: theme.color, color: theme.color }}
            >
              <Pencil size={13} /> Edit answer
            </button>
          )}
        </div>

        {isError && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{st.errorMsg || "Something went wrong while marking. Please try again."}</span>
          </div>
        )}

        {isGraded && (() => {
          const tier = scoreTier(st.score, question.marks);
          const c = TIER_STYLE[tier];
          return (
            <>
              <div className="mt-3 flex gap-3 rounded-md border-l-4 px-3 py-3" style={{ borderColor: c.border, backgroundColor: c.bg }}>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-bold"
                  style={{ borderColor: c.border, color: c.border, fontFamily: "'Lora', serif" }}
                >
                  {st.score}/{question.marks}
                </div>
                <p className="text-[14px] leading-snug italic pt-1" style={{ color: c.text, fontFamily: "'Lora', serif" }}>
                  {st.feedback}
                </p>
              </div>
              {st.tip && (
                <div className="mt-2 flex gap-2 rounded-md border px-3 py-2.5" style={{ borderColor: TIP_BLUE, backgroundColor: TIP_BLUE_BG }}>
                  <Sparkles size={15} style={{ color: TIP_BLUE }} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: TIP_BLUE }}>Key takeaway for next time</div>
                    <p className="text-[13.5px] leading-snug" style={{ color: TIP_BLUE }}>{st.tip}</p>
                  </div>
                </div>
              )}
              <FeedbackChat question={question} answerText={st.answer} score={st.score} feedback={st.feedback} tip={st.tip} caseText={caseText} />
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
// ============================================================
// Section completion chips ("quest tracker") — quick visual status per section
// ============================================================
// ============================================================
// Learner profile bar — Level + XP progress + earned badges (holistic, cross-subunit)
// ============================================================
function LearnerProfileBar({ profile, levelInfo }) {
  const earnedBadges = BADGES.filter((b) => (profile.badgeIds || []).includes(b.id));
  const [expandedId, setExpandedId] = useState(null);
  return (
    <div className="mb-5 rounded-lg border bg-white px-4 py-3" style={{ borderColor: "#e7e2d8" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: GOLD }}
          >
            <Trophy size={17} />
          </div>
          <div>
            <div className="text-[13.5px] font-bold" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
              {levelInfo.name}
            </div>
            <div className="text-[11px] text-stone-500">{profile.xp || 0} XP total · {levelInfo.nextThreshold - levelInfo.xp} XP to next level</div>
          </div>
        </div>
        <div className="flex-1 min-w-[120px] max-w-[220px]">
          <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${levelInfo.percent}%`, backgroundColor: GOLD }} />
          </div>
        </div>
      </div>
      {earnedBadges.length > 0 && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: "#f0ede5" }}>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map((b) => (
              <button
                key={b.id}
                type="button"
                title={b.desc}
                onClick={() => setExpandedId((prev) => (prev === b.id ? null : b.id))}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition hover:opacity-80"
                style={{ backgroundColor: expandedId === b.id ? "#F2DFA8" : "#FBF4E2", color: "#8A5A12" }}
              >
                <Award size={12} /> {b.name}
              </button>
            ))}
          </div>
          {expandedId && (
            <div className="mt-2 rounded-md px-3 py-2 text-[12.5px]" style={{ backgroundColor: "#FBF4E2", color: "#8A5A12" }}>
              <strong>{earnedBadges.find((b) => b.id === expandedId)?.name}:</strong> {earnedBadges.find((b) => b.id === expandedId)?.desc}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Simple entrance-animation wrapper (fade + slight rise, no keyframes needed)
// ============================================================
function FadeIn({ children, className = "", delayMs = 0, style = {} }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs || 10);
    return () => clearTimeout(t);
  }, [delayMs]);
  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease-out",
        // NOTE: deliberately opacity-only, no transform. A `transform` on any ancestor
        // (even a no-op translateY(0)) silently disables `position: sticky` on descendants —
        // this wrapper contains the sticky Reading panel, so it must stay transform-free.
      }}
    >
      {children}
    </div>
  );
}

function LevelUpToast({ levelName }) {
  if (!levelName) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <FadeIn className="flex items-center gap-3 rounded-full border-2 bg-white px-5 py-2.5 shadow-xl" style={{ borderColor: GOLD }}>
        <Trophy size={20} style={{ color: GOLD }} />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>Congratulations — level up!</div>
          <div className="text-[14px] font-semibold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>You've reached {levelName}</div>
        </div>
      </FadeIn>
    </div>
  );
}

function BadgeToast({ badges, onDismiss }) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" style={{ maxWidth: 300 }}>
      {badges.map((b, i) => (
        <FadeIn key={b.id} delayMs={i * 120} className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg" style={{ borderColor: GOLD }}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: GOLD }}>
            <Award size={16} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>Badge unlocked</div>
            <div className="text-[13px] font-semibold text-stone-800">{b.name}</div>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

// ============================================================
// Completion summary — shown once every stage in the subunit is done
// ============================================================
function CompletionCard({ stats, profile, levelInfo }) {
  const rows = [
    { label: "Vocabulary", ...stats.bySection.vocab },
    { label: "Structured", ...stats.bySection.structured },
    { label: "Essay", ...stats.bySection.essay },
  ];
  return (
    <FadeIn className="mb-6 rounded-lg border-2 overflow-hidden" style={{ borderColor: GOLD }}>
      <div className="px-5 py-4 text-white" style={{ backgroundColor: "#15396B" }}>
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-white/80">
          <Trophy size={14} /> Subunit complete
        </div>
        <h2 className="text-[20px] font-semibold mt-0.5" style={{ fontFamily: "'Lora', serif" }}>
          Well done — you've finished 1.1!
        </h2>
      </div>
      <div className="bg-white px-5 py-4">
        <table className="w-full text-[13.5px]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b" style={{ borderColor: "#f0ede5" }}>
                <td className="py-1.5 text-stone-600">{r.label}</td>
                <td className="py-1.5 text-right font-semibold text-stone-800">{r.earned}/{r.possible} marks</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5 font-semibold text-stone-800">Overall</td>
              <td className="py-1.5 text-right font-bold" style={{ color: GOLD }}>
                {stats.earned}/{stats.possible} marks ({stats.possible > 0 ? Math.round((stats.earned / stats.possible) * 100) : 0}%)
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-2 rounded-md px-3 py-2.5" style={{ backgroundColor: "#FBF4E2" }}>
          <Trophy size={16} style={{ color: GOLD }} />
          <div className="text-[13px]" style={{ color: "#8A5A12" }}>
            You're now <strong>{levelInfo.name}</strong> with <strong>{profile.xp || 0} XP</strong> — including a +{XP_SUBUNIT_COMPLETE_BONUS} XP completion bonus.
          </div>
        </div>
        <p className="mt-3 text-[13px] text-stone-500">
          More subunits (1.2–1.6) are coming soon — your level and badges will carry over automatically.
        </p>
      </div>
    </FadeIn>
  );
}


function SectionChips({ stats, currentStage, onSelectStage }) {
  const chips = [
    { key: "discover", label: "Discover", Icon: PlayCircle, color: VIDEO_COLOR, done: stats.compDone, total: stats.compTotal },
    { key: "build", label: "Build", Icon: BookOpen, color: SECTION_THEME.vocab.color, done: stats.bySection?.vocab.done ?? 0, total: stats.bySection?.vocab.total ?? 0 },
    { key: "apply", label: "Apply", Icon: Pencil, color: SECTION_THEME.structured.color, done: stats.bySection?.structured.done ?? 0, total: stats.bySection?.structured.total ?? 0 },
    { key: "master", label: "Master", Icon: Send, color: SECTION_THEME.essay.color, done: stats.bySection?.essay.done ?? 0, total: stats.bySection?.essay.total ?? 0 },
  ];
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {chips.map((c) => {
        const complete = c.total > 0 && c.done >= c.total;
        const locked = isStageLocked(c.key, stats);
        const active = currentStage === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => !locked && onSelectStage(c.key)}
            disabled={locked}
            title={locked ? "Complete the previous stage first" : `Go to ${c.label}`}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition"
            style={{
              borderColor: locked ? "#e0dcd2" : active ? c.color : complete ? c.color : "#d6d0c4",
              backgroundColor: active ? c.color : complete ? `${c.color}14` : "white",
              color: locked ? "#b3aca0" : active ? "white" : complete ? c.color : "#57534e",
              cursor: locked ? "not-allowed" : "pointer",
            }}
          >
            {complete ? <CheckCircle2 size={13} /> : <c.Icon size={13} />}
            {c.label}
            <span className="opacity-80">{locked ? "🔒" : `${c.done}/${c.total}`}</span>
          </button>
        );
      })}
    </div>
  );
}



// ============================================================
// FLASHCARDS view (Terms mode) — flip term/definition, self-paced, no grading
// ============================================================
const TERMS_STORAGE_KEY = "bm-apple-1.1:terms-reviewed";

function FlashCard({ term, definition, flipped, onFlip }) {
  return (
    <button
      type="button"
      onClick={onFlip}
      style={{ perspective: 1200, cursor: "pointer", height: 260 }}
      className="w-full select-none block text-left bg-transparent border-0 p-0 m-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2E8B84]"
      aria-pressed={flipped}
      aria-label={flipped ? `${term} — definition shown. Press to flip back to the term.` : `${term} — press to reveal the definition.`}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transition: "transform 0.5s",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: 12,
            border: "1px solid #e7e2d8",
            backgroundColor: "white",
          }}
          className="flex flex-col items-center justify-center px-6 text-center"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#2E8B84" }}>Term</div>
          <div className="text-[24px] font-semibold" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>{term}</div>
          <div className="text-[12px] text-stone-400 mt-6">Tap to reveal definition</div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 12,
            border: "1px solid #2E8B84",
            backgroundColor: "#EAF5F4",
          }}
          className="flex flex-col items-center justify-center px-8 text-center"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#2E8B84" }}>Definition</div>
          <div className="text-[16px] leading-relaxed text-stone-700">{definition}</div>
          <div className="text-[12px] text-stone-400 mt-6">Tap to flip back</div>
        </div>
      </div>
    </button>
  );
}

function shuffleIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================
// STUDY interactives
// ============================================================
const STUDY_COLOR = "#8B3A4A";
const STUDY_LIGHT = "#F7ECEE";

// ============================================================
// UNIT MAP — top-level, game-style path of subunits + a final Revision node.
// Only 1.1 has real content built so far; the rest are locked "coming soon" nodes.
// ============================================================
const UNIT_SUBUNITS = [
  { id: "1.1", title: "What is a business?", unlocked: true },
  { id: "1.2", title: "Types of business entities", unlocked: false },
  { id: "1.3", title: "Business objectives", unlocked: false },
  { id: "1.4", title: "Stakeholders", unlocked: false },
  { id: "1.5", title: "Growth and evolution", unlocked: false },
  { id: "1.6", title: "Multinational companies", unlocked: false },
];

const STUDY_SECTION_META_1_1 = [
  { key: "business", title: "What is a business?", Icon: Building2 },
  { key: "sectors", title: "Business sectors & the chain of production", Icon: Factory },
  { key: "entrepreneurship", title: "Entrepreneurship", Icon: Lightbulb },
  { key: "reasons", title: "Why start a business?", Icon: TrendingUp },
];
const STUDY_SECTION_META_1_2 = [
  { key: "sector-split", title: "Private vs. public sector", Icon: Building2 },
  { key: "entity-liability", title: "Sole traders & partnerships", Icon: Factory },
  { key: "companies", title: "Privately held vs. publicly held companies", Icon: TrendingUp },
  { key: "forprofit-social", title: "For-profit social enterprises", Icon: Lightbulb },
  { key: "coop-ngo", title: "Cooperatives & NGOs", Icon: Award },
  { key: "entity-choice", title: "Choosing the right structure", Icon: Pencil },
];
const STUDY_SECTION_META_BY_SUBUNIT = {
  "1.1": STUDY_SECTION_META_1_1,
  "1.2": STUDY_SECTION_META_1_2,
};

const STUDY_PROGRESS_KEY = "bm-apple-1.1:study-progress";

// Small, original decorative illustrations — no external images, so nothing to break.
function StudyIllustration({ variant }) {
  const common = { viewBox: "0 0 200 90", style: { width: "100%", height: 90 } };
  if (variant === "business") {
    return (
      <svg {...common}>
        <rect x="10" y="40" width="34" height="34" rx="3" fill={STUDY_LIGHT} stroke={STUDY_COLOR} />
        <text x="27" y="61" textAnchor="middle" fontSize="11" fill={STUDY_COLOR}>IN</text>
        <path d="M48 57 L82 57" stroke={STUDY_COLOR} strokeWidth="2" markerEnd="url(#arrow)" />
        <circle cx="100" cy="57" r="20" fill={STUDY_LIGHT} stroke={STUDY_COLOR} />
        <text x="100" y="61" textAnchor="middle" fontSize="10" fill={STUDY_COLOR}>PROCESS</text>
        <path d="M122 57 L156 57" stroke={STUDY_COLOR} strokeWidth="2" markerEnd="url(#arrow)" />
        <rect x="158" y="40" width="34" height="34" rx="3" fill={STUDY_COLOR} />
        <text x="175" y="61" textAnchor="middle" fontSize="11" fill="white">OUT</text>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={STUDY_COLOR} />
          </marker>
        </defs>
      </svg>
    );
  }
  if (variant === "sectors") {
    const stages = [
      { label: "Farm", x: 20 },
      { label: "Factory", x: 75 },
      { label: "Shop", x: 130 },
      { label: "You", x: 180 },
    ];
    return (
      <svg {...common}>
        {stages.slice(0, -1).map((s, i) => (
          <path key={i} d={`M${s.x + 15} 45 L${stages[i + 1].x - 15} 45`} stroke={STUDY_COLOR} strokeWidth="2" markerEnd="url(#arrow2)" />
        ))}
        {stages.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy="45" r="15" fill={i === stages.length - 1 ? STUDY_COLOR : STUDY_LIGHT} stroke={STUDY_COLOR} />
            <text x={s.x} y="70" textAnchor="middle" fontSize="9" fill={STUDY_COLOR}>{s.label}</text>
          </g>
        ))}
        <defs>
          <marker id="arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={STUDY_COLOR} />
          </marker>
        </defs>
      </svg>
    );
  }
  if (variant === "entrepreneurship") {
    return (
      <svg {...common}>
        <circle cx="100" cy="38" r="22" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="2" />
        <path d="M92 38 a8 8 0 1 1 16 0 q0 8 -5 10 v4 h-6 v-4 q-5 -2 -5 -10" fill="none" stroke={STUDY_COLOR} strokeWidth="2" />
        <line x1="97" y1="58" x2="97" y2="62" stroke={STUDY_COLOR} strokeWidth="2" />
        <line x1="103" y1="58" x2="103" y2="62" stroke={STUDY_COLOR} strokeWidth="2" />
        <path d="M60 78 Q100 60 140 78" fill="none" stroke={STUDY_COLOR} strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    );
  }
  if (variant === "sector-split") {
    return (
      <svg {...common}>
        <line x1="100" y1="15" x2="100" y2="75" stroke={STUDY_COLOR} strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="62" cy="45" r="20" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="2" />
        <path d="M54 52 v-14 l8 -6 l8 6 v14 z" fill="none" stroke={STUDY_COLOR} strokeWidth="1.6" />
        <text x="62" y="70" textAnchor="middle" fontSize="9" fill={STUDY_COLOR}>Private</text>
        <circle cx="138" cy="45" r="20" fill={STUDY_COLOR} />
        <path d="M128 52 v-10 l10 -8 l10 8 v10 z" fill="none" stroke="white" strokeWidth="1.6" />
        <line x1="128" y1="52" x2="148" y2="52" stroke="white" strokeWidth="1.6" />
        <text x="138" y="70" textAnchor="middle" fontSize="9" fill={STUDY_COLOR}>Public</text>
      </svg>
    );
  }
  if (variant === "entity-liability") {
    return (
      <svg {...common}>
        <line x1="100" y1="20" x2="100" y2="70" stroke={STUDY_COLOR} strokeWidth="2.5" />
        <line x1="55" y1="34" x2="145" y2="34" stroke={STUDY_COLOR} strokeWidth="2" />
        <path d="M55 34 L44 58 A13 13 0 0 0 66 58 Z" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="1.6" />
        <path d="M145 34 L134 58 A13 13 0 0 0 156 58 Z" fill="none" stroke={STUDY_COLOR} strokeWidth="1.6" />
        <path d="M80 70 L120 70 L112 78 L88 78 Z" fill={STUDY_COLOR} />
      </svg>
    );
  }
  if (variant === "companies") {
    return (
      <svg {...common}>
        <rect x="35" y="45" width="20" height="30" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="1.6" />
        <rect x="65" y="30" width="20" height="45" fill={STUDY_COLOR} />
        <rect x="95" y="50" width="20" height="25" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="1.6" />
        <rect x="125" y="20" width="20" height="55" fill={STUDY_COLOR} />
        <path d="M35 40 L65 25 L95 42 L125 15" fill="none" stroke={STUDY_COLOR} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 3" />
      </svg>
    );
  }
  if (variant === "forprofit-social") {
    return (
      <svg {...common}>
        <path d="M100 65 C70 45 55 30 65 18 C73 9 88 12 100 25 C112 12 127 9 135 18 C145 30 130 45 100 65 Z" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="2" />
        <circle cx="45" cy="55" r="12" fill="none" stroke={STUDY_COLOR} strokeWidth="1.6" />
        <circle cx="155" cy="55" r="12" fill={STUDY_COLOR} />
      </svg>
    );
  }
  if (variant === "coop-ngo") {
    return (
      <svg {...common}>
        <circle cx="70" cy="30" r="14" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="2" />
        <circle cx="100" cy="50" r="14" fill={STUDY_COLOR} />
        <circle cx="130" cy="30" r="14" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="2" />
        <path d="M70 44 L100 50 M130 44 L100 50" stroke={STUDY_COLOR} strokeWidth="1.5" strokeDasharray="2 3" />
        <path d="M85 72 Q100 62 115 72" fill="none" stroke={STUDY_COLOR} strokeWidth="1.5" />
      </svg>
    );
  }
  if (variant === "entity-choice") {
    return (
      <svg {...common}>
        <line x1="100" y1="20" x2="100" y2="66" stroke={STUDY_COLOR} strokeWidth="2.5" />
        <line x1="58" y1="34" x2="142" y2="34" stroke={STUDY_COLOR} strokeWidth="2" />
        <path d="M58 34 L48 56 A11 11 0 0 0 68 56 Z" fill="none" stroke={STUDY_COLOR} strokeWidth="1.6" />
        <path d="M142 34 L132 56 A11 11 0 0 0 152 56 Z" fill={STUDY_LIGHT} stroke={STUDY_COLOR} strokeWidth="1.6" />
        <circle cx="100" cy="70" r="9" fill={STUDY_COLOR} />
        <path d="M96 70 l3 3 l6 -6" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 75 L20 40 L45 55 L45 25 L70 45" fill="none" stroke={STUDY_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60 45 L70 45 L70 55" fill="none" stroke={STUDY_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="130" y="52" textAnchor="middle" fontSize="26" fontWeight="bold" fill={STUDY_COLOR} fontFamily="Lora, serif">GET CASH</text>
    </svg>
  );
}

function StudyVideoLink({ video }) {
  const [playing, setPlaying] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;

  if (playing) {
    return (
      <div className="rounded-lg border overflow-hidden bg-black" style={{ borderColor: "#e7e2d8" }}>
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="py-2 px-3 bg-white">
          <div className="text-[13px] font-semibold text-stone-700 leading-snug">{video.title}</div>
          <div className="text-[11.5px] text-stone-400">{video.channel} · {video.length}</div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${video.title}`}
      className="flex items-center gap-3 rounded-lg border overflow-hidden hover:shadow-sm transition bg-white text-left w-full"
      style={{ borderColor: "#e7e2d8" }}
    >
      <div className="relative shrink-0" style={{ width: 110, height: 62, backgroundImage: `url(${thumbUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.25)" }}>
          <PlayCircle size={26} color="white" />
        </div>
      </div>
      <div className="py-2 pr-3 min-w-0">
        <div className="text-[13px] font-semibold text-stone-700 leading-snug">{video.title}</div>
        <div className="text-[11.5px] text-stone-400">{video.channel} · {video.length}</div>
      </div>
    </button>
  );
}

function SortGame({ items, buckets, onComplete }) {
  const [pool, setPool] = useState(() => {
    const arr = items.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [placed, setPlaced] = useState({});
  const [selected, setSelected] = useState(null);
  const [shake, setShake] = useState(null);
  const [wrongMsg, setWrongMsg] = useState(null);
  const firedRef = useRef(false);

  const place = (bucketKey) => {
    if (selected === null) return;
    const item = items[selected];
    if (item.bucket === bucketKey) {
      setPlaced((b) => ({ ...b, [bucketKey]: [...(b[bucketKey] || []), selected] }));
      setPool((p) => p.filter((i) => i !== selected));
      setWrongMsg(null);
    } else {
      setShake(bucketKey);
      setTimeout(() => setShake(null), 400);
      setWrongMsg(`Not quite — "${item.label}" doesn't belong there. Try again!`);
      setTimeout(() => setWrongMsg(null), 2200);
    }
    setSelected(null);
  };

  const done = pool.length === 0;
  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      onComplete && onComplete();
    }
  }, [done, onComplete]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
        {pool.map((i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition"
            style={{
              borderColor: selected === i ? STUDY_COLOR : "#d6d0c4",
              backgroundColor: selected === i ? STUDY_LIGHT : "white",
              color: selected === i ? STUDY_COLOR : "#57534e",
            }}
          >
            {items[i].label}
          </button>
        ))}
        {done && <span className="text-[13px] font-medium" style={{ color: "#2F8F4E" }}>✓ All sorted — nice work!</span>}
      </div>
      {wrongMsg && (
        <FadeIn className="mb-3 flex items-center gap-2 rounded-md border px-3 py-2" style={{ borderColor: "#B3261E", backgroundColor: "#FCEEEE" }}>
          <AlertCircle size={15} style={{ color: "#B3261E" }} className="shrink-0" />
          <span className="text-[13px] font-medium" style={{ color: "#B3261E" }}>{wrongMsg}</span>
        </FadeIn>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <button
            type="button"
            key={b.key}
            onClick={() => place(b.key)}
            disabled={selected === null}
            aria-label={`Place "${selected !== null ? items[selected].label : "selected item"}" into ${b.label}`}
            className="w-full text-left rounded-lg border-2 border-dashed p-3 min-h-[110px] cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-default"
            style={{ borderColor: shake === b.key ? "#B3261E" : STUDY_COLOR, backgroundColor: shake === b.key ? "#FCEEEE" : STUDY_LIGHT, "--tw-ring-color": STUDY_COLOR }}
          >
            <div className="text-[11.5px] font-bold uppercase tracking-wide mb-2" style={{ color: STUDY_COLOR }}>{b.label}</div>
            <div className="flex flex-col gap-1.5">
              {(placed[b.key] || []).map((i) => (
                <div key={i} className="text-[12.5px] bg-white rounded-md px-2 py-1 border" style={{ borderColor: "#e7e2d8" }}>
                  {items[i].label}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const SORT_BUCKETS_3 = [
  { key: "input", label: "Inputs" },
  { key: "process", label: "Processes" },
  { key: "output", label: "Outputs" },
];
const SECTOR_BUCKETS_4 = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "tertiary", label: "Tertiary" },
  { key: "quaternary", label: "Quaternary" },
];

function FunctionalAreaExplorer() {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div className="flex flex-col gap-2">
      {FUNCTIONAL_AREAS.map((area, i) => (
        <div key={area.name} className="rounded-lg border overflow-hidden" style={{ borderColor: "#e7e2d8" }}>
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full text-left px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: openIdx === i ? STUDY_LIGHT : "white" }}
          >
            <div>
              <div className="text-[14px] font-semibold" style={{ color: STUDY_COLOR }}>{area.name}</div>
              <div className="text-[12.5px] text-stone-500">{area.summary}</div>
            </div>
            <ChevronRight size={16} style={{ color: STUDY_COLOR, transform: openIdx === i ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>
          {openIdx === i && (
            <div className="px-4 pb-3 text-[13.5px] text-stone-600 leading-relaxed" style={{ backgroundColor: STUDY_LIGHT }}>
              {area.detail}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChainOfProductionView({ onComplete }) {
  const [revealed, setRevealed] = useState({});
  const firedRef = useRef(false);
  const allRevealed = Object.keys(revealed).length === CHAIN_OF_PRODUCTION.length;
  useEffect(() => {
    if (allRevealed && !firedRef.current) {
      firedRef.current = true;
      onComplete && onComplete();
    }
  }, [allRevealed, onComplete]);

  return (
    <div className="flex flex-col gap-2">
      {CHAIN_OF_PRODUCTION.map((stage, i) => (
        <div key={i} className="rounded-lg border overflow-hidden" style={{ borderColor: "#e7e2d8" }}>
          <button
            onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
            className="w-full text-left px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[12px] font-bold" style={{ backgroundColor: STUDY_COLOR }}>{i + 1}</div>
              <div className="text-[14px] font-medium text-stone-700">{stage.stage}</div>
            </div>
            <span className="text-[12px] font-medium" style={{ color: STUDY_COLOR }}>{revealed[i] ? "✓" : "Which sector?"}</span>
          </button>
          {revealed[i] && (
            <div className="px-4 pb-3" style={{ backgroundColor: STUDY_LIGHT }}>
              <div className="text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: STUDY_COLOR }}>{stage.sector} sector</div>
              <p className="text-[13.5px] text-stone-600 leading-relaxed">{stage.why}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EntrepreneurCard({ data, onReveal }) {
  const [cluesShown, setCluesShown] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const doReveal = () => {
    setRevealed(true);
    onReveal && onReveal();
  };
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "#e7e2d8" }}>
      <ul className="list-disc pl-4 mb-3 space-y-1">
        {data.clues.slice(0, cluesShown).map((c, i) => (
          <li key={i} className="text-[13.5px] text-stone-600 leading-snug">{c}</li>
        ))}
      </ul>
      {!revealed ? (
        <div className="flex gap-2">
          {cluesShown < data.clues.length && (
            <button onClick={() => setCluesShown((c) => c + 1)} className="text-[12.5px] font-medium rounded-md border px-3 py-1.5" style={{ borderColor: STUDY_COLOR, color: STUDY_COLOR }}>
              Next clue
            </button>
          )}
          <button onClick={doReveal} className="text-[12.5px] font-medium rounded-md px-3 py-1.5 text-white" style={{ backgroundColor: STUDY_COLOR }}>
            Reveal
          </button>
        </div>
      ) : (
        <div className="rounded-md px-3 py-2" style={{ backgroundColor: STUDY_LIGHT }}>
          <div className="text-[14px] font-semibold" style={{ color: STUDY_COLOR }}>{data.name}</div>
          <div className="text-[12.5px] text-stone-600">{data.business}</div>
        </div>
      )}
    </div>
  );
}

function EntrepreneurGrid({ onComplete, items = ENTREPRENEURS }) {
  const [revealedSet, setRevealedSet] = useState(new Set());
  const firedRef = useRef(false);
  const allRevealed = revealedSet.size === items.length;
  useEffect(() => {
    if (allRevealed && !firedRef.current) {
      firedRef.current = true;
      onComplete && onComplete();
    }
  }, [allRevealed, onComplete]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((e, i) => (
        <EntrepreneurCard key={i} data={e} onReveal={() => setRevealedSet((s) => new Set(s).add(i))} />
      ))}
    </div>
  );
}

function GetCashGrid({ onComplete }) {
  const [flippedSet, setFlippedSet] = useState(new Set());
  const firedRef = useRef(false);
  const allFlipped = flippedSet.size === GET_CASH.length;
  useEffect(() => {
    if (allFlipped && !firedRef.current) {
      firedRef.current = true;
      onComplete && onComplete();
    }
  }, [allFlipped, onComplete]);

  const toggle = (i) => setFlippedSet((prev) => new Set(prev).add(i));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {GET_CASH.map((item, i) => {
        const flipped = flippedSet.has(i);
        return (
          <button
            type="button"
            key={i}
            onClick={() => toggle(i)}
            aria-pressed={flipped}
            aria-label={flipped ? `${item.term}: ${item.explanation}` : `${item.letter} — ${item.term}. Press to reveal explanation.`}
            className="block text-left bg-transparent border-0 p-0 m-0 rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ perspective: 1000, cursor: "pointer", height: 130, "--tw-ring-color": STUDY_COLOR }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", transition: "transform 0.5s", transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 10, border: `1px solid ${STUDY_COLOR}`, backgroundColor: "white" }} className="flex flex-col items-center justify-center px-2 text-center">
                <div className="text-[22px] font-bold" style={{ color: STUDY_COLOR, fontFamily: "'Lora', serif" }}>{item.letter}</div>
                <div className="text-[12.5px] font-semibold text-stone-700">{item.term}</div>
              </div>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 10, border: `1px solid ${STUDY_COLOR}`, backgroundColor: STUDY_LIGHT }} className="flex items-center justify-center px-2.5 text-center">
                <p className="text-[11px] leading-snug text-stone-600">{item.explanation}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const SECTION_REQUIRED_KEYS = {
  business: ["business"],
  sectors: ["sectors-chain", "sectors-sort"],
  entrepreneurship: ["entrepreneurship"],
  reasons: ["reasons"],
  "sector-split": ["sector-split"],
  "entity-liability": ["entity-liability"],
  companies: ["companies-sort", "companies-advdisadv"],
  "forprofit-social": ["forprofit-social"],
  "coop-ngo": ["coop-ngo"],
  "entity-choice": ["entity-choice"],
};
function isSectionComplete(sectionKey, completed) {
  return (SECTION_REQUIRED_KEYS[sectionKey] || []).every((k) => completed[k]);
}

// ---- 1.2 Study interactive data ----
const SECTOR_SPLIT_ITEMS = [
  { label: "DHL", bucket: "private" },
  { label: "Canada Post", bucket: "public" },
  { label: "IKEA", bucket: "private" },
  { label: "Systembolaget", bucket: "public" },
  { label: "Apple", bucket: "private" },
  { label: "A public hospital", bucket: "public" },
  { label: "Mars", bucket: "private" },
  { label: "A state fire service", bucket: "public" },
];
const SECTOR_SPLIT_BUCKETS = [
  { key: "private", label: "Private sector" },
  { key: "public", label: "Public sector" },
];

const ENTITY_LIABILITY_ITEMS = [
  { label: "Few legal formalities", bucket: "advantage" },
  { label: "Being your own boss", bucket: "advantage" },
  { label: "Quicker decision-making", bucket: "advantage" },
  { label: "Combines partners' financial strength", bucket: "advantage" },
  { label: "Unlimited liability", bucket: "disadvantage" },
  { label: "Limited sources of finance", bucket: "disadvantage" },
  { label: "Lack of continuity", bucket: "disadvantage" },
  { label: "Prolonged decision-making (partnerships)", bucket: "disadvantage" },
];
const ENTITY_LIABILITY_BUCKETS = [
  { key: "advantage", label: "Advantage" },
  { key: "disadvantage", label: "Disadvantage" },
];

const COMPANY_SPLIT_ITEMS = [
  { label: "Mars", bucket: "privately" },
  { label: "Honda Motor Company", bucket: "publicly" },
  { label: "Aldi", bucket: "privately" },
  { label: "The Walt Disney Company", bucket: "publicly" },
  { label: "IKEA", bucket: "privately" },
  { label: "Meta (Facebook)", bucket: "publicly" },
];
const COMPANY_SPLIT_BUCKETS = [
  { key: "privately", label: "Privately held" },
  { key: "publicly", label: "Publicly held" },
];

const LLC_ADV_DISADV_ITEMS = [
  { label: "Access to raising finance", bucket: "advantage" },
  { label: "Limited liability for owners", bucket: "advantage" },
  { label: "Continuity beyond any one owner", bucket: "advantage" },
  { label: "Economies of scale", bucket: "advantage" },
  { label: "Communication problems", bucket: "disadvantage" },
  { label: "Compliance costs", bucket: "disadvantage" },
  { label: "Legal requirement to disclose information", bucket: "disadvantage" },
  { label: "Bureaucracy", bucket: "disadvantage" },
];
const LLC_ADV_DISADV_BUCKETS = [
  { key: "advantage", label: "Advantage" },
  { key: "disadvantage", label: "Disadvantage" },
];

const FORPROFIT_SOCIAL_EXAMPLES = [
  {
    clues: [
      "Co-founded by actress Kristen Bell, this company sells food and personal-care products.",
      "For every product sold, it donates a serving of therapeutic food to a severely malnourished child.",
      "It trades for profit like an ordinary business, but that surplus directly funds its mission.",
    ],
    name: "This Saves Lives",
    business: "Private sector for-profit social enterprise (aims to end severe acute malnutrition in children)",
  },
  {
    clues: [
      "This organization manages the Canadian side of one of the world's most-visited natural landmarks.",
      "It was established by the Canadian government and draws around 13 million tourists a year.",
      "It trades commercially (admissions, attractions) but reinvests toward sustainable tourism and land use.",
    ],
    name: "Niagara Parks Commission",
    business: "Public sector for-profit social enterprise",
  },
];

const COOP_NGO_EXAMPLES = [
  {
    clues: [
      "A Scottish whisky distillery established in the town of Dingwall in 2015.",
      "It's owned by local community members, not outside investors.",
      "Some of its proceeds are set aside to benefit the local community directly, and it generates its own electricity to avoid the industry's typical reliance on oil and gas.",
    ],
    name: "GlenWyvis Distillery",
    business: "Cooperative",
  },
  {
    clues: [
      "An international organization operating under the hashtag #foreverychild.",
      "It provides healthcare, vaccinations, education and clean drinking water to children worldwide.",
      "It's independent of any single government and reinvests all funds into its programmes rather than distributing profit.",
    ],
    name: "UNICEF",
    business: "Non-governmental organization (NGO) / non-profit social enterprise",
  },
];

// Evaluative scenarios (AO3): reuses the same clue/reveal card as the entrepreneur/example
// grids above, but here the "reveal" is a justified recommendation, not just a fact —
// this is the section that actually asks students to weigh trade-offs, not just identify.
const ENTITY_CHOICE_SCENARIOS = [
  {
    clues: [
      "Maya and Sam want to open a small graphic design studio together.",
      "They'll pool their modest savings, share client work and split decisions equally.",
      "They have very little starting capital and want to avoid complex paperwork or cost.",
    ],
    name: "Recommendation: Partnership",
    business: "Low set-up cost and formality suits their limited capital, and sharing decisions/profits matches their equal-partner intent. Trade-off: both partners would carry unlimited liability, so a clear deed of partnership is essential to define how disputes and losses are handled.",
  },
  {
    clues: [
      "A family-run bakery chain wants to expand nationally.",
      "This needs a large injection of capital they don't have themselves.",
      "The family is determined to keep full control and avoid outside shareholders having a say.",
    ],
    name: "Recommendation: Privately held company",
    business: "Incorporating brings limited liability and access to capital from a small, trusted group of investors (e.g. family, friends), while keeping shares out of public hands — preserving family control. Trade-off: still more limited access to capital than a publicly held company, and shareholders can only sell shares with existing shareholders' permission.",
  },
  {
    clues: [
      "A cooperative of 200 local coffee farmers wants to jointly process and sell their beans.",
      "They want profits shared fairly based on each farmer's contribution.",
      "Every member wants a genuine say in how the organization is run.",
    ],
    name: "Recommendation: Cooperative",
    business: "A democratic, member-owned structure directly matches their goal of shared control and fair profit-sharing among all 200 farmers. Trade-off: decision-making across 200 members can be slower than in a company with a small board, and raising large amounts of external capital is harder than for a publicly held company.",
  },
];

const STUDY_VIDEOS_1_2 = {
  thisSavesLives: { id: "NowJS17j0S4", title: "This Saves Lives | Co-Founder Kristen Bell Shares Our Story", channel: "This Saves Lives", length: "0:47" },
  glenWyvis: { id: "DfdoKZco27E", title: "\u201cWe've created a distillery \u2014 what can YOUR community create?\u201d", channel: "Co-operatives UK", length: "3:21" },
  unicef: { id: "E1xkXZs0cAQ", title: "UNICEF | For every child", channel: "UNICEF", length: "1:30" },
};

const STUDY_SECTIONS_1_1 = [
  {
    key: "business",
    title: "What is a business?",
    intro: "A business is a decision-making organization that takes resources — its inputs — and transforms them through internal processes into goods and/or services that satisfy customer needs and wants. To operate effectively, that work is usually divided across functional departments, which must cooperate closely to reach the organization's goals.",
  },
  {
    key: "sectors",
    title: "Business sectors & the chain of production",
    intro: "Businesses can be classified by which stage of production they're engaged in — known as a sector of the economy. As a raw material moves through the primary, secondary and tertiary sectors — the \"chain of production\" — value is added at every stage. Follow cocoa beans on their journey to becoming a chocolate bar:",
  },
  {
    key: "entrepreneurship",
    title: "Entrepreneurship",
    intro: "An entrepreneur is an individual who plans, organizes and manages a business, taking on financial risk in doing so. Entrepreneurs typically take on substantial risk, hold a clear vision for the business, are rewarded through profit rather than a fixed salary, and bear responsibility — including personal cost if the business fails. See if you can guess these six real entrepreneurs from their clues:",
  },
  {
    key: "reasons",
    title: "Why start a business?",
    intro: "There are many reasons people choose to start their own business — often remembered with the mnemonic GET CASH, a well-known memory aid used in IB Business Management courses. Flip each card to explore one reason:",
  },
];

const STUDY_SECTIONS_1_2 = [
  {
    key: "sector-split",
    title: "Private vs. public sector",
    intro: "Businesses can be categorized as private sector or public sector, depending on who owns them and their main objective. Private sector organizations are owned by private individuals or businesses and generally aim to make a profit. Public sector organizations are owned and controlled by government, and typically exist to provide essential services rather than to maximize profit. Most businesses — including Apple — operate in the private sector. Sort these organizations into the correct sector:",
  },
  {
    key: "entity-liability",
    title: "Sole traders & partnerships",
    intro: "A sole trader is a business owned and run by one person, while a partnership is owned by two or more people (partners), formalized by a deed of partnership. Both are usually the easiest and cheapest types of business to set up — but both typically carry unlimited liability, meaning the owner's personal assets are at risk if the business cannot pay its debts. This was exactly the risk that led Ronald Wayne to leave Apple's founding partnership in 1976, twelve days after it was formed. Sort these features into advantage or disadvantage:",
  },
  {
    key: "companies",
    title: "Privately held vs. publicly held companies",
    intro: "Incorporating a business turns it into a company — a separate legal entity from its owners, giving those owners (its shareholders) limited liability. A privately held company's shares are owned by a small number of people (often friends, family or early investors) and can't be bought on the stock exchange. A publicly held company's shares are traded openly on the stock exchange, available to the general public. Apple itself was a privately held company between its 1977 incorporation and its 1980 stock market listing. First, sort these real companies by which type they are — then sort the advantages and disadvantages that come with incorporating in the first place:",
  },
  {
    key: "forprofit-social",
    title: "For-profit social enterprises",
    intro: "A for-profit social enterprise trades commercially — generating real revenue and profit — while existing primarily to serve a social or environmental mission rather than to maximize returns for owners. These can be private sector companies, owned by private individuals or investors, or public sector companies, owned and controlled by government. Meet two real examples:",
  },
  {
    key: "coop-ngo",
    title: "Cooperatives & NGOs",
    intro: "Not every organization is structured around individual or government ownership. A cooperative is owned and democratically controlled by its own members, who share in any profits it makes. A non-governmental organization (NGO) is a non-profit social enterprise, independent of government, that reinvests any surplus into its mission rather than distributing it as profit — it has no owners to pay. Meet two real examples:",
  },
  {
    key: "entity-choice",
    title: "Choosing the right structure",
    intro: "Knowing the features of each business entity is only half the job — real decisions mean weighing them against each other for a specific situation, and justifying the trade-offs. For each scenario below, think about which entity type fits best and why, before revealing the recommendation:",
  },
];

const STUDY_SECTIONS_BY_SUBUNIT = {
  "1.1": STUDY_SECTIONS_1_1,
  "1.2": STUDY_SECTIONS_1_2,
};

function StudyCompletionCard({ xpEarned, badgeEarned }) {
  return (
    <FadeIn className="text-center rounded-lg border-2 px-6 py-10" style={{ borderColor: STUDY_COLOR, backgroundColor: STUDY_LIGHT }}>
      <Trophy size={32} style={{ color: STUDY_COLOR }} className="mx-auto mb-3" />
      <div className="text-[19px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
        Study Guide complete!
      </div>
      <p className="text-[13.5px] text-stone-600 mb-1">You've worked through all four sections — nice, thorough studying.</p>
      {(xpEarned || badgeEarned) && (
        <p className="text-[13px] font-medium mt-2" style={{ color: STUDY_COLOR }}>
          {xpEarned ? `+${xpEarned} XP` : ""}{xpEarned && badgeEarned ? " · " : ""}{badgeEarned ? `New badge: "${badgeEarned}"` : ""}
        </p>
      )}
    </FadeIn>
  );
}

function StudyView({ onBack, subunitId }) {
  const STUDY_SECTIONS = STUDY_SECTIONS_BY_SUBUNIT[subunitId];
  const subunitTitle = `${subunitId} ${SUBUNIT_TITLES[subunitId] || ""}`;
  const [section, setSection] = useState(0);
  const [completed, setCompleted] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [reward, setReward] = useState(null);
  const awardedRef = useRef(false);
  const current = STUDY_SECTIONS[section];
  const STUDY_SECTION_META = STUDY_SECTION_META_BY_SUBUNIT[subunitId];
  const currentMeta = STUDY_SECTION_META[section];

  useEffect(() => {
    (async () => {
      try {
        setCompleted(await loadStudyProgress(subunitId));
      } catch {}
      setLoaded(true);
    })();
  }, [subunitId]);

  const markComplete = useCallback((key) => {
    setCompleted((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      saveStudyProgress(subunitId, next).catch(() => {});
      return next;
    });
  }, [subunitId]);

  const doneCount = STUDY_SECTIONS.filter((s) => isSectionComplete(s.key, completed)).length;
  const allDone = loaded && doneCount === STUDY_SECTIONS.length;

  useEffect(() => {
    if (!allDone || awardedRef.current) return;
    awardedRef.current = true;
    (async () => {
      let p = await loadProfile();
      if ((p.studyCompleted || []).includes(subunitId)) return;
      p = { ...p, studyCompleted: [...(p.studyCompleted || []), subunitId], xp: (p.xp || 0) + XP_STUDY_COMPLETE_BONUS };
      const { newly, badgeIds } = checkNewBadges(p);
      p.badgeIds = badgeIds;
      await saveProfile(p);
      setReward({ xp: XP_STUDY_COMPLETE_BONUS, badge: newly[0]?.name || null });
    })();
  }, [allDone]);

  return (
    <div className="min-h-full w-full" style={{ backgroundColor: "#FAF8F5" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Fraunces:ital,wght@1,600;1,700&display=swap');`}</style>
      <ModuleHeader
        themeColor={STUDY_COLOR}
        onBack={onBack}
        ModuleIcon={BookOpen}
        moduleName="Study"
        progressLine={loaded ? `${doneCount}/${STUDY_SECTIONS.length} sections` : ""}
        progressPercent={loaded ? (doneCount / STUDY_SECTIONS.length) * 100 : 0}
        subunitTitle={subunitTitle}
      />

      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="text-center mb-5">
          <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>Study Guide</h1>
          <p className="text-[13px] text-stone-500 mt-1">A guided walkthrough of the core ideas, with a quick activity in each section.</p>
        </div>

        {loaded && (
          <>
            <div className="flex items-center justify-between mb-2 text-[12px] text-stone-500">
              <span>{doneCount}/{STUDY_SECTIONS.length} sections complete</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden mb-5">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(doneCount / STUDY_SECTIONS.length) * 100}%`, backgroundColor: STUDY_COLOR }} />
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {STUDY_SECTIONS.map((s, i) => {
            const meta = STUDY_SECTION_META[i];
            return (
              <button
                key={s.key}
                onClick={() => setSection(i)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition"
                style={{
                  borderColor: STUDY_COLOR,
                  backgroundColor: section === i ? STUDY_COLOR : "white",
                  color: section === i ? "white" : STUDY_COLOR,
                }}
              >
                {isSectionComplete(s.key, completed) ? <CheckCircle2 size={13} /> : <meta.Icon size={13} />}
                {s.title}
              </button>
            );
          })}
        </div>

        <FadeIn key={section} className="rounded-lg border bg-white p-5" style={{ borderColor: "#e7e2d8" }}>
          <StudyIllustration variant={current.key} />
          <h2 className="text-[17px] font-semibold mb-2 mt-3" style={{ fontFamily: "'Lora', serif", color: STUDY_COLOR }}>{current.title}</h2>
          <p className="text-[14px] text-stone-600 leading-relaxed mb-5">{current.intro}</p>

          {current.key === "business" && (
            <>
              <div className="text-[12.5px] text-stone-500 mb-3">
                Here are the inputs, processes and outputs of a bakery business, all mixed up. Tap an item, then tap the bucket it belongs in.
              </div>
              <SortGame items={SORT_ITEMS} buckets={SORT_BUCKETS_3} onComplete={() => markComplete("business")} />
              <div className="mt-6 pt-5 border-t" style={{ borderColor: "#e7e2d8" }}>
                <div className="text-[13.5px] font-semibold text-stone-700 mb-3">The business's functional areas:</div>
                <FunctionalAreaExplorer />
              </div>
            </>
          )}
          {current.key === "sectors" && (
            <>
              <StudyVideoLink video={STUDY_VIDEOS.sectors} />
              <div className="mt-4">
                <ChainOfProductionView onComplete={() => markComplete("sectors-chain")} />
              </div>
              <div className="mt-4">
                <StudyVideoLink video={STUDY_VIDEOS.chocolate} />
              </div>
              <div className="mt-6 pt-5 border-t" style={{ borderColor: "#e7e2d8" }}>
                <div className="text-[13.5px] font-semibold text-stone-700 mb-3">Now sort these businesses into their sector:</div>
                <SortGame items={SECTOR_SORT_ITEMS} buckets={SECTOR_BUCKETS_4} onComplete={() => markComplete("sectors-sort")} />
              </div>
            </>
          )}
          {current.key === "entrepreneurship" && (
            <>
              <div className="mb-4">
                <StudyVideoLink video={STUDY_VIDEOS.gymshark} />
              </div>
              <EntrepreneurGrid onComplete={() => markComplete("entrepreneurship")} />
            </>
          )}
          {current.key === "reasons" && <GetCashGrid onComplete={() => markComplete("reasons")} />}
          {current.key === "sector-split" && (
            <SortGame items={SECTOR_SPLIT_ITEMS} buckets={SECTOR_SPLIT_BUCKETS} onComplete={() => markComplete("sector-split")} />
          )}
          {current.key === "entity-liability" && (
            <>
              <div className="mb-4">
                <StudyVideoLink video={STUDY_VIDEO_1_2_LIABILITY} />
              </div>
              <SortGame items={ENTITY_LIABILITY_ITEMS} buckets={ENTITY_LIABILITY_BUCKETS} onComplete={() => markComplete("entity-liability")} />
            </>
          )}
          {current.key === "companies" && (
            <>
              <SortGame items={COMPANY_SPLIT_ITEMS} buckets={COMPANY_SPLIT_BUCKETS} onComplete={() => markComplete("companies-sort")} />
              <div className="mt-6 pt-5 border-t" style={{ borderColor: "#e7e2d8" }}>
                <div className="text-[13.5px] font-semibold text-stone-700 mb-3">Now, the advantages and disadvantages of incorporating:</div>
                <SortGame items={LLC_ADV_DISADV_ITEMS} buckets={LLC_ADV_DISADV_BUCKETS} onComplete={() => markComplete("companies-advdisadv")} />
              </div>
            </>
          )}
          {current.key === "forprofit-social" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <StudyVideoLink video={STUDY_VIDEOS_1_2.thisSavesLives} />
              </div>
              <EntrepreneurGrid items={FORPROFIT_SOCIAL_EXAMPLES} onComplete={() => markComplete("forprofit-social")} />
            </>
          )}
          {current.key === "coop-ngo" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <StudyVideoLink video={STUDY_VIDEOS_1_2.glenWyvis} />
                <StudyVideoLink video={STUDY_VIDEOS_1_2.unicef} />
              </div>
              <EntrepreneurGrid items={COOP_NGO_EXAMPLES} onComplete={() => markComplete("coop-ngo")} />
            </>
          )}
          {current.key === "entity-choice" && (
            <EntrepreneurGrid items={ENTITY_CHOICE_SCENARIOS} onComplete={() => markComplete("entity-choice")} />
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: "#e7e2d8" }}>
            <button
              onClick={() => setSection((s) => Math.max(0, s - 1))}
              disabled={section === 0}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-[13px] font-medium text-stone-600 disabled:opacity-40 hover:bg-stone-50"
              style={{ borderColor: "#e7e2d8" }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-[12px] text-stone-400">{section + 1} of {STUDY_SECTIONS.length}</span>
            <button
              onClick={() => setSection((s) => Math.min(STUDY_SECTIONS.length - 1, s + 1))}
              disabled={section === STUDY_SECTIONS.length - 1}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-[13px] font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: STUDY_COLOR }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </FadeIn>

        {allDone && (
          <div className="mt-5">
            <StudyCompletionCard xpEarned={reward?.xp} badgeEarned={reward?.badge} />
          </div>
        )}
      </div>
    </div>
  );
}

function FlashcardsView({ onBack, subunitId }) {
  const subunit = SUBUNIT_REGISTRY[subunitId];
  const FLASHCARD_TERMS = subunit.flashcardTerms;
  const subunitTitle = `${subunitId} ${subunit.title}`;
  const [queue, setQueue] = useState(() => shuffleIndices(FLASHCARD_TERMS.length));
  const [mastered, setMastered] = useState(new Set());
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [lastResult, setLastResult] = useState(null); // transient "Right!"/"Keep practicing" flash

  useEffect(() => {
    (async () => {
      try {
        setReviewed(await loadTermsReviewed(subunitId));
      } catch {
        // no saved progress yet
      }
      setLoaded(true);
    })();
  }, [subunitId]);

  const currentIdx = queue[0];
  const card = currentIdx !== undefined ? FLASHCARD_TERMS[currentIdx] : null;
  const sessionComplete = loaded && queue.length === 0;
  const totalTerms = FLASHCARD_TERMS.length;

  const markReviewed = useCallback((i) => {
    setReviewed((prev) => {
      if (prev[i]) return prev;
      const next = { ...prev, [i]: true };
      saveTermsReviewed(subunitId, next).catch(() => {});
      return next;
    });
  }, [subunitId]);

  const onFlip = useCallback(() => {
    setFlipped((f) => {
      if (!f && currentIdx !== undefined) markReviewed(currentIdx);
      return !f;
    });
  }, [currentIdx, markReviewed]);

  const handleAssess = useCallback((gotIt) => {
    setLastResult(gotIt ? "right" : "wrong");
    setTimeout(() => setLastResult(null), 700);
    setQueue((prev) => {
      const [, ...rest] = prev;
      if (gotIt) {
        setMastered((m) => new Set(m).add(currentIdx));
        return rest;
      }
      // Requeue a few cards later, not immediately next, so there's spacing before it reappears.
      const insertAt = Math.min(rest.length, 3);
      return [...rest.slice(0, insertAt), currentIdx, ...rest.slice(insertAt)];
    });
    setFlipped(false);
  }, [currentIdx]);

  const restart = useCallback(() => {
    setQueue(shuffleIndices(totalTerms));
    setMastered(new Set());
    setFlipped(false);
  }, [totalTerms]);

  // Keyboard shortcuts: Space/Enter flips; ←/1 = still learning, →/2 = got it (only once flipped)
  useEffect(() => {
    const onKey = (e) => {
      if (sessionComplete || !card) return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        onFlip();
      } else if (flipped && (e.key === "ArrowLeft" || e.key === "1")) {
        handleAssess(false);
      } else if (flipped && (e.key === "ArrowRight" || e.key === "2")) {
        handleAssess(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, card, sessionComplete, onFlip, handleAssess]);

  return (
    <div className="min-h-full w-full" style={{ backgroundColor: "#FAF8F5" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Fraunces:ital,wght@1,600;1,700&display=swap');`}</style>
      <ModuleHeader
        themeColor="#2E8B84"
        onBack={onBack}
        ModuleIcon={Layers}
        moduleName="Key Terms"
        progressLine={`${mastered.size}/${totalTerms} mastered`}
        progressPercent={(mastered.size / totalTerms) * 100}
        subunitTitle={subunitTitle}
      />

      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="text-center mb-5">
          <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>Key Terms</h1>
          <p className="text-[13px] text-stone-500 mt-1">Flip each card, then mark yourself honestly — cards you get wrong come back around for another try.</p>
        </div>

        {loaded && !sessionComplete && (
          <>
            <div className="flex items-center justify-between mb-3 text-[12.5px] text-stone-500">
              <span>{queue.length} left this round</span>
              <span>{mastered.size}/{totalTerms} mastered</span>
            </div>

            <FlashCard term={card.term} definition={card.definition} flipped={flipped} onFlip={onFlip} />

            <div className="mt-5" style={{ minHeight: 44 }}>
              {!flipped && (
                <div className="text-center text-[12.5px] text-stone-400">Tap the card (or press Space) to reveal the definition</div>
              )}
              {flipped && (
                <FadeIn className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleAssess(false)}
                    className="inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: "#B3261E" }}
                  >
                    ✕ Still learning
                  </button>
                  <button
                    onClick={() => handleAssess(true)}
                    className="inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: "#2F8F4E" }}
                  >
                    ✓ Got it
                  </button>
                </FadeIn>
              )}
            </div>

            <div className="mt-6 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(mastered.size / totalTerms) * 100}%`, backgroundColor: "#2E8B84" }} />
            </div>

            <div className="text-center text-[11.5px] text-stone-400 mt-3">Space to flip · ← still learning · → got it</div>
          </>
        )}

        {sessionComplete && (
          <FadeIn className="text-center rounded-lg border-2 px-6 py-10" style={{ borderColor: "#2E8B84", backgroundColor: "#EAF5F4" }}>
            <Trophy size={32} style={{ color: "#2E8B84" }} className="mx-auto mb-3" />
            <div className="text-[19px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
              All {totalTerms} terms mastered!
            </div>
            <p className="text-[13.5px] text-stone-600 mb-5">Nice work — you got every term right at least once this round.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={restart} className="inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: "#2E8B84" }}>
                <RotateCw size={15} /> Practice again
              </button>
              <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2.5 text-[13.5px] font-semibold text-stone-600 hover:bg-stone-50" style={{ borderColor: "#e7e2d8" }}>
                Back to menu
              </button>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUBUNIT HUB — landing screen with mode tiles (Practice / Terms / Study)
// ============================================================
function HubTile({ title, desc, Icon, color, onClick, disabled, badge, progressLabel, progressPercent }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left rounded-xl border bg-white p-5 transition-all disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        borderColor: !disabled && hovered ? color : "#e7e2d8",
        backgroundColor: !disabled && hovered ? `${color}0D` : "white",
        boxShadow: !disabled && hovered ? `0 4px 14px ${color}26` : "none",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ backgroundColor: disabled ? "#b3aca0" : color }}>
          <Icon size={19} />
        </div>
        {badge && <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full" style={{ backgroundColor: "#F5F3EE", color: "#8a8478" }}>{badge}</span>}
        {!badge && progressLabel && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${color}14`, color }}>{progressLabel}</span>
        )}
      </div>
      <div className="text-[16px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: disabled ? "#8a8478" : "#15396B" }}>{title}</div>
      <p className="text-[13px] text-stone-500 leading-snug mb-3">{desc}</p>
      {!disabled && typeof progressPercent === "number" && (
        <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, backgroundColor: color }} />
        </div>
      )}
    </button>
  );
}

// ============================================================
// Shared header used by all three modules (Practice/Terms/Study), so navigating
// between them feels like one consistent app rather than three different tools.
// ============================================================
// ============================================================
// UNIT MAP visual nodes
// ============================================================
function UnitMapToken({ node, x, y, onClick }) {
  const isRevision = node.isRevision;
  const locked = isRevision ? true : !node.unlocked;
  const pct = node.progressPct || 0;
  const complete = !locked && pct >= 100;
  const size = isRevision ? 88 : 74;
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const fillColor = locked ? "#B7C4CE" : complete ? GOLD : "#15396B";
  const fillColorDark = locked ? "#6E7D8A" : complete ? "#B8860B" : "#0E2547";
  // Label goes on the opposite side from where the node itself sits (1.1 sits left → label right,
  // 1.2 sits right → label left, and so on) — an even, alternating rhythm down the path.
  const isLeftSide = x >= 50;
  const labelWidth = 148;
  const labelGap = 20;

  const circle = (
    <div className="relative" style={{ width: size, height: size }}>
      {!locked && (
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e2d8" strokeWidth="5" />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={complete ? GOLD : "#15396B"}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s" }}
          />
        </svg>
      )}
      {/* drop shadow */}
      <div className="absolute rounded-full" style={{ inset: 3, top: 6, backgroundColor: "rgba(0,0,0,0.18)", filter: "blur(3px)" }} />
      {/* token body with gradient + top highlight for a 3D "game piece" feel */}
      <div
        className="absolute rounded-full flex items-center justify-center text-white font-bold shadow-lg transition group-hover:scale-105 group-hover:-translate-y-0.5"
        style={{
          inset: 3,
          fontSize: isRevision ? 13 : 16,
          fontFamily: "'Lora', serif",
          backgroundImage: `linear-gradient(155deg, ${fillColor} 0%, ${fillColor} 55%, ${fillColorDark} 100%)`,
          border: `2px solid ${locked ? "#8F9DA8" : "rgba(255,255,255,0.35)"}`,
        }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ top: "10%", left: "16%", width: "38%", height: "22%", backgroundColor: "rgba(255,255,255,0.28)", filter: "blur(2px)" }}
        />
        {isRevision ? <Award size={26} /> : locked ? <Lock size={20} /> : complete ? <CheckCircle2 size={26} /> : node.id}
      </div>
    </div>
  );

  const label = (
    <div style={{ width: labelWidth, textAlign: isRevision ? "center" : isLeftSide ? "right" : "left" }}>
      <div className="text-[12.5px] font-bold" style={{ color: locked ? "#a39c8c" : "#15396B" }}>{isRevision ? "Revision" : node.title}</div>
      {locked && <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "#b3aca0" }}>Coming soon</div>}
    </div>
  );

  return (
    <div style={{ position: "absolute", left: `${x}%`, top: y }}>
      <button
        type="button"
        onClick={locked ? undefined : onClick}
        disabled={locked}
        aria-label={
          isRevision
            ? "Revision — locked, coming soon"
            : locked
            ? `Unit ${node.id}: ${node.title} — locked, coming soon`
            : `Unit ${node.id}: ${node.title} — ${pct}% complete`
        }
        className="relative block group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-2xl disabled:cursor-not-allowed"
        style={{ "--tw-ring-color": "#15396B", width: 1, height: 1 }}
      >
        {/* Circle is centered exactly on the (x,y) anchor point, independent of the label —
            so the label's side/width never shifts the token's actual position. */}
        <div style={{ position: "absolute", left: -size / 2, top: -size / 2 }}>{circle}</div>
        {isRevision ? (
          <div style={{ position: "absolute", left: "50%", top: size / 2 + 10, transform: "translateX(-50%)" }}>{label}</div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: -size / 2,
              [isLeftSide ? "right" : "left"]: size / 2 + labelGap,
            }}
          >
            {label}
          </div>
        )}
      </button>
    </div>
  );
}

function MapBackground({ totalHeight }) {
  const seeded = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const decorIcons = [Building2, TrendingUp, Lightbulb, Factory, Award, Pencil];
  const decorCount = Math.max(8, Math.round(totalHeight / 170));
  const decorations = Array.from({ length: decorCount }, (_, i) => ({
    Icon: decorIcons[i % decorIcons.length],
    x: 6 + seeded(i * 3.7 + 1) * 88,
    y: seeded(i * 5.3 + 2) * totalHeight,
    size: 22 + seeded(i * 7.1 + 3) * 22,
    rotate: seeded(i * 2.9 + 4) * 44 - 22,
  }));

  const hillPalette = ["#DCE8DD", "#F3E6C4", "#DCE3EE", "#EFDCE0"];
  const hillCount = Math.max(4, Math.round(totalHeight / 340));
  const hills = Array.from({ length: hillCount }, (_, i) => ({
    y: (i / hillCount) * totalHeight + seeded(i * 4.1 + 5) * 90,
    side: i % 2 === 0 ? "left" : "right",
    color: hillPalette[i % hillPalette.length],
    size: 260 + seeded(i * 6.3 + 6) * 140,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {hills.map((h, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: h.y,
            [h.side]: "-16%",
            width: h.size,
            height: h.size,
            borderRadius: "50%",
            backgroundColor: h.color,
            opacity: 0.55,
            filter: "blur(1px)",
          }}
        />
      ))}
      {decorations.map((d, i) => (
        <div key={i} style={{ position: "absolute", left: `${d.x}%`, top: d.y, transform: `rotate(${d.rotate}deg)`, color: "#15396B", opacity: 0.09 }}>
          <d.Icon size={d.size} />
        </div>
      ))}
    </div>
  );
}

function UnitMapView({ onSelectSubunit }) {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState(emptyProfile());

  // Loads just the ONE shared profile object — not a per-question scan of every
  // subunit's storage. A subunit only needs a binary "is it fully complete" signal
  // to unlock the next one, and profile.completedSubunits already tracks exactly
  // that (set once, when a subunit reaches 100% via the existing completion logic
  // in the Practice view). This avoids the 40+ individual storage calls the map
  // previously made on every single load, which was both slow and fragile.
  useEffect(() => {
    let finished = false;
    const finish = (p) => {
      if (finished) return;
      finished = true;
      setProfile(p || emptyProfile());
      setLoaded(true);
    };
    const hardTimeout = setTimeout(() => finish(emptyProfile()), 5000);

    (async () => {
      const p = await Promise.race([loadProfile().catch(() => emptyProfile()), new Promise((r) => setTimeout(() => r(emptyProfile()), 4000))]);
      finish(p);
    })();

    return () => clearTimeout(hardTimeout);
  }, []);

  // Progress per subunit, in UNIT_SUBUNITS order — a simple binary 0% or 100% based
  // on whether it's been marked fully complete, rather than a fine-grained live
  // percentage (that detail still lives on the Subunit Hub, visited far less often).
  const subunitProgress = UNIT_SUBUNITS.map((s) => ((profile.completedSubunits || []).includes(s.id) ? 100 : 0));
  // Sequential unlock: a subunit is only reachable once the one directly before it is 100% complete.
  // A node can NEVER be unlocked (testing flag or not) unless its id is in SUBUNIT_CONTENT_IDS —
  // otherwise selecting it would try to load content that was never seeded into storage, and the
  // subunit would show a "content hasn't been seeded yet" error instead of ever working.
  const subunitUnlocked = UNIT_SUBUNITS.map((s, i) => {
    const hasContent = SUBUNIT_CONTENT_IDS.includes(s.id);
    if (!hasContent) return false;
    return TESTING_UNLOCK_ALL_SUBUNITS || i === 0 || subunitProgress[i - 1] >= 100;
  });
  const allNodes = [
    ...UNIT_SUBUNITS.map((s, i) => ({ ...s, unlocked: subunitUnlocked[i], progressPct: subunitProgress[i] })),
    { id: "revision", isRevision: true, title: "Cumulative review across all of Unit 1" },
  ];
  const stepY = 172;
  const topPad = 66;
  const bottomPad = 90;
  const totalHeight = topPad + (allNodes.length - 1) * stepY + bottomPad;
  const leftX = 20, rightX = 80;
  const nodeX = (i) => (i % 2 === 0 ? leftX : rightX);
  const nodeY = (i) => topPad + i * stepY;

  let pathD = `M ${nodeX(0)} ${nodeY(0)}`;
  for (let i = 1; i < allNodes.length; i++) {
    const x0 = nodeX(i - 1), y0 = nodeY(i - 1);
    const x1 = nodeX(i), y1 = nodeY(i);
    // Control points at 38%/62% (not both at the midpoint) for a gentler, more gradual
    // curve that doesn't linger close to either node's exact x right before arrival —
    // keeps the trail from swinging into the side labels.
    const cp1Y = y0 + (y1 - y0) * 0.38;
    const cp2Y = y0 + (y1 - y0) * 0.62;
    pathD += ` C ${x0} ${cp1Y}, ${x1} ${cp2Y}, ${x1} ${y1}`;
  }

  // Small trail-marker dots sprinkled along the curve between nodes (purely decorative)
  const dots = [];
  for (let i = 1; i < allNodes.length; i++) {
    const x0 = nodeX(i - 1), y0 = nodeY(i - 1);
    const x1 = nodeX(i), y1 = nodeY(i);
    const cp1Y = y0 + (y1 - y0) * 0.38;
    const cp2Y = y0 + (y1 - y0) * 0.62;
    for (let t = 0.22; t < 0.98; t += 0.19) {
      const mt = 1 - t;
      const x = mt * mt * mt * x0 + 3 * mt * mt * t * x0 + 3 * mt * t * t * x1 + t * t * t * x1;
      const y = mt * mt * mt * y0 + 3 * mt * mt * t * cp1Y + 3 * mt * t * t * cp2Y + t * t * t * y1;
      dots.push({ x, y });
    }
  }

  return (
    <div className="min-h-full w-full" style={{ backgroundColor: "#F2EEE4" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Fraunces:ital,wght@1,600;1,700&display=swap');`}</style>
      <div className="px-5 py-5" style={{ backgroundColor: "#15396B" }}>
        <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold" style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 27, lineHeight: 1.15 }}>
              BizQuest
            </div>
            <div className="text-white/55 text-[10.5px] font-normal mt-0.5">IB DP Business Management Self Study · by George Gatsios</div>
            <h1 className="text-white text-[19px] font-semibold mt-0.5" style={{ fontFamily: "'Lora', serif" }}>Unit 1: Introduction to Business Management</h1>
          </div>
          {loaded && (
            <div className="self-center flex items-center gap-2 rounded-full bg-white/10 pl-1.5 pr-3 py-1.5 sm:shrink-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: GOLD }}>
                <Trophy size={16} />
              </div>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold text-white">{getLevelInfo(profile.xp || 0).name}</div>
                <div className="text-[10.5px] text-white/70">{profile.xp || 0} XP total</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="mx-auto max-w-2xl relative overflow-hidden"
        style={{
          height: totalHeight,
          backgroundImage: "radial-gradient(circle, #e2dccc 1px, transparent 1.4px)",
          backgroundSize: "22px 22px",
        }}
      >
        {loaded && <MapBackground totalHeight={totalHeight} />}
        {loaded && (
          <svg viewBox={`0 0 100 ${totalHeight}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}>
            {/* Trail: soft shadow underneath + warm solid path on top, for a hand-drawn dirt-trail feel */}
            <path d={pathD} fill="none" stroke="#B8AC8E" strokeWidth="6" strokeLinecap="round" opacity="0.35" vectorEffect="non-scaling-stroke" />
            <path d={pathD} fill="none" stroke="#D9CBA3" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {/* Stepping-stone dots rendered as real HTML circles (not SVG) — the SVG above uses a
            non-uniform viewBox to let the trail stretch freely, which would distort true circles
            into ovals; plain divs with border-radius aren't subject to that transform. */}
        {loaded && dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${d.x}%`,
              top: d.y,
              transform: "translate(-50%, -50%)",
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#F6EFDC",
              border: "1.2px solid #B8AC8E",
              zIndex: 1,
            }}
          />
        ))}
        {loaded && allNodes.map((n, i) => (
          <div key={n.id} style={{ position: "relative", zIndex: 2 }}>
            <UnitMapToken node={n} x={nodeX(i)} y={nodeY(i)} onClick={() => onSelectSubunit(n.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleHeader({ themeColor, onBack, ModuleIcon, moduleName, progressLine, progressPercent, subunitTitle }) {
  return (
    <div className="sticky top-0 z-10" style={{ backgroundColor: themeColor }}>
      <div className="px-5 py-4">
        <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 text-white/70 text-[11.5px] font-medium mb-1 hover:text-white"
            >
              <ArrowLeft size={12} /> Back to menu
            </button>
            <div className="text-white font-bold" style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 27, lineHeight: 1.15 }}>
              BizQuest
            </div>
            <div className="text-white/55 text-[10.5px] font-normal mt-0.5">IB DP Business Management Self Study · by George Gatsios</div>
            <div className="text-white/75 text-[14.5px] font-semibold mt-1">
              Unit 1: Introduction to Business Management
            </div>
            <h1 className="text-white text-[19px] font-semibold mt-0.5" style={{ fontFamily: "'Lora', serif" }}>
              {subunitTitle}
            </h1>
          </div>

          <div className="flex items-center sm:shrink-0">
            <div className="self-center flex items-center gap-2 rounded-full bg-white/10 pl-1.5 pr-3 py-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                <ModuleIcon size={16} />
              </div>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold text-white">{moduleName}</div>
                <div className="text-[10.5px] text-white/70">{progressLine}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-1.5 w-full bg-white/10">
        <div className="h-full transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: "white" }} />
      </div>
    </div>
  );
}

function SubunitHub({ onSelectView, onBackToMap, subunitId }) {
  const subunit = SUBUNIT_REGISTRY[subunitId];
  const QUESTIONS = subunit.questions;
  const FLASHCARD_TERMS = subunit.flashcardTerms;
  const STUDY_SECTIONS = STUDY_SECTIONS_BY_SUBUNIT[subunitId];
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState(emptyProfile());
  const [practiceProgress, setPracticeProgress] = useState({ done: 0, total: 0 });
  const [termsProgress, setTermsProgress] = useState({ done: 0, total: FLASHCARD_TERMS.length });
  const [studyProgress, setStudyProgress] = useState({ done: 0, total: STUDY_SECTIONS.length });

  useEffect(() => {
    let finished = false;
    const hardTimeout = setTimeout(() => { if (!finished) { finished = true; setLoaded(true); } }, 8000);

    (async () => {
      try {
        const p = await Promise.race([loadProfile().catch(() => emptyProfile()), new Promise((r) => setTimeout(() => r(emptyProfile()), 4000))]);
        setProfile(p);

        // Practice: all graded questions + both comprehension checks
        const responses = await loadResponses(subunitId).catch(() => ({}));
        let practiceDone = QUESTIONS.filter((q) => responses[q.id]?.status === "graded").length;
        const compResponses = await loadCompResponses(subunitId).catch(() => ({}));
        practiceDone += ["c1", "c2"].filter((id) => compResponses[id]?.status === "checked").length;
        setPracticeProgress({ done: practiceDone, total: QUESTIONS.length + 2 });

        // Key Terms: lifetime "reviewed" count
        try {
          const reviewed = await loadTermsReviewed(subunitId);
          setTermsProgress({ done: Object.keys(reviewed).length, total: FLASHCARD_TERMS.length });
        } catch {
          setTermsProgress({ done: 0, total: FLASHCARD_TERMS.length });
        }

        // Study: sections complete
        try {
          const completed = await loadStudyProgress(subunitId);
          const done = STUDY_SECTIONS.filter((s) => isSectionComplete(s.key, completed)).length;
          setStudyProgress({ done, total: STUDY_SECTIONS.length });
        } catch {
          setStudyProgress({ done: 0, total: STUDY_SECTIONS.length });
        }
      } catch {
        // fall through to render the hub with whatever defaults were already set
      } finally {
        if (!finished) { finished = true; setLoaded(true); }
      }
    })();

    return () => clearTimeout(hardTimeout);
  }, [subunitId]);

  const levelInfo = getLevelInfo(profile.xp || 0);

  return (
    <div className="min-h-full w-full" style={{ backgroundColor: "#FAF8F5" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Fraunces:ital,wght@1,600;1,700&display=swap');`}</style>
      <div className="px-5 py-5" style={{ backgroundColor: "#2D4A3E" }}>
        <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button
              onClick={onBackToMap}
              className="inline-flex items-center gap-1 text-white/70 text-[11.5px] font-medium mb-1 hover:text-white"
            >
              <ArrowLeft size={12} /> Back to Unit map
            </button>
            <div className="text-white font-bold" style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 27, lineHeight: 1.15 }}>
              BizQuest
            </div>
            <div className="text-white/55 text-[10.5px] font-normal mt-0.5">IB DP Business Management Self Study · by George Gatsios</div>
            <div className="text-white/75 text-[14.5px] font-semibold mt-1">Unit 1: Introduction to Business Management</div>
            <h1 className="text-white text-[19px] font-semibold mt-0.5" style={{ fontFamily: "'Lora', serif" }}>{subunitId} {SUBUNIT_TITLES[subunitId] || ""}</h1>
          </div>
          {loaded && (
            <div className="self-center flex items-center gap-2 rounded-full bg-white/10 pl-1.5 pr-3 py-1.5 sm:shrink-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: GOLD }}>
                <Trophy size={16} />
              </div>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold text-white">{levelInfo.name}</div>
                <div className="text-[10.5px] text-white/70">{profile.xp || 0} XP</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-8">
        <p className="text-[13px] text-stone-500 mb-5">Choose how you'd like to work through this subunit.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HubTile
            title="Study"
            desc="A guided walkthrough of the core ideas, with a quick activity in each section."
            Icon={BookOpen}
            color="#8B3A4A"
            onClick={() => onSelectView("study")}
            progressLabel={loaded ? `${studyProgress.done}/${studyProgress.total}` : null}
            progressPercent={loaded ? (studyProgress.done / studyProgress.total) * 100 : 0}
          />
          <HubTile
            title="Key Terms"
            desc="Flip through flashcards to review this subunit's key vocabulary, at your own pace."
            Icon={Layers}
            color="#2E8B84"
            onClick={() => onSelectView("terms")}
            progressLabel={loaded ? `${termsProgress.done}/${termsProgress.total}` : null}
            progressPercent={loaded ? (termsProgress.done / termsProgress.total) * 100 : 0}
          />
          <HubTile
            title="Practice"
            desc="Work through Discover, Build, Apply and Master, with live AI feedback and marks."
            Icon={Pencil}
            color="#15396B"
            onClick={() => onSelectView("practice")}
            progressLabel={loaded ? `${practiceProgress.done}/${practiceProgress.total}` : null}
            progressPercent={loaded ? (practiceProgress.done / practiceProgress.total) * 100 : 0}
          />
        </div>
      </div>
    </div>
  );
}

export default function ApplePractice1_1() {
  const [view, setView] = useState("unitmap"); // "unitmap" | "hub" | "practice" | "terms" | "study"
  const [currentSubunitId, setCurrentSubunitId] = useState("1.1");
  const subunit = SUBUNIT_REGISTRY[currentSubunitId];
  // Shadow the module-level 1.1 constants with whichever subunit is active — every
  // existing reference to these names below (in this component's render) now
  // automatically resolves to the right subunit's data, with zero further changes needed.
  const CASE_TEXT = subunit.caseText;
  const QUESTIONS = subunit.questions;
  const VIDEO = subunit.video;
  const COMPREHENSION_QUESTIONS = subunit.comprehensionQuestions;
  const SUBUNIT_ID = currentSubunitId;
  const STORAGE_PREFIX = `bm-apple-${currentSubunitId}:`;
  const TOTAL_QUESTION_COUNT = COMPREHENSION_QUESTIONS.length + QUESTIONS.length;
  const ESTIMATED_MINUTES =
    COMPREHENSION_QUESTIONS.length * 2 +
    QUESTIONS.filter((q) => q.section === "vocab").length * 1 +
    QUESTIONS.filter((q) => q.section === "structured").length * 2 +
    QUESTIONS.filter((q) => q.section === "essay").length * 8;
  const [state, setState] = useState({});
  const [compState, setCompState] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState(emptyProfile());
  const [badgeToast, setBadgeToast] = useState(null);
  const [currentStage, setCurrentStage] = useState("discover");

  // Reset to the first stage whenever the active subunit changes, so switching
  // subunits never lands you mid-way through a stage sequence that belongs to
  // whichever subunit you were last on.
  useEffect(() => {
    setCurrentStage("discover");
  }, [currentSubunitId]);

  // Scroll to top whenever the visible stage changes, so a new stage never
  // inherits a stale scroll position from whatever was showing before.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [currentStage]);

  // ---- Split-pane (Reading | Questions) with independent scroll + draggable divider ----
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [splitPercent, setSplitPercent] = useState(38);
  const [isDragging, setIsDragging] = useState(false);
  const splitContainerRef = useRef(null);

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(65, Math.max(22, pct)));
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging]);

  const announceBadges = useCallback((newly) => {
    if (!newly || newly.length === 0) return;
    setBadgeToast(newly);
    setTimeout(() => setBadgeToast(null), 4500);
  }, []);

  // Load this subunit's persisted answers whenever the active subunit changes
  // (not just once on mount) — otherwise switching subunits leaves stale
  // question/comprehension state from whichever subunit loaded first.
  useEffect(() => {
    if (view !== "practice") return;
    let cancelled = false;
    setLoaded(false);
    const hardTimeout = setTimeout(() => {
      if (!cancelled) { setLoaded(true); }
    }, 8000);
    (async () => {
      try {
        const [responses, compResponses] = await Promise.all([
          loadResponses(currentSubunitId).catch(() => ({})),
          loadCompResponses(currentSubunitId).catch(() => ({})),
        ]);
        if (!cancelled) {
          responsesRef.current = responses;
          compResponsesRef.current = compResponses;
          setState(responses);
          setCompState(compResponses);
        }
      } catch {
        // fall through with whatever was loaded so far rather than staying blank forever
      } finally {
        clearTimeout(hardTimeout);
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; clearTimeout(hardTimeout); };
  }, [currentSubunitId, view]);

  // Global learner profile (XP/badges) is shared across all subunits — loads once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loadedProfile = emptyProfile();
      try { loadedProfile = await loadProfile(); } catch {}
      if (!cancelled) setProfile(loadedProfile);
    })();
    return () => { cancelled = true; };
  }, []);

  // In-memory mirrors of this subunit's answers, kept in sync with the Supabase row.
  // Practice questions and comprehension checks are separate columns/blobs now (rather
  // than one combined key with a "comp:" prefix trick), since Supabase has no per-call
  // volume concern the way the old artifact storage did — this is just simpler and maps
  // directly onto two real database columns.
  const responsesRef = useRef({});
  const compResponsesRef = useRef({});
  const flushTimerRef = useRef(null);
  const dirtyPulseKeysRef = useRef(new Set());
  const dirtyKindsRef = useRef(new Set()); // which of "responses" / "comp" changed since last flush
  const flushResponses = useCallback(async () => {
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    const pulseKeys = Array.from(dirtyPulseKeysRef.current);
    dirtyPulseKeysRef.current = new Set();
    const kinds = Array.from(dirtyKindsRef.current);
    dirtyKindsRef.current = new Set();
    try {
      const writes = [];
      if (kinds.includes("responses")) writes.push(saveResponses(currentSubunitId, responsesRef.current));
      if (kinds.includes("comp")) writes.push(saveCompResponses(currentSubunitId, compResponsesRef.current));
      await Promise.all(writes);
      if (pulseKeys.length > 0) {
        const stamp = Date.now();
        setSavedPulses((prev) => {
          const next = { ...prev };
          for (const k of pulseKeys) next[k] = stamp;
          return next;
        });
      }
    } catch {
      // storage save failed silently — practice still works this session
    }
  }, [currentSubunitId]);
  // Debounced draft auto-save: schedules ONE shared flush 900ms after the last edit to
  // ANY question, so typed-but-unsubmitted answers survive closing the tab without
  // writing on every keystroke.
  const scheduleFlush = useCallback((pulseKey, kind) => {
    if (pulseKey) dirtyPulseKeysRef.current.add(pulseKey);
    if (kind) dirtyKindsRef.current.add(kind);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => { flushResponses(); }, 900);
  }, [flushResponses]);

  const persist = useCallback((id, value) => {
    responsesRef.current = { ...responsesRef.current, [id]: value };
  }, []);
  const persistComp = useCallback((id, value) => {
    compResponsesRef.current = { ...compResponsesRef.current, [id]: value };
  }, []);

  const [savedPulses, setSavedPulses] = useState({});
  const scheduleDraftSave = useCallback((pulseKey, text, persistFn, keyId, kind) => {
    persistFn(keyId, { answer: text, status: "idle" });
    scheduleFlush(pulseKey, kind);
  }, [scheduleFlush]);

  const onChangeAnswer = useCallback((id, text) => {
    setState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), answer: text, status: "idle" } }));
    scheduleDraftSave(id, text, persist, id, "responses");
  }, [persist, scheduleDraftSave]);
  const onChangeCompAnswer = useCallback((id, text) => {
    setCompState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), answer: text, status: "idle" } }));
    scheduleDraftSave("comp:" + id, text, persistComp, id, "comp");
  }, [persistComp, scheduleDraftSave]);

  const onSubmit = useCallback(async (question) => {
    setState((prev) => ({ ...prev, [question.id]: { ...prev[question.id], status: "loading" } }));
    try {
      const prevEntry = state[question.id] || {};
      // A question counts as "previously graded" if it has ever received a score —
      // NOT based on the current status field. Edit Again sets status back to
      // "idle" while intentionally preserving the old score for display, so
      // checking status here would treat every re-submission as brand new and
      // award the full new score's XP on top of what was already banked
      // (and re-count vocab/perfect-answer badges), letting XP be farmed
      // indefinitely via Edit Again → resubmit.
      const wasPreviouslyGraded = typeof prevEntry.score === "number";
      const prevScore = wasPreviouslyGraded ? prevEntry.score : 0;
      const wasFullBefore = wasPreviouslyGraded && prevScore === question.marks;
      const result = await gradeAnswer(question, prevEntry.answer || "", CASE_TEXT);
      const newEntry = {
        answer: prevEntry.answer || "",
        status: "graded",
        score: result.score,
        feedback: result.feedback,
        tip: result.tip,
      };
      setState((prev) => ({ ...prev, [question.id]: newEntry }));
      persist(question.id, newEntry);
      dirtyKindsRef.current.add("responses");
      flushResponses(); // save the graded result right away rather than waiting on the draft debounce

      setProfile((prevProfile) => {
        const p = { ...prevProfile };
        p.xp = (p.xp || 0) + (result.score - prevScore) * XP_PER_MARK;
        if (question.section === "vocab" && !wasPreviouslyGraded) p.vocabCompleted = (p.vocabCompleted || 0) + 1;
        if (result.score === question.marks && !wasFullBefore) p.perfectAnswers = (p.perfectAnswers || 0) + 1;
        const { newly, badgeIds } = checkNewBadges(p);
        p.badgeIds = badgeIds;
        saveProfile(p);
        announceBadges(newly);
        return p;
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        [question.id]: { ...prev[question.id], status: "error", errorMsg: err.message || "Marking failed." },
      }));
    }
  }, [state, persist, flushResponses, announceBadges]);

  const onSubmitComp = useCallback(async (question) => {
    setCompState((prev) => ({ ...prev, [question.id]: { ...prev[question.id], status: "loading" } }));
    try {
      const prevEntry = compState[question.id] || {};
      const alreadyCheckedCount = COMPREHENSION_QUESTIONS.filter((q) => compState[q.id] && compState[q.id].status === "checked").length;
      const result = await gradeComprehension(question, prevEntry.answer || "", VIDEO);
      const newEntry = {
        answer: prevEntry.answer || "",
        status: "checked",
        verdict: result.status,
        feedback: result.feedback,
      };
      setCompState((prev) => ({ ...prev, [question.id]: newEntry }));
      persistComp(question.id, newEntry);
      dirtyKindsRef.current.add("comp");
      flushResponses(); // save the checked result right away rather than waiting on the draft debounce

      setProfile((prevProfile) => {
        const p = { ...prevProfile };
        p.xp = (p.xp || 0) + XP_PER_COMPREHENSION;
        if (alreadyCheckedCount + 1 >= COMPREHENSION_QUESTIONS.length) p.videosCompleted = (p.videosCompleted || 0) + 1;
        const { newly, badgeIds } = checkNewBadges(p);
        p.badgeIds = badgeIds;
        saveProfile(p);
        announceBadges(newly);
        return p;
      });
    } catch (err) {
      setCompState((prev) => ({
        ...prev,
        [question.id]: { ...prev[question.id], status: "error", errorMsg: err.message || "Check failed." },
      }));
    }
  }, [compState, persistComp, flushResponses, announceBadges]);

  const onEditAgain = useCallback((id) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], status: "idle" } }));
  }, []);

  const stats = useMemo(() => {
    const graded = QUESTIONS.filter((q) => state[q.id] && state[q.id].status === "graded");
    const earned = graded.reduce((sum, q) => sum + (state[q.id].score || 0), 0);
    const possible = graded.reduce((sum, q) => sum + q.marks, 0);
    const compDone = COMPREHENSION_QUESTIONS.filter((q) => compState[q.id] && compState[q.id].status === "checked").length;
    const compTotal = COMPREHENSION_QUESTIONS.length;

    const bySection = {};
    for (const key of ["vocab", "structured", "essay"]) {
      const qs = QUESTIONS.filter((q) => q.section === key);
      const done = qs.filter((q) => state[q.id] && state[q.id].status === "graded").length;
      const sectionEarned = qs.reduce((sum, q) => (state[q.id] && state[q.id].status === "graded" ? sum + (state[q.id].score || 0) : sum), 0);
      const sectionPossible = qs.reduce((sum, q) => (state[q.id] && state[q.id].status === "graded" ? sum + q.marks : sum), 0);
      bySection[key] = { done, total: qs.length, earned: sectionEarned, possible: sectionPossible };
    }

    const totalItems = compTotal + QUESTIONS.length;
    const totalDone = compDone + graded.length;
    const percent = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

    let tier = null;
    if (possible > 0) {
      const pct = (earned / possible) * 100;
      if (pct >= 90) tier = "Outstanding";
      else if (pct >= 75) tier = "Strong grasp";
      else if (pct >= 50) tier = "Good progress";
      else tier = "Keep practicing";
    }

    return { answered: graded.length, total: QUESTIONS.length, earned, possible, compDone, compTotal, bySection, totalItems, totalDone, percent, tier };
  }, [state, compState]);

  const unlocked = stats.compDone >= stats.compTotal;

  // Award the one-time subunit-completion XP bonus + mark this subunit complete (holistic across the whole course)
  useEffect(() => {
    if (!loaded) return;
    if (stats.totalItems > 0 && stats.totalDone >= stats.totalItems) {
      setProfile((prevProfile) => {
        if ((prevProfile.completedSubunits || []).includes(SUBUNIT_ID)) return prevProfile;
        const p = { ...prevProfile, completedSubunits: [...(prevProfile.completedSubunits || []), SUBUNIT_ID], xp: (prevProfile.xp || 0) + XP_SUBUNIT_COMPLETE_BONUS };
        const { newly, badgeIds } = checkNewBadges(p);
        p.badgeIds = badgeIds;
        saveProfile(p);
        announceBadges(newly);
        return p;
      });
    }
  }, [stats.totalDone, stats.totalItems, loaded, announceBadges]);

  const levelInfo = useMemo(() => getLevelInfo(profile.xp || 0), [profile.xp]);
  const subunitComplete = stats.totalItems > 0 && stats.totalDone >= stats.totalItems;

  // Level-up celebration: detect when the level name changes after the initial load baseline
  const prevLevelNameRef = useRef(null);
  const [levelUpToast, setLevelUpToast] = useState(null);
  useEffect(() => {
    if (!loaded) return;
    if (prevLevelNameRef.current === null) {
      prevLevelNameRef.current = levelInfo.name; // establish baseline on first load, no toast
      return;
    }
    if (prevLevelNameRef.current !== levelInfo.name) {
      setLevelUpToast(levelInfo.name);
      setTimeout(() => setLevelUpToast(null), 5000);
      prevLevelNameRef.current = levelInfo.name;
    }
  }, [levelInfo.name, loaded]);

  // (per-stage question rendering now handled directly in the stepper below)

  if (view === "unitmap") {
    return <FadeIn key="unitmap" className="min-h-full"><UnitMapView onSelectSubunit={(id) => { if (SUBUNIT_CONTENT_IDS.includes(id)) { setCurrentSubunitId(id); setView("hub"); } }} /></FadeIn>;
  }
  if (view === "hub") {
    return <FadeIn key="hub" className="min-h-full"><SubunitHub subunitId={currentSubunitId} onSelectView={setView} onBackToMap={() => setView("unitmap")} /></FadeIn>;
  }
  if (view === "terms") {
    return <FadeIn key="terms" className="min-h-full"><FlashcardsView subunitId={currentSubunitId} onBack={() => setView("hub")} /></FadeIn>;
  }
  if (view === "study") {
    return <FadeIn key="study" className="min-h-full"><StudyView subunitId={currentSubunitId} onBack={() => setView("hub")} /></FadeIn>;
  }

  return (
    <FadeIn key="practice" className="min-h-full w-full">
    <div className="min-h-full w-full" style={{ backgroundColor: "#FAF8F5" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Fraunces:ital,wght@1,600;1,700&display=swap');`}</style>

      {/* Header */}
      <div className="sticky top-0 z-10" style={{ backgroundColor: "#15396B" }}>
        <div className="px-5 py-4">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setView("hub")}
                className="inline-flex items-center gap-1 text-white/70 text-[11.5px] font-medium mb-1 hover:text-white"
              >
                <ArrowLeft size={12} /> Back to menu
              </button>
              <div className="text-white font-bold" style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 27, lineHeight: 1.15 }}>
                BizQuest
              </div>
              <div className="text-white/55 text-[10.5px] font-normal mt-0.5">IB DP Business Management Self Study · by George Gatsios</div>
              <div className="text-white/75 text-[14.5px] font-semibold mt-1">
                Unit 1: Introduction to Business Management
              </div>
              <h1 className="text-white text-[19px] font-semibold mt-0.5" style={{ fontFamily: "'Lora', serif" }}>
                {SUBUNIT_ID} {SUBUNIT_TITLES[SUBUNIT_ID] || ""}
              </h1>
            </div>

            <div className="flex items-center flex-wrap gap-2 sm:justify-end sm:shrink-0">
              {loaded && (
                <div className="self-center flex items-center gap-2 rounded-full bg-white/10 pl-1.5 pr-3 py-1.5" title={`${profile.xp || 0} XP total`}>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: GOLD }}
                  >
                    <Trophy size={16} />
                  </div>
                  <div className="leading-tight">
                    <div className="text-[12px] font-semibold text-white">{levelInfo.name}</div>
                    <div className="text-[10.5px] text-white/70">{profile.xp || 0} XP</div>
                  </div>
                </div>
              )}
              {unlocked && (
                <div className="self-center flex items-center gap-2 rounded-full bg-white/10 pl-1.5 pr-3 py-1.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ backgroundColor: GOLD, fontFamily: "'Lora', serif" }}
                  >
                    {stats.percent}%
                  </div>
                  <div className="leading-tight">
                    <div className="text-[12px] font-semibold text-white">
                      {stats.possible > 0 ? `${stats.earned}/${stats.possible} marks` : `${stats.totalDone}/${stats.totalItems} done`}
                    </div>
                    {stats.tier && <div className="text-[10.5px] text-white/70">{stats.tier}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-white/10">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${stats.totalItems > 0 ? (stats.totalDone / stats.totalItems) * 100 : 0}%`, backgroundColor: GOLD }}
          />
        </div>
      </div>

      <div
        className={`mx-auto px-5 py-6 ${currentStage === "discover" ? "max-w-2xl" : "max-w-6xl"}`}
        style={{ paddingBottom: 24 }}
      >
        {!loaded && (
          <div className="flex items-center gap-2 text-stone-500 text-sm py-8 justify-center">
            <Loader2 size={16} className="animate-spin" /> Loading your saved progress…
          </div>
        )}

        {loaded && (
          <div className="mb-4 flex items-center gap-1.5 text-[12px] text-stone-500">
            <Clock size={13} /> {TOTAL_QUESTION_COUNT} questions · ~{ESTIMATED_MINUTES} min across 4 stages
          </div>
        )}

        {loaded && <LearnerProfileBar profile={profile} levelInfo={levelInfo} />}

        {loaded && <SectionChips stats={stats} currentStage={currentStage} onSelectStage={setCurrentStage} />}

        {/* Stage 1: Discover — full width, no case study yet */}
        {loaded && currentStage === "discover" && (
          <FadeIn key="discover">
            <VideoSection compState={compState} onChangeAnswer={onChangeCompAnswer} onSubmit={onSubmitComp} unlocked={unlocked} savedPulses={savedPulses} video={VIDEO} comprehensionQuestions={COMPREHENSION_QUESTIONS} />
            {isStageComplete("discover", stats) && <ContinueButton stageKey="discover" onAdvance={setCurrentStage} />}
          </FadeIn>
        )}

        {/* Stages 2–4: split screen — case study (left) + this stage's questions (right) */}
        {loaded && currentStage !== "discover" && (
          <FadeIn key={currentStage}>
            {/* Full-width stage banner, above both panes */}
            <div className="mb-3 rounded-md px-3 py-2 text-white" style={{ backgroundColor: SECTION_THEME[STAGE_TO_SECTION[currentStage]].color }}>
              <div className="text-[13px] font-bold uppercase tracking-wide">{SECTION_THEME[STAGE_TO_SECTION[currentStage]].label}</div>
              <div className="text-[11.5px] text-white/85">{SECTION_THEME[STAGE_TO_SECTION[currentStage]].desc}</div>
            </div>

            <div
              ref={splitContainerRef}
              className="flex flex-col sm:flex-row rounded-lg border overflow-hidden"
              style={{ borderColor: "#e7e2d8", height: isDesktop ? 600 : "auto", userSelect: isDragging ? "none" : "auto" }}
            >
              <div
                className="bg-white"
                style={{ width: isDesktop ? `${splitPercent}%` : "100%", height: isDesktop ? "100%" : "auto", minHeight: 0, overflowY: isDesktop ? "auto" : "visible" }}
              >
                <ReadingPanel caseText={CASE_TEXT} />
              </div>

              {isDesktop && (
                <div
                  onMouseDown={onDividerMouseDown}
                  onTouchStart={onDividerMouseDown}
                  className="hidden sm:flex items-center justify-center shrink-0"
                  style={{ width: 14, cursor: "col-resize", backgroundColor: isDragging ? "#EAF1F8" : "#F5F3EE", borderLeft: "1px solid #e7e2d8", borderRight: "1px solid #e7e2d8" }}
                  title="Drag to resize"
                >
                  <div className="w-1 rounded-full" style={{ height: 36, backgroundColor: "#c9c2b3" }} />
                </div>
              )}

              <div
                className="bg-white px-0"
                style={{ width: isDesktop ? `${100 - splitPercent}%` : "100%", height: isDesktop ? "100%" : "auto", minHeight: 0, overflowY: isDesktop ? "auto" : "visible" }}
              >
                <div className="p-5">
                  {currentStage === "build" && (
                    <>
                      {QUESTIONS.filter((q) => q.section === "vocab").map((q) => (
                        <QuestionCard key={q.id} question={q} state={state[q.id]} onChangeAnswer={onChangeAnswer} onSubmit={onSubmit} onEditAgain={onEditAgain} savedPulse={savedPulses[q.id]} caseText={CASE_TEXT} />
                      ))}
                      {isStageComplete("build", stats) && <PaneContinueBar stageKey="build" onAdvance={setCurrentStage} />}
                    </>
                  )}

                  {currentStage === "apply" && (
                    <>
                      {QUESTIONS.filter((q) => q.section === "structured").map((q) => (
                        <QuestionCard key={q.id} question={q} state={state[q.id]} onChangeAnswer={onChangeAnswer} onSubmit={onSubmit} onEditAgain={onEditAgain} savedPulse={savedPulses[q.id]} caseText={CASE_TEXT} />
                      ))}
                      {isStageComplete("apply", stats) && <PaneContinueBar stageKey="apply" onAdvance={setCurrentStage} />}
                    </>
                  )}

                  {currentStage === "master" && (
                    <>
                      {QUESTIONS.filter((q) => q.section === "essay").map((q) => (
                        <QuestionCard key={q.id} question={q} state={state[q.id]} onChangeAnswer={onChangeAnswer} onSubmit={onSubmit} onEditAgain={onEditAgain} savedPulse={savedPulses[q.id]} caseText={CASE_TEXT} />
                      ))}
                      {subunitComplete && <CompletionCard stats={stats} profile={profile} levelInfo={levelInfo} />}
                    </>
                  )}
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        <div className="text-center text-[12px] text-stone-400 pt-2 pb-8">
          Feedback is generated by AI using the same marking criteria as the print workbook — treat it as practice guidance, not an official grade.
        </div>
      </div>

      <LevelUpToast levelName={levelUpToast} />
      <BadgeToast badges={badgeToast} />
    </div>
    </FadeIn>
  );
}
