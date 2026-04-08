import type { ReactNode } from 'react'
import { Route, Switch, Redirect, useLocation } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Direction } from 'radix-ui'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider, useI18n } from '@/i18n'
import { AuthProvider, useAuth } from '@/lib/auth/auth'
import { OpAuthProvider, useOpAuth } from '@/lib/auth/opAuth'
import { AppShell } from '@/components/layout/AppShell'
import { OpShell } from '@/pages/op/OpShell'
import OpLoginPage from '@/pages/op/OpLogin'
import OpDashboardPage from '@/pages/op/OpDashboard'
import OpTenantsPage from '@/pages/op/OpTenants'
import OpTenantDetailPage from '@/pages/op/OpTenantDetail'
import OpProfilePage from '@/pages/op/OpProfile'
import OpSettingsPage from '@/pages/op/OpSettings'
import LandingPage from '@/pages/landing/Landing'
import LoginPage from '@/pages/auth/Login'
import SignupPage from '@/pages/auth/Signup'
import DashboardPage from '@/pages/dashboard/Dashboard'
import CardsListPage from '@/pages/cards'
import CardEditorPage from '@/pages/cards/Editor'
import CustomersPage from '@/pages/customers/Customers'
import CustomerDetailPage from '@/pages/customers/CustomerDetail'
import LocationsPage from '@/pages/locations/Locations'
import SettingsPage from '@/pages/settings/Settings'
import StaffPage from '@/pages/staff/Staff'
import StaffEditPage from '@/pages/staff/StaffEdit'
import MessagesPage from '@/pages/messages/Messages'
import MessageComposePage from '@/pages/messages/MessageCompose'
import MessageDetailPage from '@/pages/messages/MessageDetail'
import WalletAnnouncePage from '@/pages/wallet/WalletAnnouncePage'
import AutomationsPage from '@/pages/automations/Automations'
import AutomationEditPage from '@/pages/automations/AutomationEdit'
import ReportsPage from '@/pages/reports/Reports'
import StampsReportPage from '@/pages/reports/StampsReport'
import RedemptionsReportPage from '@/pages/reports/RedemptionsReport'
import IssuedCardsReportPage from '@/pages/reports/IssuedCardsReport'
import PermissionsPage from '@/pages/staff/Permissions'
import PermissionsEditPage from '@/pages/staff/PermissionsEdit'
import ProfilePage from '@/pages/profile/Profile'
import { RequirePerm } from '@/components/auth/RequirePerm'
import IntegrationEmailPage from '@/pages/settings/integrations/IntegrationEmail'
import EmailTemplateEditorPage from '@/pages/settings/integrations/EmailTemplateEditor'
import IntegrationSmsPage from '@/pages/settings/integrations/IntegrationSms'
import IntegrationPushPage from '@/pages/settings/integrations/IntegrationPush'
import SmsTemplateEditorPage from '@/pages/settings/integrations/SmsTemplateEditor'
import PushTemplateEditorPage from '@/pages/settings/integrations/PushTemplateEditor'
import ScanPage from '@/pages/scan/Scan'
import PublicRegisterPage from '@/pages/public/Register'
import IssuedCardPage from '@/pages/public/IssuedCard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

/**
 * Protected tenant (merchant) area. All routes here are mounted under /admin
 * so the URL mirrors the mental model:
 *   /admin            → merchant dashboard
 *   /op               → platform operator dashboard (future)
 *   /c/:slug, /i/...  → public customer pages
 */
