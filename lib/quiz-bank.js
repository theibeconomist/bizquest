// Multiple-choice quiz questions for the teacher-only classroom quiz game.
// Independent from the graded practice question banks in BizQuest.js — these are for a
// fast-paced review game, not assessed/marked work, so they're kept separate.
//
// Each question: { q, options, correct, difficulty, type, points }
//   difficulty: "easy" | "medium" | "hard" — drives both game ordering and points
//   type: "theory" (general definitions/concepts) | "bonus" (Apple case-study specific facts)
//   points: easy=1, medium=2, hard=3, bonus=3 (bonus questions are always worth the top rate)

const POINTS = { easy: 1, medium: 2, hard: 3, bonus: 3 };

function tag(q, difficulty, type = "theory") {
  return { ...q, difficulty, type, points: POINTS[type === "bonus" ? "bonus" : difficulty] };
}

export const QUIZ_BANK = {
  "1.1": [
    tag({ q: "What is a business?", options: ["An organization that produces or provides goods and/or services to meet customer needs or wants", "Any building used for commercial purposes", "A government-registered taxpayer", "A person who invests in the stock market"], correct: 0 }, "easy"),
    tag({ q: "Which sector of the economy extracts raw materials like minerals, oil, or timber?", options: ["Secondary", "Tertiary", "Primary", "Quaternary"], correct: 2 }, "easy"),
    tag({ q: "Manufacturing a finished good from raw materials belongs to which sector?", options: ["Primary", "Secondary", "Tertiary", "Quaternary"], correct: 1 }, "easy"),
    tag({ q: "Which sector covers services like banking, retail and healthcare?", options: ["Primary", "Secondary", "Tertiary", "Quaternary"], correct: 2 }, "easy"),
    tag({ q: "An entrepreneur is best described as someone who:", options: ["Only manages other people's businesses", "Organizes, operates and assumes the risk of a business venture", "Works exclusively in finance", "Invests passively without any risk"], correct: 1 }, "easy"),
    tag({ q: "Which of these is NOT one of the four economic sectors?", options: ["Primary", "Secondary", "Monetary", "Tertiary"], correct: 2 }, "easy"),
    tag({ q: "The quaternary sector focuses mainly on:", options: ["Farming and fishing", "Factory production", "Information, research and knowledge-based services", "Retail sales"], correct: 2 }, "medium"),
    tag({ q: "Entrepreneurship is best defined as:", options: ["The process of organizing, operating and assuming the risk of a business venture", "The act of buying shares in a company", "A government tax on new businesses", "The study of economics"], correct: 0 }, "medium"),
    tag({ q: "A key difference between an entrepreneur and a manager is that an entrepreneur typically:", options: ["Never takes on any financial risk", "Bears the risk of starting and running the venture", "Only works for large corporations", "Is guaranteed a fixed salary"], correct: 1 }, "medium"),
    tag({ q: "Which best explains why a business's classification into a single sector can be misleading?", options: ["All businesses operate in exactly one sector only", "Many businesses, like Apple, span multiple sectors at once (e.g. manufacturing and services)", "Sectors have been abolished as a concept", "Sector classification only applies to government organizations"], correct: 1 }, "hard"),
    tag({ q: "Why might a growing share of tertiary/quaternary activity change how investors view a traditionally secondary-sector company?", options: ["It has no effect on investor perception", "Service/knowledge revenue is often seen as higher-margin and more resilient than manufacturing", "It automatically lowers the company's share price", "It means the company must stop manufacturing entirely"], correct: 1 }, "hard"),
    tag({ q: "In which US city did Steve Jobs and Steve Wozniak found Apple, in a family garage?", options: ["Cupertino", "Los Altos", "San Francisco", "Palo Alto"], correct: 1 }, "easy", "bonus"),
    tag({ q: "In what year was Apple founded?", options: ["1974", "1976", "1980", "1984"], correct: 1 }, "easy", "bonus"),
    tag({ q: "Besides Jobs and Wozniak, who was Apple's third co-founder?", options: ["Mike Markkula", "John Sculley", "Ronald Wayne", "Tim Cook"], correct: 2 }, "medium", "bonus"),
    tag({ q: "Which part of Apple's business is a clear example of tertiary/quaternary sector activity?", options: ["iPhone assembly", "Services (App Store, iCloud, etc.)", "Component manufacturing", "Raw material sourcing"], correct: 1 }, "medium", "bonus"),
  ],
  "1.2": [
    tag({ q: "The private sector is best defined as:", options: ["The portion of an economy owned or directed by the government", "The portion of an economy not owned or directed by the government", "Only large multinational companies", "Businesses with fewer than 10 employees"], correct: 1 }, "easy"),
    tag({ q: "A sole trader is:", options: ["A business owned and run by one person, with no legal distinction from the owner", "Always a publicly held company", "A business with unlimited shareholders", "Only found in the primary sector"], correct: 0 }, "easy"),
    tag({ q: "A deed of partnership is:", options: ["A type of company share certificate", "A legal document formalizing how partners will share profits and losses", "A government tax filing", "A contract with a supplier"], correct: 1 }, "easy"),
    tag({ q: "Under unlimited liability, a business owner's personal assets:", options: ["Are always fully protected", "Can be used to pay off business debts", "Are protected up to a fixed government limit", "Cannot legally be touched"], correct: 1 }, "easy"),
    tag({ q: "A shareholder is someone who:", options: ["Manages a company's daily operations", "Owns shares in a company, providing capital for part-ownership", "Audits a company's accounts", "Regulates a company on behalf of the government"], correct: 1 }, "easy"),
    tag({ q: "A cooperative is a business:", options: ["Owned and operated by its members, who share the profits", "Owned entirely by the state", "Run by a single sole trader", "Only for non-profit charities"], correct: 0 }, "easy"),
    tag({ q: "In a general partnership, the partners are typically liable for the business's debts:", options: ["Not at all", "Only up to their original investment", "100%, regardless of any partnership agreement", "Only if they are the managing partner"], correct: 2 }, "medium"),
    tag({ q: "Incorporation is:", options: ["The process of paying corporate tax", "The legal process of forming a company as a separate legal entity from its owners", "A type of business loan", "Another word for bankruptcy"], correct: 1 }, "medium"),
    tag({ q: "A key feature of a privately held company is that its shares:", options: ["Are freely traded on a public stock exchange", "Cannot be sold without first being offered to existing shareholders, and aren't exchange-traded", "Must be owned by the government", "Can only be owned by employees"], correct: 1 }, "medium"),
    tag({ q: "An NGO is best described as an organization that is:", options: ["Owned by shareholders and profit-driven", "Independent of government, usually non-profit, with a social/humanitarian purpose", "A branch of a multinational company", "Always government-funded and controlled"], correct: 1 }, "medium"),
    tag({ q: "A publicly held company must typically:", options: ["Keep all financial information secret", "Disclose considerable information, including audited financial statements", "Avoid having any shareholders", "Operate only in one country"], correct: 1 }, "hard"),
    tag({ q: "Why might a firm choose incorporation despite the extra cost and regulation involved?", options: ["Incorporation guarantees higher profits automatically", "Limited liability protects owners' personal assets, and it becomes easier to raise large capital", "It removes all forms of business risk", "It exempts the firm from all taxation"], correct: 1 }, "hard"),
    tag({ q: "What did Apple's 1980 IPO raise, approximately?", options: ["$10 million", "$101 million", "$1 billion", "$500,000"], correct: 1 }, "easy", "bonus"),
    tag({ q: "Why did Ronald Wayne sell his 10% stake in Apple's original partnership so early on?", options: ["He wanted to retire wealthy", "He was concerned about unlimited liability exposure given the partnership structure", "Apple asked him to leave", "He founded a rival company"], correct: 1 }, "hard", "bonus"),
    tag({ q: "A for-profit social enterprise is a business that:", options: ["Never generates any profit", "Trades to address a social or environmental problem while also generating profit", "Is always owned by the government", "Cannot legally pay its employees"], correct: 1 }, "medium"),
  ],
  "1.3": [
    tag({ q: "A vision statement is best described as:", options: ["A short-term sales target", "An outline of an organization's aspirations in the distant future", "A legal filing requirement", "A list of a company's competitors"], correct: 1 }, "easy"),
    tag({ q: "A mission statement mainly declares:", options: ["A firm's underlying purpose and core values", "Its stock price target", "Its tax obligations", "Its factory locations"], correct: 0 }, "easy"),
    tag({ q: "SMART stands for Specific, Measurable, Achievable, Relevant and:", options: ["Team-based", "Time-bound", "Transparent", "Tactical"], correct: 1 }, "easy"),
    tag({ q: "Strategic objectives are best described as:", options: ["Short-term daily tasks", "Medium-to-long-term plans of action to reach a firm's objectives", "Only financial targets", "Government regulations"], correct: 1 }, "easy"),
    tag({ q: "Tactics are best described as:", options: ["The firm's ultimate long-term vision", "Short-term methods used to keep a strategy on track", "A synonym for corporate social responsibility", "A type of business entity"], correct: 1 }, "easy"),
    tag({ q: "Corporate social responsibility (CSR) reflects the view that businesses should:", options: ["Focus solely on maximizing shareholder profit", "Govern themselves in a way that enhances society and their stakeholders", "Avoid all government regulation", "Only report to their own board of directors"], correct: 1 }, "easy"),
    tag({ q: "Which of these is a SMART objective?", options: ["\"Become a better company\"", "\"Try to be more sustainable soon\"", "\"Increase Services revenue by 10% within 12 months\"", "\"Make more money\""], correct: 2 }, "medium"),
    tag({ q: "CSR objectives often create tension with which other type of business objective?", options: ["Marketing objectives only", "Financial/profit objectives", "Environmental objectives", "They never create any tension"], correct: 1 }, "medium"),
    tag({ q: "A tactic that contradicts its own strategy would be an example of:", options: ["Good business planning", "A firm reacting to short-term pressure in a way that undermines its longer-term goal", "A SMART objective", "A vision statement"], correct: 1 }, "medium"),
    tag({ q: "Why might a firm's stated ethical objectives be difficult to fully verify?", options: ["Ethical claims are always independently audited by law", "Much of the reporting on ethical commitments is self-reported by the firm itself", "Ethics can be measured with 100% precision", "Governments always confirm ethical claims"], correct: 1 }, "hard"),
    tag({ q: "Which scenario best illustrates a genuine strategic-vs-tactical tension?", options: ["A firm sticks perfectly to its five-year plan with no adjustments ever", "A café starts selling groceries during a crisis, temporarily departing from its original strategy to survive", "A firm writes a mission statement and never refers to it again", "A firm's vision and mission are identical word-for-word"], correct: 1 }, "hard"),
    tag({ q: "Apple's approximate FY2025 revenue was:", options: ["$41.6 million", "$416.16 billion", "$4.16 billion", "$1.6 trillion"], correct: 1 }, "easy", "bonus"),
    tag({ q: "Which of these is one of Apple's seven official corporate values?", options: ["Maximum shareholder dividends", "Lowest possible pricing", "Privacy", "Fastest delivery times"], correct: 2 }, "medium", "bonus"),
    tag({ q: "What ultimately happened to Theranos, used as a cautionary CSR/ethics example?", options: ["It became the most valuable tech company in the world", "It merged with Apple", "It was shut down after its technology was found to be flawed and fraudulent", "It successfully IPO'd"], correct: 2 }, "medium", "bonus"),
  ],
  "1.4": [
    tag({ q: "A stakeholder is:", options: ["Only a shareholder of a company", "A person or organization that affects, or is affected by, a business", "Exclusively a government regulator", "Only a company's own employees"], correct: 1 }, "easy"),
    tag({ q: "Which of these is an internal stakeholder?", options: ["A supplier", "A customer", "An employee", "A pressure group"], correct: 2 }, "easy"),
    tag({ q: "Which of these is an external stakeholder?", options: ["A shareholder", "A manager", "A customer", "A company director"], correct: 2 }, "easy"),
    tag({ q: "A pressure group is best defined as:", options: ["A company's board of directors", "Individuals with a common interest who organize to demand a change in business behaviour", "A type of financier", "A government tax authority"], correct: 1 }, "easy"),
    tag({ q: "A financier is a stakeholder who mainly:", options: ["Provides a source of finance for a firm", "Manages daily factory operations", "Sets a firm's mission statement", "Regulates workplace safety"], correct: 0 }, "easy"),
    tag({ q: "Stakeholder conflict happens when:", options: ["All stakeholder groups always want the exact same thing", "An organization can't meet all its stakeholder groups' objectives simultaneously", "A business has no external stakeholders at all", "Shareholders vote unanimously"], correct: 1 }, "easy"),
    tag({ q: "In stakeholder mapping, a stakeholder with HIGH interest and HIGH power should be:", options: ["Given minimum effort", "Managed closely", "Kept informed only", "Ignored entirely"], correct: 1 }, "medium"),
    tag({ q: "In stakeholder mapping, a stakeholder with LOW interest but HIGH power should generally be:", options: ["Managed closely at all times", "Kept satisfied", "Ignored completely", "Given minimum effort only"], correct: 1 }, "medium"),
    tag({ q: "Why can stakeholder mapping be considered subjective?", options: ["It uses only hard financial data", "Judging a stakeholder's exact 'interest' and 'power' involves interpretation, not fixed measurement", "It is set permanently by law", "It applies identically to every business in every situation"], correct: 1 }, "hard"),
    tag({ q: "Which best illustrates why a firm's response to stakeholder conflict depends partly on relative power?", options: ["All stakeholders always have equal influence over outcomes", "A firm may prioritize a powerful shareholder's demands over a less powerful pressure group's, even if the group has a valid concern", "Power has no bearing on how conflicts are resolved", "Stakeholder conflict is always resolved by government courts"], correct: 1 }, "hard"),
    tag({ q: "Approximately how many employees does Apple have worldwide, per the case study?", options: ["16,400", "164,000", "1.64 million", "64,000"], correct: 1 }, "easy", "bonus"),
    tag({ q: "Which organization investigated labour conditions at Apple's supplier factories?", options: ["The World Bank", "China Labor Watch", "The United Nations", "Interpol"], correct: 1 }, "medium", "bonus"),
    tag({ q: "The EU ruling against Apple's tax arrangements in Ireland involved approximately how much in alleged illegal state aid?", options: ["€1.3 million", "€13 billion", "€130 million", "€1.3 billion"], correct: 1 }, "hard", "bonus"),
  ],
  "1.5": [
    tag({ q: "Internal (organic) growth happens when a business grows by:", options: ["Merging with a rival firm", "Using its own resources, e.g. reinvesting profit", "Acquiring another company", "Franchising its brand"], correct: 1 }, "easy"),
    tag({ q: "External growth typically happens through:", options: ["Only raising employee wages", "Mergers, acquisitions, joint ventures, alliances or franchising", "Cutting all marketing spend", "Reducing the number of products sold"], correct: 1 }, "easy"),
    tag({ q: "Economies of scale refer to:", options: ["Rising average costs as output grows", "Falling average costs as a firm's output grows", "A firm's total revenue", "A government subsidy"], correct: 1 }, "easy"),
    tag({ q: "A merger is best described as:", options: ["One firm buying another against its will", "Two firms legally consolidating into one new company", "A firm closing down permanently", "A type of government regulation"], correct: 1 }, "easy"),
    tag({ q: "A joint venture is when two businesses:", options: ["Merge into a single legal entity", "Create, own and operate a new third organization together", "Compete aggressively for the same customers", "Become sole traders"], correct: 1 }, "easy"),
    tag({ q: "Franchising involves a franchisor:", options: ["Giving away its brand for free", "Licensing its brand and systems to franchisees, who typically pay fees and a revenue share", "Buying out all of its competitors", "Only operating in one single location"], correct: 1 }, "easy"),
    tag({ q: "Diseconomies of scale occur when a firm:", options: ["Becomes more efficient as it grows", "Becomes too large or complex to manage efficiently, so average costs rise", "Reduces its output to zero", "Merges with a smaller firm"], correct: 1 }, "medium"),
    tag({ q: "A takeover typically differs from an ordinary acquisition because it is:", options: ["Always more expensive", "Done without the target company's agreement", "Only possible between two sole traders", "Illegal in most countries"], correct: 1 }, "medium"),
    tag({ q: "A key advantage of staying small (rather than pursuing growth) is:", options: ["Automatically lower prices for customers", "Greater flexibility to adapt quickly", "Larger economies of scale", "Stronger brand recognition"], correct: 1 }, "medium"),
    tag({ q: "Why might external growth be riskier than internal growth, despite being faster?", options: ["External growth is always cheaper", "It can create culture clashes between combining firms and carries integration risk", "Internal growth is illegal in most countries", "External growth requires no capital at all"], correct: 1 }, "hard"),
    tag({ q: "Why do internal economies of scale not automatically continue forever as a firm keeps growing?", options: ["They legally must stop after 10 years", "Past a certain size, coordination/complexity costs can cause diseconomies of scale instead", "Economies of scale are fixed by government regulation", "They only apply to sole traders"], correct: 1 }, "hard"),
    tag({ q: "Apple's largest acquisition to date is approximately:", options: ["NeXT, for ~$400 million", "Beats Electronics, for ~$3 billion", "Intel's modem business, for $1 billion", "A $10 billion purchase of Foxconn"], correct: 1 }, "easy", "bonus"),
    tag({ q: "Apple's 2014 partnership with IBM, where both firms stayed fully independent, is an example of a:", options: ["Merger", "Takeover", "Strategic alliance", "Franchise"], correct: 2 }, "medium", "bonus"),
    tag({ q: "Which method of external growth has Apple deliberately never used for its retail stores, unlike McDonald's?", options: ["Wholly-owned stores", "Franchising", "Acquisitions", "Joint ventures"], correct: 1 }, "hard", "bonus"),
  ],
  "1.6": [
    tag({ q: "A multinational company (MNC) is one that:", options: ["Only exports goods, without any foreign operations", "Owns or controls operations in two or more countries", "Operates exclusively in its home country", "Is always government-owned"], correct: 1 }, "easy"),
    tag({ q: "A host country is best described as:", options: ["The country where an MNC is headquartered", "Any nation that allows an MNC to set up operations there", "A country with no international trade", "The MNC's most profitable market"], correct: 1 }, "easy"),
    tag({ q: "Offshoring occurs when a business:", options: ["Moves some or all operations to another country", "Brings a previously offshored operation back home", "Closes down entirely", "Merges with a foreign competitor"], correct: 0 }, "easy"),
    tag({ q: "Reshoring is the opposite of offshoring — it means:", options: ["Expanding into a new foreign market", "Bringing a function performed abroad back to the home country", "Closing all foreign factories permanently", "Raising import tariffs"], correct: 1 }, "easy"),
    tag({ q: "Repatriation of profits refers to:", options: ["Reinvesting all profit in the host country", "Transferring profits earned abroad back to the home country", "Donating profits to a host-country charity", "Paying host-country taxes only"], correct: 1 }, "easy"),
    tag({ q: "Protectionism refers to government policies that:", options: ["Encourage unlimited free trade", "Restrict imports and protect domestic industries, e.g. via tariffs", "Ban all multinational companies", "Subsidize only foreign firms"], correct: 1 }, "easy"),
    tag({ q: "A key positive impact an MNC can bring to a host country is:", options: ["Automatic profit repatriation", "Job creation and technology transfer", "Guaranteed environmental damage", "Reduced local competition"], correct: 1 }, "medium"),
    tag({ q: "A key risk an MNC can create for a host country is:", options: ["Permanent full employment", "Vulnerability if the local economy becomes overly dependent on that one MNC", "Automatically higher wages for everyone", "Elimination of all local businesses instantly"], correct: 1 }, "medium"),
    tag({ q: "Why is repatriation of profits sometimes criticized by host-country governments?", options: ["It means the host country keeps all the profit", "It means profit earned locally leaves the economy rather than being reinvested there", "It is illegal in every country", "It only benefits host-country workers"], correct: 1 }, "medium"),
    tag({ q: "Why might a host country's benefit from hosting an MNC be smaller than headline investment figures suggest?", options: ["Headline figures always understate the true benefit", "Profits may be repatriated, and jobs/technology transfer can be limited to certain roles", "MNCs are legally required to reinvest 100% of profit locally", "Host countries never actually gain any benefit"], correct: 1 }, "hard"),
    tag({ q: "Why did the 2022 unrest at Foxconn's Zhengzhou plant highlight a real MNC-related risk?", options: ["It showed the danger of relying heavily on a single production site/location", "It proved MNCs never face labour issues", "It showed China had banned all foreign manufacturing", "It had no connection to supply chain risk"], correct: 0 }, "hard"),
    tag({ q: "Which host country's share of global iPhone production rose sharply, from roughly 5-7% in 2022 to about 25% by 2026?", options: ["Vietnam", "India", "Mexico", "Brazil"], correct: 1 }, "easy", "bonus"),
    tag({ q: "Foxconn's giant Zhengzhou plant, sometimes called \"iPhone City,\" is located in which country?", options: ["India", "Vietnam", "China", "South Korea"], correct: 2 }, "easy", "bonus"),
    tag({ q: "By mid-2025, which country had overtaken China as the leading source of smartphones imported into the US?", options: ["Vietnam", "India", "Mexico", "Indonesia"], correct: 1 }, "hard", "bonus"),
  ],
};

// Builds a game's question sequence: theory questions ordered easy → medium → hard
// (shuffled within each tier), with bonus/case-study questions placed at the end as a
// higher-value finale — matching "mostly theory, case-study questions as bonus" and
// "increasing difficulty as we go".
export function getQuizQuestions(subunitId, count, { allUnit = false } = {}) {
  const pool = allUnit
    ? Object.values(QUIZ_BANK).flat()
    : QUIZ_BANK[subunitId] || [];

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const theory = pool.filter((q) => q.type === "theory");
  const bonus = shuffle(pool.filter((q) => q.type === "bonus"));

  const byDifficulty = (level) => shuffle(theory.filter((q) => q.difficulty === level));
  const ordered = [...byDifficulty("easy"), ...byDifficulty("medium"), ...byDifficulty("hard"), ...bonus];

  return ordered.slice(0, Math.min(count, ordered.length));
}

export function maxQuestionsFor(subunitId, allUnit) {
  const pool = allUnit ? Object.values(QUIZ_BANK).flat() : QUIZ_BANK[subunitId] || [];
  return pool.length;
}
