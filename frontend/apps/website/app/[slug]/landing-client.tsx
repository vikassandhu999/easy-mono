'use client';

import type {LandingPage} from '@/lib/api';

import {CoachStoryTemplate} from './template-coach-story';
import {ProblemFitTemplate} from './template-problem-fit';
import {ProofFirstTemplate} from './template-proof-first';

export default function LandingClient({page}: {page: LandingPage}) {
  if (page.template === 'coach_story') {
    return <CoachStoryTemplate page={page} />;
  }
  if (page.template === 'problem_fit') {
    return <ProblemFitTemplate page={page} />;
  }
  return <ProofFirstTemplate page={page} />;
}
