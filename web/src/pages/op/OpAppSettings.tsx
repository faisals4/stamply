import { Link } from 'wouter'
import { Image } from 'lucide-react'

const sections = [
  {
    id: 'banners',
    icon: Image,
    title: 'التحكم بالبنرات',
    href: '/op/app-settings/banners',
  },
]

export default function OpAppSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">إعدادات التطبيق</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
