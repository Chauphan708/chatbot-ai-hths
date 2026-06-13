/**
 * Voice Service — Web Speech API wrapper for vi-VN
 * STT (Speech-to-Text) + TTS (Text-to-Speech)
 */

/// <reference types="@types/dom-speech-recognition" />

// ─── Types ────────────────────────────────────────────

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

// ─── Feature Detection ────────────────────────────────

export function isSTTSupported(): boolean {
  return !!(
    window.SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

export function isTTSSupported(): boolean {
  return "speechSynthesis" in window;
}

// ─── STT (Speech-to-Text) ─────────────────────────────

type RecognitionInstance = InstanceType<typeof SpeechRecognition>;

let recognitionInstance: RecognitionInstance | null = null;

interface STTOptions {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  lang?: string;
  continuous?: boolean;
}

export function startSTT(options: STTOptions): boolean {
  if (!isSTTSupported()) {
    options.onError?.("Trình duyệt không hỗ trợ nhận diện giọng nói");
    return false;
  }

  // Stop any existing
  stopSTT();

  const SpeechRecognitionClass =
    window.SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;

  recognitionInstance = new SpeechRecognitionClass();
  recognitionInstance.lang = options.lang || "vi-VN";
  recognitionInstance.continuous = options.continuous ?? false;
  recognitionInstance.interimResults = true;

  recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      }
    }
    if (finalTranscript) {
      options.onResult(finalTranscript);
    }
  };

  recognitionInstance.onend = () => {
    options.onEnd?.();
  };

  recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
    const errorMessages: Record<string, string> = {
      "not-allowed": "Vui lòng cho phép truy cập microphone",
      "no-speech": "Không nghe thấy giọng nói",
      "network": "Lỗi kết nối mạng",
      "audio-capture": "Không tìm thấy microphone",
    };
    options.onError?.(errorMessages[event.error] || `Lỗi: ${event.error}`);
  };

  try {
    recognitionInstance.start();
    return true;
  } catch {
    options.onError?.("Không thể bắt đầu ghi âm");
    return false;
  }
}

export function stopSTT(): void {
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch {
      // Ignore
    }
    recognitionInstance = null;
  }
}

// ─── TTS (Text-to-Speech) ─────────────────────────────

let currentUtterance: SpeechSynthesisUtterance | null = null;

interface TTSOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

export function speak(options: TTSOptions): boolean {
  if (!isTTSSupported()) return false;

  // Stop current speech
  stopTTS();

  const utterance = new SpeechSynthesisUtterance(options.text);
  utterance.lang = options.lang || "vi-VN";
  utterance.rate = options.rate ?? 0.9;
  utterance.pitch = options.pitch ?? 1;

  // Find Vietnamese voice
  const voices = speechSynthesis.getVoices();
  const viVoice = voices.find((v) => v.lang.startsWith("vi"));
  if (viVoice) utterance.voice = viVoice;

  utterance.onend = () => {
    currentUtterance = null;
    options.onEnd?.();
  };

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
  return true;
}

export function stopTTS(): void {
  if (currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}
