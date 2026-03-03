import { z } from 'zod';

const schema = z.object({
  yearsOfExperience: z.number().or(z.nan()).optional().transform(val => Number.isNaN(val) ? undefined : val)
});

console.log(schema.safeParse({ yearsOfExperience: NaN }));
