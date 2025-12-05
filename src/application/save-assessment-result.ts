import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";
import { withLogger } from "@/utils/logger";

export class SaveAssessmentResultService {
  constructor(private repository: AssessmentResultRepository) {}

  async execute(
    stock: FisheryStock,
    result: AcceptableBiologicalCatch
  ): Promise<void> {
    return await executeImpl(this.repository, stock, result);
  }
}

const executeImpl = withLogger(
  "save-assessment-result",
  async (
    repository: AssessmentResultRepository,
    stock: FisheryStock,
    result: AcceptableBiologicalCatch
  ): Promise<void> => {
    await repository.save(stock.id, result);
  }
);
