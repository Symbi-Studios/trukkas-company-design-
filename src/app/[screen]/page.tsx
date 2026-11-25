import { ScreenRouter } from '../../ScreenRouter';
import { staticParamsFor } from '../../staticParams';

export function generateStaticParams() { return staticParamsFor('screen'); }

export default async function ScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  return <ScreenRouter screen={screen} />;
}
