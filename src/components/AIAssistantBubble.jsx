// src/components/AIAssistantBubble.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../styles/ai-assistant.css";
import assistantAvatar from "../assets/tro-ly-phuc.png";

export default function AIAssistantBubble({
  trainings = [],
  planOptions = [],
  courseOrder = [], // ✅ nhận lộ trình môn từ DB
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([]);

  // ✅ NEW: chế độ chọn kế hoạch bằng số
  const [awaitingPlanPick, setAwaitingPlanPick] = useState(false);
  const [plansList, setPlansList] = useState([]); // [{planId, planName}]

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const getPlanNameById = (planId) => {
    if (!planId) return null;
    const p = (planOptions || []).find(
      (pl) =>
        String(pl.id ?? pl.planId ?? pl.recruitmentPlanId) === String(planId)
    );
    return p?.name || p?.planName || `Kế hoạch #${planId}`;
  };

  // ✅ NEW: build danh sách kế hoạch từ trainings (ưu tiên dữ liệu thực tế đang có)
  const buildPlansFromTrainings = () => {
    const map = new Map();
    (trainings || []).forEach((t) => {
      const planId =
        t.recruitmentPlanId ??
        t.planId ??
        t.recruitmentPlan?.id ??
        t.recruitmentPlan?.planId;

      if (!planId) return;

      const planName = getPlanNameById(planId);
      map.set(String(planId), {
        planId: String(planId),
        planName,
      });
    });

    // sort theo tên để list ổn định
    return Array.from(map.values()).sort((a, b) =>
      String(a.planName).localeCompare(String(b.planName))
    );
  };

  // ✅ Build lộ trình từ courseOrder: cumulativeDays dựa trên durationDays trong DB
  const courseTimeline = useMemo(() => {
    if (!Array.isArray(courseOrder) || courseOrder.length === 0) return [];

    let cumulative = 0;
    return courseOrder
      .map((c) => {
        const daysRaw =
          c.durationDays ??
          c.courseDuration ??
          c.expectedDays ??
          c.duration ??
          0;

        const days = Number(daysRaw);
        if (!Number.isFinite(days) || days < 0) return null;

        cumulative += days;

        return {
          courseId: c.courseId ?? c.id,
          name: c.courseName || c.name || "Môn không tên",
          durationDays: days,
          cumulativeDays: cumulative,
        };
      })
      .filter(Boolean);
  }, [courseOrder]);

  // ===== helper: match score row to course in timeline =====
  const matchScoreToCourse = (scoreRow, course) => {
    if (!scoreRow || !course) return false;
    const scId = scoreRow.courseId ?? scoreRow.id;
    if (scId != null && course.courseId != null) {
      return String(scId) === String(course.courseId);
    }
    const scName = (scoreRow.courseName || scoreRow.name || "").toLowerCase();
    const cName = (course.name || "").toLowerCase();
    return !!scName && !!cName && scName === cName;
  };

  // ✅ hiển thị điểm cho 1 môn: có đủ 3 điểm -> tính trung bình (xx.xx), thiếu -> "N/A"
  const getCourseDisplayScore = (training, course) => {
    const scores = Array.isArray(training?.scores) ? training.scores : [];
    const s = scores.find((sc) => matchScoreToCourse(sc, course));
    if (!s) return "N/A";

    const th = s.theoryScore;
    const pr = s.practiceScore;
    const at = s.attitudeScore;

    if (th == null || pr == null || at == null) return "N/A";

    const avg = (Number(th) + Number(pr) + Number(at)) / 3;
    if (!Number.isFinite(avg)) return "N/A";

    return avg.toFixed(2);
  };

  /**
   * ✅ NEW LOGIC (chi tiết hơn):
   * - Tính prefixCompleted theo lộ trình hiện tại
   * - Nếu có completed nằm SAU 1 môn trước đó chưa completed => invalidSequence
   * - Trả thêm info để render bảng rõ ràng:
   *   + mustCompleteCourse: môn bắt buộc phải học tiếp theo (môn bị thiếu)
   *   + completedOutOfOrder: các môn đã hoàn thành nhưng lại nằm sau môn thiếu
   *   + prefixCompletedNames: các môn đã hoàn thành đúng thứ tự prefix
   */
  const getProgressPhase = (training) => {
    const trainingDays = Number(
      training.trainingDays ??
        training.soNgayThucTap ??
        training.soNgayTT ??
        null
    );

    if (!trainingDays || Number.isNaN(trainingDays)) return null;
    if (!courseTimeline.length) return null;

    const scores = Array.isArray(training.scores) ? training.scores : [];

    // Helper: 1 môn được coi là "hoàn thành" khi đủ 3 điểm thành phần
    const isCompleted = (course) => {
      const s = scores.find((sc) => matchScoreToCourse(sc, course));
      return (
        !!s &&
        s.theoryScore != null &&
        s.practiceScore != null &&
        s.attitudeScore != null
      );
    };

    let prefixCompleted = 0;
    let metIncompleteAtIndex = -1;
    let invalidSequence = false;

    const completedOutOfOrder = [];
    const prefixCompletedNames = [];

    for (let i = 0; i < courseTimeline.length; i++) {
      const c = courseTimeline[i];
      const done = isCompleted(c);

      if (metIncompleteAtIndex === -1) {
        if (done) {
          prefixCompleted++;
          prefixCompletedNames.push(c.name);
        } else {
          metIncompleteAtIndex = i; // gặp môn chưa hoàn thành đầu tiên
        }
      } else {
        if (done) {
          invalidSequence = true;
          completedOutOfOrder.push(c.name);
        }
      }
    }

    if (invalidSequence) {
      const mustCompleteCourse =
        metIncompleteAtIndex >= 0 ? courseTimeline[metIncompleteAtIndex] : null;

      return {
        trainingDays,
        invalidSequence: true,
        mustCompleteCourseName: mustCompleteCourse?.name || null,
        completedOutOfOrder,
        prefixCompletedNames,
      };
    }

    // Chưa hoàn thành được môn nào theo thứ tự hiện tại => không đánh giá
    if (prefixCompleted <= 0) return null;

    // "Môn hiện tại" theo nghĩa: đã hoàn thành liên tục tới môn nào
    const currentCourse = courseTimeline[prefixCompleted - 1];

    const targetDays =
      Number(currentCourse.cumulativeDays) && currentCourse.cumulativeDays > 0
        ? currentCourse.cumulativeDays
        : trainingDays;

    let status = "ĐÚNG TIẾN ĐỘ";
    if (trainingDays > targetDays) status = "CHẬM";
    else if (trainingDays < targetDays) status = "NHANH";

    return {
      trainingDays,
      currentCourseName: currentCourse.name,
      status,
      targetDays,
      invalidSequence: false,
    };
  };

  /**
   * ✅ Gom TTS chậm theo kế hoạch + lọc theo keyword nếu có
   * ✅ NEW:
   * - Nếu intern bị invalidSequence => lưu mismatch detail theo plan để show bảng
   * - Trả thêm meta.mismatchDetailsByPlan để handleDelayQuery render message mới
   */
  const buildDelayOverviewByPlan = (keywordRaw) => {
    if (!trainings || trainings.length === 0 || !courseTimeline.length) {
      return {
        groups: [],
        meta: {
          matchedPlanIds: new Set(),
          mismatchPlanIds: new Set(),
          mismatchDetailsByPlan: {},
        },
      };
    }

    const key = (keywordRaw || "").toString().trim().toLowerCase();
    const isNumeric = /^\d+$/.test(key);

    const allPlanIdsFromData = new Set(
      trainings
        .map(
          (t) =>
            t.recruitmentPlanId ??
            t.planId ??
            t.recruitmentPlan?.id ??
            t.recruitmentPlan?.planId
        )
        .filter(Boolean)
        .map((x) => String(x))
    );

    const matchedPlanIds = new Set();

    if (key && isNumeric) {
      for (const pid of allPlanIdsFromData) {
        if (String(pid) === key || String(pid) === String(Number(key))) {
          matchedPlanIds.add(String(pid));
        }
      }
    } else if (key) {
      for (const pid of allPlanIdsFromData) {
        const name = (getPlanNameById(pid) || "").toLowerCase();
        if (name.includes(key)) matchedPlanIds.add(String(pid));
      }
    }

    if (!key) {
      for (const pid of allPlanIdsFromData) matchedPlanIds.add(String(pid));
    }

    const byPlan = {};
    const mismatchPlanIds = new Set();
    const mismatchDetailsByPlan = {};

    trainings.forEach((t) => {
      const planId =
        t.recruitmentPlanId ??
        t.planId ??
        t.recruitmentPlan?.id ??
        t.recruitmentPlan?.planId;

      if (!planId) return;

      if (key && matchedPlanIds.size > 0) {
        if (!matchedPlanIds.has(String(planId))) return;
      }

      const phase = getProgressPhase(t);

      const internName =
        t.traineeName || t.fullName || t.name || "Không rõ tên";

      // ✅ Lệch thứ tự do đổi môn => gom mismatch table
      if (phase?.invalidSequence) {
        mismatchPlanIds.add(String(planId));

        if (!mismatchDetailsByPlan[planId]) {
          mismatchDetailsByPlan[planId] = {
            planId,
            planName: getPlanNameById(planId),
            rows: [],
          };
        }

        // ✅ build điểm theo từng môn (cột là tên môn)
        const courseScores = courseTimeline.reduce((acc, c) => {
          acc[c.name] = getCourseDisplayScore(t, c);
          return acc;
        }, {});

        mismatchDetailsByPlan[planId].rows.push({
          name: internName,
          mustLearn: phase.mustCompleteCourseName || "—",
          courseScores,
        });

        return;
      }

      if (!phase) return;

      if (phase.status !== "CHẬM") return;

      const delayDays = Math.max(0, phase.trainingDays - phase.targetDays);

      if (!byPlan[planId]) {
        byPlan[planId] = {
          planId,
          planName: getPlanNameById(planId),
          interns: [],
        };
      }

      byPlan[planId].interns.push({
        name: internName,
        currentCourseName: phase.currentCourseName,
        trainingDays: phase.trainingDays,
        delayDays,
      });
    });

    let groups = Object.values(byPlan);

    groups = groups.map((g) => ({
      ...g,
      interns: [...(g.interns || [])].sort((a, b) => b.delayDays - a.delayDays),
    }));

    Object.values(mismatchDetailsByPlan).forEach((p) => {
      p.rows = [...(p.rows || [])].sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
    });

    return {
      groups,
      meta: {
        matchedPlanIds,
        mismatchPlanIds,
        mismatchDetailsByPlan,
      },
    };
  };

  // ================== MESSAGE CHÀO (SỬA: thêm nhấn nhá in đậm) ==================
  useEffect(() => {
    if (messages.length > 0) return;

    const welcomeMsg = {
      id: 999999,
      sender: "ai",
      type: "text",
      text:
        "Chào bạn 👋\n" +
        "Mình là Trợ lý Phúc, giúp bạn theo dõi tiến độ thực tập sinh.\n\n" +
        "✅ **Cách 1 (xem TTS chậm):** gõ **chậm + tên kế hoạch**\n" +
        'Ví dụ: **tts chậm tháng 12** (trong đó "tháng 12" là tên kế hoạch).\n\n' +
        "✅ **Cách 2 (chọn nhanh theo số):** bấm **phím 1** để bé liệt kê tất cả kế hoạch (1,2,3,...)\n" +
        "Sau đó bạn gõ **số tương ứng** để xem tiến độ TTS của kế hoạch đó.",
    };

    setMessages([welcomeMsg]);
  }, [messages.length]);

  // ========= XỬ LÝ RIÊNG CÂU HỎI VỀ "CHẬM" (SỬA: format nhấn nhá) =========
  const handleDelayQuery = (rawContent) => {
    const lower = rawContent.toLowerCase().trim();

    if (
      lower === "chậm" ||
      lower === "tts chậm" ||
      lower === "xem tts chậm" ||
      lower === "xem chậm"
    ) {
      const hintMsg = {
        id: Date.now() + 1,
        sender: "ai",
        type: "text",
        text:
          "Bạn muốn xem TTS chậm của kế hoạch nào?\n\n" +
          "👉 Gõ: **chậm + tên kế hoạch**\n" +
          'Ví dụ: **tts chậm tháng 12** – trong đó "tháng 12" là tên kế hoạch.',
      };
      setMessages((prev) => [...prev, hintMsg]);
      return true;
    }

    if (!lower.includes("chậm")) return false;

    const idx = lower.lastIndexOf("chậm");
    let keyword = rawContent.slice(idx + "chậm".length).trim();

    if (!keyword) {
      const hintMsg = {
        id: Date.now() + 2,
        sender: "ai",
        type: "text",
        text:
          "Bạn muốn xem TTS chậm của kế hoạch nào?\n\n" +
          "👉 Gõ: **chậm + tên kế hoạch**\n" +
          'Ví dụ: **tts chậm tháng 12** – trong đó "tháng 12" là tên kế hoạch.',
      };
      setMessages((prev) => [...prev, hintMsg]);
      return true;
    }

    const { groups: overview, meta } = buildDelayOverviewByPlan(keyword);

    const matchedPlanIdsArr = meta?.matchedPlanIds
      ? Array.from(meta.matchedPlanIds)
      : [];
    const matchedPlanNames = matchedPlanIdsArr
      .map((pid) => getPlanNameById(pid))
      .filter(Boolean);

    const hasMismatchInMatchedPlan =
      meta?.mismatchPlanIds &&
      meta?.matchedPlanIds &&
      [...meta.mismatchPlanIds].some((pid) => meta.matchedPlanIds.has(pid));

    // ✅ Case 1: Có kế hoạch match nhưng đang lệch thứ tự -> show bảng mismatch
    if ((!overview || overview.length === 0) && hasMismatchInMatchedPlan) {
      const mismatchPlans = Object.values(
        meta.mismatchDetailsByPlan || {}
      ).filter((p) => meta.matchedPlanIds.has(String(p.planId)));

      const msg = {
        id: Date.now() + 3,
        sender: "ai",
        type: "sequenceMismatch",
        keyword,
        plans: mismatchPlans,
      };

      setMessages((prev) => [...prev, msg]);
      return true;
    }

    // ✅ Case 2: Có kế hoạch match nhưng chưa có dữ liệu hoàn thành môn nào
    if ((!overview || overview.length === 0) && matchedPlanNames.length > 0) {
      const planName = matchedPlanNames[0];

      const msg = {
        id: Date.now() + 31,
        sender: "ai",
        type: "text",
        text:
          `⚠️ **Kế hoạch "${planName}" hiện CHƯA CÓ dữ liệu hoàn thành môn học nào**\n\n` +
          `• **Lý do:** chưa có TTS nào được chấm **đủ 3 điểm thành phần** cho bất kỳ môn nào.\n` +
          `• **Kết quả:** bé **chưa thể đánh giá chậm/nhanh** ở thời điểm này ạ.\n\n` +
          `✅ **Cách xử lý:** Khi có ít nhất **1 môn** được chấm đủ điểm, bạn hỏi lại:\n` +
          `➡️ **chậm ${planName}**\n` +
          `là bé sẽ thống kê ngay 💖`,
      };

      setMessages((prev) => [...prev, msg]);
      return true;
    }

    // ✅ Case 3: Không match ra kế hoạch nào thật sự => sai tên
    if (!overview || overview.length === 0) {
      const notFoundMsg = {
        id: Date.now() + 4,
        sender: "ai",
        type: "text",
        text:
          "❌ **Không tìm thấy kế hoạch khớp với tên bạn nhập.**\n\n" +
          "Tên kế hoạch sai kìa, mở to mắt ra nhìn lại giúp bé với 😝\n" +
          "Nhầm lẫn nhỏ của cô/cậu chủ thôi, thử gõ lại tên kế hoạch chính xác hơn nhé 💖",
      };
      setMessages((prev) => [...prev, notFoundMsg]);
      return true;
    }

    const aiMsg = {
      id: Date.now() + 5,
      sender: "ai",
      type: "delayOverview",
      keyword: keyword,
      overview,
    };

    setMessages((prev) => [...prev, aiMsg]);
    return true;
  };

  // ✅ NEW: xử lý phím 1 / chọn số kế hoạch (SỬA: nhấn nhá)
  const handlePlanPickFlow = (rawContent) => {
    const text = String(rawContent || "").trim();

    // 1) Nếu đang chờ chọn kế hoạch => parse số
    if (awaitingPlanPick) {
      if (!/^\d+$/.test(text)) return false;

      const n = Number(text);
      if (!Number.isFinite(n)) return true;

      // cho phép huỷ
      if (n === 0) {
        setAwaitingPlanPick(false);
        setPlansList([]);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 11,
            sender: "ai",
            type: "text",
            text:
              "✅ **Đã huỷ chọn kế hoạch.**\n" +
              "Bạn có thể bấm **phím 1** để xem lại danh sách nhé 💖",
          },
        ]);
        return true;
      }

      const picked = plansList[n - 1];
      if (!picked) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 12,
            sender: "ai",
            type: "text",
            text: `⚠️ **Số bạn chọn không hợp lệ.**\n👉 Bạn chọn từ **1 đến ${plansList.length}** (hoặc gõ **0** để huỷ).`,
          },
        ]);
        return true;
      }

      // ✅ sau khi chọn, chuyển thành câu hỏi cũ: "chậm + tên kế hoạch"
      setAwaitingPlanPick(false);
      setPlansList([]);

      const autoQuery = `chậm ${picked.planName}`;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 13,
          sender: "ai",
          type: "text",
          text: `🔎 **Oke!** Bé đang kiểm tra tiến độ TTS của kế hoạch:\n➡️ **"${picked.planName}"** ...`,
        },
      ]);

      handleDelayQuery(autoQuery);
      return true;
    }

    // 2) Nếu chưa ở chế độ chọn, user gõ đúng "1" => liệt kê kế hoạch
    if (text === "1") {
      const plans = buildPlansFromTrainings();

      if (!plans.length) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 14,
            sender: "ai",
            type: "text",
            text:
              "⚠️ **Chưa có kế hoạch để liệt kê.**\n" +
              "Hiện tại bé chưa tìm thấy kế hoạch tuyển dụng nào trong dữ liệu trainings 😥",
          },
        ]);
        return true;
      }

      setPlansList(plans);
      setAwaitingPlanPick(true);

      const listText =
        "**Danh sách kế hoạch tuyển dụng hiện có:**\n\n" +
        plans.map((p, idx) => `**${idx + 1}.** ${p.planName}`).join("\n") +
        "\n\n👉 Bạn gõ **số tương ứng** để xem tiến độ TTS của kế hoạch đó (hoặc gõ **0** để huỷ).";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 15,
          sender: "ai",
          type: "text",
          text: listText,
        },
      ]);

      return true;
    }

    return false;
  };

  // ================== GỬI TIN ==================
  const handleSend = async () => {
    const raw = input.trim();
    if (!raw || loading) return;

    const content = raw;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      type: "text",
      text: content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // ✅ NEW: ưu tiên flow chọn kế hoạch bằng số
    const handledByPlanPick = handlePlanPickFlow(content);
    if (handledByPlanPick) return;

    const handledByDelay = handleDelayQuery(content);
    if (handledByDelay) {
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/ai/chat", { message: content });

      const replyText =
        typeof res.data === "string"
          ? res.data
          : res.data.reply || JSON.stringify(res.data);

      const aiMsg = {
        id: Date.now() + 1,
        sender: "ai",
        type: "text",
        text: replyText,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "ai",
          type: "text",
          text:
            "Bé chưa hiểu câu hỏi của anh/chị ạ, anh/chị hãy ghi rõ câu hỏi hơn giúp bé với ạ ❤️",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ================== RENDER MESSAGE (SỬA: support **bold**) ==================
  const renderMessageText = (text) => {
    const escapeHtml = (s) =>
      s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    // hỗ trợ **bold**
    const toHtmlWithBold = (line) => {
      const parts = String(line).split("**");
      // parts: even index = normal, odd index = bold
      const html = parts
        .map((p, idx) => {
          const safe = escapeHtml(p);
          return idx % 2 === 1 ? `<strong>${safe}</strong>` : safe;
        })
        .join("");
      return html;
    };

    return String(text)
      .split("\n")
      .map((line, i) => (
        <p
          key={i}
          dangerouslySetInnerHTML={{ __html: toHtmlWithBold(line) }}
        />
      ));
  };

  const renderMessage = (m) => {
    // ✅ bảng mới: cột là các môn học, có điểm -> hiện điểm, chưa có -> N/A
    if (m.type === "sequenceMismatch") {
      const courseCols = courseTimeline.map((c) => c.name);

      return (
        <div key={m.id} className="ai-chat-message ai-msg-ai ai-card">
          <p>
            ⚠️ Bé phát hiện trong kế hoạch khớp với <b>"{m.keyword}"</b> đang có
            <b> thay đổi thứ tự học của các môn</b>.
            <br />
            Một số TTS đã được chấm điểm theo thứ tự cũ, nên hiện tại bé{" "}
            <b>chưa thể đánh giá chậm/nhanh</b> cho tới khi các bạn học đúng môn
            còn thiếu theo lộ trình mới.
          </p>

          {(m.plans || []).map((plan) => (
            <div key={plan.planId} className="ai-plan-block">
              <div className="ai-plan-heading">
                <span className="ai-pill">Kế hoạch</span>
                <span className="ai-plan-name">{plan.planName}</span>
              </div>

              <div className="ai-table-wrapper">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên TTS</th>
                      {courseCols.map((name) => (
                        <th key={name}>{name}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {(plan.rows || []).map((r, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{r.name}</td>
                        {courseCols.map((courseName) => (
                          <td key={courseName}>
                            {r.courseScores?.[courseName] ?? "N/A"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ai-delay-summary">
                👉 Các bạn cần học đúng theo lộ trình mới (hoàn thành các môn còn
                thiếu) thì bé mới đánh giá tiếp được ạ 💖
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (m.type === "delayOverview") {
      return (
        <div key={m.id} className="ai-chat-message ai-msg-ai ai-card">
          <p>
            Đây là danh sách TTS đang <b>chậm tiến độ</b> trong các kế hoạch
            khớp với: <b>"{m.keyword}"</b>
          </p>

          {m.overview.map((plan) => {
            const maxDelay =
              plan.interns && plan.interns.length
                ? Math.max(
                    ...plan.interns.map((i) => Number(i.delayDays || 0))
                  )
                : 0;

            return (
              <div key={plan.planId} className="ai-plan-block">
                <div className="ai-plan-heading">
                  <span className="ai-pill">Kế hoạch</span>
                  <span className="ai-plan-name">{plan.planName}</span>
                  <span className="ai-plan-count">
                    {plan.interns.length} bạn chậm
                  </span>
                </div>

                <div className="ai-delay-summary">
                  ⏱ Chậm nhất: <b>{maxDelay}</b> ngày
                </div>

                <div className="ai-table-wrapper">
                  <table className="ai-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Tên TTS</th>
                        <th>Môn hiện tại</th>
                        <th>Số ngày TT</th>
                        <th>Ngày chậm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.interns.map((intern, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{intern.name}</td>
                          <td>{intern.currentCourseName}</td>
                          <td>{intern.trainingDays}</td>
                          <td
                            className={
                              intern.delayDays > 0 ? "ai-delay-cell" : ""
                            }
                          >
                            {intern.delayDays > 0 ? (
                              <span className="ai-delay-badge">
                                {intern.delayDays}
                              </span>
                            ) : (
                              intern.delayDays
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div
        key={m.id}
        className={`ai-chat-message ${
          m.sender === "user" ? "ai-msg-user" : "ai-msg-ai"
        }`}
      >
        {/* ✅ render hỗ trợ **bold** */}
        {renderMessageText(m.text)}
      </div>
    );
  };

  return (
    <>
      {/* === Nút mở chat === */}
      <button className="ai-bubble-btn" onClick={toggleOpen}>
        <img src={assistantAvatar} className="ai-bubble-avatar" />
      </button>

      {/* === Khung chat === */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-left">
              <div className="ai-chat-avatar">
                <img src={assistantAvatar} />
              </div>

              <div>
                <div className="ai-chat-title">Trợ lý Phúc</div>
                <div className="ai-chat-subtitle">
                  Đồng hành cùng quản lý đào tạo
                </div>
                <div className="ai-badge-online">
                  <span className="ai-dot" /> Luôn sẵn sàng hỗ trợ
                </div>
              </div>
            </div>

            <button className="ai-chat-close" onClick={toggleOpen}>
              ✕
            </button>
          </div>

          <div className="ai-chat-body">
            {messages.map((m) => renderMessage(m))}
            {loading && (
              <div className="ai-chat-message ai-msg-ai ai-typing">
                Đang suy nghĩ...
              </div>
            )}
          </div>

          <div className="ai-chat-input-row">
            <textarea
              className="ai-chat-input"
              placeholder={
                awaitingPlanPick
                  ? "Gõ số kế hoạch (hoặc 0 để huỷ)…"
                  : "Nhập câu hỏi…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <button
              className="ai-chat-send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
