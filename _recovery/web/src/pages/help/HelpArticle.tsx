import { Link } from 'wouter'
import { ChevronLeft, ArrowLeft, BookOpen } from 'lucide-react'
import { findArticle, nextArticle } from './data'

/**
 * Individual article viewer — breadcrumb, rendered content, and a
 * "next article" link at the bottom.
 */
export function HelpArticle({ slug }: { slug: string }) {
  const article = findArticle(slug)

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground">
          المقال غير موجود
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          تأكد من الرابط أو ارجع لمركز المساعدة
        </p>
        <Link
          href="/help"
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          مركز المساعدة
        </Link>
      </div>
    )
  }

  const Icon = article.icon
  const next = nextArticle(slug)
  const Content = article.Component

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/help"
          className="hover:text-primary transition-colors font-medium"
        >
          مركز المساعدة
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate">
          {article.title}
        </span>
      </nav>

      {/* Article header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {article.category}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground leading-tight">
          {article.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {article.description}
        </p>
      </div>

      {/* Article content */}
      <Content />

      {/* Next article */}
      {next && next.slug !== slug && (
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            المقال التالي
          </p>
          <Link
            href={`/help/${next.slug}`}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <next.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {next.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {next.description}
              </p>
            </div>
            <ArrowLeft className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      )}

      {/* Back to index */}
      <div className="mt-8 text-center">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          العودة لمركز المساعدة
        </Link>
      </div>
    </div>
  )
}
