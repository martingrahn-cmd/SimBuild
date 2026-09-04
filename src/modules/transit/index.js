// STUB — replaced by the transit builder. Must init without errors.
export default {
  name: 'transit',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: { serialize() { return {}; }, deserialize() {} },
  showcase: { description: 'transit stub — nothing staged yet', async setup(ctx) {} },
};
