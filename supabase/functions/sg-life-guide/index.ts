import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Missing-Preference, X-Inferred-Preferences",
};

// Source tier definitions
const OFFICIAL_SOURCES = [
  "gov.sg",
  "hdb.gov.sg",
  "mom.gov.sg",
  "moh.gov.sg",
  "iras.gov.sg",
  "ica.gov.sg",
  "lta.gov.sg",
  "msf.gov.sg",
  "imda.gov.sg",
  "ask.gov.sg",
  "cpf.gov.sg",
  "healthhub.sg",
  "mycareersfuture.gov.sg",
  "singpass.gov.sg",
  "moe.gov.sg",
  "mnd.gov.sg",
  "ns.sg"
];

const NEWS_SOURCES = [
  "channelnewsasia.com",
  "straitstimes.com",
  "todayonline.com",
  "tnp.sg"
];

const COMMUNITY_SOURCES = [
  "reddit.com/r/singapore",
  "reddit.com/r/askSingapore",
  "hardwarezone.com.sg"
];

// Business/location-based sources for finding stores, restaurants, services
const BUSINESS_SOURCES = [
  "google.com/maps",
  "tripadvisor.com.sg",
  "burpple.com",
  "hungrygowhere.com",
  "yelp.com.sg",
  "openrice.com",
  "timeout.com/singapore",
  "danielfooddiary.com",
  "sethlui.com",
  "ladyironchef.com"
];

interface SearchResult {
  title: string;
  url: string;
  excerpt: string;
}

interface RetrievedContext {
  official: SearchResult[];
  news: SearchResult[];
  community: SearchResult[];
  business: SearchResult[];
}

// Search using Firecrawl
async function searchWithFirecrawl(
  query: string,
  sites: string[],
  limit: number = 3
): Promise<SearchResult[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (!FIRECRAWL_API_KEY) {
    console.error("FIRECRAWL_API_KEY is not configured");
    return [];
  }

  try {
    // Build site filter query
    const siteFilter = sites.map(s => `site:${s}`).join(" OR ");
    const searchQuery = `${query} (${siteFilter})`;
    
    console.log("Searching Firecrawl:", searchQuery);

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: limit,
        lang: "en",
        country: "sg",
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firecrawl search error:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log("Firecrawl response:", JSON.stringify(data).slice(0, 500));

    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map((result: any) => ({
      title: result.title || result.url,
      url: result.url,
      excerpt: (result.markdown || result.description || "").slice(0, 500),
    }));
  } catch (error) {
    console.error("Firecrawl search failed:", error);
    return [];
  }
}

// Detect if query is location/business related
function isLocationQuery(query: string): boolean {
  const locationKeywords = [
    "nearby", "near me", "find", "store", "shop", "restaurant", "hawker",
    "food", "eat", "where to", "location", "address", "opening", "hours",
    "open now", "close", "operating hours", "stall", "market", "mall",
    "cafe", "coffee", "bubble tea", "salon", "clinic", "pharmacy",
    "chicken rice", "laksa", "nasi lemak", "roti prata", "bak kut teh"
  ];
  const lowerQuery = query.toLowerCase();
  return locationKeywords.some(keyword => lowerQuery.includes(keyword));
}

// Retrieve information from all tiers
async function retrieveInformation(query: string): Promise<RetrievedContext> {
  console.log("Starting RAG retrieval for query:", query);

  const isLocationBased = isLocationQuery(query);
  console.log("Location-based query detected:", isLocationBased);

  // Run all searches in parallel
  const searchPromises: Promise<SearchResult[]>[] = [
    searchWithFirecrawl(query, OFFICIAL_SOURCES, 3),
    searchWithFirecrawl(query, NEWS_SOURCES, 2),
    searchWithFirecrawl(query, COMMUNITY_SOURCES, 2),
  ];

  // Add business search for location-based queries
  if (isLocationBased) {
    // For location queries, search without site restrictions for better results
    searchPromises.push(searchBusinesses(query));
  } else {
    searchPromises.push(Promise.resolve([]));
  }

  const [official, news, community, business] = await Promise.all(searchPromises);

  console.log(`Retrieved: ${official.length} official, ${news.length} news, ${community.length} community, ${business.length} business sources`);

  return { official, news, community, business };
}

