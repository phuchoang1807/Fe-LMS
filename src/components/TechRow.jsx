import React from "react";
import { X } from "lucide-react";

export default function TechRow({
  tech,
  index,
  onChange,
  onRemove,
  technologies,
  totalTechs,
}) {
  const handleTechChange = (e) => {
    onChange(index, "technologyId", e.target.value);
  };

  const handleQtyChange = (e) => {
    const raw = e.target.value;
    // Chỉ giữ lại ký tự số 0–9, bỏ hết chữ & ký tự đặc biệt
    const onlyDigits = raw.replace(/\D/g, "");

    // Cho phép rỗng để user xóa hết rồi gõ lại
    onChange(index, "soLuong", onlyDigits);
  };

  // 🔹 NEW: nếu để trống (hoặc 0) rồi blur ra ngoài thì auto trả về 1
  const handleQtyBlur = () => {
    if (!tech.soLuong || tech.soLuong === "0") {
      onChange(index, "soLuong", "1");
    }
  };

  return (
    <div className="tech-row-custom">
      <select
        className="tech-select-custom"
        value={tech.technologyId || ""}
        onChange={handleTechChange}
      >
        <option value="">Chọn công nghệ</option>
        {(technologies || []).map((t) => {
          const id = String(t.id ?? t.technologyId);
          const name = t.name ?? t.technologyName ?? t.technology ?? "";
          return (
            <option key={id} value={id}>
              {name}
            </option>
          );
        })}
      </select>

      <input
        type="text"               // giữ như bản trước
        className="qty-input-custom"
        placeholder="Số lượng"
        value={tech.soLuong}
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={handleQtyChange}
        onBlur={handleQtyBlur}    // 🔹 thêm dòng này
      />

      {/* ẨN HOÀN TOÀN NÚT X NẾU CHỈ CÓ 1 DÒNG */}
      {totalTechs > 1 && (
        <button
          type="button"
          className="btn-remove-tech-custom"
          onClick={() => onRemove(index)}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
