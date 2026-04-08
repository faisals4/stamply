import { useState } from 'react'
import { Plus, Trash2, Lock, GripVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type RegistrationField,
  BUILTIN_FIELDS,
  SUGGESTED_OPTIONAL_FIELDS,
} from '@/types/card'

interface Props {
  value: RegistrationField[]
  onChange: (next: RegistrationField[]) => void
}

/**
 * Editor for the customer registration form fields. Builtin (name, phone) are
 * always present and cannot be removed or made optional. Suggested fields can
 * be toggled. Custom fields can be added with their own label + type.
 */
export function RegistrationFieldsEditor({ value, onChange }: Props) {
  // Make sure builtins are always at the top, present, locked, required.
  const ensureBuiltins = (fields: RegistrationField[]): RegistrationField[] => {
    const others = fields.filter((f) => !BUILTIN_FIELDS.some((b) => b.key === f.key))
    return [...BUILTIN_FIELDS, ...others]
  }

  const fields = ensureBuiltins(value)
  const customKeys = new Set(fields.map((f) => f.key))

  const updateField = (key: string, patch: Partial<RegistrationField>) => {
    onChange(
      fields.map((f) => (f.key === key ? { ...f, ...patch, locked: f.locked } : f)),
    )
  }

  const addField = (field: RegistrationField) => {
    onChange([...fields, field])
  }

  const removeField = (key: string) => {
    onChange(fields.filter((f) => f.key !== key))
  }

  const moveField = (key: string, direction: 'up' | 'down') => {
    const idx = fields.findIndex((f) => f.key === key)
    if (idx < 0) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    // Don't move into the locked builtin region
    const builtinCount = BUILTIN_FIELDS.length
    if (target < builtinCount || target >= fields.length) return
    const next = [...fields]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }

  // Suggested fields that aren't already added
  const availableSuggested = SUGGESTED_OPTIONAL_FIELDS.filter(
    (s) => !customKeys.has(s.key),
  )

  return (
    <div>
      <h3 className="font-semibold mb-1">حقول التسجيل</h3>
      <p className="text-sm text-muted-foreground mb-4">
        الحقول التي يملأها العميل عند تسجيل البطاقة. الاسم ورقم الجوال إجباريان دائماً.
      </p>

      {/* Field list */}
      <div className="space-y-2 mb-4">
        {fields.map((f, i) => (
          <FieldRow
            key={f.key}
            field={f}
            isFirst={i === BUILTIN_FIELDS.length}
            isLast={i === fields.length - 1}
            onUpdate={(patch) => updateField(f.key, patch)}
            onRemove={() => removeField(f.key)}
            onMoveUp={() => moveField(f.key, 'up')}
            onMoveDown={() => moveField(f.key, 'down')}
          />
        ))}
      </div>

      {/* Suggested fields */}
      {availableSuggested.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-2">حقول مقترحة (انقر للإضافة):</div>
          <div className="flex flex-wrap gap-2">
            {availableSuggested.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => addField(s)}
                className="text-xs px-3 py-1.5 rounded-full border bg-card hover:border-primary hover:text-primary transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add custom field */}
      <CustomFieldAdder
        existingKeys={customKeys}
        onAdd={addField}
      />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */

function FieldRow({
  field,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  field: RegistrationField
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<RegistrationField>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const typeLabels: Record<RegistrationField['type'], string> = {
    text: 'نص',
    phone: 'هاتف',
    email: 'بريد',
    date: 'تاريخ',
    select: 'قائمة',
  }

  return (
    <div
      className={`rounded-lg border p-3 flex items-center gap-3 ${field.locked ? 'bg-muted/30' : 'bg-card'}`}
    >
      {/* Drag handle / sort */}
      {!field.locked && (
        <div className="flex flex-col -gap-1 text-muted-foreground">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="hover:text-foreground disabled:opacity-30"
            aria-label="نقل لأعلى"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {field.locked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}

      {/* Label (editable for custom) */}
      <div className="flex-1 min-w-0">
        {field.locked ? (
          <div className="text-sm font-medium">{field.label}</div>
        ) : (
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-8 text-sm"
          />
        )}
      </div>

      {/* Type badge */}
      <Badge variant="outline" className="text-[10px] shrink-0">
        {typeLabels[field.type]}
      </Badge>

      {/* Required toggle */}
      <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={field.required}
          disabled={field.locked}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="rounded"
        />
        إجباري
      </label>

      {/* Delete (only for non-locked) */}
      {!field.locked ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-1"
          aria-label="حذف الحقل"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="w-6" />
      )}

      {/* Move down */}
      {!field.locked && (
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 -ms-2"
          aria-label="نقل لأسفل"
        >
          <GripVertical className="w-3.5 h-3.5 rotate-180" />
        </button>
      )}
    </div>
  )
}

function CustomFieldAdder({
  existingKeys,
  onAdd,
}: {
  existingKeys: Set<string>
  onAdd: (f: RegistrationField) => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<RegistrationField['type']>('text')
  const [required, setRequired] = useState(false)

  const reset = () => {
    setLabel('')
    setType('text')
    setRequired(false)
    setOpen(false)
  }

  const submit = () => {
    if (!label.trim()) return
    // Generate a stable, unique key from the label
    let key = label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_\u0600-\u06ff]/g, '')
    if (!key) key = `field_${Date.now()}`

    let i = 1
    let finalKey = key
    while (existingKeys.has(finalKey)) {
      finalKey = `${key}_${i++}`
    }

    onAdd({ key: finalKey, label: label.trim(), type, required })
    reset()
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5 me-1.5" />
        إضافة حقل مخصص
      </Button>
    )
  }

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-3">
      <div className="text-sm font-medium">حقل جديد</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">الاسم</Label>
          <Input
            placeholder="مثل: العنوان"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">النوع</Label>
          <Select value={type} onValueChange={(v) => setType(v as RegistrationField['type'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">نص</SelectItem>
              <SelectItem value="email">بريد إلكتروني</SelectItem>
              <SelectItem value="phone">هاتف إضافي</SelectItem>
              <SelectItem value="date">تاريخ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        إجباري
      </label>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={!label.trim()}>
          إضافة
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          إلغاء
        </Button>
      </div>
    </div>
  )
}
