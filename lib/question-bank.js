// Question id -> prompt text, for display purposes only (teacher dashboard). Mirrors the
// QUESTIONS / QUESTIONS_1_2 / COMPREHENSION_QUESTIONS / COMPREHENSION_QUESTIONS_1_2 arrays
// in components/BizQuest.js. If those question banks change (new/edited/removed
// questions), update this file to match, or the dashboard will fall back to showing raw
// ids for anything not listed here.
export const QUESTION_BANK = {
  "1.1": {
    v1: "Define the term business.",
    v2: "Define the term primary sector.",
    v3: "Define the term secondary sector.",
    v4: "Define the term tertiary sector.",
    v5: "Define the term quaternary sector.",
    v6: "Define the term entrepreneur.",
    v7: "Define the term entrepreneurship.",
    s8: "State two sectors of the economy in which Apple operates.",
    s9: "Describe two reasons why Jobs and Wozniak can be considered entrepreneurs.",
    s10: "Explain two reasons why Apple's growing Services revenue represents a shift toward the tertiary and quaternary sectors.",
    e11: "Discuss whether it is still accurate to classify Apple primarily as a secondary-sector business.",
    c1: "According to the video, in which US state did Steve Jobs and Steve Wozniak build Apple's first computers?",
    c2: "Name one item Jobs and Wozniak are said to have sold to help fund their first batch of computers.",
  },
  "1.2": {
    v1: "Define the term private sector.",
    v2: "Define the term public sector.",
    v3: "Define the term sole trader.",
    v4: "Define the term partnership.",
    v5: "Define the term unlimited liability.",
    v6: "Define the term limited liability.",
    v7: "Define the term incorporation.",
    v8: "Define the term privately held company.",
    v9: "Define the term publicly held company.",
    v10: "Define the term for-profit social enterprise.",
    v11: "Define the term private sector company, as a type of social enterprise.",
    v12: "Define the term public sector company, as a type of social enterprise.",
    v13: "Define the term cooperative.",
    v14: "Define the term NGO / non-profit social enterprise.",
    v15: "Define the term deed of partnership.",
    v16: "Define the term shareholder.",
    s17: "State two features of a general partnership.",
    s18: "Describe one advantage and one disadvantage of unlimited liability for a business owner.",
    s19: "Explain two advantages Apple gained by converting from a partnership into an incorporated, publicly held company.",
    s20a: "State two features of a publicly held company.",
    s20b: "Using the case (Apple's IPO raised approximately $101 million and valued the company at approximately $1.8 billion immediately afterward), calculate the percentage of Apple's post-IPO valuation that was raised through the share sale. Show all your working.",
    s20c: "Explain one advantage to Apple's early investors of the company becoming a publicly held company.",
    e21: "Recommend whether the founders of a promising new technology start-up should structure their business as a partnership or move quickly toward incorporation.",
    c1: "According to the video, roughly how much money did Apple's 1980 IPO raise, and at what share price?",
    c2: "According to the video, what effect did the IPO have on many Apple employees?",
  },
};

// Looks up prompt text, falling back to the raw id if a question isn't in the bank
// (e.g. content added to BizQuest.js after this file was last synced).
export function questionText(subunitId, questionId) {
  return QUESTION_BANK[subunitId]?.[questionId] || questionId;
}