// Search for businesses/locations with a more open search
async function searchBusinesses(query: string): Promise<SearchResult[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (!FIRECRAWL_API_KEY) {
    console.error("FIRECRAWL_API_KEY is not configured");
    return [];
  }

  try {
    // Enhanced query for Singapore locations
    const searchQuery = `${query} Singapore opening hours address`;
    console.log("Searching businesses:", searchQuery);

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: "en",
        country: "sg",
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firecrawl business search error:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log("Business search response:", JSON.stringify(data).slice(0, 500));

    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map((result: any) => ({
      title: result.title || result.url,
      url: result.url,
      excerpt: (result.markdown || result.description || "").slice(0, 800), // More content for business details
    }));
  } catch (error) {
    console.error("Business search failed:", error);
    return [];
  }
}

// Build context string for the AI
function buildRetrievedContext(context: RetrievedContext): string {
  let contextStr = "\n\n## RETRIEVED INFORMATION (Use this as primary source for your response)\n";

  // Business sources first for location queries (most relevant)
  if (context.business.length > 0) {
    contextStr += "\n### 📍 BUSINESS/LOCATION RESULTS (Include specific store names, addresses, and hours)\n";
    context.business.forEach((r, i) => {
      contextStr += `\n**Result ${i + 1}: [${r.title}](${r.url})**\n${r.excerpt}\n`;
    });
  }

  if (context.official.length > 0) {
    contextStr += "\n### 🏛️ OFFICIAL GOVERNMENT SOURCES (Highest Priority - MUST cite these)\n";
    context.official.forEach((r, i) => {
      contextStr += `\n**Source ${i + 1}: [${r.title}](${r.url})**\n${r.excerpt}\n`;
    });
  } else if (context.business.length === 0) {
    contextStr += "\n### 🏛️ OFFICIAL GOVERNMENT SOURCES\nNo official sources found for this query.\n";
  }

  if (context.news.length > 0) {
    contextStr += "\n### 📰 NEWS SOURCES (For Context & Recent Updates)\n";
    context.news.forEach((r, i) => {
      contextStr += `\n**Source ${i + 1}: [${r.title}](${r.url})**\n${r.excerpt}\n`;
    });
  }

  if (context.community.length > 0) {
    contextStr += "\n### 💬 COMMUNITY DISCUSSIONS (Anecdotal - Use with Disclaimer)\n";
    context.community.forEach((r, i) => {
      contextStr += `\n**Source ${i + 1}: [${r.title}](${r.url})**\n${r.excerpt}\n`;
    });
  }

  return contextStr;
}

