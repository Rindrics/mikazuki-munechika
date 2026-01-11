/**
 * ABC calculation parameters input form
 *
 * Shared component for configuring ABC calculation parameters (F, M, β)
 * Used in both assess/ and review/ pages.
 */

/**
 * Parameters for ABC calculation
 */
export interface ABCCalculationParams {
  /** 漁獲係数 (Fishing mortality coefficient) */
  F: number;
  /** 自然死亡係数 (Natural mortality coefficient) */
  M: number;
  /** 調整係数 (Adjustment coefficient) */
  β: number;
}

/**
 * Default parameters for ABC calculation
 */
export const DEFAULT_ABC_PARAMS: ABCCalculationParams = {
  F: 0.3,
  M: 0.4,
  β: 0.8,
};

interface ABCParamsFormProps {
  /** Current parameter values */
  params: ABCCalculationParams;
  /** Callback when parameters change */
  onChange: (params: ABCCalculationParams) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether calculation is in progress */
  isCalculating?: boolean;
}

export function ABCParamsForm({
  params,
  onChange,
  disabled = false,
  isCalculating = false,
}: ABCParamsFormProps) {
  const handleChange = (field: keyof ABCCalculationParams, value: string) => {
    onChange({
      ...params,
      [field]: parseFloat(value) || 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="param-f" className="block text-sm font-medium mb-1">
            F（漁獲係数）
          </label>
          <input
            id="param-f"
            type="number"
            step="0.01"
            value={params.F}
            onChange={(e) => handleChange("F", e.target.value)}
            disabled={disabled}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label htmlFor="param-m" className="block text-sm font-medium mb-1">
            M（自然死亡係数）
          </label>
          <input
            id="param-m"
            type="number"
            step="0.01"
            value={params.M}
            onChange={(e) => handleChange("M", e.target.value)}
            disabled={disabled}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label htmlFor="param-beta" className="block text-sm font-medium mb-1">
            β（調整係数）
          </label>
          <input
            id="param-beta"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={params.β}
            onChange={(e) => handleChange("β", e.target.value)}
            disabled={disabled}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {isCalculating && <p className="text-sm text-secondary">計算中...</p>}
    </div>
  );
}
