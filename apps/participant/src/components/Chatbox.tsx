import { useState } from "react";

export default function Chatbox() {
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  // recieve messages from server
  // store messages in localstorage and in usestate
  // read messages in order of reciept
  // when finished readnig, clear from queue
  // chat log with previous messages
  // clear localstorage button

  useEffect(() => {}, []);
}
