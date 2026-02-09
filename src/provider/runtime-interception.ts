import type { ToolUpdate, ToolMapper } from "../acp/tools.js";
import type { OpenAiToolCall } from "../proxy/tool-loop.js";
import type { StreamJsonToolCallEvent } from "../streaming/types.js";
import type { ToolRouter } from "../tools/router.js";
import type { ToolLoopMode } from "./boundary.js";
import type { ProviderBoundary } from "./boundary.js";

export interface HandleToolLoopEventOptions {
  event: StreamJsonToolCallEvent;
  boundary: ProviderBoundary;
  toolLoopMode: ToolLoopMode;
  allowedToolNames: Set<string>;
  toolMapper: ToolMapper;
  toolSessionId: string;
  shouldEmitToolUpdates: boolean;
  proxyExecuteToolCalls: boolean;
  suppressConverterToolEvents: boolean;
  toolRouter?: ToolRouter;
  responseMeta: { id: string; created: number; model: string };
  onToolUpdate: (update: ToolUpdate) => Promise<void> | void;
  onToolResult: (toolResult: any) => Promise<void> | void;
  onInterceptedToolCall: (toolCall: OpenAiToolCall) => Promise<void> | void;
}

export interface HandleToolLoopEventResult {
  intercepted: boolean;
  skipConverter: boolean;
}

export async function handleToolLoopEvent(
  options: HandleToolLoopEventOptions,
): Promise<HandleToolLoopEventResult> {
  const {
    event,
    boundary,
    toolLoopMode,
    allowedToolNames,
    toolMapper,
    toolSessionId,
    shouldEmitToolUpdates,
    proxyExecuteToolCalls,
    suppressConverterToolEvents,
    toolRouter,
    responseMeta,
    onToolUpdate,
    onToolResult,
    onInterceptedToolCall,
  } = options;

  const updates = await toolMapper.mapCursorEventToAcp(
    event,
    event.session_id ?? toolSessionId,
  );

  if (shouldEmitToolUpdates) {
    for (const update of updates) {
      await onToolUpdate(update);
    }
  }

  const interceptedToolCall = boundary.maybeExtractToolCall(
    event,
    allowedToolNames,
    toolLoopMode,
  );
  if (interceptedToolCall) {
    await onInterceptedToolCall(interceptedToolCall);
    return { intercepted: true, skipConverter: true };
  }

  if (toolRouter && proxyExecuteToolCalls) {
    const toolResult = await toolRouter.handleToolCall(event as any, responseMeta);
    if (toolResult) {
      await onToolResult(toolResult);
    }
  }

  return {
    intercepted: false,
    skipConverter: suppressConverterToolEvents,
  };
}
