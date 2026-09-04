// STUB — replaced by the effects builder. Must init without errors.
export default {
  name: 'effects',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'effects stub — nothing staged yet',
    async setup(ctx) {},
  },
};
