import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const server = new Server(
  { name: "whisper-transcribe", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "transcribe_audio",
      description:
        "Transcribes an audio file using OpenAI Whisper. Supports mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, opus, flac formats. Returns the transcribed text in the detected language.",
      inputSchema: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Absolute path to the audio file to transcribe",
          },
          language: {
            type: "string",
            description:
              "Optional ISO-639-1 language code (e.g. 'pt' for Portuguese). Auto-detected if omitted.",
          },
        },
        required: ["file_path"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "transcribe_audio") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { file_path, language } = request.params.arguments;

  const resolvedPath = path.resolve(file_path);
  if (!fs.existsSync(resolvedPath)) {
    return {
      content: [
        {
          type: "text",
          text: `Error: File not found at ${resolvedPath}`,
        },
      ],
    };
  }

  const stats = fs.statSync(resolvedPath);
  const sizeMB = stats.size / (1024 * 1024);
  if (sizeMB > 25) {
    return {
      content: [
        {
          type: "text",
          text: `Error: File too large (${sizeMB.toFixed(1)}MB). Whisper limit is 25MB.`,
        },
      ],
    };
  }

  try {
    const file = fs.createReadStream(resolvedPath);
    const params = {
      file,
      model: "whisper-1",
      response_format: "verbose_json",
    };
    if (language) params.language = language;

    const transcription = await openai.audio.transcriptions.create(params);

    const result = {
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration
        ? `${Math.round(transcription.duration)}s`
        : undefined,
      file: path.basename(resolvedPath),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Transcription error: ${error.message}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
