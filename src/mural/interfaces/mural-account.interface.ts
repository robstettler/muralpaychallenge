export interface MuralTokenAmount {
  tokenAmount: number;
  tokenSymbol: string;
}

export interface MuralWalletDetails {
  blockchain: string;
  walletAddress: string;
}

export interface MuralAccountDetails {
  walletDetails: MuralWalletDetails;
  balances: MuralTokenAmount[];
}

export interface MuralAccount {
  id: string;
  name: string;
  status: 'INITIALIZING' | 'ACTIVE';
  isApiEnabled: boolean;
  accountDetails?: MuralAccountDetails;
}

export interface MuralTransaction {
  id: string;
  hash: string;
  transactionExecutionDate: string;
  blockchain: string;
  amount: MuralTokenAmount;
  accountId: string;
  transactionDetails: {
    type: string;
    details?: {
      type: string;
      senderAddress?: string;
      blockchain?: string;
    };
  };
}

export interface MuralTransactionSearchResponse {
  total: number;
  nextId?: string;
  results: MuralTransaction[];
}
