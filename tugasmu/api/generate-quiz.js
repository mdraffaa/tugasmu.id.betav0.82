import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res){

  const { text } = req.body;

  try{

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7, // 🔥 biar ga monoton
      messages: [{
        role:"user",
        content: `
Buat 1 soal pilihan ganda dari teks berikut.

ATURAN:
- Soal HARUS spesifik dari isi teks
- Jangan buat soal umum
- Fokus ke konsep penting atau detail (misal: pasal, definisi, proses)
- Soal harus berbeda setiap kali dibuat

FORMAT WAJIB:
- JSON VALID
- TANPA markdown
- options TANPA A/B/C/D di dalam teks

Format:
{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "answer": "A",
  "explanation": "..."
}

Teks:
${text.substring(0, 12000)}
`
      }]
    });

    let output = aiResponse.choices[0].message.content;

    // 🔥 bersihin JSON formatting
    output = output
      .replace(/```json/g,"")
      .replace(/```/g,"")
      .trim();

    res.json({ quiz: output });

  }catch(err){
    console.error("QUIZ ERROR:", err);

    res.status(500).json({ 
      error:"quiz error",
      quiz: JSON.stringify({
        question: "Apa inti dari dokumen?",
        options: ["A","B","C","D"],
        answer: "A",
        explanation: "Fallback karena AI error"
      })
    });
  }

}