export interface MuralWebhookTokenAmount {
  blockchain: string;
  tokenAmount: number;
  tokenSymbol: string;
  tokenContractAddress: string;
}

export interface MuralWebhookTransactionDetails {
  blockchain: string;
  transactionDate: string;
  transactionHash: string;
  sourceWalletAddress: string;
  destinationWalletAddress: string;
}

export interface MuralAccountCreditedPayload {
  type: 'account_credited';
  accountId: string;
  transactionId: string;
  tokenAmount: MuralWebhookTokenAmount;
  organizationId: string;
  transactionDetails: MuralWebhookTransactionDetails;
  accountWalletAddress: string;
}

export interface PayoutStatusChangedPayload {
  type: 'payout_status_changed';
  organizationId: string;
  payoutRequestId: string;
  payoutId: string;
  statusChangeDetails: {
    type: 'fiat' | 'blockchain';
    previousStatus: { type: string };
    currentStatus: { type: string };
  };
}

export interface MuralWebhookEvent {
  eventId: string;
  deliveryId: string;
  transactionId?: string;
  attemptNumber: number;
  eventCategory: string;
  occurredAt: string;
  payload: MuralAccountCreditedPayload | PayoutStatusChangedPayload;
}
