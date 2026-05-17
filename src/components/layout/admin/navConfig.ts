import {
  LayoutDashboard,
  Activity,
  PlusCircle,
  Database,
  Settings2,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: "Core",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Exam Management",
    items: [
      { href: "/admin/live", label: "Live Monitor", icon: Activity, exact: true },
      { href: "/admin/exams/new", label: "Create Exam", icon: PlusCircle, exact: true },
      { href: "/admin/questions", label: "Question Bank", icon: Database, exact: true },
      { href: "/admin/controls", label: "Exam Controls", icon: Settings2, exact: true },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/students", label: "Students", icon: Users, exact: true },
    ],
  },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/live", label: "Live", icon: Activity },
  { href: "/admin/exams/new", label: "Create", icon: PlusCircle },
  { href: "/admin/questions", label: "Bank", icon: Database },
  { href: "/admin/students", label: "Users", icon: Users },
];