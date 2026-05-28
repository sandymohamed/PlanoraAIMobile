import React, { useEffect, useRef } from 'react';
import { shouldShowInterstitial } from './adHelpers';

interface InterstitialGateProps {
  /** Increment when navigating to this screen to optionally show interstitial */
  trigger?: number;
  children: React.ReactNode;
}

/**
 * Future hook point for interstitial ads after screen transitions.
 * Currently no-op; logs readiness only in dev.
 */
export const InterstitialGate: React.FC<InterstitialGateProps> = ({ trigger, children }) => {
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger === undefined || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;

    if (__DEV__ && shouldShowInterstitial()) {
      // Integration point: AdMobInterstitial.show() after N navigations
      console.log('[Planora Ads] Interstitial gate ready (placeholder)');
    }
  }, [trigger]);

  return <>{children}</>;
};
