import type { ReactNode } from 'react'
import { ShieldOff } from 'lucide-react'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

interface Props {
  permission: string
  children: ReactNode
}

/**
 * Wraps a tenant page so it only renders for users with the given permission.
 * Admins always pass. Anyone else hits a friendly inline "no access" screen
 * with a back button — much nicer than the API 403 bubbling up as a crash.
 */
export function RequirePerm({ permission, children }: Props) {
  const { can } = useAuth()
  const [, setLocation] = useLocation()

  if (can(permission)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">ليس لديك صلاحية</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          هذه الصفحة تحتاج صلاحية لا تملكها. تواصل مع مدير النظام لطلب الوصول.
        </p>
        <Button variant="outline" onClick={() => setLocation('/admin')}>
          العودة للوحة التحكم
        </Button>
      </div>
    </div>
  )
}
