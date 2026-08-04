/** Button — presentational. variants: primary | secondary | ghost | danger. */
export function Button({ variant = 'secondary', size, block, icon, children, className = '', ...rest }) {
  const cls = [
    'rd-btn',
    `rd-btn-${variant}`,
    size === 'sm' && 'rd-btn-sm',
    size === 'lg' && 'rd-btn-lg',
    block && 'rd-btn-block',
    !children && 'rd-btn-icon',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {icon}{children}
    </button>
  )
}
