// Multiple-choice quiz questions for the teacher-only classroom quiz game.
// Independent from the graded practice question banks in BizQuest.js — these are for a
// fast-paced review game, not assessed/marked work, so they're kept separate.
// Each question: { q, options: [4 strings], correct: index, explain: shown after reveal }

export const QUIZ_BANK = {
  "1.1": [
    { q: "What is a business?", options: ["An organization that produces or provides goods and/or services to meet customer needs or wants", "Any building used for commercial purposes", "A government-registered taxpayer", "A person who invests in the stock market"], correct: 0 },
    { q: "Which sector of the economy extracts raw materials like minerals, oil, or timber?", options: ["Secondary", "Tertiary", "Primary", "Quaternary"], correct: 2 },
    { q: "Manufacturing a finished good from raw materials belongs to which sector?", options: ["Primary", "Secondary", "Tertiary", "Quaternary"], correct: 1 },
    { q: "Which sector covers services like banking, retail and healthcare?", options: ["Primary", "Secondary", "Tertiary", "Quaternary"], correct: 2 },
    { q: "The quaternary sector focuses mainly on:", options: ["Farming and fishing", "Factory production", "Information, research and knowledge-based services", "Retail sales"], correct: 2 },
    { q: "An entrepreneur is best described as someone who:", options: ["Only manages other people's businesses", "Organizes, operates and assumes the risk of a business venture", "Works exclusively in finance", "Invests passively without any risk"], correct: 1 },
    { q: "In which US city did Steve Jobs and Steve Wozniak found Apple, in a family garage?", options: ["Cupertino", "Los Altos", "San Francisco", "Palo Alto"], correct: 1 },
    { q: "In what year was Apple founded?", options: ["1974", "1976", "1980", "1984"], correct: 1 },
    { q: "Besides Jobs and Wozniak, who was Apple's third co-founder?", options: ["Mike Markkula", "John Sculley", "Ronald Wayne", "Tim Cook"], correct: 2 },
    { q: "Which part of Apple's business is a clear example of tertiary/quaternary sector activity?", options: ["iPhone assembly", "Services (App Store, iCloud, etc.)", "Component manufacturing", "Raw material sourcing"], correct: 1 },
    { q: "Entrepreneurship is best defined as:", options: ["The process of organizing, operating and assuming the risk of a business venture", "The act of buying shares in a company", "A government tax on new businesses", "The study of economics"], correct: 0 },
    { q: "Which of these is NOT one of the four economic sectors?", options: ["Primary", "Secondary", "Monetary", "Tertiary"], correct: 2 },
  ],
  "1.2": [
    { q: "The private sector is best defined as:", options: ["The portion of an economy owned or directed by the government", "The portion of an economy not owned or directed by the government", "Only large multinational companies", "Businesses with fewer than 10 employees"], correct: 1 },
    { q: "A sole trader is:", options: ["A business owned and run by one person, with no legal distinction from the owner", "Always a publicly held company", "A business with unlimited shareholders", "Only found in the primary sector"], correct: 0 },
    { q: "In a general partnership, the partners are typically liable for the business's debts:", options: ["Not at all", "Only up to their original investment", "100%, regardless of any partnership agreement", "Only if they are the managing partner"], correct: 2 },
    { q: "A deed of partnership is:", options: ["A type of company share certificate", "A legal document formalizing how partners will share profits and losses", "A government tax filing", "A contract with a supplier"], correct: 1 },
    { q: "Under unlimited liability, a business owner's personal assets:", options: ["Are always fully protected", "Can be used to pay off business debts", "Are protected up to a fixed government limit", "Cannot legally be touched"], correct: 1 },
    { q: "Incorporation is:", options: ["The process of paying corporate tax", "The legal process of forming a company as a separate legal entity from its owners", "A type of business loan", "Another word for bankruptcy"], correct: 1 },
    { q: "A shareholder is someone who:", options: ["Manages a company's daily operations", "Owns shares in a company, providing capital for part-ownership", "Audits a company's accounts", "Regulates a company on behalf of the government"], correct: 1 },
    { q: "A key feature of a privately held company is that its shares:", options: ["Are freely traded on a public stock exchange", "Cannot be sold without first being offered to existing shareholders, and aren't exchange-traded", "Must be owned by the government", "Can only be owned by employees"], correct: 1 },
    { q: "A publicly held company must typically:", options: ["Keep all financial information secret", "Disclose considerable information, including audited financial statements", "Avoid having any shareholders", "Operate only in one country"], correct: 1 },
    { q: "What did Apple's 1980 IPO raise, approximately?", options: ["$10 million", "$101 million", "$1 billion", "$500,000"], correct: 1 },
    { q: "A cooperative is a business:", options: ["Owned and operated by its members, who share the profits", "Owned entirely by the state", "Run by a single sole trader", "Only for non-profit charities"], correct: 0 },
    { q: "An NGO is best described as an organization that is:", options: ["Owned by shareholders and profit-driven", "Independent of government, usually non-profit, with a social/humanitarian purpose", "A branch of a multinational company", "Always government-funded and controlled"], correct: 1 },
    { q: "A for-profit social enterprise is a business that:", options: ["Never generates any profit", "Trades to address a social or environmental problem while also generating profit", "Is always owned by the government", "Cannot legally pay its employees"], correct: 1 },
  ],
  "1.3": [
    { q: "A vision statement is best described as:", options: ["A short-term sales target", "An outline of an organization's aspirations in the distant future", "A legal filing requirement", "A list of a company's competitors"], correct: 1 },
    { q: "A mission statement mainly declares:", options: ["A firm's underlying purpose and core values", "Its stock price target", "Its tax obligations", "Its factory locations"], correct: 0 },
    { q: "Which of these is a SMART objective?", options: ["\"Become a better company\"", "\"Try to be more sustainable soon\"", "\"Increase Services revenue by 10% within 12 months\"", "\"Make more money\""], correct: 2 },
    { q: "SMART stands for Specific, Measurable, Achievable, Relevant and:", options: ["Team-based", "Time-bound", "Transparent", "Tactical"], correct: 1 },
    { q: "Strategic objectives are best described as:", options: ["Short-term daily tasks", "Medium-to-long-term plans of action to reach a firm's objectives", "Only financial targets", "Government regulations"], correct: 1 },
    { q: "Tactics are best described as:", options: ["The firm's ultimate long-term vision", "Short-term methods used to keep a strategy on track", "A synonym for corporate social responsibility", "A type of business entity"], correct: 1 },
    { q: "Corporate social responsibility (CSR) reflects the view that businesses should:", options: ["Focus solely on maximizing shareholder profit", "Govern themselves in a way that enhances society and their stakeholders", "Avoid all government regulation", "Only report to their own board of directors"], correct: 1 },
    { q: "What ultimately happened to Theranos, used as a cautionary CSR/ethics example?", options: ["It became the most valuable tech company in the world", "It merged with Apple", "It was shut down after its technology was found to be flawed and fraudulent", "It successfully IPO'd"], correct: 2 },
    { q: "Apple's approximate FY2025 revenue was:", options: ["$41.6 million", "$416.16 billion", "$4.16 billion", "$1.6 trillion"], correct: 1 },
    { q: "Which of these is one of Apple's seven official corporate values?", options: ["Maximum shareholder dividends", "Lowest possible pricing", "Privacy", "Fastest delivery times"], correct: 2 },
    { q: "CSR objectives often create tension with which other type of business objective?", options: ["Marketing objectives only", "Financial/profit objectives", "Environmental objectives", "They never create any tension"], correct: 1 },
  ],
  "1.4": [
    { q: "A stakeholder is:", options: ["Only a shareholder of a company", "A person or organization that affects, or is affected by, a business", "Exclusively a government regulator", "Only a company's own employees"], correct: 1 },
    { q: "Which of these is an internal stakeholder?", options: ["A supplier", "A customer", "An employee", "A pressure group"], correct: 2 },
    { q: "Which of these is an external stakeholder?", options: ["A shareholder", "A manager", "A customer", "A company director"], correct: 2 },
    { q: "A pressure group is best defined as:", options: ["A company's board of directors", "Individuals with a common interest who organize to demand a change in business behaviour", "A type of financier", "A government tax authority"], correct: 1 },
    { q: "A financier is a stakeholder who mainly:", options: ["Provides a source of finance for a firm", "Manages daily factory operations", "Sets a firm's mission statement", "Regulates workplace safety"], correct: 0 },
    { q: "Stakeholder conflict happens when:", options: ["All stakeholder groups always want the exact same thing", "An organization can't meet all its stakeholder groups' objectives simultaneously", "A business has no external stakeholders at all", "Shareholders vote unanimously"], correct: 1 },
    { q: "In stakeholder mapping, a stakeholder with HIGH interest and HIGH power should be:", options: ["Given minimum effort", "Managed closely", "Kept informed only", "Ignored entirely"], correct: 1 },
    { q: "Approximately how many employees does Apple have worldwide, per the case study?", options: ["16,400", "164,000", "1.64 million", "64,000"], correct: 1 },
    { q: "Which organization investigated labour conditions at Apple's supplier factories?", options: ["The World Bank", "China Labor Watch", "The United Nations", "Interpol"], correct: 1 },
    { q: "The EU ruling against Apple's tax arrangements in Ireland involved approximately how much in alleged illegal state aid?", options: ["€1.3 million", "€13 billion", "€130 million", "€1.3 billion"], correct: 1 },
    { q: "Apple's target for supply chain carbon neutrality is:", options: ["2025", "2030", "2040", "2050"], correct: 1 },
  ],
  "1.5": [
    { q: "Internal (organic) growth happens when a business grows by:", options: ["Merging with a rival firm", "Using its own resources, e.g. reinvesting profit", "Acquiring another company", "Franchising its brand"], correct: 1 },
    { q: "External growth typically happens through:", options: ["Only raising employee wages", "Mergers, acquisitions, joint ventures, alliances or franchising", "Cutting all marketing spend", "Reducing the number of products sold"], correct: 1 },
    { q: "Economies of scale refer to:", options: ["Rising average costs as output grows", "Falling average costs as a firm's output grows", "A firm's total revenue", "A government subsidy"], correct: 1 },
    { q: "Diseconomies of scale occur when a firm:", options: ["Becomes more efficient as it grows", "Becomes too large or complex to manage efficiently, so average costs rise", "Reduces its output to zero", "Merges with a smaller firm"], correct: 1 },
    { q: "A merger is best described as:", options: ["One firm buying another against its will", "Two firms legally consolidating into one new company", "A firm closing down permanently", "A type of government regulation"], correct: 1 },
    { q: "A takeover typically differs from an ordinary acquisition because it is:", options: ["Always more expensive", "Done without the target company's agreement", "Only possible between two sole traders", "Illegal in most countries"], correct: 1 },
    { q: "A joint venture is when two businesses:", options: ["Merge into a single legal entity", "Create, own and operate a new third organization together", "Compete aggressively for the same customers", "Become sole traders"], correct: 1 },
    { q: "Franchising involves a franchisor:", options: ["Giving away its brand for free", "Licensing its brand and systems to franchisees, who typically pay fees and a revenue share", "Buying out all of its competitors", "Only operating in one single location"], correct: 1 },
    { q: "Apple's largest acquisition to date is approximately:", options: ["NeXT, for ~$400 million", "Beats Electronics, for ~$3 billion", "Intel's modem business, for $1 billion", "A $10 billion purchase of Foxconn"], correct: 1 },
    { q: "Apple's 2014 partnership with IBM, where both firms stayed fully independent, is an example of a:", options: ["Merger", "Takeover", "Strategic alliance", "Franchise"], correct: 2 },
    { q: "A key advantage of staying small (rather than pursuing growth) is:", options: ["Automatically lower prices for customers", "Greater flexibility to adapt quickly", "Larger economies of scale", "Stronger brand recognition"], correct: 1 },
  ],
  "1.6": [
    { q: "A multinational company (MNC) is one that:", options: ["Only exports goods, without any foreign operations", "Owns or controls operations in two or more countries", "Operates exclusively in its home country", "Is always government-owned"], correct: 1 },
    { q: "A host country is best described as:", options: ["The country where an MNC is headquartered", "Any nation that allows an MNC to set up operations there", "A country with no international trade", "The MNC's most profitable market"], correct: 1 },
    { q: "Offshoring occurs when a business:", options: ["Moves some or all operations to another country", "Brings a previously offshored operation back home", "Closes down entirely", "Merges with a foreign competitor"], correct: 0 },
    { q: "Reshoring is the opposite of offshoring — it means:", options: ["Expanding into a new foreign market", "Bringing a function performed abroad back to the home country", "Closing all foreign factories permanently", "Raising import tariffs"], correct: 1 },
    { q: "Repatriation of profits refers to:", options: ["Reinvesting all profit in the host country", "Transferring profits earned abroad back to the home country", "Donating profits to a host-country charity", "Paying host-country taxes only"], correct: 1 },
    { q: "Protectionism refers to government policies that:", options: ["Encourage unlimited free trade", "Restrict imports and protect domestic industries, e.g. via tariffs", "Ban all multinational companies", "Subsidize only foreign firms"], correct: 1 },
    { q: "Which host country's share of global iPhone production rose sharply, from roughly 5-7% in 2022 to about 25% by 2026?", options: ["Vietnam", "India", "Mexico", "Brazil"], correct: 1 },
    { q: "Foxconn's giant Zhengzhou plant, sometimes called \"iPhone City,\" is located in which country?", options: ["India", "Vietnam", "China", "South Korea"], correct: 2 },
    { q: "A key positive impact an MNC can bring to a host country is:", options: ["Automatic profit repatriation", "Job creation and technology transfer", "Guaranteed environmental damage", "Reduced local competition"], correct: 1 },
    { q: "A key risk an MNC can create for a host country is:", options: ["Permanent full employment", "Vulnerability if the local economy becomes overly dependent on that one MNC", "Automatically higher wages for everyone", "Elimination of all local businesses instantly"], correct: 1 },
    { q: "By mid-2025, which country had overtaken China as the leading source of smartphones imported into the US?", options: ["Vietnam", "India", "Mexico", "Indonesia"], correct: 1 },
  ],
};

export function getQuizQuestions(subunitId, count) {
  const pool = QUIZ_BANK[subunitId] || [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
