'use client';

import type { LessonSection } from '@matriq/validation';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { pad2 } from '@/lib/utils';
import { FunctionPlot } from './function-plot';

/**
 * Lesson body (prototype .article). Academic content is English and marked
 * `lang="en"`; interface labels (e.g. "WORKED EXAMPLE") follow the app language.
 */
export function LessonArticle({ sections, mode }: { sections: LessonSection[]; mode: 'full' | 'notes' }) {
  const { t, language } = useI18n();
  let textIndex = 0;

  return (
    <article className="text-article text-body-ink" data-testid={`lesson-${mode}`}>
      {mode === 'notes' ? <h2 className="mb-3 text-[21px] font-bold text-ink">{t('keyPoints')}</h2> : null}
      {sections.map((section) => {
        switch (section.kind) {
          case 'text': {
            textIndex += 1;
            return (
              <section key={section.id} className="mb-[27px]" lang="en">
                {section.heading ? (
                  <h3 className="mt-6 mb-2.5 text-[17px] font-bold text-ink first:mt-0">
                    <span className="mr-2 text-caption font-black text-green">{pad2(textIndex)}</span>
                    {section.heading}
                  </h3>
                ) : null}
                <p className="leading-[1.8]">{section.body}</p>
              </section>
            );
          }
          case 'key_point':
            return (
              <div
                key={section.id}
                lang="en"
                className="mb-2.5 flex gap-3 rounded-lg border border-line bg-paper p-[15px] text-[15px] leading-[1.7]"
              >
                <Check className="mt-[3px] size-[18px] shrink-0 text-green" strokeWidth={1.9} aria-hidden="true" />
                <span>{section.body}</span>
              </div>
            );
          case 'worked_example':
            return (
              <div key={section.id} className="my-[22px] rounded-lg bg-example-bg p-[19px]">
                <small lang={language} className="text-eyebrow tracking-[1px] text-green-dark uppercase">
                  {t('workedExample')}
                </small>
                <p lang="en" className="mt-2 leading-[1.75] text-example-ink">
                  {section.body}
                </p>
              </div>
            );
          case 'formula':
            return (
              <div
                key={section.id}
                lang="en"
                className="my-5 rounded-lg border border-line bg-paper px-5 py-4 text-center text-lg font-bold text-ink"
              >
                {section.heading ? <p className="mb-1 text-caption font-semibold text-muted">{section.heading}</p> : null}
                {section.body}
              </div>
            );
          case 'diagram':
            return section.data?.type === 'function_plot' ? (
              <FunctionPlot
                key={section.id}
                data={section.data}
                heading={section.heading}
                labels={{ input: t('lesson.input'), output: t('lesson.output') }}
              />
            ) : (
              <figure key={section.id} lang="en" className="my-5 rounded-lg border border-line bg-paper p-4 text-small">
                {section.heading ? <strong className="mb-2 block">{section.heading}</strong> : null}
                <figcaption>{section.body}</figcaption>
              </figure>
            );
          default:
            return null;
        }
      })}
    </article>
  );
}
