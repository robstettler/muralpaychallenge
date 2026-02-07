import {
  Controller,
  Post,
  Req,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('api/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('mural')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleMuralWebhook(@Req() req: any) {
    const signature = req.headers['x-mural-webhook-signature'] as string;
    const timestamp = req.headers['x-mural-webhook-timestamp'] as string;

    const rawBody =
      req.rawBody?.toString('utf-8') ?? JSON.stringify(req.body);

    if (signature && timestamp) {
      const isValid = this.webhooksService.verifySignature(
        rawBody,
        signature,
        timestamp,
      );
      if (!isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    await this.webhooksService.processEvent(req.body);
    return { received: true };
  }
}
