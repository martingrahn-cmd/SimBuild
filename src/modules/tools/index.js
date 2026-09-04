// STUB — replaced by the tools builder. Must init without errors.
export default {
  name: 'tools',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'tools stub — nothing staged yet',
    async setup(ctx) {},
  },
};
