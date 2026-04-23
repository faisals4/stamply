import { Link } from 'wouter'
import { BookOpen, ChevronLeft } from 'lucide-react'
import { ARTICLES } from './data'

/**
 * Article listing grid — the "home" of the help center.
 * Each card shows the article icon, title, category badge, and
 * short description. Tapping navigates to /help/:slug.
 */
export function HelpIndex() {
  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">
          مركز المساعدة
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-md mx-auto">
          دليل شامل لاستخدام ستامبلي — تعلّم كيف تدير بطاقات الولاء
          وتكافئ عملائك بخطوات بسيطة
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ARTICLES.map((article) => {
          const Icon = article.icon
          return (
            <Link
              key={article.slug}
              href={`/help/${article.slug}`}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="mb-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {article.category}
                  </span>
                  <h2 className="text-base font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {article.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                اقرأ المقال
                <ChevronLeft className="h-3.5 w-3.5" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom CTA */}
      {ARTICLES.length <= 3 && (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            قريباً سنضيف المزيد من الدروس والشروحات ✨
          </p>
        </div>
      )}
    </div>
  )
}
