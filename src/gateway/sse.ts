export type OpenAISseMetadata = {
  inputTokens: number;
  outputTokens: number;
  hasUsage: boolean;
  finishReason: string | null;
  sawDone: boolean;
  malformed: boolean;
};

const maxBufferedChars = 64_000;

export class OpenAISseMetadataParser {
  private readonly decoder = new TextDecoder();
  private buffer = "";
  private metadata: OpenAISseMetadata = {
    inputTokens: 0,
    outputTokens: 0,
    hasUsage: false,
    finishReason: null,
    sawDone: false,
    malformed: false
  };

  push(chunk: Uint8Array) {
    this.appendText(this.decoder.decode(chunk, { stream: true }));
  }

  finish() {
    this.appendText(this.decoder.decode());
    if (this.buffer.trim()) {
      this.parseEvent(this.buffer);
      this.buffer = "";
    }
    return this.getMetadata();
  }

  getMetadata(): OpenAISseMetadata {
    return { ...this.metadata };
  }

  private appendText(text: string) {
    if (!text) return;

    this.buffer = normalizeLineEndings(this.buffer + text);
    if (this.buffer.length > maxBufferedChars) {
      this.metadata.malformed = true;
      this.buffer = "";
      return;
    }

    let separatorIndex = this.buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const eventText = this.buffer.slice(0, separatorIndex);
      this.buffer = this.buffer.slice(separatorIndex + 2);
      this.parseEvent(eventText);
      separatorIndex = this.buffer.indexOf("\n\n");
    }
  }

  private parseEvent(eventText: string) {
    const data = eventText
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => {
        const value = line.slice("data:".length);
        return value.startsWith(" ") ? value.slice(1) : value;
      })
      .join("\n")
      .trim();

    if (!data) return;
    if (data === "[DONE]") {
      this.metadata.sawDone = true;
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      this.metadata.malformed = true;
      return;
    }

    if (!isRecord(parsed)) return;
    this.captureUsage(parsed.usage);
    this.captureFinishReason(parsed.choices);
  }

  private captureUsage(value: unknown) {
    if (!isRecord(value)) return;

    const inputTokens = value.prompt_tokens;
    const outputTokens = value.completion_tokens;
    if (!isNonNegativeInteger(inputTokens) || !isNonNegativeInteger(outputTokens)) {
      this.metadata.malformed = true;
      return;
    }

    this.metadata.inputTokens = inputTokens;
    this.metadata.outputTokens = outputTokens;
    this.metadata.hasUsage = true;
  }

  private captureFinishReason(value: unknown) {
    if (!Array.isArray(value)) return;

    for (const choice of value) {
      if (!isRecord(choice) || typeof choice.finish_reason !== "string") continue;
      const finishReason = choice.finish_reason.trim();
      if (finishReason) {
        this.metadata.finishReason = finishReason.slice(0, 80);
      }
    }
  }
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
