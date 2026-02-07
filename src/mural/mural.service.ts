import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  MuralAccount,
  MuralTransactionSearchResponse,
} from './interfaces/mural-account.interface';

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

  async searchTransactions(accountId: string): Promise<MuralTransactionSearchResponse> {
    const { data } = await firstValueFrom(
      this.httpService.post<MuralTransactionSearchResponse>(
        `${this.apiBaseUrl}/api/transactions/search/account/${accountId}`,
        {},
        { headers: this.headers },
      ),
    );
    return data;
  }
}
