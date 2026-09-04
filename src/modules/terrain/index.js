// STUB — replaced by the terrain builder. Must init without errors.
export default {
  name: 'terrain',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'terrain stub — nothing staged yet',
    async setup(ctx) {},
  },
};
