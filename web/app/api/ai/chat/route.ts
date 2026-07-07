import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getAiConfig, getChatProviderConfig } from "@/lib/ai/config";
import { buildRagPrompt, retrieveSources } from "@/lib/rag/retrieval";

export async function POST(request: Request) {
  const { question } = (await request.json()) as { question?: string };
  const config = await getAiConfig();
  const sources = await retrieveSources(question ?? "", config.topK);
  const chatProvider = getChatProviderConfig();

  if (chatProvider.apiKey) {
    const provider = createOpenAI({
      apiKey: chatProvider.apiKey,
      baseURL: chatProvider.baseURL
    });
    const result = streamText({
      model: provider(config.chatModel || chatProvider.model || "gpt-4o-mini"),
      temperature: config.temperature,
      prompt: buildRagPrompt(question ?? "", sources, config.systemPrompt)
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
    "当前未配置聊天模型 API Key，因此使用本地 fallback 响应。\n\n",
    "已执行知识库检索；配置对话模型并重建 Embedding 后会切换为完整向量 RAG。\n\n",
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
