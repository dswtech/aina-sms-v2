import Dashboard from '@/pages/dashboard';
import type { ReportingProps } from '@/components/team-performance';
export default function TeamPerformance(props: ReportingProps) {
    return <Dashboard {...props} title="Kinerja Tim" />;
}
TeamPerformance.layout = {
    breadcrumbs: [{ title: 'Kinerja Tim', href: '/team-performance' }],
};
