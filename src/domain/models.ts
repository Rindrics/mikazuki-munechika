export interface AcceptableBiologicalCatch {
    value: string;
}

export interface CatchData {
    value: string;
}

export interface BiologicalData {
    value: string;
}

export type FisheryStock = (Type1Stock | Type2Stock | Type3Stock) & {
  readonly id: number;
  readonly name: string;
  readonly reference: string;
  readonly abundance: string;
  assess(
    catchData: CatchData,
    biologicalData: BiologicalData
  ): AcceptableBiologicalCatch;
};

export class Type1Stock {
  readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf";

  assess(
    catchData: CatchData,
    biologicalData: BiologicalData
  ): AcceptableBiologicalCatch {
    // Simulation logic with stock-recruitment relationship
    return {
      value: `Simulated with recruitment using ${catchData.value} and ${biologicalData.value}`,
    };
  }
}

export class Type2Stock {
  readonly reference: string = "Thttps://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

  assess(
    catchData: CatchData,
    biologicalData: BiologicalData
  ): AcceptableBiologicalCatch {
    // Simulation logic without stock-recruitment relationship
    return {
      value: `Simulated without recruitment using ${catchData.value} and ${biologicalData.value}`,
    };
  }
}

export class Type3Stock {
  readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

  assess(
    catchData: CatchData,
    biologicalData: BiologicalData
  ): AcceptableBiologicalCatch {
    // Direct ABC estimation logic
    return {
      value: `ABC estimated directly using ${catchData.value} and ${biologicalData.value}`,
    };
  }
}
