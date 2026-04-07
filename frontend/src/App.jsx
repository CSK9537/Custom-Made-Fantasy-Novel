import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// ✍️ 1. 글자를 한 땀 한 땀 연성하는 타이핑 컴포넌트
const Typewriter = ({ text, speed = 40, onTyping }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let i = 0;
    setIsTyping(true);
    setDisplayedText("");

    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;

      // 글자가 찍힐 때마다 스크롤을 맨 아래로 내리도록 부모에게 알림
      if (onTyping) onTyping();

      if (i >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]); // onTyping은 렌더링 무한루프 방지를 위해 의존성 배열에서 제외

  return (
    <div
      style={{
        fontSize: "16px",
        lineHeight: "1.8",
        color: "#d1c7b7",
        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
        wordBreak: "keep-all",
      }}
    >
      {displayedText.split("\n").map((line, idx, arr) => (
        <p key={idx} style={{ margin: "0 0 10px 0" }}>
          {line}
          {/* 타자가 쳐지는 동안 맨 마지막 줄 끝에 깜빡이는 커서(|) 표시 */}
          {isTyping && idx === arr.length - 1 && (
            <span className="blinking-cursor">|</span>
          )}
        </p>
      ))}
    </div>
  );
};

function App() {
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [choices, setChoices] = useState([]);

  const [isFinished, setIsFinished] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  const [bookUid, setBookUid] = useState(null);
  const [orderUid, setOrderUid] = useState(null);

  const initialized = useRef(false);
  const scrollRef = useRef(null);

  // ✍️ 2. 스크롤을 강제로 맨 아래로 내리는 함수 (타이핑 중에도 호출됨)
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const fetchGMResponse = async (userMessage = "") => {
    try {
      if (userMessage) {
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
        setTimeout(scrollToBottom, 100); // 유저 대사 입력 후 스크롤 내리기
      }

      setIsGeneratingText(true);
      setChoices([]);

      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, turn }),
      });
      const data = await response.json();

      setIsGeneratingText(false);

      const msgId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          sender: "gm",
          text: data.text,
          imageUrl: null,
          isLoadingImage: true,
        },
      ]);
      setChoices(data.choices || []);

      if (data.isEndOfChapter) {
        setIsFinished(true);
      }
      setTurn((prev) => prev + 1);

      if (data.imagePrompt) {
        fetch("http://localhost:3000/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePrompt: data.imagePrompt }),
        })
          .then((res) => res.json())
          .then((imgData) => {
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
            setTimeout(scrollToBottom, 200); // 이미지 로드 완료 후 스크롤 갱신
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGeneratingText, scrollToBottom]);

  const handlePublish = async () => {
    /* 기존 코드 동일 */
    try {
      setIsPublishing(true);
      alert(
        "스토리와 연성된 이미지를 책으로 묶습니다... 잠시만 기다려주세요! 🪄",
      );
      const response = await fetch("http://localhost:3000/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json();
      setIsPublishing(false);
      if (data.success) {
        setBookUid(data.bookUid);
        alert(data.message);
      } else {
        alert("출판 실패: " + data.message);
      }
    } catch (error) {
      console.error("출판 에러:", error);
      setIsPublishing(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  const handleOrder = async () => {
    /* 기존 코드 동일 */
    try {
      setIsOrdering(true);
      alert("센트럴 사령부에 인쇄를 요청합니다... 🛒");
      const response = await fetch("http://localhost:3000/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookUid }),
      });
      const data = await response.json();
      setIsOrdering(false);
      if (data.success) {
        setOrderUid(data.orderUid);
        alert(data.message);
      } else {
        alert("주문 실패: " + data.message);
      }
    } catch (error) {
      console.error("주문 에러:", error);
      setIsOrdering(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ color: "#d1c7b7", minHeight: "100vh", padding: "20px" }}>
      <div
        style={{ textAlign: "center", marginBottom: "20px", marginTop: "10px" }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            color: "#f3e5d8",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          }}
        >
          국가 연금술사 연구 일지
        </h1>
        <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#8c7355" }}>
          The Fullmetal Alchemist Visual Novel
        </p>
        <div
          style={{
            width: "60px",
            height: "2px",
            background: "#5c4b37",
            margin: "15px auto",
          }}
        />
      </div>

      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "#121214",
          border: "1px solid #2a2218",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
          borderRadius: "6px",
          display: "flex",
          flexDirection: "column",
          height: "75vh",
        }}
      >
        <div
          className="novel-scroll"
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "35px",
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className="fade-in"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.sender === "user" && (
                <div
                  style={{
                    color: "#8c7355",
                    fontStyle: "italic",
                    fontSize: "15px",
                    borderBottom: "1px solid #2a2218",
                    paddingBottom: "5px",
                  }}
                >
                  " {msg.text} "
                </div>
              )}

              {msg.sender === "gm" && (
                <div style={{ width: "100%" }}>
                  {msg.isLoadingImage && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        border: "1px solid #2a2218",
                        backgroundColor: "#0b0b0c",
                        marginBottom: "20px",
                        color: "#5c4b37",
                        fontStyle: "italic",
                        fontSize: "14px",
                      }}
                    >
                      ✧ 진리의 문에서 장면을 연성하는 중... ✧
                    </div>
                  )}
                  {msg.imageUrl && (
                    <div
                      className="fade-in"
                      style={{ marginBottom: "25px", textAlign: "center" }}
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Scene"
                        style={{
                          width: "100%",
                          border: "2px solid #3a2f24",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                  )}

                  {/* ✍️ 3. 단순 텍스트 렌더링 대신 Typewriter 컴포넌트 적용! */}
                  <Typewriter
                    text={msg.text}
                    speed={30}
                    onTyping={scrollToBottom}
                  />
                </div>
              )}
            </div>
          ))}

          {isGeneratingText && (
            <div
              className="fade-in"
              style={{
                textAlign: "center",
                color: "#5c4b37",
                fontStyle: "italic",
                padding: "20px 0",
              }}
            >
              기록을 이어나가는 중...
            </div>
          )}
        </div>

        <div
          style={{
            padding: "20px 30px",
            borderTop: "1px solid #2a2218",
            backgroundColor: "#0e0e10",
          }}
        >
          {!isFinished ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  className="choice-btn"
                  disabled={isGeneratingText}
                  onClick={() => fetchGMResponse(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : !bookUid ? (
            <button
              className="action-btn publish-btn"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing
                ? "📖 진리의 문에서 책을 엮는 중..."
                : "📖 연구 일지 엮어내기 (출판)"}
            </button>
          ) : !orderUid ? (
            <button
              className="action-btn order-btn"
              onClick={handleOrder}
              disabled={isOrdering}
            >
              {isOrdering
                ? "🛒 사령부에 주문 접수 중..."
                : "🛒 센트럴 사령부에 인쇄 요청하기 (주문)"}
            </button>
          ) : (
            <div
              className="fade-in"
              style={{
                textAlign: "center",
                padding: "16px",
                backgroundColor: "rgba(27,67,50,0.4)",
                border: "1px solid #2f855a",
                color: "#9ae6b4",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              ✅ 국가 연금술사 사령부로 주문이 완료되었습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
