/**
 * Enhanced UI Components Library
 * Provides modern, accessible, and beautiful UI components for MarketSage
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './EnhancedUI.module.css';

// ============================================================================
// FOUNDATIONAL COMPONENTS
// ============================================================================

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onClick,
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  const buttonClass = [
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`],
    fullWidth && styles['button--full-width'],
    loading && styles['button--loading'],
    disabled && styles['button--disabled'],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <div className={styles.spinner} />}
      {!loading && icon && iconPosition === 'left' && (
        <span className={styles.buttonIcon}>{icon}</span>
      )}
      <span className={styles.buttonText}>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className={styles.buttonIcon}>{icon}</span>
      )}
    </button>
  );
};

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
  error?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  defaultValue,
  type = 'text',
  error,
  helpText,
  required = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  size = 'md',
  onChange,
  onFocus,
  onBlur,
  className = '',
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const inputId = useRef(`input-${Math.random().toString(36).substr(2, 9)}`);

  const containerClass = [
    styles.inputContainer,
    styles[`input--${size}`],
    fullWidth && styles['input--full-width'],
    focused && styles['input--focused'],
    error && styles['input--error'],
    disabled && styles['input--disabled'],
    className
  ].filter(Boolean).join(' ');

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <div className={containerClass}>
      {label && (
        <label htmlFor={inputId.current} className={styles.inputLabel}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={styles.inputWrapper}>
        {icon && iconPosition === 'left' && (
          <div className={styles.inputIcon}>{icon}</div>
        )}
        
        <input
          id={inputId.current}
          type={type}
          className={styles.input}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <div className={styles.inputIcon}>{icon}</div>
        )}
      </div>
      
      {error && <div className={styles.inputError}>{error}</div>}
      {helpText && !error && <div className={styles.inputHelp}>{helpText}</div>}
    </div>
  );
};

// ============================================================================
// CARD COMPONENTS
// ============================================================================

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  clickable?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  clickable = false,
  loading = false,
  children,
  className = '',
  onClick,
  ...props
}) => {
  const cardClass = [
    styles.card,
    styles[`card--${variant}`],
    styles[`card--padding-${padding}`],
    clickable && styles['card--clickable'],
    loading && styles['card--loading'],
    className
  ].filter(Boolean).join(' ');

  const CardComponent = clickable ? 'button' : 'div';

  return (
    <CardComponent
      className={cardClass}
      onClick={onClick}
      {...props}
    >
      {loading && <div className={styles.cardOverlay}><div className={styles.spinner} /></div>}
      {children}
    </CardComponent>
  );
};

// ============================================================================
// ALERT COMPONENTS
// ============================================================================

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  description?: string;
  dismissible?: boolean;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  description,
  dismissible = false,
  icon,
  actions,
  onDismiss,
  children,
  className = ''
}) => {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  const alertClass = [
    styles.alert,
    styles[`alert--${variant}`],
    className
  ].filter(Boolean).join(' ');

  const defaultIcons = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  return (
    <div className={alertClass}>
      <div className={styles.alertContent}>
        {(icon || defaultIcons[variant]) && (
          <div className={styles.alertIcon}>
            {icon || defaultIcons[variant]}
          </div>
        )}
        
        <div className={styles.alertBody}>
          {title && <div className={styles.alertTitle}>{title}</div>}
          {description && <div className={styles.alertDescription}>{description}</div>}
          {children}
        </div>
        
        {actions && <div className={styles.alertActions}>{actions}</div>}
        
        {dismissible && (
          <button
            className={styles.alertDismiss}
            onClick={handleDismiss}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// BADGE COMPONENTS
// ============================================================================

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  rounded = false,
  children,
  className = ''
}) => {
  const badgeClass = [
    styles.badge,
    styles[`badge--${variant}`],
    styles[`badge--${size}`],
    rounded && styles['badge--rounded'],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClass}>
      {children}
    </span>
  );
};

// ============================================================================
// PROGRESS COMPONENTS
// ============================================================================

export interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const progressClass = [
    styles.progress,
    styles[`progress--${variant}`],
    styles[`progress--${size}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={progressClass}>
      {(showLabel || label) && (
        <div className={styles.progressLabel}>
          {label || `${Math.round(percentage)}%`}
        </div>
      )}
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalClass = [
    styles.modal,
    styles[`modal--${size}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={modalClass} ref={modalRef}>
        {title && (
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>{title}</h2>
            <button
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        )}
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TOOLTIP COMPONENTS
// ============================================================================

export interface TooltipProps {
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = 'top',
  trigger = 'hover',
  delay = 300,
  children,
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
      
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        let y = triggerRect.top - tooltipRect.height - 8;
        
        // Adjust position based on placement
        switch (placement) {
          case 'bottom':
            y = triggerRect.bottom + 8;
            break;
          case 'left':
            x = triggerRect.left - tooltipRect.width - 8;
            y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            break;
          case 'right':
            x = triggerRect.right + 8;
            y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            break;
        }
        
        setPosition({ x, y });
      }
    }, delay);
  }, [delay, placement]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipClass = [
    styles.tooltip,
    styles[`tooltip--${placement}`],
    visible && styles['tooltip--visible'],
    className
  ].filter(Boolean).join(' ');

  const triggerProps = {
    ref: triggerRef,
    ...(trigger === 'hover' && {
      onMouseEnter: showTooltip,
      onMouseLeave: hideTooltip
    }),
    ...(trigger === 'click' && {
      onClick: () => visible ? hideTooltip() : showTooltip()
    }),
    ...(trigger === 'focus' && {
      onFocus: showTooltip,
      onBlur: hideTooltip
    })
  };

  return (
    <>
      <div className={styles.tooltipTrigger} {...triggerProps}>
        {children}
      </div>
      {visible && (
        <div
          ref={tooltipRef}
          className={tooltipClass}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 9999
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

// ============================================================================
// TOGGLE SWITCH COMPONENT
// ============================================================================

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  defaultChecked = false,
  disabled = false,
  size = 'md',
  label,
  description,
  onChange,
  className = ''
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const toggleChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    
    const newChecked = !toggleChecked;
    
    if (!isControlled) {
      setInternalChecked(newChecked);
    }
    
    onChange?.(newChecked);
  };

  const toggleClass = [
    styles.toggle,
    styles[`toggle--${size}`],
    toggleChecked && styles['toggle--checked'],
    disabled && styles['toggle--disabled'],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.toggleContainer}>
      <button
        type="button"
        className={toggleClass}
        onClick={handleToggle}
        disabled={disabled}
        aria-checked={toggleChecked}
        role="switch"
      >
        <div className={styles.toggleThumb} />
      </button>
      
      {(label || description) && (
        <div className={styles.toggleContent}>
          {label && (
            <div className={styles.toggleLabel}>{label}</div>
          )}
          {description && (
            <div className={styles.toggleDescription}>{description}</div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TABS COMPONENT
// ============================================================================

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeTab?: string;
  defaultTab?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  onChange?: (tabId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  defaultTab,
  variant = 'default',
  size = 'md',
  onChange,
  className = '',
  children
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || items[0]?.id);
  const isControlled = activeTab !== undefined;
  const currentTab = isControlled ? activeTab : internalActiveTab;

  const handleTabChange = (tabId: string) => {
    const tab = items.find(item => item.id === tabId);
    if (tab?.disabled) return;

    if (!isControlled) {
      setInternalActiveTab(tabId);
    }
    
    onChange?.(tabId);
  };

  const tabsClass = [
    styles.tabs,
    styles[`tabs--${variant}`],
    styles[`tabs--${size}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={tabsClass}>
      <div className={styles.tabsList}>
        {items.map((item) => {
          const isActive = item.id === currentTab;
          const tabClass = [
            styles.tab,
            isActive && styles['tab--active'],
            item.disabled && styles['tab--disabled']
          ].filter(Boolean).join(' ');

          return (
            <button
              key={item.id}
              className={tabClass}
              onClick={() => handleTabChange(item.id)}
              disabled={item.disabled}
              aria-selected={isActive}
              role="tab"
            >
              {item.icon && (
                <span className={styles.tabIcon}>{item.icon}</span>
              )}
              <span className={styles.tabLabel}>{item.label}</span>
              {item.badge && (
                <Badge variant="primary" size="sm" className={styles.tabBadge}>
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
      
      {children && (
        <div className={styles.tabContent}>
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

export interface LoadingProps {
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'muted';
  text?: string;
  overlay?: boolean;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  overlay = false,
  className = ''
}) => {
  const loadingClass = [
    styles.loading,
    styles[`loading--${variant}`],
    styles[`loading--${size}`],
    styles[`loading--${color}`],
    overlay && styles['loading--overlay'],
    className
  ].filter(Boolean).join(' ');

  const LoadingElement = () => (
    <div className={loadingClass}>
      <div className={styles.loadingIndicator}>
        {variant === 'spinner' && <div className={styles.spinner} />}
        {variant === 'dots' && (
          <div className={styles.dots}>
            <div className={styles.dot} />
            <div className={styles.dot} />
            <div className={styles.dot} />
          </div>
        )}
        {variant === 'bars' && (
          <div className={styles.bars}>
            <div className={styles.bar} />
            <div className={styles.bar} />
            <div className={styles.bar} />
            <div className={styles.bar} />
          </div>
        )}
        {variant === 'pulse' && <div className={styles.pulse} />}
      </div>
      {text && <div className={styles.loadingText}>{text}</div>}
    </div>
  );

  if (overlay) {
    return (
      <div className={styles.loadingOverlay}>
        <LoadingElement />
      </div>
    );
  }

  return <LoadingElement />;
};
