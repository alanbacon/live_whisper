import os from "os";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";
import token from "./token.json" assert { type: "json" };
import { Stream } from "stream";
const baseApiUrl = "https://api.openai.com/v1/audio";

const userHomeDir = os.homedir();

type ResponseFormat = "json" | "text" | "srt" | "verbose_json" | "vtt";

type TranscriptOptions = {
  translate?: boolean;
  prompt?: string;
  responseFormat: ResponseFormat;
};

export async function getTranscript(
  file: string | Stream,
  options: TranscriptOptions
): Promise<string> {
  let url;
  if (options.translate) {
    url = baseApiUrl + "/translations";
  } else {
    url = baseApiUrl + "/transcriptions";
  }

  const form = new FormData();

  if (typeof file === "string") {
    const fileStream = fs.createReadStream(file);
    form.append("file", fileStream);
  } else {
    form.append("file", file, {
      filename: "rec.webm",
    });
  }
  form.append("model", "whisper-1");
  form.append("response_format", options.responseFormat);
  if (options.prompt) {
    form.append("prompt", options.prompt);
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.bearerToken}`,
    },
    body: form,
  });
  const responseText = await response.text();
  return responseText;
}

const transcriptOptions: TranscriptOptions = {
  responseFormat: "srt",
  translate: true,
};

// getTranscript(`${userHomeDir}/Desktop/chinese.mp3`, transcriptOptions).catch(
//   console.log
// );
