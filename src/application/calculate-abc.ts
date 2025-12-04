import { FisheryStock, CatchData, BiologicalData, AcceptableBiologicalCatch } from "@/domain";

export function calculateAbc(
    stock: FisheryStock,
    catchData: CatchData,
    biologicalData: BiologicalData
): AcceptableBiologicalCatch {
    return stock.estimateAbundance(
        catchData,
        biologicalData
    ).assess();
}
