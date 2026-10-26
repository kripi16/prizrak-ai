export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  if (!apiKey) {
    return res.status(500).json({
      error: "Не настроен OPENROUTER_API_KEY в Vercel."
    });
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return res.status(400).json({
        error: "История сообщений не передана."
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Призрак AI"
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data?.error?.message || "Ошибка OpenRouter. Проверь модель и API-ключ."
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "Модель не вернула ответ. Попробуй выбрать другую модель."
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "Не удалось подключиться к OpenRouter."
    });
  }
}
