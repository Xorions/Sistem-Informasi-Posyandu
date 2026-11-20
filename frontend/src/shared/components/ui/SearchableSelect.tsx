import { useEffect, useId, useRef, useState } from 'react'
import { Input } from './field'

export type SearchableOption = {
  value: string | number
  label: string
  searchText?: string
}

type SearchableSelectProps = {
  options: SearchableOption[]
  selectedOption?: SearchableOption
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  hasError?: boolean
  disabled?: boolean
  required?: boolean
  onSearchChange?: (query: string) => void
}

export function SearchableSelect({
  options,
  selectedOption,
  value,
  onChange,
  placeholder = 'Pilih data',
  searchPlaceholder = 'Cari nama atau NIK...',
  emptyMessage = 'Data tidak ditemukan.',
  hasError,
  disabled,
  required,
  onSearchChange,
}: SearchableSelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = options.find((option) => String(option.value) === String(value))
    ?? (selectedOption && String(selectedOption.value) === String(value) ? selectedOption : undefined)
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')
  const filtered = !normalizedQuery
    ? options
    : options.filter((option) => `${option.label} ${option.searchText ?? ''}`.toLocaleLowerCase('id-ID').includes(normalizedQuery))

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  const choose = (option: SearchableOption) => {
    onChange(String(option.value))
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative w-full" ref={rootRef}>
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        value={open ? query : selected?.label ?? ''}
        placeholder={open ? searchPlaceholder : placeholder}
        disabled={disabled}
        required={required && !value}
        hasError={hasError}
        className="pr-20"
        onFocus={() => {
          setQuery('')
          setActiveIndex(0)
          setOpen(true)
          onSearchChange?.('')
        }}
        onClick={() => {
          if (!open) {
            setQuery('')
            setOpen(true)
            onSearchChange?.('')
          }
        }}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setActiveIndex(0)
          onSearchChange?.(nextQuery)
          if (!onSearchChange && value) onChange('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            setQuery('')
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, 0))
          } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
            event.preventDefault()
            choose(filtered[activeIndex])
          }
        }}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {(value || query) && (
          <button
            type="button"
            aria-label="Hapus pilihan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (value) onChange('')
              setQuery('')
              setActiveIndex(0)
              onSearchChange?.('')
              setOpen(true)
              inputRef.current?.focus()
            }}
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
        )}
        <button
          type="button"
          aria-label={open ? 'Tutup daftar pilihan' : 'Buka daftar pilihan'}
          aria-expanded={open}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) {
              setOpen(false)
              setQuery('')
            } else {
              setOpen(true)
              setQuery('')
              setActiveIndex(0)
              onSearchChange?.('')
              inputRef.current?.focus()
            }
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && (
        <ul id={`${id}-listbox`} role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {filtered.length ? filtered.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={String(option.value) === String(value)}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${index === activeIndex ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.label}
            </li>
          )) : <li className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</li>}
        </ul>
      )}
    </div>
  )
}
