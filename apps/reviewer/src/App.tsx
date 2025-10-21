import { useRef } from "react";
import Mic from "./assets/Mic";
import useSpeechToText from "./hooks/useSpeechToText";
import { onSubmit } from "./hooks/speechToTextOnSubmit";
import Listen from "./assets/Listen";
import Pending from "./assets/Pending";

function App() {
  const { isListening, transcript, startListening, stopListening, submitting } =
    useSpeechToText({ continuous: true }, onSubmit);

  const toggleRecording = async () => {
    isListening ? await stopListening() : await startListening();
  };

  return (
    <>
      <div>
        <h1>Reviewer</h1>
        <p>speak a list of items, say the word 'comma' to seperate items</p>
        <button
          className="mic-button"
          style={{
            background: submitting
              ? "yellow"
              : isListening
                ? "lightgray"
                : "none",
          }}
          onClick={() => toggleRecording()}
        >
          {submitting ? <Pending /> : isListening ? <Listen /> : <Mic />}
        </button>
        <p>{transcript}</p>
      </div>
    </>
  );
}

export default App;
