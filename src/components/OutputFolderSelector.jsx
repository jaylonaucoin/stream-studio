import { Folder, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function OutputFolderSelector({ folder, onChange }) {
  const truncatePath = (path, maxLength = 200) => {
    if (!path) return ''
    if (path.length <= maxLength) return path
    const parts = path.split(/[/\\]/)
    if (parts.length <= 2) {
      return path.length > maxLength ? '...' + path.slice(-maxLength + 3) : path
    }
    return '...' + parts.slice(-2).join('/')
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="mr-1 text-sm text-muted-foreground">Output:</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge variant="outline" className="max-w-full gap-1 truncate font-normal" />
            }
          >
            <FolderOpen className="size-3.5" />
            <span className="truncate">{truncatePath(folder)}</span>
          </TooltipTrigger>
          <TooltipContent>{folder}</TooltipContent>
        </Tooltip>
      </div>
      <Button size="sm" variant="outline" onClick={onChange}>
        <FolderOpen className="size-4" />
        Choose Folder
      </Button>
    </div>
  )
}

export default OutputFolderSelector
