import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  it('calcula subtotal e total na criacao do pedido', async () => {
    const createdPayloads: any[] = [];
    const prisma: any = {
      order: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          createdPayloads.push(data);
          return { id: 'ord1', ...data, items: data.items.create };
        }),
      },
    };

    const audit: any = { log: jest.fn() };
    const realtime: any = { emitOrderCreated: jest.fn() };
    const service = new OrdersService(prisma, audit, realtime);

    await service.create({
      contactId: 'c1',
      shippingCents: 500,
      discountCents: 200,
      items: [
        { name: 'Produto A', quantity: 2, unitCents: 1000 },
        { name: 'Produto B', quantity: 1, unitCents: 3000 },
      ],
    });

    expect(createdPayloads[0].subtotalCents).toBe(5000);
    expect(createdPayloads[0].totalCents).toBe(5300);
  });
});
