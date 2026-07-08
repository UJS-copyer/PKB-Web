import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getAiConfig, getChatProviderConfig } from "@/lib/ai/config";
import { buildRagPrompt, retrieveSources } from "@/lib/rag/retrieval";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const role = typeof item?.role === "string" ? item.role : "";
      const content = typeof item?.content === "string" ? item.content.trim() : "";
      return (role === "user" || role === "assistant") && content ? { role, content } : null;
    })
    .filter((item): item is ChatMessage => Boolean(item))
    .slice(-12);
}

function buildConversationContext(messages: ChatMessage[]) {
  return messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "用户" : "助手"}：${message.content}`)
    .join("\n");
}

export async function POST(request: Request) {
  const body = await request.json();
  const messages = normalizeMessages(body.messages);
  const question =
    messages
      .slice()
      .reverse()
      .find((message) => message.role === "user")?.content ??
    (typeof body.question === "string" ? body.question : "");
  const config = await getAiConfig();
  const context = buildConversationContext(messages);
  const retrievalQuery = [context, question].filter(Boolean).join("\n\n当前问题：");
  const sources = await retrieveSources(retrievalQuery || question, config.topK);
  const chatProvider = getChatProviderConfig();

  if (chatProvider.apiKey) {
    const provider = createOpenAI({
      apiKey: chatProvider.apiKey,
      baseURL: chatProvider.baseURL
    });
    const result = streamText({
      model: provider(config.chatModel || chatProvider.model || "gpt-4o-mini"),
      temperature: config.temperature,
      prompt: buildRagPrompt(
        context ? `对话上下文：\n${context}\n\n当前问题：\n${question}` : question,
        sources,
        config.systemPrompt
      )
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
