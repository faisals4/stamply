import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Loader2 } from 'lucide-react'
import { FullPageLoader } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import {
  listOpPlans,
  updateOpPlan,
  type PlanItem,
} from '@/lib/api/op'

/**
 * /op/plans — plans management page. Shows all available plans with their
 * pricing and limits, allowing inline editing of prices and plan limits.
 */
export default function OpPlansPage() {
  const qc = useQueryClient()
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null)

  // Query
  const { data: plans, isLoading } = useQuery({
    queryKey: ['op-plans'],
    queryFn: listOpPlans,
  })

  // Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<PlanItem> }) =>
      updateOpPlan(payload.id, payload.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-plans'] })
      setEditingPlanId(null)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      alert(axiosErr.response?.data?.message ?? 'تعذر تحديث الخطة')
    },
  })

  if (isLoading) {
    return <FullPageLoader />
  }

  return (
    <div>
      <PageHeader
        icon={<Crown />}
        title="إدارة الخطط"
        subtitle="الخطط المتاحة وأسعارها"
      />

      {plans && plans.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Crown className="w-12 h-12 mx-auto text-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد خطط متاحة</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isEditing={editingPlanId === plan.id}
              onEdit={() => setEditingPlanId(plan.id)}
              onCancel={() => setEditingPlanId(null)}
              onSave={(data) => {
                updateMutation.mutate({ id: plan.id, data })
                setEditingPlanId(null)
              }}
              isSaving={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center">
        {plans?.length ?? 0} خطة متاحة
      </p>
    </div>
  )
}

function PlanCard({
  plan,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: {
  plan: PlanItem
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (data: Partial<PlanItem>) => void
  isSaving: boolean
}) {
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthly_price)
  const [yearlyPrice, setYearlyPrice] = useState(plan.yearly_price)
  const [maxCards, setMaxCards] = useState(plan.max_cards.toString())
  const [maxLocations, setMaxLocations] = useState(plan.max_locations.toString())
  const [maxUsers, setMaxUsers] = useState(plan.max_users.toString())

  const handleSave = () => {
    onSave({
      monthly_price: monthlyPrice,
      yearly_price: yearlyPrice,
      max_cards: parseInt(maxCards),
      max_locations: parseInt(maxLocations),
      max_users: parseInt(maxUsers),
    })
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-sm text-foreground">{plan.name_ar}</h3>
          <p className="text-xs text-muted-foreground mt-1">{plan.name_en}</p>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full inline-block mt-2">
            {plan.slug}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">السعر الشهري</label>
            <Input
              type="text"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              className="bg-card border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">السعر السنوي</label>
            <Input
              type="text"
              value={yearlyPrice}
              onChange={(e) => setYearlyPrice(e.target.value)}
              className="bg-card border-border text-sm"
            />
          </div>

          <hr className="border-border my-2" />

          <div>
            <label className="text-xs text-muted-foreground block mb-1">حد أقصى للبطاقات</label>
            <Input
              type="number"
              value={maxCards}
              onChange={(e) => setMaxCards(e.target.value)}
              className="bg-card border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">حد أقصى للمواقع</label>
            <Input
              type="number"
              value={maxLocations}
              onChange={(e) => setMaxLocations(e.target.value)}
              className="bg-card border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">حد أقصى للمستخدمين</label>
            <Input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              className="bg-card border-border text-sm"
            />
          </div>

          {plan.trial_days > 0 && (
            <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-600">أيام التجربة: {plan.trial_days}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
            size="sm"
          >
            {isSaving && <Loader2 className="w-3 h-3 animate-spin me-1" />}
            حفظ
          </Button>
          <Button
            onClick={onCancel}
            disabled={isSaving}
            variant="outline"
            className="flex-1 border-border bg-card hover:bg-muted"
            size="sm"
          >
            إلغاء
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-ring transition">
      <div className="mb-4">
        <h3 className="font-semibold text-sm text-foreground">{plan.name_ar}</h3>
        <p className="text-xs text-muted-foreground mt-1">{plan.name_en}</p>
        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full inline-block mt-2">
          {plan.slug}
        </span>
      </div>

      <div className="space-y-3 text-sm mb-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">السعر الشهري</span>
          <span className="font-mono font-medium">{plan.monthly_price}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">السعر السنوي</span>
          <span className="font-mono font-medium">{plan.yearly_price}</span>
        </div>

        <hr className="border-border my-2" />

        <div className="grid gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">البطاقات</span>
            <span className="font-medium">{plan.max_cards}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">المواقع</span>
            <span className="font-medium">{plan.max_locations}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">المستخدمون</span>
            <span className="font-medium">{plan.max_users}</span>
          </div>
        </div>

        {plan.trial_days > 0 && (
          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-600">أيام التجربة: {plan.trial_days}</p>
          </div>
        )}
      </div>

      <Button
        onClick={onEdit}
        variant="outline"
        size="sm"
        className="w-full border-border bg-card hover:bg-muted"
      >
        تعديل
      </Button>
    </div>
  )
}
