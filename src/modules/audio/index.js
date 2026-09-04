// STUB — replaced by the audio builder. Must init without errors.
export default {
  name: 'audio',
  dependencies: [],
  budget: { drawCalls: 10, triangles: 10000 },
  async init(ctx) { ctx.log.info('stub init'); },
  update(dt, ctx) {},
  dispose(ctx) {},
  api: {},
  showcase: {
    description: 'audio stub — nothing staged yet',
    async setup(ctx) {},
  },
};
