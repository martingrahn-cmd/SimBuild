// STUB — replaced by the ui builder. Must init without errors.
export default {
  name: 'ui',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'ui stub — nothing staged yet',
    async setup(ctx) {},
  },
};
