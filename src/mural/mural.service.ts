import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MuralAccount } from './interfaces/mural-account.interface';

@Injectable()
export class MuralService {
  private readonly logger = new Logger(MuralService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private get apiBaseUrl(): string {
    return this.configService.get<string>('mural.apiBaseUrl')!;
  }

  private get apiKey(): string {
    return this.configService.get<string>('mural.apiKey')!;
  }

  private get transferApiKey(): string {
    return this.configService.get<string>('mural.transferApiKey')!;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createAccount(name: string): Promise<MuralAccount> {
    const { data } = await firstValueFrom(
      this.httpService.post<MuralAccount>(
        `${this.apiBaseUrl}/api/accounts`,
        { name },
        { headers: this.headers },
      ),
    );
    this.logger.log(`Created Mural account: ${data.id} (status: ${data.status})`);
    return data;
  }

  async getAccountById(accountId: string): Promise<MuralAccount> {
    const { data } = await firstValueFrom(
      this.httpService.get<MuralAccount>(
        `${this.apiBaseUrl}/api/accounts/${accountId}`,
        { headers: this.headers },
      ),
    );
    return data;
  }

  async getAllAccounts(): Promise<MuralAccount[]> {
    const { data } = await firstValueFrom(
      this.httpService.get<MuralAccount[]>(
        `${this.apiBaseUrl}/api/accounts`,
        { headers: this.headers },
      ),
    );
    return data;
  }

  async createPayout(sourceAccountId: string, amountUsdc: number): Promise<any> {
    const body = {
      sourceAccountId,
      memo: `Auto COP withdrawal`,
      payouts: [
        {
          amount: {
            tokenAmount: amountUsdc,
            tokenSymbol: 'USDC',
          },
          payoutDetails: {
            type: 'fiat',
            bankName: 'Bancolombia',
            bankAccountOwner: 'Demo Merchant',
            fiatAndRailDetails: {
              type: 'cop',
              symbol: 'COP',
              phoneNumber: '+573001234567',
              accountType: 'SAVINGS',
              bankAccountNumber: '12345678901',
              documentNumber: '1234567890',
              documentType: 'NATIONAL_ID',
            },
          },
          recipientInfo: {
            type: 'business',
            name: 'Demo Merchant Store',
            email: 'merchant@example.com',
            physicalAddress: {
              address1: 'Calle 100 #15-20',
              country: 'CO',
              state: 'DC',
              city: 'Bogota',
              zip: '110111',
            },
          },
        },
      ],
    };

    const { data } = await firstValueFrom(
      this.httpService.post(
        `${this.apiBaseUrl}/api/payouts/payout`,
        body,
        { headers: this.headers },
      ),
    );
    this.logger.log(`Created payout request: ${data.id} (status: ${data.status})`);
    return data;
  }

  async executePayout(payoutRequestId: string): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.post(
        `${this.apiBaseUrl}/api/payouts/payout/${payoutRequestId}/execute`,
        { exchangeRateToleranceMode: 'FLEXIBLE' },
        {
          headers: {
            ...this.headers,
            'transfer-api-key': this.transferApiKey,
          },
        },
      ),
    );
    this.logger.log(`Executed payout request: ${data.id} (status: ${data.status})`);
    return data;
  }

  async getPayout(payoutRequestId: string): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.apiBaseUrl}/api/payouts/payout/${payoutRequestId}`,
        { headers: this.headers },
      ),
    );
    return data;
  }
}
