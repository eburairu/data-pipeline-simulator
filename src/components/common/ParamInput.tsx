import React from 'react';

interface ParamInputProps {
    value: Record<string, string>;
    onChange: (val: Record<string, string>) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
}

/**
 * ParamInput: キー・バリューペア編集用のテキストエリアコンポーネント
 * 
 * key=value形式のテキストを解析してRecord<string, string>として管理します。
 */
const ParamInput: React.FC<ParamInputProps> = ({
    value,
    onChange,
    placeholder = "KEY=value\nKEY2=value2",
    className = "",
    rows = 4
}) => {
    // Record<string, string> を key=value 形式のテキストに変換
    const textValue = Object.entries(value || {}).map(([k, v]) => `${k}=${v}`).join('\n');

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const params: Record<string, string> = {};
        text.split('\n').forEach(line => {
            const idx = line.indexOf('=');
            if (idx > 0) {
                const key = line.substring(0, idx).trim();
                const val = line.substring(idx + 1).trim();
                if (key) params[key] = val;
            }
        });
        onChange(params);
    };

    return (
        <textarea
            className={`w-full border rounded p-1 text-xs font-mono ${className}`}
            placeholder={placeholder}
            value={textValue}
            onChange={handleChange}
            rows={rows}
        />
    );
};

export default ParamInput;
