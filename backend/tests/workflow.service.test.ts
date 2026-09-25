import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import workflowService from '../src/services/workflow.service';
import { createFamily, createOrder, createUser, db, migrate } from './helpers';

const STAGES = [
  { name: 'Ready to Make', wc_status: 'processing' },
  { name: 'Making', wc_status: 'processing' },
  { name: 'Done', wc_status: 'completed' },
];

let familyA: number;
let familyB: number;
let adminA: number;

beforeAll(async () => {
  await migrate();
  familyA = await createFamily('Family A');
  familyB = await createFamily('Family B');
  adminA = await createUser(familyA, 'admin-a@example.com', 'admin');
  await createUser(familyB, 'admin-b@example.com', 'admin');
});

afterAll(async () => {
  await db.destroy();
});

let stagesA: { id: number }[];
let stagesB: { id: number }[];
let orderA: number;
let orderB: number;
let nextWcId = 100;

beforeEach(async () => {
  await db('order_workflow_history').delete();
  await db('order_workflow').delete();
  await db('cached_orders').delete();
  await db('order_workflow_stages').delete();

  stagesA = await workflowService.updateStages(familyA, STAGES);
  stagesB = await workflowService.updateStages(familyB, STAGES);
  orderA = await createOrder(familyA, nextWcId++);
  orderB = await createOrder(familyB, nextWcId++);
  await workflowService.syncOrderStageFromWooCommerce(orderA, familyA, 'processing');
  await workflowService.syncOrderStageFromWooCommerce(orderB, familyB, 'processing');
});

async function currentStage(orderId: number): Promise<number> {
  const row = await db('order_workflow').where({ order_id: orderId }).first();
  return row.stage_id;
}

describe('updateOrderStageWithWooCommerceSync', () => {
  it('pushes the WooCommerce order id, not the local id', async () => {
    const wc = { updateOrderStatus: vi.fn().mockResolvedValue({}) };
    const order = await db('cached_orders').where({ id: orderA }).first();

    const result = await workflowService.updateOrderStageWithWooCommerceSync(orderA, stagesA[2].id, adminA, familyA, wc);

    expect(wc.updateOrderStatus).toHaveBeenCalledWith(familyA, order.woocommerce_order_id, 'completed');
    expect(result).toEqual({ wooCommerceSynced: true });
    expect((await db('cached_orders').where({ id: orderA }).first()).status).toBe('completed');
  });

  it('skips WooCommerce when the status does not change', async () => {
    const wc = { updateOrderStatus: vi.fn() };

    await workflowService.updateOrderStageWithWooCommerceSync(orderA, stagesA[1].id, adminA, familyA, wc);

    expect(wc.updateOrderStatus).not.toHaveBeenCalled();
    expect(await currentStage(orderA)).toBe(stagesA[1].id);
  });

  it('keeps the local move and reports the error when WooCommerce fails', async () => {
    const wc = { updateOrderStatus: vi.fn().mockRejectedValue(new Error('store offline')) };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await workflowService.updateOrderStageWithWooCommerceSync(orderA, stagesA[2].id, adminA, familyA, wc);

    expect(result).toEqual({ wooCommerceSynced: false, wooCommerceError: 'store offline' });
    expect(await currentStage(orderA)).toBe(stagesA[2].id);
  });

  it("rejects another family's stage or order", async () => {
    await expect(
      workflowService.updateOrderStageWithWooCommerceSync(orderA, stagesB[0].id, adminA, familyA)
    ).rejects.toThrow('Stage not found');
    await expect(
      workflowService.updateOrderStageWithWooCommerceSync(orderB, stagesA[0].id, adminA, familyA)
    ).rejects.toThrow('Order not found');
  });
});

describe('syncOrderStageFromWooCommerce', () => {
  it('leaves an order in a stage that already maps to the same status', async () => {
    await workflowService.updateOrder(orderA, { stage_id: stagesA[1].id }, adminA, familyA);

    await workflowService.syncOrderStageFromWooCommerce(orderA, familyA, 'processing');

    expect(await currentStage(orderA)).toBe(stagesA[1].id);
  });

  it('moves the order and records history attributed to a family admin', async () => {
    await workflowService.syncOrderStageFromWooCommerce(orderA, familyA, 'completed');

    expect(await currentStage(orderA)).toBe(stagesA[2].id);
    const history = await db('order_workflow_history').where({ order_id: orderA }).first();
    expect(history).toMatchObject({ changed_by: adminA, notes: 'Synced from WooCommerce' });
  });
});

describe('updateStages', () => {
  it('updates stages in place so orders and history survive', async () => {
    await workflowService.updateOrder(orderA, { stage_id: stagesA[1].id }, adminA, familyA);
    const renamed = stagesA.map((stage, i) => ({ ...stage, name: `Stage ${i}` }));

    const saved = await workflowService.updateStages(familyA, renamed);

    expect(saved.map((s) => s.id)).toEqual(stagesA.map((s) => s.id));
    expect(saved[0].name).toBe('Stage 0');
    expect(await currentStage(orderA)).toBe(stagesA[1].id);
    expect(await db('order_workflow_history').where({ order_id: orderA })).toHaveLength(1);
  });

  it('refuses to remove a stage that still holds orders', async () => {
    const withoutFirst = stagesA.slice(1);

    await expect(workflowService.updateStages(familyA, withoutFirst)).rejects.toThrow('Cannot remove a stage');
    expect(await workflowService.getStages(familyA)).toHaveLength(3);
  });

  it('removes empty stages and inserts new ones', async () => {
    const saved = await workflowService.updateStages(familyA, [stagesA[0], { name: 'Shipped', wc_status: 'completed' }]);

    expect(saved.map((s) => s.name)).toEqual(['Ready to Make', 'Shipped']);
  });
});

describe('family scoping', () => {
  it("blocks updates to another family's orders", async () => {
    await expect(workflowService.updateOrder(orderB, { priority: 5 }, adminA, familyA)).rejects.toThrow('Order not found');
    await expect(
      workflowService.bulkUpdate({ order_ids: [orderA, orderB], priority: 1 }, adminA, familyA)
    ).rejects.toThrow('Order not found');
  });

  it('allows duplicate ids in a bulk update', async () => {
    await workflowService.bulkUpdate({ order_ids: [orderA, orderA], priority: 2 }, adminA, familyA);

    expect((await db('order_workflow').where({ order_id: orderA }).first()).priority).toBe(2);
  });

  it("hides order history from other families", async () => {
    await workflowService.updateOrder(orderA, { stage_id: stagesA[1].id }, adminA, familyA);

    expect(await workflowService.getOrderHistory(orderA, familyB)).toHaveLength(0);
    const history = await workflowService.getOrderHistory(orderA, familyA);
    expect(history[0].changed_by_name).toBe('Test Admin');
  });

  it("ignores visibility changes to another family's stage", async () => {
    await workflowService.updateStageVisibility(stagesB[0].id, true, familyA);

    const stage = await db('order_workflow_stages').where({ id: stagesB[0].id }).first();
    expect(Boolean(stage.is_hidden)).toBe(false);
  });
});
