export interface AcceptableBiologicalCatch {
    value: string;
}

export interface CatchData {
    value: string;
}

export interface BiologicalData {
    value: string;
}

export interface AssessmentProject {
  Assess(catchData: CatchData, biologicalData: BiologicalData): AcceptableBiologicalCatch;
}

export class TACAssessment implements AssessmentProject {
  readonly #catchData: CatchData;
  readonly #biologicalData: BiologicalData;
  
  constructor(catchData: CatchData, biologicalData: BiologicalData) {
    this.#catchData = catchData;
    this.#biologicalData = biologicalData;
  }

  Assess(catchData: CatchData, biologicalData: BiologicalData): AcceptableBiologicalCatch {
    return {
      value: `calculation completed using ${this.#catchData.value} and ${this.#biologicalData.value}`,
    };
  }
}