import { useState, useEffect, useRef } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [choices, setChoices] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);

  const initialized = useRef(false);

  const fetchGMResponse = async (userMessage = "") => {
    try {
      if (userMessage) {
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
      }

      // 1. 대사 연성 시작
      setIsGeneratingText(true);
      setChoices([]);

      // 텍스트 API 먼저 호출
      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, turn }),
      });
      const data = await response.json();

      setIsGeneratingText(false);

      // 2. 대사를 받자마자 화면에 즉시 출력!
      const msgId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          sender: "gm",
          text: data.text,
          imageUrl: null,
          isLoadingImage: true, // 이미지는 아직 로딩 중이라고 표시
        },
      ]);
      setChoices(data.choices || []);

      if (data.isEndOfChapter) {
        setIsFinished(true);
      }
      setTurn((prev) => prev + 1);

      // 3. 백그라운드에서 조용히 이미지 API 호출!
      if (data.imagePrompt) {
        fetch("http://localhost:3000/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePrompt: data.imagePrompt }),
        })
          .then((res) => res.json())
          .then((imgData) => {
            // 이미지가 도착하면 해당 메시지에 끼워넣기
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === msgId
                  ? {
                      ...msg,
                      imageUrl: imgData.imageUrl,
                      isLoadingImage: false,
                    }
                  : msg,
              ),
            );
          });
      }
    } catch (error) {
      console.error("API 통신 에러:", error);
      setIsGeneratingText(false);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchGMResponse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublish = async () => {
    try {
      alert(
        "스토리와 연성된 이미지를 스위트북으로 보냅니다... 잠시만 기다려주세요! 🪄",
      );
      const response = await fetch("http://localhost:3000/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setIsFinished(true);
      } else {
        alert("출판 실패: " + data.message);
      }
    } catch (error) {
      console.error("출판 에러:", error);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#1a1a1a",
        color: "#eaeaea",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "serif",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          borderBottom: "1px solid #333",
          paddingBottom: "10px",
        }}
      >
        🗡️ 연금술사 비주얼 노벨
      </h1>

      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "20px",
          backgroundColor: "#2a2a2a",
          borderRadius: "8px",
          minHeight: "500px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{ textAlign: msg.sender === "user" ? "right" : "left" }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  backgroundColor:
                    msg.sender === "user" ? "#4a5568" : "#2d3748",
                  border: msg.sender === "gm" ? "1px solid #4a5568" : "none",
                  lineHeight: "1.6",
                  maxWidth: "90%",
                  wordBreak: "keep-all",
                  textAlign: "left",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: msg.sender === "gm" ? "#f6ad55" : "#63b3ed",
                  }}
                >
                  {msg.sender === "gm" ? "🧙‍♂️ 게임 마스터" : "⚔️ 당신"}
                </strong>

                <div style={{ marginBottom: "10px" }}>{msg.text}</div>

                {msg.isLoadingImage && (
                  <div
                    style={{
                      fontStyle: "italic",
                      color: "#a0aec0",
                      padding: "10px",
                      border: "1px dashed #4a5568",
                      borderRadius: "5px",
                      fontSize: "14px",
                    }}
                  >
                    🎨 진리의 문에서 장면을 연성하는 중...
                  </div>
                )}

                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Scene 연성 이미지"
                    style={{
                      width: "100%",
                      borderRadius: "6px",
                      border: "1px solid #4a5568",
                      marginTop: "10px",
                    }}
                  />
                )}
              </span>
            </div>
          ))}

          {isGeneratingText && (
            <div style={{ textAlign: "left" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#2d3748",
                  color: "#a0aec0",
                  fontStyle: "italic",
                }}
              >
                ✍️ 마스터가 스토리를 연성 중...
              </span>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "15px" }}>
          {!isFinished ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  disabled={isGeneratingText}
                  onClick={() => fetchGMResponse(choice)}
                  style={{
                    padding: "12px",
                    backgroundColor: isGeneratingText ? "#4a5568" : "#2b6cb0",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: isGeneratingText ? "not-allowed" : "pointer",
                    fontSize: "15px",
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={handlePublish}
              style={{
                width: "100%",
                padding: "15px",
                backgroundColor: "#c53030",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              📖 출판하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
