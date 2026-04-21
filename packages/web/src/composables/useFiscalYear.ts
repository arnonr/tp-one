import { ref, computed } from 'vue';
import { getFiscalYear, getFiscalYearRange, getFiscalQuarter, toAD, FISCAL_QUARTER_LABELS } from '../utils/thai';

export function useFiscalYear() {
  const currentFY = getFiscalYear();
  const selectedFY = ref(currentFY);

  const fyRange = computed(() => getFiscalYearRange(selectedFY.value));
  const fyLabel = computed(() => `ปีงบ ${selectedFY.value}`);

  const fyOptions = computed(() => {
    const options: { label: string; value: number }[] = [];
    for (let y = currentFY - 3; y <= currentFY + 1; y++) {
      options.push({ label: `ปีงบ ${y}`, value: y });
    }
    return options.reverse();
  });

  const currentQuarter = getFiscalQuarter();

  function quarterRange(quarter: number, fiscalYear?: number) {
    const fy = fiscalYear ?? selectedFY.value;
    const adYear = toAD(fy);
    const ranges: Record<number, { start: Date; end: Date }> = {
      1: { start: new Date(adYear - 1, 9, 1), end: new Date(adYear - 1, 11, 31) },
      2: { start: new Date(adYear, 0, 1), end: new Date(adYear, 2, 31) },
      3: { start: new Date(adYear, 3, 1), end: new Date(adYear, 5, 30) },
      4: { start: new Date(adYear, 6, 1), end: new Date(adYear, 8, 30) },
    };
    return ranges[quarter];
  }

  return {
    currentFY,
    selectedFY,
    fyRange,
    fyLabel,
    fyOptions,
    currentQuarter,
    quarterRange,
    quarterLabels: FISCAL_QUARTER_LABELS,
  };
}
