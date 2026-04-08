import type { ReactNode } from 'react'
import type { CardTemplate } from '@/types/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CardVisual } from '@/components/card/CardVisual'
import { ApplePassPreview } from './preview/ApplePassPreview'
import { GooglePassPreview } from './preview/GooglePassPreview'

interface Props {
  card: CardTemplate
  collectedStamps?: number
}

/**
 * Live preview of a card across the 3 surfaces it can render on:
 *   - الويب  → the in-app PWA card (`<CardVisual>`)
 *   - ابل    → an Apple Wallet pass mockup mirroring the .pkpass we sign
 *   - قوقل  → a Google Wallet loyalty object mockup
 *
 * All three previews share the same iPhone-shaped frame so the editor
 * can flip between them without the layout jumping.
 */
export function CardPreview({ card, collectedStamps = 3 }: Props) {
  return (
    <div className="flex flex-col items-center">
      <Tabs defaultValue="web" className="w-[280px]">
        <TabsList className="w-full grid grid-cols-3 mb-3">
          <TabsTrigger value="web">الويب</TabsTrigger>
          <TabsTrigger value="apple">ابل</TabsTrigger>
          <TabsTrigger value="google">قوقل</TabsTrigger>
        </TabsList>

        <TabsContent value="web" className="mt-0">
          <PhoneFrame background="bg-neutral-100">
            <div className="pt-8 pb-4 px-3">
              <CardVisual card={card} collectedStamps={collectedStamps} />
            </div>
          </PhoneFrame>
        </TabsContent>

        <TabsContent value="apple" className="mt-0">
          <PhoneFrame background="bg-neutral-100">
            <div className="pt-8 pb-4 px-3">
              <ApplePassPreview card={card} collectedStamps={collectedStamps} />
            </div>
          </PhoneFrame>
        </TabsContent>

        <TabsContent value="google" className="mt-0">
          <PhoneFrame background="bg-neutral-100">
            <div className="pt-8 pb-4 px-3">
              <GooglePassPreview card={card} collectedStamps={collectedStamps} />
            </div>
          </PhoneFrame>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Shared iPhone frame chrome — notch + rounded body. */
function PhoneFrame({
  children,
  background = 'bg-white',
}: {
  children: ReactNode
  background?: string
}) {
  return (
    <div className="relative w-[280px] rounded-[2.5rem] bg-neutral-900 p-2.5 shadow-2xl">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-10" />
      <div className={`rounded-[2rem] overflow-hidden ${background} min-h-[500px]`}>
        {children}
      </div>
    </div>
  )
}
