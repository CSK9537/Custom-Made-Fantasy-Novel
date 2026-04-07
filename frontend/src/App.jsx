/**
 * File: App.jsx
 * Description: 강철의 연금술사 테마 TRPG 및 출판 프로세스 UI
 */
import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// ==========================================
// 1. 공통 컴포넌트 (타이핑 애니메이션)
// ==========================================
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
    <div className="typewriter-text">
      {displayedText.split("\n").map((line, idx, arr) => (
        <p key={idx}>
          {line}
          {isTyping && idx === arr.length - 1 && (
            <span className="blinking-cursor">|</span>
          )}
        </p>
      ))}
    </div>
  );
};

// ==========================================
// 2. 메인 애플리케이션 로직
// ==========================================
function App() {
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [choices, setChoices] = useState([]);

  const [isFinished, setIsFinished] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
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

  // ==========================================
  // 3. API 통신 핸들러
  // ==========================================
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
        body: JSON.stringify({
          sessionId: sessionId.current,
          message: userMessage,
          turn,
        }),
      });
      const data = await response.json();

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
      if (data.isEndOfChapter) setIsFinished(true);
      setTurn((prev) => prev + 1);

      if (data.imagePrompt) {
        try {
          const imgResponse = await fetch("http://localhost:3000/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imagePrompt: data.imagePrompt }),
          });
          const imgData = await imgResponse.json();

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === msgId
                ? { ...msg, imageUrl: imgData.imageUrl, isLoadingImage: false }
                : msg,
            ),
          );
          setTimeout(scrollToBottom, 200);
        } catch (imgError) {
          console.error("[Client - Error] 이미지 통신 오류:", imgError);
        } finally {
          setIsGeneratingText(false);
        }
      } else {
        setIsGeneratingText(false);
      }
    } catch (error) {
      console.error("[Client - Error] 채팅 API 통신 오류:", error);
      setIsGeneratingText(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setShowPreviewModal(false);
      alert("스토리와 연성된 이미지를 책으로 묶습니다. 잠시만 기다려주십시오.");

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
      console.error("[Client - Error] 출판 에러:", error);
      setIsPublishing(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  const handleOrder = async () => {
    try {
      setIsOrdering(true);
      alert("센트럴 사령부에 인쇄를 요청합니다.");

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
      console.error("[Client - Error] 주문 에러:", error);
      setIsOrdering(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

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
        body: JSON.stringify({ orderUid }),
      });
      const data = await response.json();
      setIsCanceling(false);

      if (data.success) {
        alert(data.message);
        setOrderUid(null);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("[Client - Error] 주문 취소 에러:", error);
      setIsCanceling(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  const galleryImages = messages.filter((msg) => msg.imageUrl);

  // ==========================================
  // 4. UI 렌더링
  // ==========================================
  return (
    <div className="app-container">
      {/* 헤더 */}
      <div className="app-header">
        <h1 className="app-title">국가 연금술사 연구 일지</h1>
        <p className="app-subtitle">The Fullmetal Alchemist Visual Novel</p>
        <div className="app-divider" />
      </div>

      {/* 메인 컨테이너 */}
      <div className="main-box">
        {/* 대화 영역 */}
        <div className="chat-container novel-scroll" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`fade-in message-row ${msg.sender === "user" ? "user-row" : "gm-row"}`}
            >
              {msg.sender === "user" && (
                <div className="user-text">" {msg.text} "</div>
              )}

              {msg.sender === "gm" && (
                <div className="gm-content">
                  {msg.isLoadingImage && (
                    <div className="gm-loading">
                      [ 진리의 문에서 장면을 연성하는 중... ]
                    </div>
                  )}
                  {msg.imageUrl && (
                    <div className="fade-in image-wrapper">
                      <img
                        src={msg.imageUrl}
                        alt="Scene"
                        className="scene-image"
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
            <div className="fade-in generating-text">
              기록을 이어나가는 중...
            </div>
          )}
        </div>

        {/* 하단 컨트롤러 */}
        <div className="bottom-controller">
          {!isFinished ? (
            <div className="choices-container">
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
              onClick={() => setShowPreviewModal(true)}
              disabled={isPublishing}
            >
              {isPublishing
                ? "진리의 문에서 책을 엮는 중..."
                : "출판 전 연성진 검토 (미리보기)"}
            </button>
          ) : !orderUid ? (
            <button
              className="action-btn order-btn"
              onClick={handleOrder}
              disabled={isOrdering}
            >
              {isOrdering
                ? "사령부에 주문 접수 중..."
                : "센트럴 사령부에 인쇄 요청하기 (주문)"}
            </button>
          ) : (
            <div className="fade-in order-success-container">
              <div className="success-box">
                국가 연금술사 사령부로 주문이 완료되었습니다. <br />
                <span>(주문번호: {orderUid})</span>
              </div>
              <button
                className="cancel-btn"
                onClick={handleCancelOrder}
                disabled={isCanceling}
              >
                {isCanceling
                  ? "취소 요청 중..."
                  : "비상탈출 (인쇄 주문 취소하기)"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 모달 팝업 */}
      {showPreviewModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPreviewModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>출판 전 수집된 일지 (총 {galleryImages.length}장)</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowPreviewModal(false)}
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
              <button
                className="choice-btn modal-btn"
                onClick={() => setShowPreviewModal(false)}
              >
                닫기
              </button>
              <button
                className="action-btn publish-btn modal-btn"
                onClick={handlePublish}
              >
                최종 출판하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
