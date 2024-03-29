import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import { useRouter } from 'next/router';

import BookIcon from 'components/icons/book';
import Empty from 'components/empty';
import Form from 'components/form';
import Header from 'components/header';
import HowTo from 'components/how-to';
import Page from 'components/page';
import PinIcon from 'components/icons/pin';
import Select from 'components/select';
import TextField from 'components/textfield';
import ThemeSelect from 'components/theme-select';

import { Test } from 'lib/model';
import dateString from 'lib/date';
import supabase from 'lib/supabase';
import useNProgress from 'lib/nprogress';
import { useUser } from 'lib/context/user';

import courses from 'assets/courses.json';
import tests from 'assets/tests.json';

function TestSection({
  name,
  date,
  difficulty,
  content,
}: Partial<Test>): JSX.Element {
  const loading = useMemo(
    () => !name && !date && !difficulty && !content,
    [name, date, difficulty, content]
  );
  useEffect(() => {
    if (!name || !date || !difficulty || !content) return;
    window.analytics?.track('Test Viewed', { name, date, difficulty, content });
  }, [name, date, difficulty, content]);
  return (
    <section>
      <header className='wrapper'>
        <h2 className={cn({ loading })}>{!loading && name}</h2>
        <p className={cn({ loading })}>
          {!loading &&
            date &&
            `${dateString(date)}${difficulty ? ` - ${difficulty}` : ''}`}
        </p>
      </header>
      <ol className='wrapper'>
        {loading &&
          Array(5)
            .fill(null)
            .map((_, idx) => <li key={idx} className='loading' />)}
        {!loading && content && content.map((c, idx) => <li key={idx}>{c}</li>)}
      </ol>
      <style jsx>{`
        section {
          border-top: 1px solid var(--accents-2);
          padding: var(--margin) 0;
        }

        h2 {
          text-transform: lowercase;
          font-size: 24px;
          font-weight: 400;
          line-height: 1;
          margin: 0 0 12px;
        }

        h2.loading {
          max-width: 200px;
          height: 24px;
        }

        p {
          text-transform: lowercase;
          color: var(--accents-5);
          margin: 0;
        }

        p.loading {
          max-width: 175px;
          height: 6px;
          margin-top: 12px;
        }

        header {
          margin: 48px auto;
        }

        section li {
          margin: 24px 0;
        }

        section li.loading {
          height: 54px;
          margin-left: -24px;
          list-style: none;
        }

        section ol {
          padding-left: 48px;
          margin: 48px auto;
        }
      `}</style>
    </section>
  );
}

export default function IndexPage(): JSX.Element {
  const {
    push,
    query: { s, c },
  } = useRouter();
  const school = useMemo(() => (typeof s === 'string' ? s : 'gunn'), [s]);
  const course = useMemo(
    () => (typeof c === 'string' ? c : courses[0].id),
    [c]
  );

  const { user, setUser } = useUser({ access: 'required' });
  const { loading, setLoading } = useNProgress();
  const [error, setError] = useState(false);
  const [phone, setPhone] = useState('');
  const onSubmit = useCallback(
    async (evt: FormEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      setLoading(true);
      setError(false);
      window.analytics?.track('Phone Submitted', { phone });
      const body = JSON.stringify({ phone });
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabase.auth.session()?.access_token || ''}`,
      };
      const res = await fetch('/api/users', { method: 'POST', body, headers });
      setLoading(false);
      if (res.status !== 201) {
        setError(true);
        const { message } = (await res.json()) as { message: string };
        window.analytics?.track('Phone Errored', { phone, error: message });
      } else {
        setUser(await res.json());
        window.analytics?.track('Phone Saved', { phone });
      }
    },
    [phone, setLoading, setUser]
  );

  return (
    <Page name='Index'>
      <main>
        <Header />
        <Form>
          <Select
            options={[{ value: 'gunn', label: 'Gunn HS [beta]' }]}
            label='School'
            icon={<PinIcon />}
            value={school}
            onChange={(v) => {
              window.analytics?.track('School Selected', { school: v });
              return push(`/?s=${v}&c=${course}`, undefined, { shallow: true });
            }}
            disabled
          />
          <Select
            options={courses.map((cs) => ({ value: cs.id, label: cs.name }))}
            label='Course'
            icon={<BookIcon />}
            value={course}
            onChange={(v) => {
              window.analytics?.track('Course Selected', { course: v });
              return push(`/?s=${school}&c=${v}`, undefined, { shallow: true });
            }}
          />
          <ThemeSelect />
          {!user?.phone && (
            <TextField
              id='phone'
              label='[get invite codes]'
              value={phone}
              setValue={(v) => {
                window.analytics?.track('Phone Changed', { phone: v });
                setPhone(v);
              }}
              button='get codes'
              placeholder='phone number'
              onSubmit={onSubmit}
              loading={loading}
              error={error}
            />
          )}
        </Form>
        <HowTo>
          <li>
            make a contribution: whenever u ask someone about a test, dm{' '}
            <a
              href='https://instagram.com/thavmaclub'
              target='_blank'
              rel='noopener noreferrer'
            >
              @thavmaclub
            </a>{' '}
            with whatever they tell u about it
          </li>
          <li>
            then, whenever u need info and no one’s awake at 1am the night
            before a test, login and it’ll be here
          </li>
        </HowTo>
        {!user?.access &&
          Array(5)
            .fill(null)
            .map((_, idx) => <TestSection key={idx} />)}
        {user?.access &&
          tests
            .filter((t) => t.course === course)
            .sort(
              (a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf()
            )
            .map((t) => <TestSection key={t.id} {...t} />)}
        {user?.access && !tests.some((t) => t.course === course) && (
          <section>
            <div className='wrapper'>
              <Empty>
                <p>
                  no contributions to show yet;
                  <br />
                  dm test info to{' '}
                  <a
                    href='https://instagram.com/thavmaclub'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    @thavmaclub
                  </a>
                </p>
              </Empty>
            </div>
          </section>
        )}
        <style jsx>{`
          section {
            border-top: 1px solid var(--accents-2);
            padding: var(--margin) 0;
          }

          main :global(form button) {
            width: 60px;
          }
        `}</style>
      </main>
    </Page>
  );
}
