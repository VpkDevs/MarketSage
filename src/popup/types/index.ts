export interface TabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export interface SectionProps {
  isActive: boolean;
}

export type ActiveTab = 'protect' | 'insight' | 'scout';

export interface AppState {
  activeTab: ActiveTab;
}
