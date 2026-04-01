import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res){

  const { text } = req.body;

  try{

    const aiResponse = await openai.chat.completions.create({
      model:"gpt-4o-mini",
      temperature: 0.6, // 🔥 biar variasi tapi masih stabil
      messages:[{
        role:"user",
        content: `
Buat 5 flashcard dari teks berikut.

ATURAN:
- Flashcard HARUS spesifik dari isi teks
- Jangan buat definisi umum
- Prioritaskan:
  • pasal (jika ada)
  • istilah penting
  • konsep utama
- Jika ada pasal → minimal 1 dan maksimal 3 flashcard HARUS berisi pasal
- Jika tidak ada pasal → fokus ke konsep paling penting
- Setiap term harus singkat & spesifik
- Definition harus jelas tapi tidak terlalu panjang

FORMAT WAJIB:
- JSON VALID
- TANPA markdown
- TANPA teks tambahan

Format:
[
  {
    "term": "...",
    "definition": "..."
  }
]

Teks:
${text.substring(0, 12000)}
`
      }]
    });

    let output = aiResponse.choices[0].message.content;

    // 🔥 bersihin markdown JSON
    output = output
      .replace(/```json/g,"")
      .replace(/```/g,"")
      .trim();

    res.json({ flashcards: output });

  }catch(err){
    console.error("FLASHCARD ERROR:", err);

    res.status(500).json({ 
      error:"flashcard error",
      flashcards: JSON.stringify([
        {
          term: "Fallback",
          definition: "Flashcard gagal dibuat karena error."
        }
      ])
    });
  }

}