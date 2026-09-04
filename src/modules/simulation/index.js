// STUB — replaced by the simulation builder. Must init without errors.
export default {
  name: 'simulation',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'simulation stub — nothing staged yet',
    async setup(ctx) {},
  },
};
