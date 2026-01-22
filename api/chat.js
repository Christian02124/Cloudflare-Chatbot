export default {
  async fetch(request, env) {

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const { message, pdfText, mode } = await request.json();

    if (!message) {
      return new Response("Message required", { status: 400 });
    }

    // ===========================
    // PROMPT DINAMIS
    // ===========================
    let prompt = `
Kamu adalah AI asisten pintar seperti ChatGPT.
Jawab dengan natural, jelas, dan membantu.
`;

    if (pdfText) {
      prompt += `
Gunakan dokumen berikut sebagai REFERENSI TAMBAHAN.
Jika pertanyaan berkaitan dengan PDF, prioritaskan dokumen.
Jika tidak, jawab seperti AI biasa.

=== DOKUMEN ===
${pdfText}
`;
    }

    prompt += `
=== PERTANYAAN USER ===
${message}
`;

    // ===========================
    // JUDUL CHAT (AUTO)
    // ===========================
    if (mode === "title") {
      const titlePrompt = `
Ringkas pertanyaan berikut menjadi judul chat maksimal 5 kata:

"${message}"
`;
      const titleResult = await env.AI.run(
        "@cf/meta/llama-3-8b-instruct",
        { prompt: titlePrompt, max_tokens: 20 }
      );

      return Response.json({
        title: titleResult.response.trim(),
      });
    }

    // ===========================
    // CHAT NORMAL
    // ===========================
    const result = await env.AI.run(
      "@cf/meta/llama-3-8b-instruct",
      {
        prompt,
        max_tokens: 512,
      }
    );

    return Response.json({
      reply: result.response,
    });
  },
};