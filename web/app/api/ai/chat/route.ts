import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { buildRagPrompt, retrieveLocalSources } from "@/lib/rag/retrieval";

export async function POST(request: Request) {
  const { question } = (await request.json()) as { question?: string };
  const sources = await retrieveLocalSources(question ?? "");

  if (process.env.OPENAI_API_KEY) {
    const result = streamText({
      model: openai(process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini"),
      temperature: 0.2,
      prompt: buildRagPrompt(question ?? "", sources)
    });

    return result.toTextStreamResponse({
      headers: {
        "X-RAG-Sources": encodeURIComponent(JSON.stringify(sources))
      }
    });
  }

  const encoder = new TextEncoder();
  const text = [
    `问题：${question ?? ""}\n\n`,
    "当前未配置 OPENAI_API_KEY，因此使用本地 fallback 响应。\n\n",
    "已执行本地 Knowledge 检索；生产环境配置 OpenAI/Qdrant 后会切换为完整 RAG。\n\n",
    "引用：\n",
    ...(sources.length > 0
      ? sources.map((source, index) => `${index + 1}. ${source.path}\n`)
      : ["未找到足够相关来源。\n"])
  ];

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of text) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
