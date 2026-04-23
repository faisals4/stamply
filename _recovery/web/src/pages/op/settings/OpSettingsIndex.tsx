import { Link } from 'wouter'
import { Bell, Apple, Flame, Wallet, Globe, Settings } from 'lucide-react'

const sections = [
  {
    id: 'vapid',
    icon: Bell,
    title: 'Web Push (VAPID)',
    href: '/op/settings/vapid',
  },
  {
    id: 'apns',
    icon: Apple,
    title: 'Apple Push (APNs)',
    href: '/op/settings/apns',
  },
  {
    id: 'fcm',
    icon: Flame,
    title: 'Firebase (FCM)',
    href: '/op/settings/fcm',
  },
  {
    id: 'apple-wallet',
    icon: Wallet,
    title: 'Apple Wallet',
    href: '/op/settings/apple-wallet',
  },
  {
    id: 'google-wallet',
    icon: Globe,
    title: 'Google Wallet',
    href: '/op/settings/google-wallet',
  },
  {
    id: 'features',
    icon: Settings,
    title: 'خصائص المنصة',
    href: '/op/settings/features',
  },
]

export default function OpSettingsIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">إعدادات المنصّة</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.id} href={section.href}>
              <div className="bg-white rounded-xl h-16 flex items-center gap-3 px-4 cursor-pointer hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#A4A1AA]" />
                </div>
                <span className="text-[13px] font-medium text-[#635C70]">{section.title}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
