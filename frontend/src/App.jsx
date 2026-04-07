import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// ✍️ 글자를 한 땀 한 땀 연성하는 타이핑 컴포넌트
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
      if (onTyping) onTyping();
      if (i >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

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
  const [isCanceling, setIsCanceling] = useState(false); // 취소 로딩 상태

  // 🔍 갤러리 모달 창 열림/닫힘 상태 추가
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [bookUid, setBookUid] = useState(null);
  const [orderUid, setOrderUid] = useState(null);

  const initialized = useRef(false);
  const scrollRef = useRef(null);
  const sessionId = useRef(
    `alchemist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  );

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const fetchGMResponse = async (userMessage = "") => {
    try {
      if (userMessage) {
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
        setTimeout(scrollToBottom, 100);
      }

      setIsGeneratingText(true);
      setChoices([]);

      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🚨 [1순위 수정] 백엔드로 내 고유 방 번호를 보냅니다!
        body: JSON.stringify({
          sessionId: sessionId.current,
          message: userMessage,
          turn,
        }),
      });
      const data = await response.json();

      // ❌ 원래 여기에 있던 setIsGeneratingText(false); 를 지웠습니다!

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
            setTimeout(scrollToBottom, 200);

            // 🚨 [2순위 수정] 이미지가 완전히 화면에 표시될 준비가 된 '지금' 잠금을 풉니다!
            setIsGeneratingText(false);
          })
          .catch((err) => {
            console.error("이미지 통신 에러:", err);
            // 에러가 나서 이미지를 못 받아와도 게임은 진행되도록 잠금을 풀어줍니다.
            setIsGeneratingText(false);
          });
      } else {
        // 이미지 프롬프트가 없는 턴이라면 바로 잠금을 풉니다.
        setIsGeneratingText(false);
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

  // 📖 출판 API 호출 함수 (이제 모달 안에서 불립니다)
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setShowPreviewModal(false); // 출판 시작 시 모달 닫기
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

  // 🚨 취소 버튼 핸들러 추가
  const handleCancelOrder = async () => {
    if (
      !window.confirm(
        "정말 인쇄 요청을 취소하시겠습니까?\n(충전금은 즉시 환불됩니다)",
      )
    )
      return;

    try {
      setIsCanceling(true);
      const response = await fetch("http://localhost:3000/api/order/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderUid }), // 취소할 주문 번호를 서버로 전송
      });

      const data = await response.json();
      setIsCanceling(false);

      if (data.success) {
        alert(data.message);
        setOrderUid(null); // 주문 번호를 날려버려서 다시 "주문하기" 버튼이 뜨게 만듦!
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("주문 취소 에러:", error);
      setIsCanceling(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  // 모달 렌더링에 사용할 이미지가 있는 메시지만 필터링
  const galleryImages = messages.filter((msg) => msg.imageUrl);

  return (
    <div
      style={{
        color: "#d1c7b7",
        minHeight: "100vh",
        padding: "20px",
        position: "relative",
      }}
    >
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
            // 🚨 출판 버튼을 누르면 바로 출판하는게 아니라 모달을 먼저 띄웁니다!
            <button
              className="action-btn publish-btn"
              onClick={() => setShowPreviewModal(true)}
              disabled={isPublishing}
            >
              {isPublishing
                ? "📖 진리의 문에서 책을 엮는 중..."
                : "🔍 출판 전 연성진 검토 (미리보기)"}
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
            // 🚨 주문 완료 후 나타나는 화면 수정
            <div
              className="fade-in"
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div
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
                ✅ 국가 연금술사 사령부로 주문이 완료되었습니다. <br />
                <span style={{ fontSize: "13px", color: "#68d391" }}>
                  (주문번호: {orderUid})
                </span>
              </div>

              {/* 🚨 비상탈출(취소) 버튼 추가 */}
              <button
                onClick={handleCancelOrder}
                disabled={isCanceling}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "transparent",
                  color: "#fc8181",
                  border: "1px solid #fc8181",
                  borderRadius: "4px",
                  fontSize: "15px",
                  cursor: isCanceling ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  opacity: isCanceling ? 0.5 : 1,
                }}
              >
                {isCanceling
                  ? "⏳ 취소 요청 중..."
                  : "🚨 비상탈출 (인쇄 주문 취소하기)"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🔍 출판 전 갤러리 모달창 */}
      {showPreviewModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPreviewModal(false)}
        >
          {/* 안쪽 클릭 시 닫히지 않도록 e.stopPropagation() 처리 */}
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: "20px", color: "#f3e5d8" }}>
                📖 출판 전 수집된 일지 (총 {galleryImages.length}장)
              </h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8c7355",
                  fontSize: "28px",
                  cursor: "pointer",
                  lineHeight: "1",
                }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body novel-scroll">
              <div className="gallery-grid">
                {galleryImages.map((msg, idx) => (
                  <div key={idx} className="gallery-item">
                    <img src={msg.imageUrl} alt={`Scene ${idx + 1}`} />
                    <p>제 {idx + 1} 장</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              {/* 🚨 '더 수정하기'를 직관적인 '닫기'로 변경! */}
              <button
                className="choice-btn"
                style={{ width: "auto", padding: "10px 20px", margin: 0 }}
                onClick={() => setShowPreviewModal(false)}
              >
                닫기
              </button>
              <button
                className="action-btn publish-btn"
                style={{ width: "auto", padding: "10px 30px", margin: 0 }}
                onClick={handlePublish}
              >
                최종 출판하기 🪄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
