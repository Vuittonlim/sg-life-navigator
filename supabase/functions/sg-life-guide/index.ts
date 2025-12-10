import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const systemPrompt = `You are "SG Life Guide" – a warm, knowledgeable AI assistant that helps people navigate life in Singapore. You speak like a helpful Singaporean friend who knows the ins and outs of living here.

Your approach:
1. Listen to the user's life situation with empathy
2. Understand their specific context (citizenship status, family situation, budget, timeline)
3. Provide a personalised, step-by-step checklist of what they need to do
4. Include practical tips, government schemes they might qualify for, and common pitfalls to avoid

Format your responses as:
- Start with a brief, reassuring acknowledgment of their situation
- Provide numbered steps in a clear checklist format
- Include estimated timeframes where applicable
- Add "Pro tips" for insider knowledge
- End with encouragement

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], userContext, preferencesContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Run RAG retrieval and SEA-LION enhancement in parallel
    const [retrievedContext, culturalContext] = await Promise.all([
      retrieveInformation(message).catch(err => {
        console.error("RAG retrieval failed:", err);
        return { official: [], news: [], community: [], business: [] } as RetrievedContext;
      }),
      enhanceWithSeaLion(message, userContext).catch(err => {
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
    
    if (userContext) {
      finalSystemPrompt += `

IMPORTANT: The user has logged in with Singpass and you have access to their verified personal information. Use this context to provide highly personalised advice. Reference their specific situation (age, income, CPF, housing status, etc.) when giving recommendations. Here is their profile:

${userContext}

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
    if (preferencesContext) {
      finalSystemPrompt += preferencesContext;
    }

    // Add retrieved context to system prompt
    finalSystemPrompt += retrievedContextStr;

    const messages = [
      { role: "system", content: finalSystemPrompt },
      ...conversationHistory,
      { role: "user", content: message }
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("SG Life Guide error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
