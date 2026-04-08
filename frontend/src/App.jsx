/**
 * File: App.jsx
 * Description: 진리의 문(TRPG) 메인 UI 및 채팅 인터페이스 화면 렌더링 컴포넌트
 */

// ==========================================
// 1. 모듈 및 컴포넌트 임포트
// ==========================================
import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

import Header from "./components/common/Header";
import Typewriter from "./components/common/Typewriter";
import PreviewModal from "./components/modal/PreviewModal";
import BottomAction from "./components/controls/BottomAction";
import { useAlchemist } from "./hooks/useAlchemist";

// ==========================================
// 2. 메인 App 컴포넌트
// ==========================================
function App() {
  // 1. 상태 및 Ref 선언
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const scrollRef = useRef(null);
  const initialized = useRef(false);

  // 2. 스크롤 함수 (커스텀 훅 전달용)
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // 3. 커스텀 훅 (비즈니스 로직 연동)
  const {
    messages,
    choices,
    isFinished,
    isGeneratingText,
    isPublishing,
    isOrdering,
    isCanceling,
    bookUid,
    orderUid,
    fetchGMResponse,
    handlePublish,
    handleOrder,
    handleCancelOrder,
  } = useAlchemist(scrollToBottom);

  // ==========================================
  // 3. 생명주기 (Lifecycle) 관리
  // ==========================================
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      console.log(
        "[App] ℹ️ 초기 렌더링 완료. 게임 마스터와 세션 연결을 시작합니다.",
      );
      fetchGMResponse();
    }
  }, [fetchGMResponse]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGeneratingText, scrollToBottom]);

  // ==========================================
  // 4. UI 렌더링 로직
  // ==========================================
  return (
    <div className="app-container">
      <Header />

      <div className="main-box">
        <div className="chat-container novel-scroll" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`fade-in message-row ${msg.sender === "user" ? "user-row" : "gm-row"}`}
            >
              {msg.sender === "user" ? (
                <div className="user-text">" {msg.text} "</div>
              ) : (
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
              <div className="loading-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <span>운명을 연성하는 중...</span>
            </div>
          )}
        </div>

        <div className="bottom-controller">
          <BottomAction
            isFinished={isFinished}
            bookUid={bookUid}
            orderUid={orderUid}
            choices={choices}
            isGeneratingText={isGeneratingText}
            isPublishing={isPublishing}
            isOrdering={isOrdering}
            isCanceling={isCanceling}
            onChoiceSelect={fetchGMResponse}
            onShowPreview={() => setShowPreviewModal(true)}
            onOrder={handleOrder}
            onCancelOrder={handleCancelOrder}
          />
        </div>
      </div>

      {showPreviewModal && (
        <PreviewModal
          messages={messages}
          onClose={() => setShowPreviewModal(false)}
          onPublish={() => {
            setShowPreviewModal(false);
            handlePublish();
          }}
        />
      )}
    </div>
  );
}

export default App;