function TenantRoutes() {
  const { user, isLoading } = useAuth()
  const [location] = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        ...
      </div>
    )
  }

  if (!user) {
    const next = encodeURIComponent(location)
    return <Redirect to={`/admin/login?next=${next}`} />
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/admin">
          <RequirePerm permission="dashboard.view"><DashboardPage /></RequirePerm>
        </Route>

        {/* Profile is intentionally NOT permission-gated — every authenticated
            user is allowed to manage their own profile. */}
        <Route path="/admin/profile" component={ProfilePage} />

        <Route path="/admin/cards">
          <RequirePerm permission="cards.view"><CardsListPage /></RequirePerm>
        </Route>
        <Route path="/admin/cards/new">
          <RequirePerm permission="cards.manage"><CardEditorPage /></RequirePerm>
        </Route>
        <Route path="/admin/cards/:id">
          <RequirePerm permission="cards.view"><CardEditorPage /></RequirePerm>
        </Route>

        <Route path="/admin/customers">
          <RequirePerm permission="customers.view"><CustomersPage /></RequirePerm>
        </Route>
        <Route path="/admin/customers/:id">
          <RequirePerm permission="customers.view"><CustomerDetailPage /></RequirePerm>
        </Route>

        <Route path="/admin/scan">
          <RequirePerm permission="scan.use"><ScanPage /></RequirePerm>
        </Route>

        <Route path="/admin/messages">
          <RequirePerm permission="messages.send"><MessagesPage /></RequirePerm>
        </Route>
        {/* /new must come before /:id so wouter doesn't capture "new" as an id */}
        <Route path="/admin/messages/new">
          <RequirePerm permission="messages.send"><MessageComposePage /></RequirePerm>
        </Route>
        <Route path="/admin/messages/:id">
          <RequirePerm permission="messages.send"><MessageDetailPage /></RequirePerm>
        </Route>
        {/* Apple Wallet announcements — push lock-screen notifications
            to cardholders without needing a native iOS app. */}
        <Route path="/admin/wallet/announce">
          <RequirePerm permission="messages.send"><WalletAnnouncePage /></RequirePerm>
        </Route>
        <Route path="/admin/automations">
          <RequirePerm permission="automations.view"><AutomationsPage /></RequirePerm>
        </Route>
        {/* /new must come before /:id so wouter doesn't capture "new" as id */}
        <Route path="/admin/automations/new">
          <RequirePerm permission="automations.manage"><AutomationEditPage /></RequirePerm>
        </Route>
        <Route path="/admin/automations/:id">
          <RequirePerm permission="automations.manage"><AutomationEditPage /></RequirePerm>
        </Route>

        <Route path="/admin/locations">
          <RequirePerm permission="locations.view"><LocationsPage /></RequirePerm>
        </Route>

        {/* Drill-down reports — more specific routes MUST come before /admin/reports */}
        <Route path="/admin/reports/stamps">
          <RequirePerm permission="reports.view"><StampsReportPage /></RequirePerm>
        </Route>
        <Route path="/admin/reports/redemptions">
          <RequirePerm permission="reports.view"><RedemptionsReportPage /></RequirePerm>
        </Route>
        <Route path="/admin/reports/issued-cards">
          <RequirePerm permission="cards.view"><IssuedCardsReportPage /></RequirePerm>
        </Route>
        <Route path="/admin/reports">
          <RequirePerm permission="reports.view"><ReportsPage /></RequirePerm>
        </Route>

        <Route path="/admin/managers">
          <RequirePerm permission="staff.view"><StaffPage /></RequirePerm>
        </Route>
        {/* /permissions must come before /:id so wouter doesn't capture it as an id */}
        <Route path="/admin/managers/permissions">
          <RequirePerm permission="staff.permissions"><PermissionsPage /></RequirePerm>
        </Route>
        <Route path="/admin/managers/permissions/:role">
          <RequirePerm permission="staff.permissions"><PermissionsEditPage /></RequirePerm>
        </Route>
        <Route path="/admin/managers/:id">
          <RequirePerm permission="staff.manage"><StaffEditPage /></RequirePerm>
        </Route>

        <Route path="/admin/settings">
          <RequirePerm permission="settings.brand"><SettingsPage /></RequirePerm>
        </Route>
        <Route path="/admin/settings/integrations/email">
          <RequirePerm permission="settings.integrations"><IntegrationEmailPage /></RequirePerm>
        </Route>
        <Route path="/admin/settings/email-templates/:key">
          <RequirePerm permission="settings.templates"><EmailTemplateEditorPage /></RequirePerm>
        </Route>
        <Route path="/admin/settings/integrations/push">
          <RequirePerm permission="settings.integrations"><IntegrationPushPage /></RequirePerm>
        </Route>
        <Route path="/admin/settings/integrations/sms">
          <RequirePerm permission="settings.integrations"><IntegrationSmsPage /></RequirePerm>
        </Route>
        <Route path="/admin/settings/sms-templates/:key">
          <RequirePerm permission="settings.templates"><SmsTemplateEditorPage /></RequirePerm>
        </Route>
        <Route path="/admin/settings/push-templates/:key">
          <RequirePerm permission="settings.templates"><PushTemplateEditorPage /></RequirePerm>
        </Route>

        <Route>
          <Redirect to="/admin" />
        </Route>
      </Switch>
    </AppShell>
  )
}

