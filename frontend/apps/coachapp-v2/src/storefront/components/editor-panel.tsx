import type {Key} from '@heroui/react';
import {Accordion} from '@heroui/react';
import {useState} from 'react';
import type {UseFormReturn} from 'react-hook-form';
import {useWatch} from 'react-hook-form';

import type {Offer} from '@/api/offers';
import type {Testimonial} from '@/api/testimonials';
import type {EditorFormValues} from '@/storefront/components/editor-schema';

import FaqEditor from '@/storefront/components/faq-editor';
import HeroEditor from '@/storefront/components/hero-editor';
import IntakeQuestionsEditor from '@/storefront/components/intake-questions-editor';
import OffersSummary from '@/storefront/components/offers-summary';
import SettingsEditor from '@/storefront/components/settings-editor';
import TestimonialsSummary from '@/storefront/components/testimonials-summary';
import TrustStatsEditor from '@/storefront/components/trust-stats-editor';

type SectionStatus = 'complete' | 'optional' | 'partial';

function getSectionStatuses(values: EditorFormValues, offerCount: number, testimonialCount: number) {
  const hero: SectionStatus =
    values.display_name && values.slug ? 'complete' : values.display_name || values.slug ? 'partial' : 'optional';

  const trustStats: SectionStatus = values.trust_stats.length > 0 ? 'complete' : 'optional';

  const offers: SectionStatus = offerCount > 0 ? 'complete' : 'optional';

  const testimonials: SectionStatus = testimonialCount > 0 ? 'complete' : 'optional';

  const faq: SectionStatus = values.faq_items.length > 0 ? 'complete' : 'optional';

  const intake: SectionStatus = values.intake_questions.length > 0 ? 'complete' : 'optional';

  const settings: SectionStatus = values.is_published ? 'complete' : 'optional';

  return {faq, hero, intake, offers, settings, testimonials, trustStats};
}

function StatusDot({status}: {status: SectionStatus}) {
  if (status === 'complete') {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-success" />;
  }
  if (status === 'partial') {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />;
  }
  return <span className="h-2 w-2 shrink-0 rounded-full bg-default-300" />;
}

function statusLabel(status: SectionStatus) {
  if (status === 'complete') {
    return 'Complete';
  }
  if (status === 'partial') {
    return 'Incomplete';
  }
  return 'Optional';
}

type SectionId = 'faq' | 'hero' | 'intake' | 'offers' | 'settings' | 'testimonials' | 'trustStats';

interface SectionConfig {
  id: SectionId;
  label: string;
  sublabel: (values: EditorFormValues, offerCount: number, testimonialCount: number) => string;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'hero',
    label: 'Hero',
    sublabel: (v) => (v.display_name ? v.display_name : 'Not set'),
  },
  {
    id: 'trustStats',
    label: 'Trust Stats',
    sublabel: (v) => (v.trust_stats.length > 0 ? `${v.trust_stats.length} stats` : 'Optional'),
  },
  {
    id: 'offers',
    label: 'Offers',
    sublabel: (_, c) => (c > 0 ? `${c} active` : 'None yet'),
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    sublabel: (_, __, c) => (c > 0 ? `${c} active` : 'None yet'),
  },
  {
    id: 'faq',
    label: 'FAQ',
    sublabel: (v) => (v.faq_items.length > 0 ? `${v.faq_items.length} items` : 'Optional'),
  },
  {
    id: 'intake',
    label: 'Intake Questions',
    sublabel: (v) => (v.intake_questions.length > 0 ? `${v.intake_questions.length} questions` : 'Optional'),
  },
  {
    id: 'settings',
    label: 'Settings',
    sublabel: (v) => (v.is_published ? 'Published' : 'Draft'),
  },
];

export default function EditorPanel({
  form,
  offers,
  originalSlug,
  testimonials,
}: {
  form: UseFormReturn<EditorFormValues>;
  offers: Offer[];
  originalSlug: string | undefined;
  testimonials: Testimonial[];
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set(['hero']));
  const watched = useWatch({
    control: form.control,
    name: ['display_name', 'slug', 'trust_stats', 'faq_items', 'intake_questions', 'is_published'],
  });
  const values: EditorFormValues = {
    ...form.getValues(),
    display_name: watched[0],
    faq_items: watched[3],
    intake_questions: watched[4],
    is_published: watched[5],
    slug: watched[1],
    trust_stats: watched[2],
  };
  const activeOffers = offers.filter((o) => o.status === 'active');
  const activeTestimonials = testimonials.filter((t) => t.status === 'active');
  const statuses = getSectionStatuses(values, activeOffers.length, activeTestimonials.length);

  function renderSectionBody(id: SectionId) {
    switch (id) {
      case 'hero':
        return <HeroEditor form={form} />;
      case 'trustStats':
        return <TrustStatsEditor form={form} />;
      case 'offers':
        return <OffersSummary offers={activeOffers} />;
      case 'testimonials':
        return <TestimonialsSummary testimonials={activeTestimonials} />;
      case 'faq':
        return <FaqEditor form={form} />;
      case 'intake':
        return <IntakeQuestionsEditor form={form} />;
      case 'settings':
        return (
          <SettingsEditor
            form={form}
            originalSlug={originalSlug}
          />
        );
    }
  }

  return (
    <Accordion
      className="flex flex-col"
      expandedKeys={expandedKeys}
      onExpandedChange={setExpandedKeys}
    >
      {SECTIONS.map((section) => {
        const status = statuses[section.id];

        return (
          <Accordion.Item
            id={section.id}
            key={section.id}
          >
            <Accordion.Heading>
              <Accordion.Trigger className="flex min-h-11 w-full items-center gap-3 px-4 py-3">
                <StatusDot status={status} />
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold">{section.label}</span>
                  <span className="ml-2 text-xs text-foreground-400">
                    {section.sublabel(values, activeOffers.length, activeTestimonials.length)}
                  </span>
                </div>
                <span className="text-xs text-foreground-400">{statusLabel(status)}</span>
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-4 pb-5 pt-1">{renderSectionBody(section.id)}</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
