import { useState, useMemo } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  COUNTRIES,
  DEFAULT_COUNTRY_CODE,
  findCountry,
  isValidNationalLength,
  normalizeNational,
  type Country,
} from '@/lib/countries'
import { cn } from '@/lib/utils'

export interface PhoneInputValue {
  countryCode: string // ISO alpha-2
  national: string // digits only, no leading zero
  e164: string // full E.164 (no +) — `${dial}${national}`
  isValid: boolean
}

interface Props {
  value: PhoneInputValue
  onChange: (value: PhoneInputValue) => void
  defaultCountry?: string
  required?: boolean
  id?: string
  className?: string
}

export function makePhoneValue(
  countryCode: string,
  rawNational: string,
): PhoneInputValue {
  const country = findCountry(countryCode) ?? findCountry(DEFAULT_COUNTRY_CODE)!
  const national = normalizeNational(rawNational)
  const isValid = national.length > 0 && isValidNationalLength(country, national)
  return {
    countryCode: country.code,
    national,
    e164: `${country.dial}${national}`,
    isValid,
  }
}

export function PhoneInput({
  value,
  onChange,
  required,
  id,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const country = findCountry(value.countryCode) ?? findCountry(DEFAULT_COUNTRY_CODE)!

  const handleNationalChange = (raw: string) => {
    onChange(makePhoneValue(country.code, raw))
  }

  const selectCountry = (c: Country) => {
    onChange(makePhoneValue(c.code, value.national))
    setOpen(false)
  }

  return (
    <div className={cn('flex gap-2', className)} dir="ltr">
      {/* Country selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 px-3 gap-1.5 shrink-0 font-mono"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-sm">+{country.dial}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[280px] max-w-[280px] p-0" align="start">
          <CountryCombobox
            selectedCode={country.code}
            onSelect={selectCountry}
          />
        </PopoverContent>
      </Popover>

      {/* National number */}
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required={required}
        value={value.national}
        onChange={(e) => handleNationalChange(e.target.value)}
        // Block non-digit and non-Arabic-digit keys at typing time
        onKeyDown={(e) => {
          if (
            e.key.length === 1 &&
            !/[\d٠-٩]/.test(e.key) &&
            !e.ctrlKey &&
            !e.metaKey
          ) {
            e.preventDefault()
          }
        }}
        onPaste={(e) => {
          e.preventDefault()
          const pasted = e.clipboardData.getData('text')
          handleNationalChange(pasted)
        }}
        placeholder="5xxxxxxxx"
        className="flex-1 font-mono tracking-wider text-left"
      />
    </div>
  )
}

function CountryCombobox({
  selectedCode,
  onSelect,
}: {
  selectedCode: string
  onSelect: (c: Country) => void
}) {
  const [query, setQuery] = useState('')

  // Search by name, name_en, dial code, or ISO code (case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '')
    if (!q) return COUNTRIES
    return COUNTRIES.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
      )
    })
  }, [query])

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="ابحث بالاسم أو الرمز..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>لا توجد نتائج</CommandEmpty>
        <CommandGroup>
          {filtered.map((c) => (
            <CommandItem
              key={c.code}
              value={c.code}
              onSelect={() => onSelect(c)}
              className="gap-2"
            >
              <span className="text-base">{c.flag}</span>
              <span className="flex-1 text-sm" dir="rtl">
                {c.name}
              </span>
              <span className="text-xs text-muted-foreground font-mono">+{c.dial}</span>
              {c.code === selectedCode && (
                <Check className="w-3.5 h-3.5 text-primary" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
