export function createChatCompletionResponse(model: string, content: string) {
  return {
    id: `cursor-acp-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: `cursor-acp/${model}`,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

export function createChatCompletionChunk(
  id: string,
  created: number,
  model: string,
  deltaContent: string,
  done = false
) {
  return {
    id,
    object: "chat.completion.chunk",
    created,
    model: `cursor-acp/${model}`,
    choices: [
      {
        index: 0,
        delta: deltaContent ? { content: deltaContent } : {},
        finish_reason: done ? "stop" : null
      }
    ]
  };
}