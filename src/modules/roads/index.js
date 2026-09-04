// STUB — replaced by the roads builder. Must init without errors.
export default {
  name: 'roads',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'roads stub — nothing staged yet',
    async setup(ctx) {},
  },
};
