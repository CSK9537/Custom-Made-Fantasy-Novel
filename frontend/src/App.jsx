import { useState, useEffect } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [choices, setChoices] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  // 게임 마스터(백엔드)와 통신하는 함수
  const fetchGMResponse = async (userMessage = "") => {
    try {
      // 사용자가 선택지를 눌렀다면 화면에 먼저 표시
      if (userMessage) {
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
      }

      // 백엔드 API 호출
      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, turn }),
      });

      const data = await response.json();

      // 게임 마스터의 응답을 화면에 표시
      setMessages((prev) => [...prev, { sender: "gm", text: data.text }]);
      setChoices(data.choices || []);

      // 챕터가 끝났다면 상태 업데이트
      if (data.isEndOfChapter) {
        setIsFinished(true);
      }

      setTurn((prev) => prev + 1);
    } catch (error) {
      console.error("API 통신 에러:", error);
    }
  };

  // 앱이 처음 켜질 때 게임 마스터의 첫 인사말 불러오기
  useEffect(() => {
    fetchGMResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 출판하기 버튼 클릭 시 동작 (다음 단계에서 스위트북 API 연동 예정)
  const handlePublish = () => {
    alert(
      "이곳에 스위트북 Books API & Orders API를 호출하는 로직이 들어갈 예정입니다! 📖",
    );
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
        🗡️ Custom-Made Fantasy Novel
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
        {/* 대화 내역 출력 영역 */}
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
                  maxWidth: "80%",
                  wordBreak: "keep-all",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    color: msg.sender === "gm" ? "#f6ad55" : "#63b3ed",
                  }}
                >
                  {msg.sender === "gm" ? "🧙‍♂️ 게임 마스터" : "⚔️ 용사 (당신)"}
                </strong>
                {msg.text}
              </span>
            </div>
          ))}
        </div>

        {/* 선택지 또는 출판 버튼 영역 */}
        <div style={{ borderTop: "1px solid #444", paddingTop: "15px" }}>
          {!isFinished ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => fetchGMResponse(choice)}
                  style={{
                    padding: "12px",
                    backgroundColor: "#2b6cb0",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "15px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.backgroundColor = "#2c5282")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.backgroundColor = "#2b6cb0")
                  }
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
              onMouseOver={(e) => (e.target.style.backgroundColor = "#9b2c2c")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#c53030")}
            >
              📖 이 모험의 기록을 양장본으로 출판하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
