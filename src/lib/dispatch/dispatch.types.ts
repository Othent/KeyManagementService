export interface ArDriveBundledTransactionResponseData {
  id: string;
  timestamp: number;
  winc: string;
  version: string;
  deadlineHeight: number;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  public: string;
  signature: string;
  owner: string;
}

export interface ArDriveBundledTransactionData
  extends ArDriveBundledTransactionResponseData {
  type: "BUNDLED";
}

export interface UploadedTransactionData {
  type: "BASE";
  id: string;
  signature: string;
  owner: string;
}
