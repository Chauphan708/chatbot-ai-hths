/**
 * RAG Service using LangChain & pgvector
 */

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import pg from "pg";

// ─── Types ───────────────────────────────────────

export interface RAGResult {
  id: string;
  title: string;
  content: string;
  commonMistakes: string[] | null;
  scaffoldingHints: Record<string, string> | null;
  similarity: number;
}

export interface RAGSearchOptions {
  topK?: number;
  minSimilarity?: number;
}

// ─── Connection Pool ──────────────────────────────

let pgPool: pg.Pool | null = null;

function getPgPool(): pg.Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not defined in environment variables");
    }
    pgPool = new pg.Pool({
      connectionString,
      ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pgPool;
}

// ─── LangChain PGVectorStore helper ───────────────

async function getVectorStore(): Promise<PGVectorStore> {
  const pool = getPgPool();
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });

  // Initialize and return PGVectorStore with custom columns to map our training_data table
  return await PGVectorStore.initialize(embeddings, {
    pool,
    tableName: "training_data",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  });
}

// ─── Core Functions ──────────────────────────────

/**
 * Embed and store a single document using LangChain.
 */
export async function embedTrainingData(
  chatbotId: string,
  title: string,
  content: string,
  commonMistakes: string[] | null = null,
  scaffoldingHints: Record<string, string> | null = null
): Promise<void> {
  const pool = getPgPool();
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });

  // 1. Generate embedding vector via LangChain Google embeddings
  const vector = await embeddings.embedQuery(content);

  // 2. Insert into PostgreSQL using pg pool directly since PGVectorStore expects strict langchain format
  // This keeps compatibility with our original drizzle schema.
  const query = `
    INSERT INTO training_data (id, chatbot_id, title, content, common_mistakes, scaffolding_hints, embedding)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector)
  `;
  await pool.query(query, [
    chatbotId,
    title,
    content,
    commonMistakes ? JSON.stringify(commonMistakes) : null,
    scaffoldingHints ? JSON.stringify(scaffoldingHints) : null,
    `[${vector.join(",")}]`
  ]);
}

/**
 * Semantic search across training data using LangChain Vector Store.
 * 
 * We fetch similar documents using PGVectorStore.
 */
export async function searchTrainingData(
  chatbotId: string,
  query: string,
  options: RAGSearchOptions = {}
): Promise<RAGResult[]> {
  const { topK = 5, minSimilarity = 0.3 } = options;
  const pool = getPgPool();

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });

  const queryEmbedding = await embeddings.embedQuery(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Standard raw SQL query with pgvector cosine distance to fetch extra fields:
  // (We use raw PG pool here for accurate schema extraction with matching structure)
  const results = await pool.query(`
    SELECT
      id,
      title,
      content,
      common_mistakes,
      scaffolding_hints,
      1 - (embedding <=> $1::vector) AS similarity
    FROM training_data
    WHERE chatbot_id = $2
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> $1::vector) >= $3
    ORDER BY embedding <=> $1::vector
    LIMIT $4
  `, [embeddingStr, chatbotId, minSimilarity, topK]);

  return results.rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    commonMistakes: row.common_mistakes,
    scaffoldingHints: row.scaffolding_hints,
    similarity: parseFloat(row.similarity),
  }));
}

/**
 * Build context string from RAG results.
 */
export function buildRAGContext(results: RAGResult[]): string {
  if (results.length === 0) {
    return "";
  }

  const chunks = results.map((r, i) => {
    let chunk = `### Tài liệu ${i + 1}: ${r.title}\n${r.content}`;

    if (r.commonMistakes && r.commonMistakes.length > 0) {
      chunk += `\n\n**Lỗi sai phổ biến:**\n${r.commonMistakes.map((m) => `- ${m}`).join("\n")}`;
    }

    if (r.scaffoldingHints && Object.keys(r.scaffoldingHints).length > 0) {
      chunk += `\n\n**Gợi ý scaffolding:**`;
      for (const [level, hint] of Object.entries(r.scaffoldingHints)) {
        chunk += `\n- Mức ${level}: ${hint}`;
      }
    }

    return chunk;
  });

  return (
    "## 📚 Tài liệu tham khảo từ giáo viên\n\n" +
    "Dưới đây là các tài liệu liên quan mà giáo viên đã chuẩn bị. " +
    "Hãy sử dụng chúng để hỗ trợ học sinh:\n\n" +
    chunks.join("\n\n---\n\n")
  );
}

// ─── Export ──────────────────────────────────────

export const ragService = {
  embedTrainingData,
  searchTrainingData,
  buildRAGContext,
  getVectorStore,
};
