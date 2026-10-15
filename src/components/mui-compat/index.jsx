import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useState,
  useEffect,
} from 'react'
import { cn } from '@/lib/utils'
import { Button as ShadButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert as ShadAlert, AlertDescription } from '@/components/ui/alert'
import { Checkbox as ShadCheckbox } from '@/components/ui/checkbox'
import { Switch as ShadSwitch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Slider as ShadSlider } from '@/components/ui/slider'
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Dialog as ShadDialog,
  DialogContent as ShadDialogContent,
  DialogFooter as ShadDialogFooter,
  DialogHeader,
  DialogTitle as ShadDialogTitle,
  DialogDescription as ShadDialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion as AccordionRoot,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Skeleton as ShadSkeleton } from '@/components/ui/skeleton'
import { Tabs as ShadTabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table as ShadTable,
  TableBody as ShadTableBody,
  TableCell as ShadTableCell,
  TableHead as ShadTableHead,
  TableHeader as ShadTableHeader,
  TableRow as ShadTableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

function sxToClass(sx) {
  if (!sx || typeof sx !== 'object') return ''
  const classes = []
  if (sx.display === 'flex') classes.push('flex')
  if (sx.flexDirection === 'column') classes.push('flex-col')
  if (sx.flexDirection === 'row') classes.push('flex-row')
  if (sx.alignItems === 'center') classes.push('items-center')
  if (sx.justifyContent === 'center') classes.push('justify-center')
  if (sx.justifyContent === 'space-between') classes.push('justify-between')
  if (sx.flexGrow === 1 || sx.flex === 1) classes.push('flex-1')
  if (sx.flexWrap === 'wrap') classes.push('flex-wrap')
  if (sx.minWidth === 0) classes.push('min-w-0')
  if (sx.width === '100%') classes.push('w-full')
  if (sx.textAlign === 'center') classes.push('text-center')
  if (sx.overflow === 'hidden') classes.push('overflow-hidden')
  if (sx.overflow === 'auto' || sx.overflowY === 'auto') classes.push('overflow-auto')
  if (sx.borderRadius === 1 || sx.borderRadius === 2) classes.push('rounded-lg')
  if (sx.fontWeight === 500 || sx.fontWeight === 600 || sx.fontWeight === 'medium') {
    classes.push('font-medium')
  }
  if (sx.fontWeight === 600) classes.push('font-semibold')
  if (sx.color === 'text.secondary' || sx.color === 'text.disabled') {
    classes.push('text-muted-foreground')
  }
  if (sx.color === 'error.main' || sx.color === 'error') classes.push('text-destructive')
  if (sx.color === 'primary.main' || sx.color === 'primary') classes.push('text-primary')
  if (sx.color === 'success.main') classes.push('text-success')
  if (sx.bgcolor === 'background.paper' || sx.bgcolor === 'background.default') {
    classes.push(sx.bgcolor === 'background.paper' ? 'bg-card' : 'bg-muted/40')
  }
  if (sx.border === 1 || sx.borderTop === 1 || sx.borderBottom === 1) {
    classes.push('border border-border')
  }
  if (sx.mb === 1) classes.push('mb-2')
  if (sx.mb === 2) classes.push('mb-4')
  if (sx.mb === 3) classes.push('mb-6')
  if (sx.mt === 1) classes.push('mt-2')
  if (sx.mt === 2) classes.push('mt-4')
  if (sx.mt === 3) classes.push('mt-6')
  if (sx.p === 2) classes.push('p-4')
  if (sx.p === 3) classes.push('p-6')
  if (sx.py === 1) classes.push('py-2')
  if (sx.py === 2) classes.push('py-4')
  if (sx.gap === 1) classes.push('gap-2')
  if (sx.gap === 2) classes.push('gap-4')
  if (sx.gap === 0.5) classes.push('gap-1')
  return classes.join(' ')
}

export const Box = forwardRef(function Box(
  { component: Comp = 'div', className, sx, children, ...props },
  ref
) {
  return (
    <Comp ref={ref} className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </Comp>
  )
})

export const Typography = forwardRef(function Typography(
  { variant = 'body1', component, className, sx, gutterBottom, color, children, ...props },
  ref
) {
  const tagMap = {
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    subtitle1: 'h3',
    subtitle2: 'h4',
    body1: 'p',
    body2: 'p',
    caption: 'span',
  }
  const Comp = component || tagMap[variant] || 'p'
  const variantClass = {
    h4: 'text-xl font-semibold',
    h5: 'text-lg font-semibold',
    h6: 'text-base font-semibold',
    subtitle1: 'text-base font-semibold',
    subtitle2: 'text-sm font-semibold',
    body1: 'text-sm',
    body2: 'text-sm',
    caption: 'text-xs text-muted-foreground',
  }[variant]
  const colorClass =
    color === 'text.secondary' || color === 'text.disabled'
      ? 'text-muted-foreground'
      : color === 'error'
        ? 'text-destructive'
        : color === 'primary'
          ? 'text-primary'
          : color === 'success.main'
            ? 'text-success'
            : ''
  return (
    <Comp
      ref={ref}
      className={cn(variantClass, colorClass, gutterBottom && 'mb-2', sxToClass(sx), className)}
      {...props}
    >
      {children}
    </Comp>
  )
})

export const Paper = forwardRef(function Paper(
  { className, sx, elevation, variant, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card',
        elevation ? 'shadow-sm' : '',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

export const Button = forwardRef(function Button(
  {
    variant = 'default',
    color,
    size = 'default',
    startIcon,
    endIcon,
    className,
    sx,
    fullWidth,
    children,
    ...props
  },
  ref
) {
  const mappedVariant =
    variant === 'contained' || variant === 'default'
      ? color === 'error'
        ? 'destructive'
        : 'default'
      : variant === 'outlined'
        ? 'outline'
        : variant === 'text'
          ? 'ghost'
          : variant
  const mappedSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : size
  return (
    <ShadButton
      ref={ref}
      variant={mappedVariant}
      size={mappedSize}
      className={cn(fullWidth && 'w-full', sxToClass(sx), className)}
      {...props}
    >
      {startIcon}
      {children}
      {endIcon}
    </ShadButton>
  )
})

export const IconButton = forwardRef(function IconButton(
  { className, sx, size = 'small', color, children, ...props },
  ref
) {
  return (
    <ShadButton
      ref={ref}
      variant="ghost"
      size={size === 'small' ? 'icon-sm' : 'icon'}
      className={cn(
        color === 'error' && 'text-destructive hover:text-destructive',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      {children}
    </ShadButton>
  )
})

export const Chip = forwardRef(function Chip(
  { label, icon, className, sx, size, color, variant, onDelete, ...props },
  ref
) {
  return (
    <Badge
      ref={ref}
      variant={variant === 'outlined' ? 'outline' : 'default'}
      className={cn(sxToClass(sx), className)}
      {...props}
    >
      {icon}
      {label}
    </Badge>
  )
})

export function TextField({
  label,
  helperText,
  error,
  fullWidth,
  multiline,
  rows,
  size,
  margin,
  InputProps,
  inputProps,
  className,
  sx,
  select,
  children,
  value,
  onChange,
  ...props
}) {
  const autoId = useId()
  const fieldId = props.id || inputProps?.id || autoId
  if (select) {
    return (
      <FormControl fullWidth={fullWidth} className={className} sx={sx}>
        {label ? <InputLabel>{label}</InputLabel> : null}
        <Select value={value} onChange={onChange} label={label} {...props}>
          {children}
        </Select>
        {helperText ? (
          <p className={cn('mt-1 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
            {helperText}
          </p>
        ) : null}
      </FormControl>
    )
  }
  const Comp = multiline ? Textarea : Input
  return (
    <div className={cn(fullWidth && 'w-full', margin === 'normal' && 'my-2', className, sxToClass(sx))}>
      {label ? (
        <Label htmlFor={fieldId} className="mb-1.5">
          {label}
        </Label>
      ) : null}
      <Comp
        id={fieldId}
        value={value}
        onChange={onChange}
        rows={multiline ? rows : undefined}
        aria-invalid={error || undefined}
        className={cn(fullWidth && 'w-full', InputProps?.className)}
        {...inputProps}
        {...props}
      />
      {helperText ? (
        <p className={cn('mt-1 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {helperText}
        </p>
      ) : null}
    </div>
  )
}

export function FormControl({ children, fullWidth, className, sx, size, ...props }) {
  return (
    <div className={cn(fullWidth && 'w-full', 'space-y-1.5', sxToClass(sx), className)} {...props}>
      {children}
    </div>
  )
}

export function InputLabel({ children, className, ...props }) {
  return (
    <Label className={className} {...props}>
      {children}
    </Label>
  )
}

export function Select({
  value,
  onChange,
  children,
  label,
  fullWidth,
  className,
  sx,
  disabled,
  ...props
}) {
  const items = []
  const walk = (nodes) => {
    if (!nodes) return
    const arr = Array.isArray(nodes) ? nodes : [nodes]
    arr.forEach((child) => {
      if (!child || !child.props) return
      if (child.type === MenuItem || child.props.value !== undefined) {
        items.push(child)
      } else if (child.props.children) {
        walk(child.props.children)
      }
    })
  }
  walk(children)

  return (
    <ShadSelect
      value={value === '' || value == null ? '__none__' : String(value)}
      onValueChange={(v) => {
        const next = v === '__none__' ? '' : v
        onChange?.({ target: { value: next } })
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(fullWidth && 'w-full', sxToClass(sx), className)} {...props}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => {
          const val = item.props.value === '' || item.props.value == null ? '__none__' : String(item.props.value)
          return (
            <SelectItem key={val} value={val} disabled={item.props.disabled}>
              {item.props.children}
            </SelectItem>
          )
        })}
      </SelectContent>
    </ShadSelect>
  )
}

export function MenuItem({ children }) {
  return children
}

export function Dialog({ open, onClose, children, maxWidth, fullWidth, PaperProps, ...props }) {
  return (
    <ShadDialog open={!!open} onOpenChange={(next) => !next && onClose?.()} {...props}>
      <ShadDialogContent
        className={cn(
          fullWidth && 'w-full',
          maxWidth === 'sm' && 'sm:max-w-md',
          maxWidth === 'md' && 'sm:max-w-2xl',
          maxWidth === 'lg' && 'sm:max-w-4xl',
          'max-h-[90vh] overflow-y-auto'
        )}
        showCloseButton={false}
      >
        {children}
      </ShadDialogContent>
    </ShadDialog>
  )
}

export function DialogTitle({ children, className, ...props }) {
  return (
    <DialogHeader>
      <ShadDialogTitle className={className} {...props}>
        {children}
      </ShadDialogTitle>
    </DialogHeader>
  )
}

export function DialogContent({ children, className, dividers, ...props }) {
  return (
    <div className={cn(dividers && 'border-y border-border py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function DialogContentText({ children, className, ...props }) {
  return (
    <ShadDialogDescription className={className} {...props}>
      {children}
    </ShadDialogDescription>
  )
}

export function DialogActions({ children, className, ...props }) {
  return (
    <ShadDialogFooter className={className} {...props}>
      {children}
    </ShadDialogFooter>
  )
}

export function Drawer({ open, onClose, anchor = 'right', children, PaperProps, ...props }) {
  return (
    <Sheet open={!!open} onOpenChange={(next) => !next && onClose?.()} {...props}>
      <SheetContent
        side={anchor === 'left' ? 'left' : 'right'}
        className={cn('w-full bg-background sm:max-w-md', PaperProps?.sx && sxToClass(PaperProps.sx))}
        showCloseButton={false}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

export function Alert({ severity, children, onClose, action, className, sx, ...props }) {
  return (
    <ShadAlert
      variant={severity === 'error' ? 'destructive' : 'default'}
      className={cn('mb-2', sxToClass(sx), className)}
      {...props}
    >
      <AlertDescription className="flex items-start justify-between gap-2">
        <span>{children}</span>
        <span className="flex shrink-0 items-center gap-1">
          {action}
          {onClose ? (
            <ShadButton size="sm" variant="ghost" onClick={onClose}>
              Dismiss
            </ShadButton>
          ) : null}
        </span>
      </AlertDescription>
    </ShadAlert>
  )
}

export function Switch({ checked, onChange, onCheckedChange, ...props }) {
  return (
    <ShadSwitch
      checked={!!checked}
      onCheckedChange={(v) => {
        onCheckedChange?.(v)
        onChange?.({ target: { checked: v } })
      }}
      {...props}
    />
  )
}

export function Checkbox({ checked, onChange, onCheckedChange, icon, checkedIcon, ...props }) {
  return (
    <ShadCheckbox
      checked={!!checked}
      onCheckedChange={(v) => {
        onCheckedChange?.(v)
        onChange?.({ target: { checked: v } })
      }}
      {...props}
    />
  )
}

export function FormControlLabel({
  control,
  label,
  value,
  checked,
  onChange,
  disabled,
  className,
  sx,
  ...props
}) {
  const controlEl = isValidElement(control)
    ? cloneElement(control, {
        value: control.props.value ?? value,
        checked: control.props.checked ?? checked,
        onChange: control.props.onChange ?? onChange,
        disabled: control.props.disabled ?? disabled,
      })
    : control
  return (
    <label
      className={cn(
        'flex items-center gap-3 text-sm',
        disabled && 'opacity-50',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      {controlEl}
      <span>{label}</span>
    </label>
  )
}

export function Divider({ className, sx, ...props }) {
  return <Separator className={cn(sxToClass(sx), className)} {...props} />
}

export function LinearProgress({ value, className, sx, variant, ...props }) {
  return (
    <Progress
      value={value ?? 0}
      className={cn('w-full', sxToClass(sx), className)}
      {...props}
    />
  )
}

export function CircularProgress({ size, className, sx, ...props }) {
  const mapped = size <= 20 ? 'sm' : size >= 40 ? 'lg' : 'default'
  return <Spinner size={mapped} className={cn(sxToClass(sx), className)} {...props} />
}

export function Tooltip({ title, children, arrow, ...props }) {
  if (!title) return children
  return (
    <ShadTooltip {...props}>
      <TooltipTrigger
        render={
          typeof children?.type === 'string' || children?.type
            ? children
            : <span className="inline-flex" />
        }
      >
        {children?.type ? children.props?.children : children}
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </ShadTooltip>
  )
}

export function ToggleButtonGroup({
  value,
  onChange,
  exclusive,
  children,
  fullWidth,
  className,
  sx,
  disabled,
  ...props
}) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <ToggleGroup
      value={value != null ? [value] : []}
      onValueChange={(vals) => {
        const next = vals[0]
        if (next != null) onChange?.(null, next)
      }}
      disabled={disabled}
      className={cn(fullWidth && 'w-full', sxToClass(sx), className)}
      {...props}
    >
      {items.filter(Boolean).map((child) => (
        <ToggleGroupItem
          key={child.props.value}
          value={child.props.value}
          disabled={child.props.disabled || disabled}
          aria-label={child.props['aria-label']}
          className={cn(fullWidth && 'flex-1', child.props.className)}
        >
          {child.props.children}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function ToggleButton({ children }) {
  return children
}

export function List({ children, className, sx, dense, ...props }) {
  return (
    <ul className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </ul>
  )
}

export function ListItem({ children, className, sx, disablePadding, ...props }) {
  return (
    <li className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </li>
  )
}

export function ListItemButton({ children, className, sx, ...props }) {
  return (
    <button type="button" className={cn('flex w-full items-center text-left', sxToClass(sx), className)} {...props}>
      {children}
    </button>
  )
}

export function ListItemIcon({ children, className, sx, ...props }) {
  return (
    <span className={cn('mr-2 inline-flex shrink-0', sxToClass(sx), className)} {...props}>
      {children}
    </span>
  )
}

export function ListItemText({ primary, secondary, className, sx, primaryTypographyProps, ...props }) {
  return (
    <span className={cn('min-w-0 flex-1', sxToClass(sx), className)} {...props}>
      <span className={cn('block text-sm font-medium', primaryTypographyProps?.className)}>
        {primary}
      </span>
      {secondary ? <span className="block text-xs text-muted-foreground">{secondary}</span> : null}
    </span>
  )
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, marks, className, sx, ...props }) {
  const vals = Array.isArray(value) ? value : [value]
  return (
    <ShadSlider
      value={vals}
      onValueChange={(v) => onChange?.(null, Array.isArray(value) ? v : v[0])}
      min={min}
      max={max}
      step={step}
      className={cn(sxToClass(sx), className)}
      {...props}
    />
  )
}

export function Snackbar({ open, onClose, message, autoHideDuration = 6000, children, ...props }) {
  useEffect(() => {
    if (!open) return undefined
    if (message) toast(message)
    const t = setTimeout(() => onClose?.({}, 'timeout'), autoHideDuration)
    return () => clearTimeout(t)
  }, [open, message, autoHideDuration, onClose])
  if (!open) return null
  if (children) {
    return <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">{children}</div>
  }
  return null
}

export function Collapse({ in: open, children, ...props }) {
  if (!open) return null
  return <div {...props}>{children}</div>
}

export function Fade({ in: open, children }) {
  if (!open) return null
  return children
}

export function Zoom({ in: open, children }) {
  if (!open) return null
  return children
}

export function Stack({ children, direction = 'column', spacing = 1, className, sx, ...props }) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        spacing === 1 ? 'gap-2' : spacing === 2 ? 'gap-4' : 'gap-1',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function Container({ children, maxWidth, className, sx, ...props }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4',
        maxWidth === 'sm' && 'max-w-xl',
        maxWidth === 'md' && 'max-w-3xl',
        maxWidth === 'lg' && 'max-w-5xl',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { TooltipProvider, SheetTitle, SheetHeader }

export function Accordion({
  children,
  defaultExpanded,
  expanded,
  onChange,
  className,
  sx,
  disableGutters,
  ...props
}) {
  const id = useId()
  const itemValue = `item-${id}`
  const isControlled = expanded !== undefined
  const defaultValue = defaultExpanded ? itemValue : undefined
  const value = isControlled ? (expanded ? itemValue : '') : undefined

  let summary = null
  let details = null
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === AccordionSummary || child.type?.displayName === 'AccordionSummary') {
      summary = child
    } else if (child.type === AccordionDetails || child.type?.displayName === 'AccordionDetails') {
      details = child
    }
  })

  return (
    <AccordionRoot
      type="single"
      collapsible
      defaultValue={isControlled ? undefined : defaultValue}
      value={value}
      onValueChange={(next) => {
        const open = next === itemValue
        onChange?.(null, open)
      }}
      className={cn(
        'rounded-lg border border-border bg-card px-3',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      <AccordionItem value={itemValue} className="border-0">
        {summary}
        {details}
      </AccordionItem>
    </AccordionRoot>
  )
}

export function AccordionSummary({ children, expandIcon, className, sx, ...props }) {
  return (
    <AccordionTrigger className={cn('px-0', sxToClass(sx), className)} {...props}>
      {children}
    </AccordionTrigger>
  )
}
AccordionSummary.displayName = 'AccordionSummary'

export function AccordionDetails({ children, className, sx, ...props }) {
  return (
    <AccordionContent className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </AccordionContent>
  )
}
AccordionDetails.displayName = 'AccordionDetails'

export function InputAdornment({ children }) {
  return <span className="inline-flex items-center">{children}</span>
}

export function Skeleton({ variant, width, height, className, sx, ...props }) {
  return (
    <ShadSkeleton
      className={cn(sxToClass(sx), className)}
      style={{ width, height }}
      {...props}
    />
  )
}

export function Tabs({ value, onChange, children, className, sx, 'aria-label': ariaLabel, ...props }) {
  const items = Children.toArray(children).filter(isValidElement)
  return (
    <ShadTabs
      value={value != null ? String(value) : undefined}
      onValueChange={(v) => onChange?.(null, v)}
      className={cn('w-full', sxToClass(sx), className)}
      {...props}
    >
      <TabsList
        aria-label={ariaLabel}
        className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
      >
        {items.map((child) => (
          <TabsTrigger
            key={String(child.props.value)}
            value={String(child.props.value)}
            id={child.props.id}
            aria-controls={child.props['aria-controls']}
            className="inline-flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-3 py-3 data-active:border-primary"
          >
            {child.props.icon}
            {child.props.label || child.props.children}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((child) =>
        child.props.children ? (
          <TabsContent key={`c-${child.props.value}`} value={String(child.props.value)}>
            {child.props.children}
          </TabsContent>
        ) : null
      )}
    </ShadTabs>
  )
}

export function Tab() {
  return null
}

export function Table({ children, className, sx, size, ...props }) {
  return (
    <ShadTable className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </ShadTable>
  )
}

export function TableContainer({ children, className, sx, ...props }) {
  return (
    <div className={cn('w-full overflow-auto', sxToClass(sx), className)} {...props}>
      {children}
    </div>
  )
}

export function TableHead({ children, className, sx, ...props }) {
  return (
    <ShadTableHeader className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </ShadTableHeader>
  )
}

export function TableBody({ children, className, sx, ...props }) {
  return (
    <ShadTableBody className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </ShadTableBody>
  )
}

export function TableRow({ children, className, sx, hover, selected, ...props }) {
  return (
    <ShadTableRow
      className={cn(selected && 'bg-muted', sxToClass(sx), className)}
      {...props}
    >
      {children}
    </ShadTableRow>
  )
}

export function TableCell({ children, className, sx, align, padding, ...props }) {
  return (
    <ShadTableCell
      className={cn(
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      {children}
    </ShadTableCell>
  )
}

export function RadioGroup({ value, onChange, children, className, sx, row, name, ...props }) {
  const autoName = useId()
  const groupName = name || autoName
  return (
    <div
      role="radiogroup"
      className={cn(
        row ? 'flex flex-row flex-wrap gap-4' : 'flex flex-col gap-2',
        sxToClass(sx),
        className
      )}
      {...props}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        const childValue = child.props.value
        return cloneElement(child, {
          checked: childValue === value,
          name: groupName,
          onChange: (e) => {
            child.props.onChange?.(e)
            onChange?.(e)
          },
        })
      })}
    </div>
  )
}

export function Radio({ checked, value, onChange, size, ...props }) {
  return (
    <input
      type="radio"
      checked={checked}
      value={value}
      onChange={(e) => onChange?.(e)}
      className={cn('accent-primary', size === 'small' ? 'size-3.5' : 'size-4')}
      {...props}
    />
  )
}

export function FormLabel({ children, className, sx, ...props }) {
  return (
    <Label className={cn(sxToClass(sx), className)} {...props}>
      {children}
    </Label>
  )
}

export function CssBaseline() {
  return null
}

export function ThemeProvider({ children }) {
  return children
}

export function createTheme() {
  return {}
}
