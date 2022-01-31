import cn from 'classnames';
import { nanoid } from 'nanoid';
import rfdc from 'rfdc';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

import Empty from 'components/empty';
import Header from 'components/header';
import Page from 'components/page';

import { APIError, Assessment } from 'lib/model';
import dateString from 'lib/date';
import { fetcher } from 'lib/fetch';

const clone = rfdc();

export default function AssessmentPage(): JSX.Element {
  const { query } = useRouter();
  const url = useMemo(
    () =>
      typeof query.id === 'string' && typeof query.pwd === 'string'
        ? `/api/assessments/${query.id}?pwd=${query.pwd}`
        : null,
    [query.id, query.pwd]
  );
  const { data, error, mutate } = useSWR<Assessment, APIError>(url, fetcher);
  return (
    <Page name='Assessment'>
      <main>
        <Header />
        <article>
          <header className='wrapper'>
            <h2
              className={cn('nowrap', {
                loading: !data && !error && !(query.id && !query.pwd),
              })}
            >
              {data?.name}
              {data && <i> - {dateString(data.date)}</i>}
              {((!data && error) || (query.id && !query.pwd)) &&
                `assessment ${data?.id || query.id || 0}`}
            </h2>
          </header>
          {!data &&
            !error &&
            Array(10)
              .fill(null)
              .map((_, questionIdx) => (
                <section className='wrapper' key={questionIdx}>
                  <p className='loading' />
                  <ul>
                    {Array(5)
                      .fill(null)
                      .map((__, answerIdx) => (
                        <li key={answerIdx} className='loading' />
                      ))}
                  </ul>
                </section>
              ))}
          {data?.questions.map((question, questionIdx) => (
            <section className='wrapper' key={questionIdx} data-cy='question'>
              <p>
                <b>{questionIdx + 1}. </b>
                {question.question}
              </p>
              <ul>
                {question.answers.map((answer, answerIdx) => (
                  <li key={answerIdx}>
                    <input
                      id={`${questionIdx}-${answerIdx}`}
                      type='radio'
                      value={answerIdx}
                      className='radio'
                      checked={question.answer === answerIdx}
                      onChange={async () => {
                        const updated = clone(data);
                        updated.questions[questionIdx].answer = answerIdx;
                        await mutate(updated, false);
                        if (url) await mutate(fetcher(url, 'PATCH', updated));
                      }}
                    />
                    <label htmlFor={`${questionIdx}-${answerIdx}`}>
                      {answer}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {((!data && error) ||
            (query.id && !query.pwd) ||
            (data && !data.questions.length)) && (
            <section className='wrapper'>
              <Empty>
                <div className='empty'>
                  {!query.pwd && (
                    <p>
                      unauthorized - missing assessment pwd
                      <br />
                      revisit this page with a <i>?pwd=</i> url
                      <br />
                      <br />
                      ex: /assessments/0<i>?pwd=</i>
                      {nanoid()}
                    </p>
                  )}
                  {error && (
                    <p>
                      error ({Number(error.code)}) fetching assessment:
                      <br />
                      {error.message}
                    </p>
                  )}
                  {data && !data.questions.length && (
                    <p>
                      waiting for questions...
                      <br />
                      the test has yet to start
                    </p>
                  )}
                </div>
              </Empty>
            </section>
          )}
        </article>
        <style jsx>{`
          article {
            border-top: 1px solid var(--accents-2);
            padding: 48px 0 0;
          }

          h2 {
            font-size: 24px;
            font-weight: 400;
            line-height: 1;
            height: 24px;
            text-transform: lowercase;
            margin: 0;
          }

          h2.loading {
            max-width: 500px;
          }

          h2 i {
            color: var(--accents-5);
          }

          p {
            margin: 0 0 8px;
          }

          .empty p {
            margin: 0;
          }

          code {
            margin: 0;
            display: inline;
          }

          ul {
            margin: 0;
            padding: 0;
          }

          li {
            list-style: none;
            margin: 4px 0;
          }

          label {
            margin-left: 8px;
          }

          section {
            margin-bottom: 24px;
          }
        `}</style>
      </main>
    </Page>
  );
}
