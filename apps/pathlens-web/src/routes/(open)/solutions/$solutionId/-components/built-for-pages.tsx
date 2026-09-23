import { LayersIcon } from 'lucide-react'

export const BuiltForPages = () => {
  return (
    <div className="group">
      <div className="flex h-full flex-col justify-between gap-8 overflow-hidden">
        <div className="p-5">
          <p className="text-muted-foreground font-medium">
            <LayersIcon className="mr-2 inline-block" size={18} />
            Pages & Content
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Find your most visited pages, understand engagement, and identify
            the content{' '}
            <span className="text-foreground">people care about most</span>.
          </p>
        </div>

        <div className="bg-card/20 relative aspect-square w-full overflow-hidden border-t-2 border-dashed"></div>
      </div>
    </div>
  )
}
