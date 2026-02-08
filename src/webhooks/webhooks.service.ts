import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { MuralWebhookEvent } from '../mural/interfaces/mural-webhook-event.interface';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  verifySignature(
    rawBody: string,
    signature: string,
    timestamp: string,
  ): boolean {
    const publicKey = this.configService.get<string>(
      'mural.webhookPublicKey',
    );
    if (!publicKey) {
      this.logger.warn(
        'No webhook public key configured — skipping signature verification',
      );
      return true;
    }

    try {
      const message = `${new Date(timestamp).toISOString()}.${rawBody}`;
      const signatureBuffer = Buffer.from(signature, 'base64');
      return crypto.verify(
        'sha256',
        Buffer.from(message),
        { key: publicKey, dsaEncoding: 'der' },
        signatureBuffer,
      );
    } catch (error) {
      this.logger.error('Signature verification failed', error);
      return false;
    }
  }

  async processEvent(event: MuralWebhookEvent): Promise<void> {
    this.logger.log(
      `Processing webhook event: ${event.eventId} (${event.payload?.type})`,
    );

    if (event.payload?.type === 'account_credited') {
      const { tokenAmount, transactionDetails, accountId } = event.payload;
      if (tokenAmount.tokenSymbol === 'USDC') {
        await this.ordersService.matchDeposit(
          tokenAmount.tokenAmount,
          transactionDetails.transactionHash,
          accountId,
        );
      }
    }

    if (event.payload?.type === 'payout_status_changed') {
      const { payoutRequestId, payoutId, statusChangeDetails } = event.payload;
      await this.ordersService.updatePayoutStatus(
        payoutRequestId,
        payoutId,
        statusChangeDetails.currentStatus.type,
      );
    }
  }
}
