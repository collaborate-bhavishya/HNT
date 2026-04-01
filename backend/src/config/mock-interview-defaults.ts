/**
 * Default `mockInterviewLink` when `SubjectDashboardConfig.mockInterviewLink` is empty.
 * Values saved in admin Dashboard Config always win.
 *
 * Per-vertical Google Docs (Brightchamps mock-interview prep). Keys are lowercase
 * `candidate.position` (e.g. "Coding" → "coding", "Financial Literacy" → "financial literacy").
 */
export const DEFAULT_MOCK_INTERVIEW_LINK_ALL_VERTICALS = '';

const DOC_CODING =
  'https://docs.google.com/document/d/1G4_OPbnOplA4MOcwU_dQ-uJU7vuCS2TpVwMHX7JjJ5M/edit';
const DOC_MATH =
  'https://docs.google.com/document/d/1Y0JZKFW112oaH3Rd0SSm2MukeO0fF1YkujoW5xn6i-0/edit';
const DOC_ROBOTICS =
  'https://docs.google.com/document/d/1WOEw3AIJR0Ivz0GeTBa6s8sCsVwROD_YHQF58XoPKtc/edit';
const DOC_ENGLISH =
  'https://docs.google.com/document/d/1pUgI6pOxWeQxthGE0HcI8-NdUnb1kxADxrj9MXwQd70/edit';
const DOC_FINANCIAL_LITERACY =
  'https://docs.google.com/document/d/18XZUrVM3HIbvvJCTd1wG3kZ56PY77QwdxddXdd0W_0w/edit';

export const DEFAULT_MOCK_INTERVIEW_LINK_BY_SUBJECT: Record<string, string> = {
  coding: DOC_CODING,
  math: DOC_MATH,
  science: '',
  english: DOC_ENGLISH,
  robotics: DOC_ROBOTICS,
  'financial literacy': DOC_FINANCIAL_LITERACY,
  finlit: DOC_FINANCIAL_LITERACY,
};

export function resolveMockInterviewLink(
  subject: string,
  stored: string | null | undefined,
): string | null {
  const trimmed = stored?.trim();
  if (trimmed) return trimmed;

  const key = subject.trim().toLowerCase();
  const perSubject = DEFAULT_MOCK_INTERVIEW_LINK_BY_SUBJECT[key]?.trim();
  if (perSubject) return perSubject;

  const shared = DEFAULT_MOCK_INTERVIEW_LINK_ALL_VERTICALS.trim();
  if (shared) return shared;

  return null;
}
