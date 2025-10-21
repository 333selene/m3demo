import { useEffect, useRef, useState } from "react";

export interface SpeechToTextOptions {
  interimResults?: boolean;
  lang?: string;
  continuous?: boolean;
}

type SpeechToTextReturn = {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  submitting: boolean;
};

const normalizeSpokenPunctuation = (s: string) => {
  return s.replace(/\bcomma\b/gi, ",");
};

const useSpeechToText = (
  options: SpeechToTextOptions,
  onSubmit: (transcript: string) => Promise<string>,
): SpeechToTextReturn => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const transcriptRef = useRef("");
  const recognitionRef = useRef<null | SpeechRecognition>(null);

  const startListening = async () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = async () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log(`sending text: ${transcriptRef.current}`);
      setSubmitting(true);
      const serverResponse = await onSubmit(transcriptRef.current);
      console.log(`Server response: ${serverResponse}`);
      setSubmitting(false);
      setTranscript("");
      transcriptRef.current = "";
    }
  };

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      console.error("web speech api is not supported");
      return;
    }
    recognitionRef.current = new window.webkitSpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.interimResults = options.interimResults ?? false;
    recognition.lang = options.lang ?? "en-US";
    recognition.continuous = options.continuous ?? true;

    recognition.onresult = (e) => {
      let chunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const punctuationFiltered = normalizeSpokenPunctuation(
          res[0].transcript,
        );
        chunk += punctuationFiltered;
      }
      setTranscript((prev) => prev + chunk);
      transcriptRef.current = transcriptRef.current + chunk;
    };

    recognition.onerror = (e) => {
      console.error("speech recognition error", e.error);
    };

    return () => {
      recognition.stop();
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    submitting,
  };
};

export default useSpeechToText;
