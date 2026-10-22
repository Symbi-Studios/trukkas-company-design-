'use client';

import { useState } from 'react';
import { Link, useNavigate, useParams } from '../router.js';
import { Button, Card, Icon, PageHeader } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { topicBySlug } from '../domain/support.js';
import { StillNeedHelp } from './HelpGuides.jsx';
import styles from './Guides.module.css';

export function GuideDetail() {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const guides = useCollection('guides') || [];
  const [feedback, setFeedback] = useState(null);
  const guide = guides.find((g) => g.id === guideId);

  if (!guide) {
    return (
      <div className={styles.page}>
        <PageHeader title="Guide not found" description="This guide may have moved or been removed." />
        <div><Button variant="outline" onClick={() => navigate('/support/guides')}>Browse all guides</Button></div>
      </div>
    );
  }

  const topic = topicBySlug(guide.topic);
  const related = guides.filter((g) => g.topic === guide.topic && g.id !== guide.id);

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={[
          { label: 'Support', onClick: () => navigate('/support') },
          { label: 'Help Guides', onClick: () => navigate('/support/guides') },
          { label: topic.value, onClick: () => navigate(`/support/guides?topic=${topic.slug}`) },
          guide.title,
        ]}
        title={guide.title}
        description={guide.summary}
      />

      <div className={styles.articleLayout}>
        <Card className={styles.article}>
          <div className={styles.articleMeta}>
            <span className={styles.topicTag}><Icon name={topic.icon} size={13} />{topic.value}</span>
            <span className={styles.meta}><Icon name="clock" size={13} /> {guide.readMinutes} min read</span>
            <span className={styles.meta}>Updated {guide.updated}</span>
          </div>

          {guide.sections.map((s) => (
            <section key={s.heading} className={styles.section}>
              <h2>{s.heading}</h2>
              {s.body && <p>{s.body}</p>}
              {s.steps && <ol>{s.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
              {s.tip && (
                <div className={styles.tip}>
                  <Icon name="lightbulb" size={16} color="var(--tk-blue)" />
                  <span>{s.tip}</span>
                </div>
              )}
            </section>
          ))}

          <div className={styles.feedback}>
            {feedback ? (
              <span><Icon name="circle-check" size={16} color="var(--tk-success)" /> Thanks for your feedback.</span>
            ) : (
              <>
                <span>Was this guide helpful?</span>
                <Button variant="outline" size="sm" icon="thumbs-up" onClick={() => setFeedback('yes')}>Yes</Button>
                <Button variant="outline" size="sm" icon="thumbs-down" onClick={() => setFeedback('no')}>No</Button>
              </>
            )}
          </div>
        </Card>

        <aside className={styles.aside}>
          <Card>
            <h3 className={styles.asideTitle}>More in {topic.label}</h3>
            {related.length === 0 ? (
              <p className={styles.meta}>No other guides in this topic yet.</p>
            ) : (
              <ul className={styles.relatedList}>
                {related.map((g) => (
                  <li key={g.id}>
                    <Link to={`/support/guides/${g.id}`}>
                      <Icon name="file-text" size={16} color="var(--tk-blue)" />
                      <span>{g.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/support/guides?topic=${topic.slug}`} className={styles.viewAll}>
              View all {topic.value} guides <Icon name="arrow-right" size={14} />
            </Link>
          </Card>
          <StillNeedHelp topic={topic} />
        </aside>
      </div>
    </div>
  );
}
