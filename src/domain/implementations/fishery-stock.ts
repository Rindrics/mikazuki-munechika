import {
  StockGroup,
  CatchData,
  BiologicalData,
  AcceptableBiologicalCatch,
} from "../models";

export abstract class FisheryStockBase {
  private static nextId: number = 1;
  readonly id: number;
  readonly stockGroup: StockGroup;
  #abundance: string | undefined;

  constructor(stockGroup: StockGroup) {
    this.id = FisheryStockBase.nextId++;
    this.stockGroup = stockGroup;
  }

  get name(): string {
    return this.stockGroup.name;
  }

  abstract readonly reference: string;

  get abundance(): string {
    if (this.#abundance === undefined) {
      throw new Error("Abundance has not been estimated. Call estimateAbundance() first.");
    }
    return this.#abundance;
  }

  // Only way to set abundance
  estimateAbundance(catchData: CatchData, biologicalData: BiologicalData): this {
    this.#abundance = `estimated using ${catchData.value} and ${biologicalData.value}`;
    return this;
  }

  abstract assess(): AcceptableBiologicalCatch;
}

export class Type1Stock extends FisheryStockBase {
  readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf";

  assess(): AcceptableBiologicalCatch {
    // Simulation logic with stock-recruitment relationship
    return {
      value: `Simulated WITH recruitment using its abundance "${this.abundance}"`,
    };
  }
}

export class Type2Stock extends FisheryStockBase {
  readonly reference: string = "Thttps://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

  assess(): AcceptableBiologicalCatch {
    // Simulation logic without stock-recruitment relationship
    return {
      value: `Simulated WITHOUT recruitment using its abundance "${this.abundance}"`,
    };
  }
}

export class Type3Stock extends FisheryStockBase {
  readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

  assess(): AcceptableBiologicalCatch {
    // Direct ABC estimation logic
    return {
      value: `ABC estimated DIRECTLY using its abundance "${this.abundance}"`,
    };
  }
}

export type FisheryStock = Type1Stock | Type2Stock | Type3Stock;
