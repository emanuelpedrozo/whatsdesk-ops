import { Module } from '@nestjs/common';
import { MockWhatsappProvider } from './mock-whatsapp.provider';
import { MetaWhatsappProvider } from './meta-whatsapp.provider';
import { BaileysWhatsappProvider } from './baileys-whatsapp.provider';
import { QrModule } from '../../qr/qr.module';

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';

@Module({
  imports: [QrModule],
  providers: [
    MockWhatsappProvider,
    MetaWhatsappProvider,
    BaileysWhatsappProvider,
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: (
        mockProvider: MockWhatsappProvider,
        metaProvider: MetaWhatsappProvider,
        baileysProvider: BaileysWhatsappProvider,
      ) => {
        if (process.env.WHATSAPP_PROVIDER === 'meta') return metaProvider;
        if (process.env.WHATSAPP_PROVIDER === 'baileys') return baileysProvider;
        return mockProvider;
      },
      inject: [MockWhatsappProvider, MetaWhatsappProvider, BaileysWhatsappProvider],
    },
  ],
  exports: [WHATSAPP_PROVIDER],
})
export class WhatsappModule {}
