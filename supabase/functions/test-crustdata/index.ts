import { enrichProfiles, normalizeProfile } from "../_shared/crustDataClient.ts";

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { "Content-Type": "application/json" },
      status: 405,
    });
  }

  let url;
  try {
    const body = await req.json();
    url = body.url;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url in request body" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  try {
    const { profiles, pending } = await enrichProfiles([url]);
    
    if (pending.length > 0) {
      return new Response(JSON.stringify({ status: "pending", url }), {
        headers: { "Content-Type": "application/json" },
        status: 202,
      });
    }

    if (profiles.length === 0) {
      return new Response(JSON.stringify({ error: "No profile found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      });
    }

    const raw = profiles[0];
    const normalized = normalizeProfile(raw);

    return new Response(JSON.stringify({ raw, normalized }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
