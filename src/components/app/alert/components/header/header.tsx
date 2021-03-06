import React from 'react';
import cx from 'classnames';
import { AlertContext } from '../../alert-context';
import styles from './header.module.scss';

interface Header extends React.HTMLAttributes<HTMLDivElement> {
  children: string | JSX.Element | JSX.Element[];
  className?: string;
}

const Header = ({ children, className, ...restOfProps }: Header) => {
  return (
    <AlertContext.Consumer>
      {({ variant }) => {
        const headerClasses = cx(
          styles.header,
          {
            [styles.info]: variant === 'info',
            [styles.success]: variant === 'success',
            [styles.warning]: variant === 'warning',
            [styles.error]: variant === 'error',
          },
          className
        );

        return (
          <div className={headerClasses} {...restOfProps}>
            {children}
          </div>
        );
      }}
    </AlertContext.Consumer>
  );
};

export { Header };
