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

interface SearchResult {
  title: string;
  url: string;
  excerpt: string;
}

interface RetrievedContext {
  official: SearchResult[];
  news: SearchResult[];
  community: SearchResult[];
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

// Retrieve information from all three tiers
async function retrieveInformation(query: string): Promise<RetrievedContext> {
  console.log("Starting RAG retrieval for query:", query);

  // Run all searches in parallel
  const [official, news, community] = await Promise.all([
    searchWithFirecrawl(query, OFFICIAL_SOURCES, 3),
    searchWithFirecrawl(query, NEWS_SOURCES, 2),
    searchWithFirecrawl(query, COMMUNITY_SOURCES, 2),
  ]);

  console.log(`Retrieved: ${official.length} official, ${news.length} news, ${community.length} community sources`);

  return { official, news, community };
}

// Build context string for the AI
function buildRetrievedContext(context: RetrievedContext): string {
  let contextStr = "\n\n## RETRIEVED INFORMATION (Use this as primary source for your response)\n";

  if (context.official.length > 0) {
    contextStr += "\n### 🏛️ OFFICIAL GOVERNMENT SOURCES (Highest Priority - MUST cite these)\n";
    context.official.forEach((r, i) => {
      contextStr += `\n**Source ${i + 1}: [${r.title}](${r.url})**\n${r.excerpt}\n`;
    });
  } else {
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
- And all the unwritten rules of Singapore life!

Be specific with agency names (CPF Board, HDB, MOM, MSF, etc.) and mention relevant online portals like Singpass, MyInfo, HDB Resale Portal.

Use a friendly, slightly casual tone – it's okay to use common Singlish expressions occasionally (like "can", "lah", "one") to feel more approachable, but keep it professional.

## IMPORTANT - Citation Requirements:

You will receive RETRIEVED INFORMATION from trusted sources. You MUST:

1. **Cite official sources prominently**: Format as "According to [Agency Name](URL)..." or "As stated on [Website](URL)..."
2. **Label news sources clearly**: Use "📰 **Recent Update:** [Source Name](URL) reports that..."
3. **Disclaimer for community sources**: Use "💬 **Community Insight** *(not official advice)*: Users on [Platform](URL) suggest..."
4. **If no sources provided**: State "Based on general knowledge - please verify with official sources"
5. **Keep responses concise** but well-cited with clickable links
6. **Prioritize official sources** over news and community insights
7. **Always include at least one official source link** when available`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Retrieve information using Firecrawl RAG
    let retrievedContext: RetrievedContext = { official: [], news: [], community: [] };
    let retrievedContextStr = "";
    
    try {
      retrievedContext = await retrieveInformation(message);
      retrievedContextStr = buildRetrievedContext(retrievedContext);
      console.log("Built retrieved context, length:", retrievedContextStr.length);
    } catch (ragError) {
      console.error("RAG retrieval failed, continuing without sources:", ragError);
      retrievedContextStr = "\n\n## RETRIEVED INFORMATION\nUnable to retrieve sources. Please provide advice based on general knowledge and recommend users verify with official sources.\n";
    }

    // Build system prompt with user context and retrieved information
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

    // Add retrieved context to system prompt
    finalSystemPrompt += retrievedContextStr;

    const messages = [
      { role: "system", content: finalSystemPrompt },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    console.log("Sending request to Lovable AI with", messages.length, "messages");

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