// SEA-LION enhancement for Southeast Asian cultural context
async function enhanceWithSeaLion(
  userMessage: string,
  userContext: string | null
): Promise<string | null> {
  const SEALION_API_KEY = Deno.env.get("SEALION_API_KEY");
  
  if (!SEALION_API_KEY) {
    console.log("SEALION_API_KEY not configured, skipping SEA-LION enhancement");
    return null;
  }

  try {
    console.log("Calling SEA-LION for cultural context enhancement");
    
    const seaLionPrompt = `You are an expert on Southeast Asian cultures, languages, and contexts, with deep knowledge of Singapore's multicultural society.

Analyze the following user query and provide:
1. Cultural context that may be relevant (Malay, Chinese, Indian, Eurasian perspectives)
2. Any Singlish or local language nuances that should be considered
3. Cultural sensitivities or traditions that apply
4. Local customs, practices, or unwritten rules relevant to the query
5. Any dialect-specific terms or concepts (Hokkien, Teochew, Cantonese, Tamil, Malay)

Keep your response concise and focused on cultural insights that would help give better advice.

${userContext ? `User Profile:\n${userContext}\n\n` : ""}User Query: "${userMessage}"

Provide cultural context insights:`;

    const response = await fetch("https://api.sea-lion.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SEALION_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "aisingapore/Llama-SEA-LION-v3.5-8B-R",
        messages: [
          { role: "user", content: seaLionPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SEA-LION API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const culturalContext = data.choices?.[0]?.message?.content;
    
    if (culturalContext) {
      console.log("SEA-LION cultural context retrieved, length:", culturalContext.length);
      return culturalContext;
    }
    
    return null;
  } catch (error) {
    console.error("SEA-LION enhancement failed:", error);
    return null;
  }
}

// Preference detection - check what preferences might be helpful for the query
function detectMissingPreferences(
  query: string,
  existingPreferences: string | null
): string | null {
  const lowerQuery = query.toLowerCase();
  const prefs = existingPreferences?.toLowerCase() || "";
  
  // Map of query keywords to preference keys
  const preferenceMap: Record<string, { keywords: string[]; key: string }> = {
    housing_status: {
      keywords: ["hdb", "bto", "resale", "rent", "house", "flat", "condo", "home", "move", "property"],
      key: "housing_status"
    },
    budget_preference: {
      keywords: ["budget", "cheap", "affordable", "cost", "price", "expensive", "money", "save"],
      key: "budget_preference"
    },
    citizenship_status: {
      keywords: ["pr", "citizen", "foreigner", "visa", "ep", "pass", "immigrant", "apply", "cpf"],
      key: "citizenship_status"
    },
    employment_type: {
      keywords: ["job", "work", "salary", "employ", "career", "income", "freelance", "self-employed"],
      key: "employment_type"
    },
    family_status: {
      keywords: ["married", "family", "kids", "child", "baby", "spouse", "parent", "single"],
      key: "family_status"
    },
    timeline_preference: {
      keywords: ["when", "urgent", "soon", "deadline", "time", "quickly", "asap", "plan"],
      key: "timeline_preference"
    }
  };
  
  // Find relevant preference that's missing
  for (const [prefKey, config] of Object.entries(preferenceMap)) {
    const isRelevant = config.keywords.some(kw => lowerQuery.includes(kw));
    const hasPref = prefs.includes(prefKey);
    
    if (isRelevant && !hasPref) {
      return config.key;
    }
  }
  
  return null;
}

// Infer preferences from user message content
interface InferredPreference {
  key: string;
  value: string;
  label: string;
}

function inferPreferencesFromMessage(message: string): InferredPreference[] {
  const inferred: InferredPreference[] = [];
  const lowerMessage = message.toLowerCase();

  // Housing patterns
  const hdbPatterns = [
    { pattern: /\b(live|stay|staying|living)\s+(in\s+)?(a\s+)?(\d[-\s]?room)\s*(hdb|flat)?/i, extract: (m: RegExpMatchArray) => ({ value: m[4].replace(/\s+/g, "-").toLowerCase() + "-hdb", label: m[4].replace(/-/g, " ").toUpperCase() + " HDB" }) },
    { pattern: /\b(own|bought|have)\s+(a\s+)?(\d[-\s]?room)\s*(hdb|flat)/i, extract: (m: RegExpMatchArray) => ({ value: m[3].replace(/\s+/g, "-").toLowerCase() + "-hdb-owner", label: m[3].replace(/-/g, " ").toUpperCase() + " HDB (Owner)" }) },
    { pattern: /\brenting\s+(a\s+)?(\d[-\s]?room|hdb|condo|apartment)/i, extract: () => ({ value: "renting", label: "Renting" }) },
    { pattern: /\b(live|stay)\s+(in\s+)?(a\s+)?condo(minium)?/i, extract: () => ({ value: "condo", label: "Condominium" }) },
    { pattern: /\b(live|stay)\s+with\s+(my\s+)?parents/i, extract: () => ({ value: "with-parents", label: "Living with parents" }) },
  ];

  for (const { pattern, extract } of hdbPatterns) {
    const match = message.match(pattern);
    if (match) {
      const result = extract(match);
      inferred.push({ key: "housing_status", ...result });
      break;
    }
  }

  // Citizenship patterns
  const citizenshipPatterns = [
    { pattern: /\bi('m|\s+am)\s+(a\s+)?pr\b/i, value: "pr", label: "Permanent Resident" },
    { pattern: /\bi('m|\s+am)\s+(a\s+)?permanent\s+resident/i, value: "pr", label: "Permanent Resident" },
    { pattern: /\bi('m|\s+am)\s+(a\s+)?singapore(an)?\s+citizen/i, value: "citizen", label: "Singapore Citizen" },
    { pattern: /\bi('m|\s+am)\s+(a\s+)?citizen/i, value: "citizen", label: "Singapore Citizen" },
    { pattern: /\bi('m|\s+am)\s+(a\s+)?foreigner/i, value: "foreigner", label: "Foreigner" },
    { pattern: /\bi('m|\s+am)\s+on\s+(an?\s+)?(ep|employment\s+pass)/i, value: "ep", label: "Employment Pass Holder" },
    { pattern: /\bi('m|\s+am)\s+on\s+(an?\s+)?(s\s*pass|spass)/i, value: "spass", label: "S Pass Holder" },
    { pattern: /\bi('m|\s+am)\s+on\s+(an?\s+)?(wp|work\s+permit)/i, value: "wp", label: "Work Permit Holder" },
    { pattern: /\bi('m|\s+am)\s+(a\s+)?new\s+citizen/i, value: "new-citizen", label: "New Citizen" },
  ];

  for (const { pattern, value, label } of citizenshipPatterns) {
    if (pattern.test(message)) {
      inferred.push({ key: "citizenship_status", value, label });
      break;
    }
  }

  // Family status patterns
  const familyPatterns = [
    { pattern: /\b(i('m|\s+am)|we('re|\s+are))\s+married/i, value: "married", label: "Married" },
    { pattern: /\bmy\s+(wife|husband|spouse)/i, value: "married", label: "Married" },
    { pattern: /\bi('m|\s+am)\s+single/i, value: "single", label: "Single" },
    { pattern: /\b(have|got)\s+(\d+\s+)?(kids?|child(ren)?)/i, value: "with-children", label: "With children" },
    { pattern: /\bmy\s+(kids?|child(ren)?|son|daughter)/i, value: "with-children", label: "With children" },
    { pattern: /\b(expecting|pregnant|having\s+a\s+baby)/i, value: "expecting", label: "Expecting" },
    { pattern: /\bi('m|\s+am)\s+(engaged|getting\s+married)/i, value: "engaged", label: "Engaged" },
  ];

  for (const { pattern, value, label } of familyPatterns) {
    if (pattern.test(message)) {
      inferred.push({ key: "family_status", value, label });
      break;
    }
  }

  // Employment patterns
  const employmentPatterns = [
    { pattern: /\bi('m|\s+am)\s+(a\s+)?(freelancer|freelancing)/i, value: "freelance", label: "Freelancer" },
    { pattern: /\bi('m|\s+am)\s+self[-\s]?employed/i, value: "self-employed", label: "Self-employed" },
    { pattern: /\bi('m|\s+am)\s+(a\s+)?business\s+owner/i, value: "business-owner", label: "Business Owner" },
    { pattern: /\bi('m|\s+am)\s+(currently\s+)?(unemployed|jobless|looking\s+for\s+(a\s+)?job)/i, value: "unemployed", label: "Unemployed" },
    { pattern: /\bi('m|\s+am)\s+(a\s+)?student/i, value: "student", label: "Student" },
    { pattern: /\bi('m|\s+am)\s+retired/i, value: "retired", label: "Retired" },
    { pattern: /\bi\s+work\s+(at|for|in)/i, value: "employed", label: "Employed" },
    { pattern: /\bi('m|\s+am)\s+working\s+(at|for|in|as)/i, value: "employed", label: "Employed" },
  ];

  for (const { pattern, value, label } of employmentPatterns) {
    if (pattern.test(message)) {
      inferred.push({ key: "employment_type", value, label });
      break;
    }
  }

  // Likes/interests patterns (flexible catch-all for hobbies, food, etc.)
  const likePatterns = [
    /\bi\s+(like|love|enjoy|prefer|want|crave|feel like)\s+(?:to\s+eat\s+|eating\s+|some\s+)?([^,.!?]+)/gi,
    /\bmy\s+favo(u)?rite\s+(\w+)\s+is\s+([^,.!?]+)/gi,
    /\bi('m|\s+am)\s+(a\s+)?(fan\s+of|into|craving)\s+([^,.!?]+)/gi,
    /\b([^,.!?]+)\s+sounds?\s+good/gi,
  ];

  // Match "I like/want X" patterns
  const likeMatch = message.match(/\bi\s+(like|love|enjoy|prefer|want|crave|feel like)\s+(?:to\s+eat\s+|eating\s+|some\s+)?([^,.!?]+)/i);
  if (likeMatch) {
    const item = likeMatch[2].trim().toLowerCase();
    if (item.length > 2 && !["it", "to", "the", "this", "that", "a", "an"].includes(item)) {
      const cleanItem = item.replace(/\s+/g, "_").slice(0, 30);
      inferred.push({ 
        key: `likes_${cleanItem}`, 
        value: item, 
        label: `Likes ${item}` 
      });
    }
  }

  // Match "X sounds good" pattern
  const soundsGoodMatch = message.match(/\b([a-zA-Z\s]+)\s+sounds?\s+good/i);
  if (soundsGoodMatch && !likeMatch) {
    const item = soundsGoodMatch[1].trim().toLowerCase();
    if (item.length > 2 && !["it", "that", "this", "which"].includes(item)) {
      const cleanItem = item.replace(/\s+/g, "_").slice(0, 30);
      inferred.push({ 
        key: `likes_${cleanItem}`, 
        value: item, 
        label: `Likes ${item}` 
      });
    }
  }

  // Location/area patterns
  const areaPatterns = [
    { pattern: /\b(live|stay|staying|living|work|working)\s+(in|at|near)\s+(tampines|jurong|bedok|woodlands|yishun|ang mo kio|toa payoh|bishan|clementi|queenstown|bukit|punggol|sengkang|pasir ris|hougang|serangoon|kallang|geylang|marine parade|east coast|west coast|changi|central|orchard|bugis|chinatown|little india|harbourfront|sentosa)/i, extract: (m: RegExpMatchArray) => ({ key: m[1].toLowerCase().includes("work") ? "work_area" : "home_area", value: m[3].toLowerCase(), label: m[3].charAt(0).toUpperCase() + m[3].slice(1) }) },
  ];

  for (const { pattern, extract } of areaPatterns) {
    const match = message.match(pattern);
    if (match) {
      const result = extract(match);
      inferred.push(result);
    }
  }

  // Budget preference patterns
  const budgetPatterns = [
    { pattern: /\bi('m|\s+am)\s+(on\s+a\s+)?(tight\s+)?budget/i, value: "budget-conscious", label: "Budget conscious" },
    { pattern: /\b(looking\s+for\s+)?(cheap|affordable|budget)/i, value: "budget-conscious", label: "Budget conscious" },
    { pattern: /\b(money|cost)\s+(is\s+)?(not|no)\s+(a\s+)?(problem|issue|concern)/i, value: "flexible", label: "Flexible budget" },
    { pattern: /\b(willing\s+to|can)\s+(spend|pay)\s+(more|extra)/i, value: "flexible", label: "Flexible budget" },
  ];

  for (const { pattern, value, label } of budgetPatterns) {
    if (pattern.test(message)) {
      inferred.push({ key: "budget_preference", value, label });
      break;
    }
  }

  return inferred;
}

const systemPrompt = `You are "SG Life Guide" – a warm, knowledgeable AI assistant that helps people navigate life in Singapore. You speak like a helpful Singaporean friend who knows the ins and outs of living here.

## CRITICAL: Response Style
Keep responses SHORT and CONVERSATIONAL - aim for 2-3 short paragraphs max. Users can ask follow-up questions.
- Do NOT provide exhaustive lists or full guides upfront
- Give a helpful, focused answer first
- End with a question to understand what the user wants to explore further
- Use conversational tone, not essay format

Your approach:
1. Give a brief, direct answer to what they asked (1-2 paragraphs)
2. Offer 2-4 specific follow-up options they can choose from
3. Ask which direction they want to go

IMPORTANT: At the end of EVERY response, include a "Quick options" section formatted EXACTLY like this:
---QUICK_OPTIONS---
[Option 1 label]|[Short description]
[Option 2 label]|[Short description]  
[Option 3 label]|[Short description]
---END_OPTIONS---

Example:
"Wah, looking for chicken rice near Tampines? There are a few good spots! What kind of experience are you looking for?

---QUICK_OPTIONS---
Hawker style|Classic kopitiam vibes, budget-friendly
Restaurant|Air-con comfort, can sit longer
Best rated|Top picks regardless of price
Near MRT|Easy to get to via public transport
---END_OPTIONS---"

You know about:
- CPF, HDB, BTO, resale, rental procedures
- Work permits, employment passes, PR applications
- Starting families (MOM schemes, baby bonus, childcare)
- Education system (registration, PSLE, O/A levels, polytechnic, university)
- Healthcare (Medisave, MediShield, CHAS)
- Career transitions and SkillsFuture
- Retirement planning
- Rental agreements and tenant rights
- COE, car ownership, public transport
- Local food, restaurants, hawker centres, and places to visit
- And all the unwritten rules of Singapore life!

Be specific with agency names (CPF Board, HDB, MOM, MSF, etc.) and mention relevant online portals like Singpass, MyInfo, HDB Resale Portal.

Use a friendly, slightly casual tone – it's okay to use common Singlish expressions occasionally (like "can", "lah", "one") to feel more approachable, but keep it professional.

## HANDLING LOCATION/BUSINESS QUERIES:
When users ask about finding stores, restaurants, hawker stalls, or services nearby:
1. **Use the BUSINESS/LOCATION RESULTS** provided - cite specific store names and addresses
2. **Include opening hours** if available from the retrieved sources
3. **Indicate if a place is likely open today** based on operating hours (today is ${new Date().toLocaleDateString('en-SG', { weekday: 'long' })})
4. Provide **3-5 concrete recommendations** with details when results are found
5. Include links to sources so users can verify current information
6. If no specific results are found, suggest using Google Maps or food apps like Burpple, HungryGoWhere

## Cultural Sensitivity:
- Be aware of Singapore's multicultural society (Chinese, Malay, Indian, Eurasian communities)
- Consider cultural practices when giving advice (e.g., wedding customs, religious observances, festive periods)
- Understand local dialects and colloquialisms (Hokkien, Teochew, Cantonese, Tamil, Malay expressions)
- Be sensitive to different community practices and traditions

## IMPORTANT - Citation Requirements:

You will receive RETRIEVED INFORMATION from trusted sources. You MUST:

1. **Cite official sources prominently**: Format as "According to [Agency Name](URL)..." or "As stated on [Website](URL)..."
2. **For business/location results**: Use "📍 **[Store Name](URL)** - [Address] - Opening hours: [hours]"
3. **Label news sources clearly**: Use "📰 **Recent Update:** [Source Name](URL) reports that..."
4. **Disclaimer for community sources**: Use "💬 **Community Insight** *(not official advice)*: Users on [Platform](URL) suggest..."
5. **If no sources provided**: State "Based on general knowledge - please verify with official sources"
6. **Keep responses concise** but well-cited with clickable links
7. **Prioritize official sources** over news and community insights
8. **Always include at least one official source link** when available`;

// Input validation constants
const MAX_MESSAGE_LENGTH = 5000;
const MAX_CONVERSATION_HISTORY = 20;
const MAX_USER_CONTEXT_LENGTH = 10000;
const MAX_PREFERENCES_CONTEXT_LENGTH = 5000;

// Sanitize string input - removes potentially dangerous characters
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove null bytes and control characters except newlines/tabs
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

// Validate and sanitize message content
function validateMessage(message: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof message !== 'string') {
    return { valid: false, sanitized: '', error: 'Message must be a string' };
  }
  
  const sanitized = sanitizeInput(message);
  
  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'Message cannot be empty' };
  }
  
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, sanitized: '', error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` };
  }
  
  return { valid: true, sanitized };
}

// Validate conversation history
function validateConversationHistory(history: unknown): { role: string; content: string }[] {
  if (!Array.isArray(history)) return [];
  
  return history
    .slice(-MAX_CONVERSATION_HISTORY) // Keep only recent messages
    .filter((msg): msg is { role: string; content: string } => 
      typeof msg === 'object' && 
      msg !== null &&
      typeof msg.role === 'string' &&
      typeof msg.content === 'string' &&
      ['user', 'assistant', 'system'].includes(msg.role)
    )
    .map(msg => ({
      role: msg.role,
      content: sanitizeInput(msg.content).slice(0, MAX_MESSAGE_LENGTH)
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, conversationHistory, userContext, preferencesContext } = body;
    
    // Validate message
    const messageValidation = validateMessage(message);
    if (!messageValidation.valid) {
      console.log("Message validation failed:", messageValidation.error);
      return new Response(JSON.stringify({ error: messageValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sanitizedMessage = messageValidation.sanitized;
    
    // Validate and sanitize conversation history
    const validatedHistory = validateConversationHistory(conversationHistory);
    
    // Sanitize optional context strings
    const sanitizedUserContext = typeof userContext === 'string' 
      ? sanitizeInput(userContext).slice(0, MAX_USER_CONTEXT_LENGTH) 
      : null;
    const sanitizedPreferencesContext = typeof preferencesContext === 'string'
      ? sanitizeInput(preferencesContext).slice(0, MAX_PREFERENCES_CONTEXT_LENGTH)
      : null;
    
    console.log(`Request validated: message=${sanitizedMessage.length}chars, history=${validatedHistory.length}msgs`);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Detect missing preferences that could help personalize the response
    const missingPreference = detectMissingPreferences(sanitizedMessage, sanitizedPreferencesContext);
    if (missingPreference) {
      console.log("Missing preference detected:", missingPreference);
    }
    
    // Infer preferences from the user's message
    const inferredPreferences = inferPreferencesFromMessage(sanitizedMessage);
    if (inferredPreferences.length > 0) {
      console.log("Inferred preferences:", JSON.stringify(inferredPreferences));
    }
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Run RAG retrieval and SEA-LION enhancement in parallel
    const [retrievedContext, culturalContext] = await Promise.all([
      retrieveInformation(sanitizedMessage).catch(err => {
        console.error("RAG retrieval failed:", err);
        return { official: [], news: [], community: [], business: [] } as RetrievedContext;
      }),
      enhanceWithSeaLion(sanitizedMessage, sanitizedUserContext).catch(err => {
        console.error("SEA-LION failed:", err);
        return null;
      }),
    ]);

    // Build retrieved context string
    let retrievedContextStr = "";
    const hasResults = retrievedContext.official.length > 0 || 
                       retrievedContext.news.length > 0 || 
                       retrievedContext.community.length > 0 ||
                       retrievedContext.business.length > 0;
    
    if (hasResults) {
      retrievedContextStr = buildRetrievedContext(retrievedContext);
      console.log("Built retrieved context, length:", retrievedContextStr.length);
    } else {
      retrievedContextStr = "\n\n## RETRIEVED INFORMATION\nNo sources retrieved. Provide advice based on general knowledge and recommend users verify with official sources.\n";
    }

    // Build system prompt with user context, cultural context, and retrieved information
    let finalSystemPrompt = systemPrompt;
    
    if (sanitizedUserContext) {
      finalSystemPrompt += `

IMPORTANT: The user has logged in with Singpass and you have access to their verified personal information. Use this context to provide highly personalised advice. Reference their specific situation (age, income, CPF, housing status, etc.) when giving recommendations. Here is their profile:

${sanitizedUserContext}

When responding:
- Address them by their first name
- Reference specific numbers from their profile (e.g., their CPF balance, income level)
- Tailor advice to their exact life stage and circumstances
- Mention schemes they specifically qualify for based on their profile`;
    }

    // Add SEA-LION cultural context if available
    if (culturalContext) {
      finalSystemPrompt += `

## 🌏 SOUTHEAST ASIAN CULTURAL CONTEXT (from SEA-LION AI)
Consider the following cultural insights when formulating your response:

${culturalContext}

Use these cultural insights to make your advice more relevant and sensitive to local customs and practices.`;
    }

    // Add preferences context if available
    if (sanitizedPreferencesContext) {
      finalSystemPrompt += sanitizedPreferencesContext;
    }

    // Add retrieved context to system prompt
    finalSystemPrompt += retrievedContextStr;

    const messages = [
      { role: "system", content: finalSystemPrompt },
      ...validatedHistory,
      { role: "user", content: sanitizedMessage }
    ];

    console.log("Sending request to Lovable AI with", messages.length, "messages");
    console.log("Cultural context included:", !!culturalContext);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Failed to generate response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add custom headers with preference info
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
    };
    
    if (missingPreference) {
      responseHeaders["X-Missing-Preference"] = missingPreference;
    }
    
    // Send inferred preferences in header (JSON encoded, limited to avoid header size issues)
    if (inferredPreferences.length > 0) {
      responseHeaders["X-Inferred-Preferences"] = JSON.stringify(inferredPreferences.slice(0, 5));
    }

    return new Response(response.body, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("SG Life Guide error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
