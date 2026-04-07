/**
 * File: useAlchemist.js
 * Description: TRPG 게임 진행, API 통신, 출판 및 주문 처리를 담당하는 메인 비즈니스 로직 훅
 */
import { useState, useRef } from "react";

export function useAlchemist(onScroll) {
  // ==========================================
  // 1. 상태(State) 및 Ref 관리
  // ==========================================
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [choices, setChoices] = useState([]);

  const [isFinished, setIsFinished] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [bookUid, setBookUid] = useState(null);
  const [orderUid, setOrderUid] = useState(null);

  const sessionId = useRef(
    `alchemist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  );

  // ==========================================
  // 2. 게임 마스터(GM) 대화 및 이미지 연성 로직
  // ==========================================
  const fetchGMResponse = async (userMessage = "") => {
    try {
      if (userMessage) {
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
        if (onScroll) setTimeout(onScroll, 100);
      }

      setIsGeneratingText(true);
      setChoices([]);

      console.log(
        `[useAlchemist] ℹ️ 턴 ${turn} 진행 중: 백엔드 AI 통신 요청...`,
      );

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
      if (data.isEndOfChapter) {
        console.log("[useAlchemist] ✅ 스토리 챕터 종료 감지됨.");
        setIsFinished(true);
      }
      setTurn((prev) => prev + 1);

      // 이미지 프롬프트가 존재할 경우 추가 통신
      if (data.imagePrompt) {
        try {
          console.log(
            "[useAlchemist] ℹ️ 이미지 프롬프트 감지. DALL-E 3 연성 요청...",
          );
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
          console.log("[useAlchemist] ✅ 이미지 렌더링 완료.");
          if (onScroll) setTimeout(onScroll, 200);
        } catch (imgError) {
          console.error(
            "[useAlchemist] ❌ Error: 이미지 통신 오류 -",
            imgError,
          );
        } finally {
          setIsGeneratingText(false);
        }
      } else {
        setIsGeneratingText(false);
      }
    } catch (error) {
      console.error("[useAlchemist] ❌ Error: 채팅 API 통신 오류 -", error);
      setIsGeneratingText(false);
    }
  };

  // ==========================================
  // 3. 출판(Sweetbook) 통신 로직
  // ==========================================
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      console.log("[useAlchemist] ℹ️ 출판 API 호출: 책 조립 연성진 가동...");
      alert("스토리와 연성된 이미지를 책으로 묶습니다. 잠시만 기다려주십시오.");

      const response = await fetch("http://localhost:3000/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json();
      setIsPublishing(false);

      if (data.success) {
        console.log(`[useAlchemist] ✅ 출판 성공! (Book UID: ${data.bookUid})`);
        setBookUid(data.bookUid);
        alert(data.message);
      } else {
        console.error("[useAlchemist] ❌ 출판 실패:", data.message);
        alert("출판 실패: " + data.message);
      }
    } catch (error) {
      console.error("[useAlchemist] ❌ Error: 출판 서버 통신 오류 -", error);
      setIsPublishing(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  // ==========================================
  // 4. 인쇄 주문 통신 로직
  // ==========================================
  const handleOrder = async () => {
    try {
      setIsOrdering(true);
      console.log(
        `[useAlchemist] ℹ️ 주문 API 호출: 센트럴 사령부에 인쇄 요청... (Book UID: ${bookUid})`,
      );
      alert("센트럴 사령부에 인쇄를 요청합니다.");

      const response = await fetch("http://localhost:3000/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookUid }),
      });
      const data = await response.json();
      setIsOrdering(false);

      if (data.success) {
        console.log(
          `[useAlchemist] ✅ 주문 접수 완료 (Order UID: ${data.orderUid})`,
        );
        setOrderUid(data.orderUid);
        alert(data.message);
      } else {
        console.error("[useAlchemist] ❌ 주문 실패:", data.message);
        alert("주문 실패: " + data.message);
      }
    } catch (error) {
      console.error("[useAlchemist] ❌ Error: 주문 서버 통신 오류 -", error);
      setIsOrdering(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  // ==========================================
  // 5. 인쇄 주문 취소 로직
  // ==========================================
  const handleCancelOrder = async () => {
    if (
      !window.confirm(
        "정말 인쇄 요청을 취소하시겠습니까?\n(충전금은 즉시 환불됩니다)",
      )
    )
      return;

    try {
      setIsCanceling(true);
      console.log(
        `[useAlchemist] ⚠️ 취소 API 호출: 인쇄 강제 중단 요청... (Order UID: ${orderUid})`,
      );

      const response = await fetch("http://localhost:3000/api/order/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderUid }),
      });
      const data = await response.json();
      setIsCanceling(false);

      if (data.success) {
        console.log("[useAlchemist] ✅ 주문 취소(비상탈출) 성공.");
        alert(data.message);
        setOrderUid(null);
      } else {
        console.error("[useAlchemist] ❌ 주문 취소 불가 상태:", data.message);
        alert(data.message);
      }
    } catch (error) {
      console.error(
        "[useAlchemist] ❌ Error: 주문 취소 서버 통신 오류 -",
        error,
      );
      setIsCanceling(false);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  return {
    messages,
    turn,
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
  };
}
