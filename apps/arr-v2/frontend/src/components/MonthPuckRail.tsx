import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './MonthPuckRail.module.css';

export type MonthPuckItem = {
  id: string;
  value: string;
  label: string;
  fullLabel?: string;
  metaLabel?: string;
  index: number;
};

type Props = {
  months: MonthPuckItem[];
  selectedValue: string | null;
  hoveredValue?: string | null;
  onSelect: (value: string) => void;
  onHoverChange?: (value: string | null) => void;
  puckWidth?: number;
  puckGap?: number;
  animationDurationMs?: number;
  showCenterMarker?: boolean;
  className?: string;
};

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export default function MonthPuckRail({
  months,
  selectedValue,
  hoveredValue = null,
  onSelect,
  onHoverChange,
  puckWidth = 66,
  puckGap = 12,
  animationDurationMs = 180,
  showCenterMarker = true,
  className = '',
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const puckRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  const activeValue = hoveredValue ?? selectedValue ?? months[0]?.value ?? null;
  const activeIndex = useMemo(() => {
    const found = months.findIndex((month) => month.value === activeValue);
    return clampIndex(found >= 0 ? found : 0, months.length);
  }, [activeValue, months]);

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const updateWidth = () => setViewportWidth(element.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const itemStep = puckWidth + puckGap;
  const safeViewportWidth = viewportWidth || 720;
  const spacerWidth = Math.max(0, safeViewportWidth / 2 - puckWidth / 2);
  const activePuckCenter = spacerWidth + activeIndex * itemStep + puckWidth / 2;
  const trackX = safeViewportWidth / 2 - activePuckCenter;

  function selectByIndex(index: number) {
    const next = months[clampIndex(index, months.length)];
    if (!next) return;
    onHoverChange?.(null);
    onSelect(next.value);
    requestAnimationFrame(() => puckRefs.current[next.index]?.focus());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!months.length) return;
    const currentIndex = activeIndex;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectByIndex(currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectByIndex(currentIndex + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectByIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectByIndex(months.length - 1);
    }
  }

  if (!months.length) return null;

  return (
    <div
      className={`${styles.rail} ${className}`.trim()}
      style={{
        '--puck-width': `${puckWidth}px`,
        '--puck-gap': `${puckGap}px`,
        '--rail-duration': `${animationDurationMs}ms`,
      } as CSSProperties}
      aria-label="Month selector"
    >
      <div
        ref={viewportRef}
        className={styles.viewport}
        role="listbox"
        aria-label="ARR movement month selector"
        aria-activedescendant={activeValue ? `month-puck-${activeValue}` : undefined}
        onKeyDown={handleKeyDown}
      >
        {showCenterMarker && <div className={styles.centerMarker} aria-hidden="true" />}
        <div
          className={styles.track}
          style={{
            paddingLeft: spacerWidth,
            paddingRight: spacerWidth,
            transform: `translate3d(${trackX}px, 0, 0)`,
          }}
        >
          {months.map((month, index) => {
            const isActive = month.value === activeValue;
            const isSelected = month.value === selectedValue;
            const distance = Math.abs(index - activeIndex);
            const distanceClass = distance === 1
              ? styles.distance1
              : distance === 2
                ? styles.distance2
                : '';

            return (
              <button
                id={`month-puck-${month.value}`}
                key={month.id}
                ref={(node) => { puckRefs.current[index] = node; }}
                type="button"
                role="option"
                aria-selected={isActive}
                aria-pressed={isSelected}
                title={month.fullLabel ?? month.value}
                className={[
                  styles.puck,
                  isActive ? styles.active : '',
                  isSelected ? styles.selected : '',
                  distanceClass,
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  onHoverChange?.(null);
                  onSelect(month.value);
                }}
                onMouseEnter={() => onHoverChange?.(month.value)}
                onMouseLeave={() => onHoverChange?.(null)}
                onFocus={() => onHoverChange?.(month.value)}
                onBlur={() => onHoverChange?.(null)}
              >
                <span className={styles.label}>{month.label}</span>
                {month.metaLabel && <span className={styles.meta}>{month.metaLabel}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
