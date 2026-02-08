import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import "../styles/datepicker.css";
import { FiCalendar } from "react-icons/fi"; // ✅ dùng icon hiện đại
const months = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];
const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const DatePicker = ({ selectedDate, onDateChange }) => {
  const today = new Date();
  const [showCalendar, setShowCalendar] = useState(false);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  // Khi có selectedDate mới → cập nhật hiển thị
  useEffect(() => {
  if (selectedDate?.value) {
    const displayY = selectedDate.displayYear ?? selectedDate.value.getFullYear();
    const displayM = selectedDate.displayMonth ?? selectedDate.value.getMonth();
    setYear(displayY);
    setMonth(displayM);
    setSelectedDay(selectedDate.hasDaySelection ? selectedDate.value.getDate() : null);
  } else {
    setSelectedDay(null);
  }
}, [selectedDate]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (year, month) => (new Date(year, month, 1).getDay() + 6) % 7; // Bắt đầu từ T2

  const handleDateClick = (day) => setSelectedDay(day);

 const handleApply = () => {
  const base = new Date(year, month, selectedDay || 1);

  const payload = {
    value: base,
    displayYear: year,
    displayMonth: month,
  };

  if (selectedDay !== null) {
    payload.filterMode = "day";
    payload.hasDaySelection = true;
    payload.displayText = base.toLocaleDateString("vi-VN"); // dd/mm/yyyy
  } else {
    payload.filterMode = "month";
    payload.hasDaySelection = false;
    payload.displayText = `${months[month]} ${year}`;
  }

  onDateChange(payload);
  setShowCalendar(false);
};


  const handleCancel = () => setShowCalendar(false);

  return (
    <div className="datepicker-wrapper">
      {/* Nút chính hiển thị ngày/tháng/năm */}
      <button
  className="datepicker-input"
  onClick={() => setShowCalendar(!showCalendar)}
>
  {selectedDate ? selectedDate.displayText : "dd/mm/yyyy"}
  <FiCalendar className="calendar-icon" />
</button>

      {showCalendar && (
        <div className="calendar-popup">
          {/* === Header chọn tháng và năm === */}
          <div className="calendar-header">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="month-select"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>

            <div className="year-nav">
              <button className="year-btn" onClick={() => setYear(year - 1)}>&lt;</button>
             <span
   className="year-display"
  style={{ cursor: "pointer" }}
  onClick={() => {
    const base = new Date(year, 0, 1);
    onDateChange({
      value: base,
      filterMode: "year",
      displayYear: year,
      displayMonth: 0,
      hasDaySelection: false,
      displayText: `Năm ${year}`,
    });
    setShowCalendar(false);
  }}
>
  {year}
</span>
              <button className="year-btn" onClick={() => setYear(year + 1)}>&gt;</button>
            </div>
          </div>

          {/* === Hàng thứ trong tuần === */}
          <div className="calendar-days-header">
            {daysOfWeek.map((d, i) => (
              <div key={i} className="day-name">{d}</div>
            ))}
          </div>

          {/* === Lưới ngày === */}
          <div className="calendar-grid">
            {[...Array(getFirstDay(year, month))].fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="empty-day"></div>
            ))}

            {[...Array(getDaysInMonth(year, month))].map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDay === day;
              const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year;

              return (
                <div
                  key={day}
                  className={`calendar-day ${isSelected ? "selected" : ""} ${
                    isToday ? "today" : ""
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* === Nút Hủy / Áp dụng === */}
          <div className="calendar-footer">
            <button className="cancel-btn" onClick={handleCancel}>Huỷ</button>
            <button className="apply-btn" onClick={handleApply}>Áp dụng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;