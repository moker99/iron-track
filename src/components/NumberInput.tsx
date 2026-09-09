import React, { useState, useEffect, useRef } from 'react';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string | undefined | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 'any',
  placeholder = '0',
  className = 'input',
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const formatValue = (v: number | string | undefined | null): string => {
    if (v === undefined || v === null) return '0';
    if (typeof v === 'number') {
      return isNaN(v) ? '0' : String(v);
    }
    return v === '' ? '0' : String(v);
  };

  const [text, setText] = useState<string>(() => formatValue(value));
  const isFocusedRef = useRef(false);

  // 當外部傳入的 value 改變時同步內部 text
  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(formatValue(value));
    } else {
      const currentParsed = text === '' || text === '-' ? 0 : parseFloat(text);
      const propParsed = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
      if (!isNaN(propParsed) && propParsed !== currentParsed) {
        setText(formatValue(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);

    // 使用者將字元全部刪除時，允許保持空白，同時通知上層 0 維持即時運算
    if (raw === '' || raw === '-') {
      onChange(0);
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    // 聚焦時自動全選文字，方便使用者直接打字覆蓋或按 Backspace 清空
    e.currentTarget.select();
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    const trimmed = text.trim();

    // 離開輸入框時若為空白，自動補回 0
    if (trimmed === '' || isNaN(parseFloat(trimmed))) {
      setText('0');
      onChange(0);
    } else {
      let parsed = parseFloat(trimmed);
      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;
      setText(String(parsed));
      onChange(parsed);
    }

    onBlur?.(e);
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      className={className}
      style={style}
      value={text}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onWheel={(e) => e.currentTarget.blur()}
      {...rest}
    />
  );
};