/**
 * Platform operator (Stamply staff) protected area.
 * Uses a separate auth context so a tenant token never leaks into /op.
 */
function OpRoutes() {
  const { admin, isLoading } = useOpAuth()
  const [location] = useLocation()

  // /op/login is public
  if (location === '/op/login') {
    return <OpLoginPage />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        ...
      </div>
    )
  }

  if (!admin) {
    return <Redirect to="/op/login" />
  }

  return (
    <OpShell>
      <Switch>
        <Route path="/op" component={OpDashboardPage} />
        <Route path="/op/profile" component={OpProfilePage} />
        <Route path="/op/tenants" component={OpTenantsPage} />
        <Route path="/op/settings" component={OpSettingsPage} />
        <Route path="/op/tenants/:id" component={OpTenantDetailPage} />
        <Route>
          <Redirect to="/op" />
        </Route>
      </Switch>
    </OpShell>
  )
}

/** Feeds the active i18n direction into Radix so Tabs/Tooltip/Select etc. flow RTL. */
function RadixDirectionBridge({ children }: { children: ReactNode }) {
  const { dir } = useI18n()
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RadixDirectionBridge>
          <TooltipProvider delayDuration={150}>
            <AuthProvider>
              <OpAuthProvider>
                <Switch>
                  {/* Public (unauthenticated) customer pages */}
                  <Route path="/c/:templateId" component={PublicRegisterPage} />
                  <Route path="/i/:serial" component={IssuedCardPage} />

                  {/* Tenant login + signup */}
                  <Route path="/admin/login" component={LoginPage} />
                  <Route path="/signup" component={SignupPage} />

                  {/* Legacy /login → forward to /admin/login */}
                  <Route path="/login">
                    <Redirect to="/admin/login" />
                  </Route>

                  {/* Root → public marketing landing page */}
                  <Route path="/" component={LandingPage} />

                  {/* Platform operator (SaaS owner) — /op and up to 3 levels deep.
                      wouter's `:rest*` splat doesn't match multi-segment tails,
                      so we enumerate each depth explicitly. */}
                  <Route path="/op" component={OpRoutes} />
                  <Route path="/op/:a" component={OpRoutes} />
                  <Route path="/op/:a/:b" component={OpRoutes} />
                  <Route path="/op/:a/:b/:c" component={OpRoutes} />

                  {/* Tenant (merchant) dashboard — /admin and up to 4 levels deep
                      (deepest current path is /admin/settings/email-templates/welcome). */}
                  <Route path="/admin" component={TenantRoutes} />
                  <Route path="/admin/:a" component={TenantRoutes} />
                  <Route path="/admin/:a/:b" component={TenantRoutes} />
                  <Route path="/admin/:a/:b/:c" component={TenantRoutes} />
                  <Route path="/admin/:a/:b/:c/:d" component={TenantRoutes} />
                </Switch>
              </OpAuthProvider>
            </AuthProvider>
          </TooltipProvider>
        </RadixDirectionBridge>
      </I18nProvider>
    </QueryClientProvider>
  )
}
