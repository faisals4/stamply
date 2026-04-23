import { useRoute } from 'wouter'
import { HelpLayout } from './HelpLayout'
import { HelpIndex } from './HelpIndex'
import { HelpArticle } from './HelpArticle'

/**
 * Route dispatcher for the help center:
 *   /help         → article index grid
 *   /help/:slug   → individual article
 *
 * Mounted once in App.tsx at both `/help` and `/help/:slug` — wouter
 * resolves whichever path matches first and this component decides
 * what to render based on the slug param.
 */
export default function HelpPages() {
  const [match, params] = useRoute('/help/:slug')
  const slug = match ? params?.slug : null

  return (
    <HelpLayout>
      {slug ? <HelpArticle slug={slug} /> : <HelpIndex />}
    </HelpLayout>
  )
}
