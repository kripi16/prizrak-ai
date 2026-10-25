export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Разрешён только POST." });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: "ИИ ещё не подключён: добавь GEMINI_API_KEY в настройках проекта на хостинге."
    });
  }
  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = messages.find(m => m.role === "system")?.content ||
      "Ты Призрак — дружелюбный ИИ-помощник, говори по-русски, естественно и с юмором.";
    const contents = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "").slice(0, 20000) }]
      }));
    if (!contents.length) return res.status(400).json({ error: "Пустое сообщение." });

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: String(system).slice(0, 5000) }] },
          contents,
          generationConfig: {
            temperature: typeof body.temperature === "number" ? body.temperature : 0.8,
            maxOutputTokens: 2048
          }
        })
      }
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      const message = data?.error?.message || `Ошибка Gemini API: ${upstream.status}`;
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: message });
    }
    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "").join("").trim();
    return res.status(200).json({
      choices: [{ message: { role: "assistant", content: answer || "Не удалось получить текстовый ответ." } }]
    });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера: " + (error?.message || "неизвестная ошибка") });
  }
}
