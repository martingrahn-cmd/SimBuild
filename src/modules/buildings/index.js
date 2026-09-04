// STUB — replaced by the buildings builder. Must init without errors.
export default {
  name: 'buildings',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'buildings stub — nothing staged yet',
    async setup(ctx) {},
  },
};
