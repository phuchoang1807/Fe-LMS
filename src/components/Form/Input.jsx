import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./Form.css"; // Đảm bảo đúng đường dẫn tới file form.css

/**
 * Component Input tái sử dụng
 * @param {string} label - tiêu đề của input
 * @param {string} error - thông báo lỗi
 */
const Input = ({ label, error, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === "password";
  const inputType = isPassword && showPassword ? "text" : props.type;

  return (
    <div className="form-group">
      {label && <label htmlFor={props.name}>{label}</label>}
      <div className="input-wrapper">
        <input id={props.name} {...props} type={inputType} />
        {isPassword && (
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </span>
        )}
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default Input;