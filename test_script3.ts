import { z } from 'zod';

const schema = z.object({
  yearsOfExperience: z.number().optional().or(z.nan())
});

type SchemaType = z.infer<typeof schema>;
const x: SchemaType = {}; // will this error if it's required?
console.log(schema.safeParse({}));
