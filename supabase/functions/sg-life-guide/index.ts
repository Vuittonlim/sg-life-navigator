import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Use a friendly, slightly casual tone – it's okay to use common Singlish expressions occasionally (like "can", "lah", "one") to feel more approachable, but keep it professional.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages = [
      { role: "system", content: systemPrompt },
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
