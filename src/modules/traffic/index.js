// STUB — replaced by the traffic builder. Must init without errors.
export default {
  name: 'traffic',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'traffic stub — nothing staged yet',
    async setup(ctx) {},
  },
};
