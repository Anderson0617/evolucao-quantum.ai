import { ai } from "../src/lib/aiClient";

async function main() {
  const r = await ai.chat.completions.create({
    model: "gemma3:4b",
    messages: [
      { role: "system", content: "Responda apenas: Ok Codex local." },
      { role: "user", content: "Diga algo." }
    ],
    temperature: 0.2,
  });
  console.log(r.choices?.[0]?.message?.content ?? "(sem conteúdo)");
}
main().catch(console.error);
