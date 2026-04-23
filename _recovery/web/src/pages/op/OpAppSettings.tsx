import { Link } from 'wouter'
import { Image, MessageSquare, Smartphone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getOtpSmsConfig, getAppIconConfig } from '@/lib/api/op/settings'

const sections = [
  {
    id: 'otp-sms',
    icon: MessageSquare,
    title: 'مزوّدو SMS (OTP)',
    href: '/op/app-settings/otp-sms',
  },
  {
    id: 'banners',
    icon: Image,
    title: 'التحكم بالبنرات',
    href: '/op/app-settings/banners',
  },
  {
    id: 'app-icon',
    icon: Smartphone,
    title: 'أيقونة التطبيق',
    href: '/op/app-settings/app-icon',
  },
]

export default function OpAppSettingsPage() {
  const { data: otpConfig } = useQuery({
    queryKey: ['op-settings', 'otp-sms'],
    queryFn: getOtpSmsConfig,
  })
  const { data: iconConfig } = useQuery({
    queryKey: ['op-settings', 'app-icon'],
    queryFn: getAppIconConfig,
  })

  const activeProvider = otpConfig
    ? otpConfig.messagecentral.enabled
      ? 'MessageCentral'
      : otpConfig.unifonic.enabled
        ? 'Unifonic'
        : otpConfig.smscountry.enabled
          ? 'SMSCountry'
          : otpConfig.twilio.enabled
            ? 'Twilio'
            : null
    : undefined

  const activeIconLabel = iconConfig?.variants.find((v) => v.is_active)?.label_ar

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
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-[#635C70] block">{section.title}</span>
                  {section.id === 'otp-sms' && activeProvider !== undefined && (
                    <span className={`text-[11px] block ${activeProvider ? 'text-emerald-600' : 'text-red-500'}`}>
                      {activeProvider ?? 'غير مفعّل'}
                    </span>
                  )}
                  {section.id === 'app-icon' && activeIconLabel && (
                    <span className="text-[11px] block text-emerald-600">
                      {activeIconLabel}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
