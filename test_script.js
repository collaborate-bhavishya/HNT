const { z } = require('zod');

const schema = z.object({
  yearsOfExperience: z.number().optional()
});

console.log(schema.safeParse({ yearsOfExperience: NaN }));
