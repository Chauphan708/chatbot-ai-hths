/**
 * RAG Service — Retrieval-Augmented Generation
 *
 * Uses pgvector on Neon PostgreSQL for semantic search
 * across teacher-uploaded training data.
 *
 * Flow:
 * 1. GV uploads training data → text is embedded → stored in training_data
 * 2. HS asks question → question is embedded → cosine similarity search
 * 3. Top-K relevant chunks are injected into prompt context
 */

import { sql, eq, desc, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { trainingData } from "../../db/schema.js";
import { generateEmbedding } from "../ai/gemini.js";

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

// ─── Core Functions ──────────────────────────────

/**
 * Embed and store training data text.
 * Called when GV uploads new training content.
 */
export async function embedTrainingData(
  trainingDataId: string,
  content: string
): Promise<number[]> {
  const { embedding } = await generateEmbedding(content);

  // Store embedding in PostgreSQL via pgvector
  await db
    .update(trainingData)
    .set({
      embedding: embedding,
    })
    .where(eq(trainingData.id, trainingDataId));

  return embedding;
}

/**
 * Batch embed all unembedded training data for a chatbot.
 * Useful after clone or initial setup.
 */
export async function embedAllForChatbot(
  chatbotId: string
): Promise<{ processed: number; errors: number }> {
  // Find all training data without embeddings
  const unembedded = await db
    .select()
    .from(trainingData)
    .where(
      and(
        eq(trainingData.chatbotId, chatbotId),
        sql`${trainingData.embedding} IS NULL`
      )
    );

  let processed = 0;
  let errors = 0;

  for (const item of unembedded) {
    try {
      await embedTrainingData(item.id, item.content);
      processed++;
    } catch (error) {
      console.error(`Failed to embed training data ${item.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Semantic search across training data for a chatbot.
 * Uses pgvector cosine distance for similarity ranking.
 *
 * @param chatbotId - The chatbot to search within
 * @param query - Student's question or search text
 * @param options - Search options (topK, minSimilarity)
 * @returns Top-K most relevant training data chunks
 */
export async function searchTrainingData(
  chatbotId: string,
  query: string,
  options: RAGSearchOptions = {}
): Promise<RAGResult[]> {
  const { topK = 5, minSimilarity = 0.3 } = options;

  // Embed the query
  const { embedding: queryEmbedding } = await generateEmbedding(query);

  // Convert embedding array to PostgreSQL vector format
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Cosine similarity search using pgvector
  // 1 - cosine_distance = cosine_similarity
  const results = await db.execute(sql`
    SELECT
      id,
      title,
      content,
      common_mistakes,
      scaffolding_hints,
      1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM training_data
    WHERE chatbot_id = ${chatbotId}
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `);

  return (results.rows as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    commonMistakes: row.common_mistakes,
    scaffoldingHints: row.scaffolding_hints,
    similarity: parseFloat(row.similarity),
  }));
}

/**
 * Build context string from RAG results for prompt injection.
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
  embedAllForChatbot,
  searchTrainingData,
  buildRAGContext,
};
