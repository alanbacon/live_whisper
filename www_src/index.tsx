import React from "react";
import ReactDOM from "react-dom";
import hark from "hark";
import { RingBuffer } from "ring-buffer-ts";
import FlipMove from "react-flip-move";
import { v4 as uuidv4 } from "uuid";

import "./style.css";

class AudioRecorder {
  stream: MediaStream;
  recorder: MediaRecorder;
  timeslice: number;
  buffer: RingBuffer<Blob>;
  data: Blob[];
  recording: boolean;
  mimeType: string;
  headerChunk: Blob | null;

  constructor(bufferTime = 1500) {
    this.recording = false;
    this.data = [];
    this.timeslice = 500; //milliseconds
    const bufferBins = Math.round(bufferTime / this.timeslice);
    this.buffer = new RingBuffer<Blob>(bufferBins);
    this.mimeType = "audio/webm;codecs=opus";
    this.headerChunk = null;
  }

  async init() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.recorder.ondataavailable = this.handleAvailableData.bind(this);
    this.recorder.start(this.timeslice);
    this.recorder.onstop = this.stop.bind(this);
  }

  handleAvailableData(e: BlobEvent) {
    if (!this.headerChunk) {
      this.headerChunk = e.data;
    } else {
      this.buffer.add(e.data);
    }
    if (this.recording) {
      this.data.push(e.data);
    }
  }

  stop() {
    if (this.recording) {
      this.recording = false;
      return true;
    } else {
      return false;
    }
  }

  start() {
    if (!this.stream) {
      throw new Error("cannot start before calling init()");
    }
    if (this.recording) {
      return;
    }
    const buffer = this.buffer.toArray();
    if (this.headerChunk) {
      this.data.push(this.headerChunk); // keep the first chunk of data for its meta-data, otherwise the file becomes corrupt
    }
    this.data.push(...buffer);
    this.recording = true;
  }

  getFile() {
    const allFileBlob = new Blob(this.data, { type: this.mimeType });
    this.data = [];
    return new File([allFileBlob], `rec.webm`, {
      type: allFileBlob.type,
      lastModified: Date.now(),
    });
  }
}

type ApiTranslationResp = string;
type TranslationObj = { text: string; id: string };

async function postAudioFile(file: File): Promise<ApiTranslationResp> {
  const form = new FormData();
  form.append("file", file);
  const translationResp = await fetch("/api/recording", {
    method: "POST",
    body: form,
  });
  const translation = (await translationResp.text()) as ApiTranslationResp;
  return translation;
}

const recorder = new AudioRecorder();

type AppProps = {
  maxTranslationsHistory: number;
};

// had to use a class component because the hark callbacks were not getting the up to date useState variables
class App extends React.Component<AppProps> {
  state: {
    translationsHistory: TranslationObj[];
  };
  speechEvents: hark.Harker;
  constructor(props: AppProps) {
    super(props);
    this.state = {
      translationsHistory: [],
    };
  }

  componentDidMount() {
    async function setupHark(self: App) {
      await recorder.init();
      const micStreamHark = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const options = {};
      self.speechEvents = hark(micStreamHark, options);
      self.speechEvents.on("speaking", self.startSpeaking.bind(self));
      self.speechEvents.on("stopped_speaking", self.stopSpeaking.bind(self));
    }

    setupHark(this).catch(console.log);
  }

  async addTranslationToHistory(audioFile: File, translationId: string) {
    const translationText = await postAudioFile(audioFile);
    const translationIndex = this.state.translationsHistory.findIndex(
      (translationObj) => translationObj.id === translationId
    );
    const laterTranslations = this.state.translationsHistory.slice(
      0,
      translationIndex
    );
    const translation = this.state.translationsHistory[translationIndex];
    const earlierTranslations = this.state.translationsHistory.slice(
      translationIndex + 1
    );
    if (translationText) {
      translation.text = translationText;
      const newTranslations = [
        ...laterTranslations,
        translation,
        ...earlierTranslations,
      ].slice(0, this.props.maxTranslationsHistory);
      this.setState({
        translationsHistory: newTranslations,
      });
    } else {
      const newTranslations = [...laterTranslations, ...earlierTranslations];
      this.setState({
        translationsHistory: newTranslations,
      });
    }
  }

  startSpeaking(): void {
    console.log("speaking");
    recorder.start();
    const translationId = uuidv4().slice(0, 6);
    this.setState({
      translationsHistory: [
        { text: "...", id: translationId },
        ...this.state.translationsHistory,
      ],
    });
  }

  async stopSpeaking(): Promise<void> {
    console.log("stopped_speaking");
    const isAudioToGet = recorder.stop();
    if (isAudioToGet) {
      const translationId = this.state.translationsHistory[0].id;
      const audioFile = recorder.getFile();
      await this.addTranslationToHistory(audioFile, translationId);
    }
  }

  render(): JSX.Element {
    return (
      <div>
        <h2>Just start speaking, loud and clear, in any language</h2>
        <FlipMove>
          {this.state.translationsHistory.map((translation) => {
            return (
              <div className="chatbox" key={translation.id}>
                <p className="chatpara">{translation.text}</p>
              </div>
            );
          })}
        </FlipMove>
      </div>
    );
  }
}

ReactDOM.render(
  <App maxTranslationsHistory={10} />,
  document.getElementById("root")
);
