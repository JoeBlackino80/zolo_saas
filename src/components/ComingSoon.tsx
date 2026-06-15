import { PageHeader, Card, EmptyState } from './ui';

export default function ComingSoon({ title, subtitle, icon, desc }: { title: string; subtitle: string; icon: React.ReactNode; desc: string }) {
  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <EmptyState
          icon={icon}
          title="Pripravujeme"
          description={desc}
        />
      </Card>
    </div>
  );
}
