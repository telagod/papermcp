type ToolContent = {
  type: 'text';
  text: string;
};

type ToolResult<T extends Record<string, unknown>> = {
  content: ToolContent[];
  structuredContent?: T;
  isError?: boolean;
};

const stringify = (value: unknown) => JSON.stringify(value, null, 2);

export const createToolResponse = <T extends Record<string, unknown>>(payload: T): ToolResult<T> => ({
  content: [{ type: 'text', text: stringify(payload) }],
  structuredContent: payload,
});

export const createToolErrorResponse = (message: string): ToolResult<{ error: string }> => ({
  content: [{ type: 'text', text: stringify({ error: message }) }],
  structuredContent: { error: message },
  isError: true,
});
