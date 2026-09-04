// STUB — replaced by the zoning builder. Must init without errors.
export default {
  name: 'zoning',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'zoning stub — nothing staged yet',
    async setup(ctx) {},
  },
};
