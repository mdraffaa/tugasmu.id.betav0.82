import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({ dest: "/tmp" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {

  upload.array("files")(req, res, async (err) => {

    if (err) return res.status(500).json({ error: "Upload error" });

    let extractedText = "";

    for (let file of req.files) {
      const dataBuffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(dataBuffer);
      extractedText += pdfData.text;
    }

    try {

      // 🔥 STEP 1: DETECT TOPIK
      const classifyResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `
Tentukan topik utama dari teks berikut.

Jawab hanya 1 kata:
hukum / biologi / geografi / sejarah / ekonomi / fisika / kimia / umum

Teks:
${extractedText.substring(0, 3000)}
`
          }
        ]
      });

      const topic = classifyResponse.choices[0].message.content
        .trim()
        .toLowerCase();

      console.log("TOPIC:", topic);

      // 🔥 STEP 2: INSTRUKSI DINAMIS
      let extraInstruction = "";

      if (topic === "hukum") {
        extraInstruction = `
WAJIB:
- Tampilkan pasal secara eksplisit (contoh: Pasal 27)
- Setiap pasal harus jadi poin terpisah
- Tidak boleh ditulis "pasal-pasal"
`;
      } else if (topic === "biologi") {
        extraInstruction = "Fokus pada proses biologis dan istilah ilmiah.";
      } else if (topic === "fisika") {
        extraInstruction = "Fokus pada konsep dan rumus.";
      } else if (topic === "geografi") {
        extraInstruction = "Fokus pada fenomena alam.";
      }

      // 🔥 PROMPT FINAL (DISESUAIIN DARI PUNYA LU)
      const prompt = `
Kamu adalah AI tutor untuk siswa SMA.

ATURAN STRUKTUR:
- WAJIB mengikuti struktur dokumen jika ada (bagian, bab, poin)
- Jangan hanya merangkum secara umum
- Ambil poin dari setiap bagian penting
- Jika ada list/poin di dokumen → WAJIB ditampilkan kembali dalam bentuk ringkasan

ATURAN KERAS:
- DILARANG membuat penjelasan umum di luar isi dokumen
- WAJIB mengambil informasi langsung dari dokumen
- Sorot istilah penting menggunakan <b>bold</b> atau <span style="color:#4f46e5">warna biru</span>
- Jangan menuliskan instruksi formatting ke dalam output
- Jika dokumen berisi pasal → WAJIB tampilkan pasal secara eksplisit
- Jika dokumen tidak berisi pasal → tampilkan konsep utama dari teks
- Fokus pada isi nyata dokumen, bukan teori tambahan
- Hindari kalimat generik seperti "dokumen ini membahas..."

ATURAN HIGHLIGHT:
- Setiap paragraf WAJIB memiliki minimal 2 kata yang di-highlight
- Gunakan <b>bold</b> untuk istilah utama
- Gunakan <span style="color:#4f46e5">warna biru</span> untuk konsep penting
- Total minimal 8 highlight dalam seluruh output
- Jangan highlight kata yang tidak penting

Prioritaskan highlight pada:
- istilah penting (contoh: Pancasila, UUD 1945)
- konsep utama (contoh: ideologi, sistem presidensial)
- bagian penting (contoh: Pasal, hak, kewajiban)
- wajib highlight semua point pada bagian POINT PENTING



Topik materi: ${topic}

Instruksi khusus:
${extraInstruction}



PRIORITAS:
1. Ambil poin penting dari dokumen
2. Ringkas tanpa menghilangkan informasi penting
3. Gunakan bahasa sederhana TANPA mengubah makna asli

Tugas:
- Jelaskan seperti guru
- Mudah dipahami siswa SMA
- Jangan terlalu singkat

Gunakan format HTML:

<h2>📘 Judul Materi</h2>

<p>Penjelasan umum 3-5 kalimat. Gunakan bahasa yang mudah dipahami siswa SMA + 1 emoji</p>

<h3>📌 Ringkasan:</h3>
<ul>
<li>5-7 poin penting</li>
<li>Boleh pakai emoji kecil</li>
</ul>

<h3>🔥 Poin Penting:</h3>
<p>Jika pada dokumen terdapat point penting (misal dalam hukum atau PKN ada pasal-pasal spesifik dan amandemen spesifik), WAJIB tampilkan semua dengan bentuk point-point. Total maksimal adalah 10 point</p>

<h3>📖 Penjelasan Materi</h3>
<p>Penjelasan sesuai topik. Mudah dipahami anak SMA + 1 emoji. Highlight konsep utama dengan <b>bold</b> dan warna:
<span style="color:#4f46e5">contoh</span>. Maksimal 7 kalimat saja. </p>

<h3>🧠 Kesimpulan:</h3>
<p>Ringkasan akhir</p>

<h3>✨ Tips Belajar:</h3>
<ul>
<li>2-3 tips</li>
</ul>

Dokumen:
${extractedText.substring(0, 15000)}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1", // 🔥 upgrade
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }]
      });

      let summary = response.choices[0].message.content;

      summary = summary
        .replace(/```html/g, "")
        .replace(/```/g, "")
        .trim();

      res.json({
        summary,
        rawText: extractedText.substring(0, 15000)
      });

    } catch (err) {
      console.error("AI ERROR:", err);

      res.json({
        summary: extractedText.substring(0, 500)
      });
    }

  });

}