// Barrel re-export of the Trukkas design system, wired as real ES modules
// (no window globals, no runtime Babel). Source of truth lives under ./ds/
// (components/, tokens/, assets/) — this file is the only place that needs
// updating when a component is added there.
export { Icon } from './ds/assets/icons/Icon.jsx';

export { Avatar } from './ds/components/core/Avatar.jsx';
export { TK_STATUS, Badge } from './ds/components/core/Badge.jsx';
export { Button } from './ds/components/core/Button.jsx';
export { Card } from './ds/components/core/Card.jsx';
export { CopyableId } from './ds/components/core/CopyableId.jsx';
export { Divider } from './ds/components/core/Divider.jsx';
export { IconButton } from './ds/components/core/IconButton.jsx';
export { LabelValue } from './ds/components/core/LabelValue.jsx';
export { Logo } from './ds/components/core/Logo.jsx';
export { SectionCard } from './ds/components/core/SectionCard.jsx';
export { SplitButton } from './ds/components/core/SplitButton.jsx';
export { Tag } from './ds/components/core/Tag.jsx';

export { BarChart } from './ds/components/data/BarChart.jsx';
export { DataTable } from './ds/components/data/DataTable.jsx';
export { DonutChart } from './ds/components/data/DonutChart.jsx';
export { LegendList } from './ds/components/data/LegendList.jsx';
export { LineChart } from './ds/components/data/LineChart.jsx';
export { Pagination } from './ds/components/data/Pagination.jsx';
export { ProgressBar } from './ds/components/data/ProgressBar.jsx';
export { RankBarList } from './ds/components/data/RankBarList.jsx';
export { Sparkline } from './ds/components/data/Sparkline.jsx';
export { StatCard } from './ds/components/data/StatCard.jsx';
export { TableToolbar } from './ds/components/data/TableToolbar.jsx';

export { Banner } from './ds/components/feedback/Banner.jsx';
export { CountBadge } from './ds/components/feedback/CountBadge.jsx';
export { DropdownMenu } from './ds/components/feedback/DropdownMenu.jsx';
export { EmptyState } from './ds/components/feedback/EmptyState.jsx';
export { Modal } from './ds/components/feedback/Modal.jsx';
export { Skeleton, SkeletonRow } from './ds/components/feedback/Skeleton.jsx';
export { StatusDot } from './ds/components/feedback/StatusDot.jsx';
export { Timeline } from './ds/components/feedback/Timeline.jsx';
export { Tooltip } from './ds/components/feedback/Tooltip.jsx';

export { Checkbox } from './ds/components/forms/Checkbox.jsx';
export { ChoiceCard } from './ds/components/forms/ChoiceCard.jsx';
export { ColorSwatchPicker } from './ds/components/forms/ColorSwatchPicker.jsx';
export { FilterSelect } from './ds/components/forms/FilterSelect.jsx';
export { Radio } from './ds/components/forms/Radio.jsx';
export { SearchField } from './ds/components/forms/SearchField.jsx';
export { Select } from './ds/components/forms/Select.jsx';
export { Switch } from './ds/components/forms/Switch.jsx';
export { TextField } from './ds/components/forms/TextField.jsx';
export { Textarea } from './ds/components/forms/Textarea.jsx';

export { Breadcrumbs } from './ds/components/navigation/Breadcrumbs.jsx';
export { CompanySwitcher } from './ds/components/navigation/CompanySwitcher.jsx';
export { PageHeader } from './ds/components/navigation/PageHeader.jsx';
export { Sidebar } from './ds/components/navigation/Sidebar.jsx';
export { SidebarNavItem } from './ds/components/navigation/SidebarNavItem.jsx';
export { SidebarSectionLabel } from './ds/components/navigation/SidebarSectionLabel.jsx';
export { Tabs } from './ds/components/navigation/Tabs.jsx';
export { TopBar } from './ds/components/navigation/TopBar.jsx';

export { ActivityFeed } from './ds/components/patterns/ActivityFeed.jsx';
export { AlertRow } from './ds/components/patterns/AlertRow.jsx';
export { AppShell } from './ds/components/patterns/AppShell.jsx';
export { AttachmentCard } from './ds/components/patterns/AttachmentCard.jsx';
export { EntityHeaderCard } from './ds/components/patterns/EntityHeaderCard.jsx';
export { ListRow } from './ds/components/patterns/ListRow.jsx';
export { MapPanel } from './ds/components/patterns/MapPanel.jsx';
export { MessageBubble } from './ds/components/patterns/MessageBubble.jsx';
export { NotificationItem } from './ds/components/patterns/NotificationItem.jsx';
export { PermissionRow } from './ds/components/patterns/PermissionRow.jsx';
export { QuickActionsCard } from './ds/components/patterns/QuickActionsCard.jsx';
