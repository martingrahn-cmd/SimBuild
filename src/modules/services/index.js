// STUB — replaced by the services builder. Must init without errors.
export default {
  name: 'services',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: { serialize() { return {}; }, deserialize() {} },
  showcase: { description: 'services stub — nothing staged yet', async setup(ctx) {} },
};
