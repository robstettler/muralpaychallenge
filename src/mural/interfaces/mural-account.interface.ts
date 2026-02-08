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


